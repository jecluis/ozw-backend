/*
 * Copyright (C) 2020  Joao Eduardo Luis <joao@wipwd.dev>
 *
 * This file is part of wip:wd's openzwave backend (ozw-backend).
 * ozw-backend is free software: you can redistribute it and/or modify it under
 * the terms of the EUROPEAN UNION PUBLIC LICENSE v1.2, as published by the
 * European Comission.
 */

import ZWave from 'openzwave-shared';
import { Logger } from 'tslog';
import { ENOENT, ENODEV } from 'constants';
import { ConfigService } from './ConfigService';
import fs from 'fs';


let logger: Logger = new Logger({name: "zwave-driver"});


export interface OZWDriverStatus {
	is_connected: boolean;
	is_ready: boolean;
	is_failed: boolean;
	is_scan_complete: boolean;
	is_db_ready: boolean;
	device: string;
}


export class ZWaveDriver {

	private static instance: ZWaveDriver;
	private constructor() {
		this._zwave = new ZWave({
			UserPath: './zwave.db',
			ConfigPath: './zwave.db',
			ConsoleOutput: false,
			LogFileName: 'ozw-backend.zwave.log',
			Logging: true
		});

		this._setup();
	}

	public static getInstance(): ZWaveDriver {
		if (!ZWaveDriver.instance) {
			ZWaveDriver.instance = new ZWaveDriver();
		}
		return ZWaveDriver.instance;
	}

	private _zwave: ZWave;
	private _status: OZWDriverStatus = {
		is_connected: false,
		is_ready: false,
		is_failed: false,
		is_db_ready: false,
		is_scan_complete: false,
		device: ""
	};

	private _setup() {
		this._zwave.on("connected", this._onConnected.bind(this));
		this._zwave.on("driver failed", this._onFailed.bind(this));
		this._zwave.on("driver ready", this._onReady.bind(this));
		this._zwave.on("manufacturer specific DB ready",
					   this._onDBReady.bind(this));
		this._zwave.on("scan complete", this._onScanCompleted.bind(this));
	}

	private _onConnected(version: string): void {
		logger.info("zwave driver connected");
		this._status.is_connected = true;
		this._status.is_failed = true;
	}

	private _onFailed(): void {
		logger.error("zwave driver failed");
		this._status.is_failed = true;
		this._status.is_connected = false;
		this._status.is_ready = false;
	}

	private _onReady(id: number) {
		logger.info(`zwave driver ready, home id: ${id}`);
		this._status.is_ready = true;
		this._status.is_failed = false;
		this._status.is_connected = true;
	}

	private _onDBReady() {
		logger.info("zwave manufacturer db ready");
		this._status.is_db_ready = true;
	}

	private _onScanCompleted() {
		logger.info("zwave driver scan completed");
		this._status.is_scan_complete = true;
	}

	private _deviceExists() {
		let cfg = ConfigService.getConfig();

		if (!fs.existsSync(cfg.zwave.device)) {
			return false;
		}
		return true;
	}

	private _findCandidateDevices() {
		let dev_lst = fs.readdirSync("/dev", {encoding: "utf-8"});
		let candidates: string[] = [];
		dev_lst.forEach( (dev) => {
			if (dev.startsWith("ttyACM") || dev.startsWith("ttyUSB")) {
				candidates.push("/dev/" + dev);
				return;
			}
		});
		return candidates;
	}

	/**
	 * Obtains one candidate device.
	 * 
	 * If there are multiple candidate devices, it will obtain one of them.
	 */
	private _getCandidateDevice(): string {
		let lst = this._findCandidateDevices();
		let candidate: string|undefined = lst.pop();
		return (!!candidate ? candidate : "");
	}

	start(): number {
		logger.info("start zwave driver");
		if (this._status.is_connected) {
			// we're done here, let's move on.
			logger.debug("attempted to start a connected network.");
			return 0;
		}

		let config = ConfigService.getConfig();
		if (config.zwave.device === "") {
			logger.info("device not specified in config; find best match");
			config.zwave.device = this._getCandidateDevice();			
		}

		if (config.zwave.device === "") {
			logger.error("zwave device not specified");
			return -ENODEV;
		}

		if (!this._deviceExists()) {
			logger.error(
				`zwave device at '${config.zwave.device} does not exist`);
			return -ENOENT;
		}

		this._zwave.connect(config.zwave.device);
		this._status.device = config.zwave.device;
		return 0;
	}

	stop(): void {
		logger.info("stop zwave driver");
		if (!this._status.is_connected) {
			// we're done here, move on.
			return;
		}
		let config = ConfigService.getConfig();
		this._zwave.disconnect(this._status.device);
		this._status = {
			is_connected: false,
			is_failed: false,
			is_ready: false,
			device: "",
			is_db_ready: false,
			is_scan_complete: false
		}
	}

	getStatus(): OZWDriverStatus {
		return this._status;
	}

	getAvailableDevices(): string[] {
		return this._findCandidateDevices();
	}

	isReady(): boolean {
		let s = this._status;
		return (s.is_connected && s.is_ready &&
		        s.is_db_ready && s.is_scan_complete);
	}

	getDriver(): ZWave {
		return this._zwave;
	}

	static getDriver(): ZWave {
		let inst: ZWaveDriver = ZWaveDriver.getInstance();
		return inst.getDriver();
	}
}