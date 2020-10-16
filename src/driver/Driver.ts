/*
 * Copyright (C) 2020  Joao Eduardo Luis <joao@wipwd.dev>
 *
 * This file is part of wip:wd's openzwave backend (ozw-backend).
 * ozw-backend is free software: you can redistribute it and/or modify it under
 * the terms of the EUROPEAN UNION PUBLIC LICENSE v1.2, as published by the
 * European Comission.
 */

import { Logger } from 'tslog';
import { BackendConfig, ConfigService, ConfigValidator } from "./ConfigService";


export abstract class Driver extends ConfigValidator {

    protected logger: Logger;
    protected _config: BackendConfig = {} as BackendConfig;
    private _has_config: boolean = false;
    private _is_running: boolean = false;
    private _wants_startup: boolean = false;

    constructor(
        protected _driver_name: string,
        private _always_requires_config: boolean
    ) {
        super();
        this.logger = new Logger({name: `driver-${_driver_name}`});
        ConfigService.getConfig().subscribe(
            this._handleUpdateConfig.bind(this)
        );
        ConfigService.registerValidator(this);
    }

    private _handleUpdateConfig(config: BackendConfig): void {
        if (Object.keys(config).length === 0) {
            if (this.hasConfig()) {
                this.logger.error("driver won't update to an empty config");
            }
            return;
        }
        if (!this._shouldUpdateConfig(config)) {
            this.logger.warn("driver not updating config");
            return;
        }
        this._config = config;
        this._has_config = true;
        if (this._wants_startup) {
            this.logger.info("config updated, driver wants startup.");
            this.startup();
        }
    }

    protected hasConfig(): boolean {
        return this._has_config;
    }

    public get driverName(): string {
        return this._driver_name;
    }

    public isRunning(): boolean {
        return this._is_running;
    }

    public startup(): boolean {
        if (this.isRunning()) {
            this.logger.info("driver already running");
            return true;  // be idempotent, I guess...
        }
        if (!this._has_config && this._always_requires_config) {
            this.logger.info("config not available, marking wants startup");
            this._wants_startup = true;
            this._is_running = false;
            return false;
        }
        this.logger.info("starting up driver");
        const has_started: boolean = this._startup();
        if (!has_started) {
            this._is_running = false;
            this._wants_startup = false;
            return false;
        }
        this._is_running = true;
        this._wants_startup = false;
        return true;
    }

    public shutdown(): boolean {
        if (!this.isRunning()) {
            this.logger.info("driver not running");
            return true;  // be idempotent; we're not running anyway.
        }
        this.logger.info("shutting down driver");
        if (this._shutdown()) {
            this._is_running = false;
            this._wants_startup = false;
            return true;
        }
        return false;
    }

    public restart(): boolean {
        this.logger.info("restarting driver");
        if (!this.shutdown()) {
            return false;
        }
        if (!this.startup()) {
            return false;
        }
        return true;
    }

    public validConfig(config: BackendConfig): boolean {
        const res: boolean = this._shouldUpdateConfig(config);
        if (!res) {
            this.logger.info(`config not valid for driver ${this.driverName}`);
        } else {
            this.logger.info(`config valid for driver ${this.driverName}`);
        }
        return res;
    }

    protected abstract _startup(): boolean;
    protected abstract _shutdown(): boolean;
    protected abstract _shouldUpdateConfig(config: BackendConfig): boolean;
    protected abstract _updatedConfig(): void;
}
