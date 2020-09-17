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
	Path,
	Res,
	TsoaResponse,
	Body
} from 'tsoa';
import { Logger } from 'tslog';
import { NetworkService } from '../network/NetworkService';
import { NetworkNode, APISetNodeNameRequest } from '../network/Node';
import { NetworkValue, ValueSetRequest } from '../network/Value';
import { ValueGenre } from 'openzwave-shared';


let logger: Logger = new Logger({name: "api-nodes"});
let svc: NetworkService = NetworkService.getInstance();


@Route("/api/nodes")
export class NodesController extends Controller {

	constructor() { super(); }

	@Get("")
	public async getNodes(): Promise<NetworkNode[]> {
		logger.debug("get network nodes");
		return svc.getNodes();
	}

	@Get("/{id}")
	public async getNode(
		@Path() id: number,
		@Res() notFoundResponse: TsoaResponse<404, {reason: string}>): Promise<NetworkNode> {
		logger.debug(`get network node id ${id}`);
		let node: NetworkNode = {} as NetworkNode;
		try {
			node = svc.getNode(id);
			return node;
		} catch (e) {
			// no such node
			notFoundResponse(404, { reason: `unknown node id ${id}`});			
		}
		return node;
	}

	@Post("/{id}/name")
	public async setNodeName(
		@Path() id: number,
		@Body() name: APISetNodeNameRequest
	): Promise<boolean> {
		logger.debug(`set node ${id} name to ${name.name}`);
		if (!name || name.name == "") {
			return false;
		}
		svc.setNodeName(id, name.name);
		return true;
	}

	@Get("/{id}/values")
	public async getValues(@Path() id: number): Promise<NetworkValue[]> {
		return svc.getValues(id);
	}

	@Get("/{id}/values/genre/{genre}")
	public async getValuesByGenre(
		@Path() id: number,
		@Path() genre: string
	): Promise<NetworkValue[]> {
		if (genre as ValueGenre) {
			return svc.getValuesByGenre(id, (genre as ValueGenre));
		}
		return [];
	}

	@Get("/{id}/values/id/{valueid}")
	public async getValueByID(
		@Path() id: number,
		@Path() valueid: string
	): Promise<NetworkValue> {
		return svc.getValueByID(id, valueid);
	}

	@Post("/{id}/values/id/{valueid}")
	public async setValueByID(
		@Path() id: number,
		@Path() valueid: string,
		@Body() value: ValueSetRequest
	): Promise<boolean> {
		logger.debug(`set node ${id} value ${valueid} to `, value);
		svc.setValueByID(value);
		return true;
	}

	@Get("{id}/neighbors")
	public async getNodeNeighbors(
		@Path() id: number
	): Promise<number[]> {
		return svc.getNodeNeighbors(id);
	}
}