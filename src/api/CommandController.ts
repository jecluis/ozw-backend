/*
 * Copyright (C) 2020  Joao Eduardo Luis <joao@wipwd.dev>
 *
 * This file is part of wip:wd's openzwave backend (ozw-backend).
 * ozw-backend is free software: you can redistribute it and/or modify it under
 * the terms of the EUROPEAN UNION PUBLIC LICENSE v1.2, as published by the
 * European Comission.
 */

import {
	Controller,
	Get,
	Route,
	Post,
	Put
} from 'tsoa';
import { Logger } from 'tslog';
import { ZWaveDriver } from '../driver/ZWaveDriver';
import { CommandService, CommandStatus } from '../network/CommandService';


let logger: Logger = new Logger({name: "api-network"});
let driver: ZWaveDriver = ZWaveDriver.getInstance();
let svc: CommandService = CommandService.getInstance();


@Route("/api/command")
export class CommandController extends Controller {

	constructor() { super(); }

	@Put("/node/add")
	public async nodeAdd(): Promise<boolean> {
		logger.debug("add node command");
		return svc.addNode();
	}

	@Put("/node/remove")
	public async nodeRemove(): Promise<boolean> {
		logger.debug("remove node command");
		return svc.removeNode();
	}

	@Put("/network/heal")
	public async healNetwork(): Promise<boolean> {
		logger.debug("heal node command");
		return svc.healNetwork();
	}


	@Put("/cancel")
	public async cancelCommand(): Promise<boolean> {
		logger.debug("cancelling command");
		return svc.cancelCommand();
	}


	@Get("/status")
	public async getCommandStatus(): Promise<CommandStatus> {
		logger.debug("get command status");
		return svc.getStatus();
	}
}