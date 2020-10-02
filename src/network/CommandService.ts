/*
 * Copyright (C) 2020  Joao Eduardo Luis <joao@wipwd.dev>
 *
 * This file is part of wip:wd's openzwave backend (ozw-backend).
 * ozw-backend is free software: you can redistribute it and/or modify it under
 * the terms of the EUROPEAN UNION PUBLIC LICENSE v1.2, as published by the
 * European Comission.
 */

import ZWave, {
	ControllerState, ControllerError
} from 'openzwave-shared';
import { ZWaveDriver } from '../driver/ZWaveDriver';
import { Logger } from 'tslog';
import { NetworkService } from './NetworkService';
import { NetworkNode } from './Node';

export enum CommandEnum {
	None                        = 0,
	AddDevice                   = 1,
	CreateNewPrimary            = 2,
	ReceiveConfiguration        = 3,
	RemoveDevice                = 4,
	RemoveFailedNode            = 5,
	HasNodeFailed               = 6,
	ReplaceFailedNode           = 7,
	TransferPrimaryRole         = 8,
	RequestNetworkUpdate        = 9,
	RequestNodeNeighborUpdate   = 10,
	AssignReturnRoute           = 11,
	DeleteAllReturnRoutes       = 12,
	SendNodeInformation         = 13,
	ReplicationSend             = 14,
	CreateButton                = 15,
	DeleteButton                = 16,
	CancelCommand				= 17,
	NotACommand					= 18, // increase on additional commands.
}


export enum CommandStateEnum {
	NORMAL		= 0,
	STARTING	= 1,
	CANCEL		= 2,
	ERROR		= 3,
	WAITING		= 4,
	SLEEPING	= 5,
	INPROGRESS	= 6,
	COMPLETED	= 7,
	FAILED		= 8,
	NODE_OK		= 9,
	NODE_FAILED	= 10,	
}


export interface CommandState {
	command: CommandEnum;
	is_completed: boolean;
	is_failed: boolean;
	is_cancelled: boolean;
	is_running: boolean;
	is_waiting: boolean;
	percent_done: number;

	time_started: Date;
	time_finished?: Date;
}

export interface CommandStatus {
	is_running_command: boolean;
	current_command?: CommandState;
	last_command?: CommandState;
}

abstract class Command {

	protected constructor(cmd: CommandEnum) {
		this._state = {
			command: cmd,
			is_completed: false,
			is_failed: false,
			is_cancelled: false,
			is_running: false,
			is_waiting: false,
			percent_done: 0,
			time_started: new Date(),
			time_finished: undefined
		};
	}

	protected _is_cancelled: boolean = false;
	protected _state: CommandState;

	protected markIsRunning() { this._state.is_running = true; }
	protected markIsFailed() {
		this._state.is_failed = true;
		this.markNotAlive();
	}
	protected markIsWaiting() { this._state.is_waiting = true; }
	protected markIsCancelled() {
		this._state.is_cancelled = true;
		this.markNotAlive();
	}
	protected markIsCompleted() {
		this._state.is_completed = true;
		this.markNotAlive();
	}
	protected markNotAlive() {
		this._state.is_running = false;
		this._state.is_waiting = false;
	}
	protected isNotAlive() {
		return (this._state.is_failed || this._state.is_cancelled ||
		        this._state.is_completed);
	}

	public abstract _isDone(): boolean;
	public abstract handle(id: number, state: CommandStateEnum): void;
	public abstract hasPercent(): boolean;
	public abstract getPercent(): number;


	public getState(): CommandState {
		return this._state;
	};

	public isDone(): boolean {
		let is_done: boolean = (this._is_cancelled || this._isDone());
		if (is_done && !this._state.time_finished) {
			this._state.time_finished = new Date();
		}
		return is_done;
	}

	public cancel(): void {
		this._is_cancelled = true;
	}

	public getCommand(): CommandEnum {
		return this._state.command;
	}
}


class CommandAddNode extends Command {
	constructor() { super(CommandEnum.AddDevice); }

	public _isDone(): boolean {
		return this.isNotAlive();
	}
	public handle(id: number, state: CommandStateEnum): void {
		if (state == CommandStateEnum.STARTING) {
			this.markIsRunning();
		} else if (state == CommandStateEnum.WAITING) {
			this.markIsWaiting();
		} else if (state == CommandStateEnum.COMPLETED) {
			this.markIsCompleted();
		} else if (state == CommandStateEnum.FAILED ||
		           state == CommandStateEnum.ERROR) {
			this.markIsFailed();
		} else if (state == CommandStateEnum.CANCEL) {
			this.markIsCancelled();
		}
	}

	public hasPercent(): boolean { return false; }
	public getPercent(): number { return 0; }
}


class CommandRemoveNode extends Command {
	constructor() { super(CommandEnum.RemoveDevice); }

	public _isDone(): boolean {
		return this.isNotAlive();
	}

	public handle(id: number, state: CommandStateEnum): void {
		if (state == CommandStateEnum.STARTING) {
			this.markIsRunning();
		} else if (state == CommandStateEnum.WAITING) {
			this.markIsWaiting();
		} else if (state == CommandStateEnum.COMPLETED) {
			this.markIsCompleted();
		} else if (state == CommandStateEnum.FAILED ||
		           state == CommandStateEnum.ERROR) {
			this.markIsFailed();
		} else if (state == CommandStateEnum.CANCEL) {
			this.markIsCancelled();
		}
	}

	public hasPercent(): boolean { return false; }
	public getPercent(): number { return 0; }
}

class CommandHealNetwork extends Command {
	constructor() {
		super(CommandEnum.RequestNodeNeighborUpdate);
		let netsvc: NetworkService = NetworkService.getInstance();
		this._total_num_nodes = netsvc.getNodes().length;
	}

	private _total_num_nodes: number = 0;
	private _num_failed: number = 0;
	private _num_finished: number = 0;

	public _isDone(): boolean {
		logger.info(`heal > ${this.getPercent()}% done`);
		let is_done: boolean = (this._num_finished == this._total_num_nodes);
		if (is_done) {
			if (this._num_failed == this._num_finished) {
				this.markIsFailed();
			} else {
				this.markIsCompleted();
			}
		}
		return is_done;
	}

	public handle(id: number, state: CommandStateEnum): void {
		if (state == CommandStateEnum.STARTING) {
			this.markIsRunning();
		} else if (state == CommandStateEnum.FAILED ||
			state == CommandStateEnum.COMPLETED ||
			state == CommandStateEnum.ERROR) {
			this._num_finished ++;
			if (state != CommandStateEnum.COMPLETED) {
				this._num_failed ++;
			}
		}
		this._state.percent_done = this.getPercent();
		logger.info(`heal > ${this._num_failed} nodes failed, `+
			`${this._num_finished}/${this._total_num_nodes} nodes finished `+
			`(${this.getPercent()}%)`);
	}

	public hasPercent(): boolean { return true; }
	public getPercent(): number {
		let total = this._total_num_nodes;
		let finished = this._num_finished;
		return Math.floor((finished/total)*100);
	}
}


let logger: Logger = new Logger({name: "command-service"});


export class CommandService {

	private static instance: CommandService;
	private constructor() {
		this._zwave = ZWaveDriver.getDriver();
		this._zwave.on("controller command", this._onCommand.bind(this));
	}
	public static getInstance() {
		if (!CommandService.instance) {
			CommandService.instance = new CommandService();
		}
		return CommandService.instance;
	}

	private _zwave: ZWave;
	private _driver: ZWaveDriver = ZWaveDriver.getInstance();
	private _is_running_command: boolean = false;
	private _last_command_status: CommandState[] = [];
	private _command_handler?: Command;

	private _onCommand(
			id: number, state: CommandStateEnum,
			notification: ControllerError, msg: string, command: number): void {

		logger.debug(`command on node ${id}, state: ${state}, notif: ${notification}, msg: ${msg}, command: ${command}`);
		
		if (this._is_running_command && !this._command_handler) {
			throw new Error("unexpected command running without handler");
		}

		if (!this._command_handler) {
			logger.debug(`stray command message for command ${command}`);
			return;
		}

		if (this._command_handler.getCommand() != command) {
			logger.debug(`command ${command} is not current running command`);
			return;
		}

		/*
		switch (state) {
			case CommandStateEnum.CANCEL: 
				this._current_command.is_cancelled = true;
				this._current_command.is_running = false;
				this._current_command.is_waiting = false;
				break;
			case CommandStateEnum.COMPLETED:
				this._current_command.is_completed = true;
				this._current_command.is_running = false;
				this._current_command.is_waiting = false;
				break;
			case CommandStateEnum.WAITING:
				this._current_command.is_waiting = true;
				break;
			case CommandStateEnum.STARTING:
				this._current_command.is_running = true;
				break;
			case CommandStateEnum.FAILED:
				this._current_command.is_failed = true;
				this._current_command.is_running = false;
				this._current_command.is_waiting = false;
				break;
		}
		*/

		this._command_handler.handle(id, state);
		if (this._command_handler.isDone()) {
			this._archiveRunningCommand();
		}
	}

	private _archiveRunningCommand(): void {
		if (!this._command_handler) {
			return;
		}

		let cmd: CommandState = this._command_handler.getState();
		this._command_handler = undefined;
		this._is_running_command = false;
		this._last_command_status.push(cmd);
	}

	addNode(): boolean {
		logger.info("command > add node");
		if (!this._driver.isReady()) {
			logger.info("refusing command because driver is not ready");
			return false;
		}
		if (this._is_running_command) {
			logger.info("refusing command because command already running");
			return false;
		}

		this._is_running_command = true;
		this._command_handler = new CommandAddNode();
		this._zwave.addNode();
		return true;
	}

	removeNode() {
		logger.info("command > remove node");
		if (!this._driver.isReady()) {
			logger.info("refusing command because driver is not ready");
			return false;
		}
		if (this._is_running_command) {
			logger.info("refusing command because command already running");
			return false;
		}

		this._is_running_command = true;
		this._command_handler = new CommandRemoveNode();
		this._zwave.removeNode();
		return true;
	}

	cancelCommand(): boolean {
		if (!this._is_running_command) {
			return true;
		}

		this._zwave.cancelControllerCommand();
		this._command_handler?.cancel();
		return true;
	}

	healNetwork(): boolean {
		logger.info("command > heal network");
		if (!this._driver.isReady()) {
			logger.info("refusing command because driver is not ready");
			return false;
		}
		if (this._is_running_command) {
			logger.info("refusing command because command already running");
			return false;
		}

		this._is_running_command = true;
		this._command_handler = new CommandHealNetwork();
		
		let svc: NetworkService = NetworkService.getInstance();
		let nodes: NetworkNode[] = svc.getNodes();
		nodes.forEach( (node) => {
			this._zwave.requestNodeNeighborUpdate(node.id);
		})
		return true;
	}


	getStatus(): CommandStatus {
		return {
			is_running_command: this._is_running_command,
			current_command: this._command_handler?.getState(),
			last_command: (this._last_command_status.reverse())[0]
		}
	}


}