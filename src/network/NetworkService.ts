/*
 * Copyright (C) 2020  Joao Eduardo Luis <joao@wipwd.dev>
 *
 * This file is part of wip:wd's openzwave backend (ozw-backend).
 * ozw-backend is free software: you can redistribute it and/or modify it under
 * the terms of the EUROPEAN UNION PUBLIC LICENSE v1.2, as published by the
 * European Comission.
 */

import { ZWaveDriver } from '../driver/ZWaveDriver';
import ZWave, {
	NodeInfo, Value, Notification, ValueGenre
} from 'openzwave-shared';
import { Datastore } from './Datastore';
import { Logger } from 'tslog';
import {
	NetworkNode, NetworkNodeCaps, NetworkNodeProperties,
	NetworkNodeStateEnum, NetworkNodeType
} from './Node';
import { NetworkValue, ValueSetRequest } from './Value';
import { PrometheusDriver } from '../driver/PrometheusDriver';


let logger: Logger = new Logger({name: 'network-service'});


export enum NetworkStatusEnum {
	None 		= 0,
	Starting	= 1,
	Stopped		= 2,
	Dead		= 3,
	Sleep 		= 4,
	Awake 		= 5,
	Alive		= 6
}

export interface NetworkStatus {
	state: NetworkStatusEnum;
	str: string;
	nodes_total: number;
	nodes_alive: number;
	nodes_asleep: number;
	nodes_awake: number;
	nodes_dead: number;
}

export class NetworkService {

	private static instance: NetworkService;
	private constructor() {
		this._setup();
		this._status = {} as NetworkStatus;
		this._status.state = NetworkStatusEnum.Stopped;
		this._updateStatus();
	}
	public static getInstance(): NetworkService {
		if (!NetworkService.instance) {
			NetworkService.instance = new NetworkService();
		}
		return NetworkService.instance;
	}

	private _store: Datastore = new Datastore();
	private _is_running: boolean = false;
	private _is_scan_complete: boolean = false;
	private _status: NetworkStatus;


	private _setup(): void {
		logger.info("setting up network service");
		let driver: ZWave = ZWaveDriver.getDriver();

		// nodes
		driver.on("node added", this._onNodeAdded.bind(this));
		driver.on("node removed", this._onNodeRemoved.bind(this));
		driver.on("node reset", this._onNodeReset.bind(this));
		driver.on("polling enabled", this._onNodePollingEnabled.bind(this));
		driver.on("polling disabled", this._onNodePollingDisabled.bind(this));
		driver.on("node available", this._onNodeAvailable.bind(this));
		driver.on("node naming", this._onNodeNaming.bind(this));
		driver.on("node ready", this._onNodeReady.bind(this));
		driver.on("notification", this._onNodeNotification.bind(this));


		// values
		driver.on("value added", this._onValueAdded.bind(this));
		driver.on("value changed", this._onValueChanged.bind(this));
		driver.on("value refreshed", this._onValueRefreshed.bind(this));
		driver.on("value removed", this._onValueRemoved.bind(this));


		driver.on("scan complete", this._onScanComplete.bind(this));
	}

	// start/stop network

	/**
	 * Start the network
	 * 
	 * This means that we are going to start listening for events.
	 * 
	 */
	start() {
		logger.info("start network");
		this._is_running = true;
		this._is_scan_complete = false;
		this._updateStatus();
	}

	/**
	 * Stop the network
	 * 
	 * Stop listening for events, and clear out all and any info we might have.
	 * 
	 */
	stop() {
		logger.info("stop network");
		this._is_running = false;
		this._is_scan_complete = false;
		this._updateStatus();
		this._store.clear();
	}
	

	private _isRunning() {
		return this._is_running;
	}

	// CALLBACKS
	//
	// nodes
	private _onNodeAdded(id: number): void {
		logger.info(`adding node ${id}`);
		if (!this._isRunning()) { return; }
		this._store.nodeAdd(id);
		this._updateStatus();
	}

	private _onNodeRemoved(id: number): void {
		logger.info(`removing node ${id}`);
		if (!this._isRunning()) { return; }
		this._store.nodeRemove(id);
		this._updateStatus();
	}

	private _onNodeReset(id: number): void {
		logger.info(`resetting node ${id}`);
		if (!this._isRunning()) { return; }
		this._updateStatus();
		// ??
	}

	private _onNodePollingEnabled(id: number): void {
		logger.info(`enabling polling on node ${id}`);
		if (!this._isRunning()) { return; }
		this._updateStatus();
	}

	private _onNodePollingDisabled(id: number): void {
		logger.info(`disabling polling on node ${id}`);
		if (!this._isRunning()) { return; }
		this._updateStatus();
	}

	private _onNodeAvailable(id: number, info: NodeInfo): void {
		logger.info(`node ${id} is available`);
		if (!this._isRunning()) { return; }
		this._store.nodeUpdated(id, info);
		this._updateNodeCaps(id);
		this._updateNodeProperties(id);
		this._updateStatus();
	}

	private _onNodeNaming(id: number, info: NodeInfo): void {
		logger.info(`node ${id} named`);
		if (!this._isRunning()) { return; }
		this._store.nodeUpdated(id, info);
		this._updateStatus();
	}

	private _onNodeReady(id: number, info: NodeInfo): void {
		logger.info(`node ${id} is now ready`);
		if (!this._isRunning()) { return; }
		this._store.nodeUpdated(id, info);
		this._store.markNodeReady(id);
		this._updateStatus();
		
		// if the node is ready, then it is alive.
		// or so we decided.
		let node: NetworkNode = this._store.getNode(id);
		node.state.state = NetworkNodeStateEnum.Alive;
		node.state.str = "alive";
	}

	private _onNodeNotification(
			id: number,
			notification: Notification,
			str: string): void {
		logger.info(`notification on node ${id}: ${str}, `, notification);
		if (!this._isRunning()) { return; }
		let node: NetworkNode = this._store.getNode(id);
		switch (notification) {
			case Notification.NodeAlive:
				node.state = {state: NetworkNodeStateEnum.Alive, str: "alive"};
				break;
			case Notification.NodeAwake:
				node.state = {state: NetworkNodeStateEnum.Awake, str: "awake"};
				break;
			case Notification.NodeDead:
				node.state = {state: NetworkNodeStateEnum.Dead, str: "dead"};
				break;
			case Notification.NodeSleep:
				node.state = {state: NetworkNodeStateEnum.Sleep, str: "sleep"};
				break;
		}
		this._updateStatus();
	}

	private _isClassMeter(cls: number): boolean {
		// 0x32: COMMAND_CLASS_METER
		return (cls == 0x32);
	}

	private _isClassSwitch(cls: number): boolean {
		// 0x25: COMMAND_CLASS_SWITCH_BINARY
		// 0x26: COMMAND_CLASS_SWITH_MULTILEVEL
		return (cls == 0x25 || cls == 0x26);
	}

	// values
	private _onValueAdded(id: number, cls: number, value: Value) {
		if (!this._isRunning()) { return; }
		this._store.valueAdd(id, cls, value);

		let node: NetworkNode = this._store.getNode(id);
		let node_type: NetworkNodeType = node.type;
		if (this._isClassMeter(cls)) {
			node_type.is_meter = true;
		} else if (this._isClassSwitch(cls)) {
			node_type.is_switch = true;
		}

		if (node_type.is_meter) {
			this._addToPrometheus(id, cls, value);
		}
	}

	private _onValueChanged(id: number, cls: number, value: Value) {
		if (!this._isRunning()) { return; }
		this._store.valueChange(id, cls, value);
		logger.info(`value changed on node ${id}: ${value.value_id}`);
		if (this._isClassMeter(cls)) {
			this._addToPrometheus(id, cls, value);
		}
	}

	private _onValueRefreshed(id: number, cls: number, value: Value) {
		if (!this._isRunning()) { return; }
		this._onValueChanged(id, cls, value);
		logger.info(`value refreshed on node ${id}: ${value.value_id}`);
	}

	private _onValueRemoved(
			id: number, cls: number,
			inst: number, idx: number) {
		if (!this._isRunning()) { return; }
		this._store.valueRemove(id, cls, inst, idx);
	}


	private _updateNodeCaps(id: number) {
		let node: NetworkNode = this._store.getNode(id);
		let driver: ZWave = ZWaveDriver.getDriver();
		let is_primary_controller = false;
		let is_controller = (driver.getControllerNodeId() === id);
		if (is_controller) {
			is_primary_controller = driver.isPrimaryController();
		}
		let caps: NetworkNodeCaps = {
			is_controller: is_controller,
			is_primary_controller: is_primary_controller
		}
		node.capabilities = caps;
	}

	private _updateNodeProperties(id: number) {
		let node: NetworkNode = this._store.getNode(id);
		let driver: ZWave = ZWaveDriver.getDriver();
		let properties: NetworkNodeProperties = {
			is_beaming: driver.isNodeBeamingDevice(id),
			is_listening: driver.isNodeListeningDevice(id),
			is_routing: driver.isNodeRoutingDevice(id)
		}
		node.properties = properties;
	}

	getNodes(): NetworkNode[] {
		return this._store.getNodes();
	}

	getNode(id: number): NetworkNode {
		// this can throw.
		return this._store.getNode(id);
	}

	getValues(id: number): NetworkValue[] {
		return this._store.getValues(id);
	}

	getValuesByGenre(id: number, genre: ValueGenre): NetworkValue[] {
		return this._store.getValuesByGenre(id, genre);
	}

	getValueByID(id: number, valueid: string): NetworkValue {
		return this._store.getValueByID(id, valueid);
	}

	setValueByID(value: ValueSetRequest) {
		logger.debug(`set value by id: `, value);
		let driver: ZWave = ZWaveDriver.getDriver();
		driver.setChangeVerified(
			value.node_id, value.class_id, value.instance,
			value.index, true);
		logger.debug(`set-value-by-id: setting `, value);
		driver.setValue(
			value.node_id, value.class_id, value.instance,
			value.index, value.value);
		logger.debug(`set-value-by-id: sent to driver `, value);
	}

	getStatus(): NetworkStatus {
		this._updateStatus();
		return this._status;	
	}

	public getNodeNeighbors(id: number): number[] {
		if (!this._store.nodeExists(id)) {
			return [];
		}
		let driver: ZWave = ZWaveDriver.getDriver();
		return driver.getNodeNeighbors(id);
	}


	private _onScanComplete(): void {
		if (this._isRunning()) {
			this._is_scan_complete = true;
		}
	}


	private _updateStatus(): void {
		let nodelst: NetworkNode[] = this._store.getNodes();

		let nodes_total: number = nodelst.length;
		let nodes_alive: number = 0;
		let nodes_asleep: number = 0;
		let nodes_awake: number = 0;
		let nodes_dead: number = 0;
		let nodes_unknown: number = 0;

		nodelst.forEach( (node) => {
			let node_state = node.state.state;
			switch (node_state) {
				case NetworkNodeStateEnum.Alive:
					nodes_alive++;
					break;
				case NetworkNodeStateEnum.Awake:
					nodes_awake++;
					break;
				case NetworkNodeStateEnum.Sleep:
					nodes_asleep++;
					break;
				case NetworkNodeStateEnum.Dead:
					nodes_dead++;
					break;
				default:
					nodes_unknown++;
					break;
			}
		});

		let state: NetworkStatusEnum = NetworkStatusEnum.None;
		let state_str: string = "";
		if (!this._isRunning()) {
			state = NetworkStatusEnum.Stopped;
			state_str = "stopped";
		} else if (this._isRunning() && !this._is_scan_complete) {
			state = NetworkStatusEnum.Starting;
			state_str = "starting";
		} else if (nodes_alive > 0) {
			state = NetworkStatusEnum.Alive;
			state_str = "alive";
		} else if (nodes_awake > 0) {
			state = NetworkStatusEnum.Awake;
			state_str = "awake";
		} else if (nodes_asleep > 0) {
			state = NetworkStatusEnum.Sleep;
			state_str = "sleep";
		} else if (nodes_dead > 0) {
			state = NetworkStatusEnum.Dead;
			state_str = "dead";
		}

		this._status = {
			nodes_alive: nodes_alive,
			nodes_asleep: nodes_asleep,
			nodes_awake: nodes_awake,
			nodes_dead: nodes_dead,
			nodes_total: nodes_total,
			state: state,
			str: state_str
		};
	}


	private _addToPrometheus(id: number, cls: number, value: Value) {
		let unit: string = value.units;
		if (unit !== "A" && unit !== "V" && unit !== "W") {
			return;
		}
		let v: number = +value.value;
		PrometheusDriver.put(id, unit, v);
	}
 }