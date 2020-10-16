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
import { BackendConfig, ConfigService } from './ConfigService';
import fs from 'fs';
import { Driver } from './Driver';


const logger: Logger = new Logger({name: "zwave-driver"});


export interface OZWDriverStatus {
    is_connected: boolean;
    is_ready: boolean;
    is_failed: boolean;
    is_scan_complete: boolean;
    is_db_ready: boolean;
    device: string;
}


export class ZWaveDriver extends Driver {

    private static instance: ZWaveDriver;

    private _zwave: ZWave;
    private _status: OZWDriverStatus = {
        is_connected: false,
        is_ready: false,
        is_failed: false,
        is_db_ready: false,
        is_scan_complete: false,
        device: ""
    };

    private constructor() {
        super("zwave", true);

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

    static getDriver(): ZWave {
        const inst: ZWaveDriver = ZWaveDriver.getInstance();
        return inst.getDriver();
    }

    private _setup(): void {
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

    private _onReady(id: number): void {
        logger.info(`zwave driver ready, home id: ${id}`);
        this._status.is_ready = true;
        this._status.is_failed = false;
        this._status.is_connected = true;
    }

    private _onDBReady(): void {
        logger.info("zwave manufacturer db ready");
        this._status.is_db_ready = true;
    }

    private _onScanCompleted(): void {
        logger.info("zwave driver scan completed");
        this._status.is_scan_complete = true;
    }

    private _deviceExists(): boolean {
        if (!this.hasConfig()) {
            return false;
        }
        if (!fs.existsSync(this._config.zwave.device)) {
            return false;
        }
        return true;
    }

    private _findCandidateDevices(): string[] {
        const dev_lst = fs.readdirSync("/dev", {encoding: "utf-8"});
        const candidates: string[] = [];
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
        const lst = this._findCandidateDevices();
        const candidate: string|undefined = lst.pop();
        return (!!candidate ? candidate : "");
    }

    protected _startup(): boolean {
        logger.info("start zwave driver");
        if (this._status.is_connected) {
            // we're done here, let's move on.
            logger.debug("attempted to start a connected network.");
            return true;
        }

        const config = this._config;
        if (Object.keys(this._config).length === 0) {
            this.logger.error("can't start with an empty config!!");
            return false;
        }

        const has_config = (
            Object.keys(this._config.zwave).length > 0 &&
            this._config.zwave.device !== ""
        );
        if (!has_config) {
            logger.info("device not specified in config; find best match");
            config.zwave = {
                device: this._getCandidateDevice()
            };
        }

        if (config.zwave.device === "") {
            logger.error("zwave device not specified");
            // return -ENODEV;
            return false;
        }

        if (!this._deviceExists()) {
            logger.error(
                `zwave device at '${config.zwave.device} does not exist`);
            // return -ENOENT;
            return false;
        }

        this._zwave.connect(config.zwave.device);
        this._status.device = config.zwave.device;
        return true;
    }

    protected _shutdown(): boolean {
        logger.info("stop zwave driver");
        if (this.isRunning() || !this._status.is_connected) {
            // we're done here, move on.
            return true;
        }
        this._zwave.disconnect(this._status.device);
        this._status = {
            is_connected: false,
            is_failed: false,
            is_ready: false,
            device: "",
            is_db_ready: false,
            is_scan_complete: false
        };
        return true;
    }

    protected _shouldUpdateConfig(config: BackendConfig): boolean {
        const is_empty_config = (
            Object.keys(config).length === 0 ||
            Object.keys(config.zwave).length === 0 ||
            !config.zwave.device || config.zwave.device === ""
        );

        if (this.isRunning() &&
            (is_empty_config || config.zwave.device !== this._status.device)
        ) {
            return false;
        }
        return true;
    }

    protected _updatedConfig(): void { }

    public getStatus(): OZWDriverStatus {
        return this._status;
    }

    public getAvailableDevices(): string[] {
        return this._findCandidateDevices();
    }

    public isReady(): boolean {
        const s = this._status;
        return (s.is_connected && s.is_ready &&
                s.is_db_ready && s.is_scan_complete);
    }

    public getDriver(): ZWave {
        return this._zwave;
    }
}
