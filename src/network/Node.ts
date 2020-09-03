/*
 * Copyright (C) 2020  Joao Eduardo Luis <joao@wipwd.dev>
 *
 * This file is part of wip:wd's openzwave backend (ozw-backend).
 * ozw-backend is free software: you can redistribute it and/or modify it under
 * the terms of the EUROPEAN UNION PUBLIC LICENSE v1.2, as published by the
 * European Comission.
 */

export enum NetworkNodeStateEnum {
	MessageComplete = 0,
	Timeout = 1,
	Nop = 2,
	Awake = 3,
	Sleep = 4,
	Dead = 5,
	Alive = 6,
}

export interface NetworkNodeState {
	state: NetworkNodeStateEnum;
	str: string;
}

export interface NetworkNodeProperties {
	is_listening: boolean;
	is_routing: boolean;
	is_beaming: boolean;
}

export interface NetworkNodeCaps {
	is_controller: boolean;
	is_primary_controller: boolean;
}

export interface NetworkNodeType {
	is_switch: boolean;
	is_meter: boolean;
}

export interface NetworkNodeInfo {
	manufacturer: string;
	manufacturerid: string;
	product: string;
	producttype: string;
	productid: string;
	type: string;
	name: string;
	loc: string;
}


export interface NetworkNode {

	id: number;
	info: NetworkNodeInfo;
	is_ready: boolean;
	capabilities: NetworkNodeCaps;
	properties: NetworkNodeProperties;
	type: NetworkNodeType;
	state: NetworkNodeState;
	last_seen: Date;
}