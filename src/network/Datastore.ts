/*
 * Copyright (C) 2020  Joao Eduardo Luis <joao@wipwd.dev>
 *
 * This file is part of wip:wd's openzwave backend (ozw-backend).
 * ozw-backend is free software: you can redistribute it and/or modify it under
 * the terms of the EUROPEAN UNION PUBLIC LICENSE v1.2, as published by the
 * European Comission.
 */

import { NetworkNode, NetworkNodeType, NetworkNodeInfo, NetworkNodeCaps, NetworkNodeProperties, NetworkNodeState } from './Node';
import { NetworkValue } from './Value';
import { NodeInfo, Value, ValueGenre } from 'openzwave-shared';
import { Logger } from 'tslog';


let logger: Logger = new Logger({name: 'datastore'});


export class UnknownNodeError extends Error {
	constructor(msg: string, id: number) {
		super(msg);
		this.name = "UnknownNodeError";
		this.id = id;
	}

	public id: number;
}

export class Datastore {

	// map of node_id -> node
	private _nodes_by_id: {[id: number]: NetworkNode} = {};
	// map of value_id -> value
	private _values_by_id: {[id: string]: NetworkValue} = {};
	// this is a map of node_id -> map<value_id, value>
	private _values_by_node: {[id: number]: {[id: string]: NetworkValue}} = {};


	// clear out the store
	clear() {
		this._nodes_by_id = {};
		this._values_by_id = {};
		this._values_by_node = {};
	}

	// nodes
	//
	nodeAdd(id: number): NetworkNode {
		//let node: NetworkNode = {} as NetworkNode;
		let node: NetworkNode = {
			id: id,
			info: {} as NetworkNodeInfo,
			is_ready: false,
			capabilities: {} as NetworkNodeCaps,
			properties: {} as NetworkNodeProperties,
			state: {} as NetworkNodeState,
			type: {} as NetworkNodeType,
			last_seen: new Date()
		}

		if (!this.nodeExists(id)) {
			this._nodes_by_id[id] = node;
		}
		return node;
	}

	nodeUpdated(id: number, info: NodeInfo) {
		if (!this.nodeExists(id)) {
			this.nodeAdd(id);
		}
		let node = this._nodes_by_id[id];
		node.info = info;
		this.updateNodeLastSeen(node);
	}

	nodeRemove(id: number): void {
		if (!this.nodeExists(id)) {
			// done?
			return;
		}

		delete this._nodes_by_id[id];
		this.valuesRemoveByNode(id);
	}

	markNodeReady(id: number) {
		if (!this.nodeExists(id)) {
			logger.error(`attempting marking unknown node ready (node ${id})`);
			throw new UnknownNodeError(`unknown node ${id}`, id);
		}
		this._nodes_by_id[id].is_ready = true;
	}

	getNode(id: number): NetworkNode {
		if (!this.nodeExists(id)) {
			throw new UnknownNodeError(`unknown node ${id}`, id);
		}
		return this._nodes_by_id[id];
	}

	getNodes(): NetworkNode[] {
		return Object.values(this._nodes_by_id);
	}

	nodeExists(id: number): boolean {
		return (id in this._nodes_by_id);
	}

	// values
	//

	private _createNetworkValue(nodeid: number, value: Value): NetworkValue {
		return {
			id: {
				node_id: nodeid,
				class_id: value.class_id,
				instance: value.instance,
				index: value.index
			},
			value: value,
			last_seen: new Date()
		};
	}

	valueAdd(nodeid: number, cls: number, value: Value): NetworkValue {
		let v: NetworkValue = this._createNetworkValue(nodeid, value);
		if (!this.nodeExists(nodeid)) {
			// the value exists, so the node must exist.
			this.nodeAdd(nodeid);
		}
		if (!(nodeid in this._values_by_node)) {
			this._values_by_node[nodeid] = {};
		}
		let value_id: string = value.value_id;
		this._values_by_node[nodeid][value_id] = v;
		this._values_by_id[value_id] = v;
		this.updateNodeLastSeenByID(nodeid);
		this.updateValueLastSeen(v);
		return v;
	}

	valueChange(nodeid: number, cls: number, value: Value): void {
		let valueid = value.value_id;
		if (!(valueid in this._values_by_id)) {
			// we must have missed the add event?
			this.valueAdd(nodeid, cls, value);
			return;
		}
		let v: NetworkValue = this._values_by_id[valueid];
		v.value = value;
		this.updateNodeLastSeenByID(nodeid);
		this.updateValueLastSeen(v);
	}

	valuesRemoveByNode(id: number): void {
		if (!(id in this._values_by_node)) {
			return;
		}

		let values: string[] = Object.keys(this._values_by_node[id]);
		values.forEach( (value_id) => {
			this.valueRemoveByID(value_id);
		});
		delete this._values_by_node[id];
	}

	valueRemoveByID(value_id: string): void {
		if (value_id in this._values_by_id) {
			delete this._values_by_id[value_id];
		}
	}

	valueRemove(id: number, cls: number, inst: number, idx: number): void {
		let value_id = `${id}-${cls}-${inst}-${idx}`;
		this.valueRemoveByID(value_id);
		this.updateNodeLastSeenByID(id);
	}

	valueExists(value_id: string): boolean {
		return (value_id in this._values_by_id);
	}

	getValues(nodeid: number): NetworkValue[] {
		if (!(nodeid in this._values_by_node)) {
			return [];
		}
		return Object.values(this._values_by_node[nodeid]);
	}

	getValuesByGenre(nodeid: number, genre: ValueGenre): NetworkValue[] {
		if (!(nodeid in this._values_by_node)) {
			return [];
		}
		let values: NetworkValue[] =
			Object.values(this._values_by_node[nodeid]);
		let value_by_genre: NetworkValue[] = [];
		values.forEach( (v) => {
			if (v.value.genre === genre) {
				value_by_genre.push(v);
			}
		});
		return value_by_genre;
	}

	public getValueByID(nodeid: number, valueid: string): NetworkValue {
		if (!(nodeid in this._values_by_node)) {
			return {} as NetworkValue;
		}
		if (!(valueid in this._values_by_id)) {
			return {} as NetworkValue;
		}
		return this._values_by_id[valueid];
	}


	updateNodeLastSeen(node: NetworkNode) {
		node.last_seen = new Date();
	}

	updateNodeLastSeenByID(nodeid: number) {
		let node = this.getNode(nodeid);
		this.updateNodeLastSeen(node);
	}

	updateValueLastSeen(value: NetworkValue) {
		value.last_seen = new Date();
	}
}