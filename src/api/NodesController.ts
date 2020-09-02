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
	Post
} from 'tsoa';
import { Logger } from 'tslog';
import { NetworkService } from '../network/NetworkService';
import { NetworkNode } from '../network/Node';
import { Notification } from 'openzwave-shared';


let logger: Logger = new Logger({name: "api-nodes"});
let svc: NetworkService = NetworkService.getInstance();


@Route("/api/nodes")
export class NodesController extends Controller {

	constructor() { super(); }

	@Get('')
	public async getNodes(): Promise<NetworkNode[]> {
		logger.debug("get network status");
		return svc.getNodes();
	}
}