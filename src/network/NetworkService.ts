/*
 * Copyright (C) 2020  Joao Eduardo Luis <joao@wipwd.dev>
 *
 * This file is part of wip:wd's openzwave backend (ozw-backend).
 * ozw-backend is free software: you can redistribute it and/or modify it under
 * the terms of the EUROPEAN UNION PUBLIC LICENSE v1.2, as published by the
 * European Comission.
 */

import { ZWaveDriver } from '../driver/ZWaveDriver';
import ZWave, { NodeInfo, Value } from 'openzwave-shared';
import { Datastore } from './Datastore';
import { Logger } from 'tslog';
import { NetworkNode } from './Node';


let logger: Logger = new Logger({name: 'network-service'});


export class NetworkService {

	private static instance: NetworkService;
	private constructor() {
		this._setup();
	}
	public static getInstance(): NetworkService {
		if (!NetworkService.instance) {
			NetworkService.instance = new NetworkService();
		}
		return NetworkService.instance;
	}

	private _store: Datastore = new Datastore();
	private _is_running: boolean = false;


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
	}

	private _onNodeRemoved(id: number): void {
		logger.info(`removing node ${id}`);
		if (!this._isRunning()) { return; }
		this._store.nodeRemove(id);
	}

	private _onNodeReset(id: number): void {
		logger.info(`resetting node ${id}`);
		if (!this._isRunning()) { return; }
		// ??
	}

	private _onNodePollingEnabled(id: number): void {
		logger.info(`enabling polling on node ${id}`);
		if (!this._isRunning()) { return; }
	}

	private _onNodePollingDisabled(id: number): void {
		logger.info(`disabling polling on node ${id}`);
		if (!this._isRunning()) { return; }
	}

	private _onNodeAvailable(id: number, info: NodeInfo): void {
		logger.info(`node ${id} is available`);
		if (!this._isRunning()) { return; }
		this._store.nodeUpdated(id, info);
	}

	private _onNodeNaming(id: number, info: NodeInfo): void {
		logger.info(`node ${id} named`);
		if (!this._isRunning()) { return; }
		this._store.nodeUpdated(id, info);
	}

	private _onNodeReady(id: number, info: NodeInfo): void {
		logger.info(`node ${id} is now ready`);
		if (!this._isRunning()) { return; }
		this._store.nodeUpdated(id, info);
		this._store.markNodeReady(id);
		// XXX: update state, caps, etc.
	}

	private _onNodeNotification(
			id: number,
			notification: Notification,
			str: string): void {
		logger.info(`notification on node ${id}: ${str}, `, notification);
		if (!this._isRunning()) { return; }
		// XXX: update node state, etc.
	}

	// values
	private _onValueAdded(id: number, cls: number, value: Value) {
		if (!this._isRunning()) { return; }
	}

	private _onValueChanged(id: number, cls: number, value: Value) {
		if (!this._isRunning()) { return; }
	}

	private _onValueRefreshed(id: number, cls: number, value: Value) {
		if (!this._isRunning()) { return; }
	}

	private _onValueRemoved(
			id: number, cls: number,
			inst: number, idx: number) {
		if (!this._isRunning()) { return; }
	}


	getNodes(): NetworkNode[] {
		return this._store.getNodes();
	}
 }