/*
 * Copyright (C) 2020  Joao Eduardo Luis <joao@wipwd.dev>
 *
 * This file is part of wip:wd's openzwave backend (ozw-backend).
 * ozw-backend is free software: you can redistribute it and/or modify it under
 * the terms of the EUROPEAN UNION PUBLIC LICENSE v1.2, as published by the
 * European Comission.
 */
import fs from 'fs';
import { BehaviorSubject } from 'rxjs';
import { Logger } from 'tslog';

export interface BackendConfig {
    http: {
        host: string;
        port: number;
    };
    zwave: ZWaveConfig;
    prometheus: {
        url: string;
    };
}

export interface ZWaveConfig {
    device: string;
}


export abstract class ConfigValidator {
    public abstract validConfig(config: BackendConfig): boolean;
}

const logger: Logger = new Logger({name: "config-svc"});

export class ConfigService {

    private static instance: ConfigService;
    private _default_config: BackendConfig = {
        http: {
            host: "0.0.0.0",
            port: 31337
        },
        zwave: {
            device: ""
        },
        prometheus: {
            url: ""
        }
    };
    private _config = {} as BackendConfig;
    private _validators: ConfigValidator[] = [];

    _config_update: BehaviorSubject<BackendConfig>;

    private constructor() {
        this._load();
        this._config_update = new BehaviorSubject(this._config);
    }

    public static getInstance(): ConfigService {
        if (!ConfigService.instance) {
            ConfigService.instance = new ConfigService();
        }
        return ConfigService.instance;
    }

    public static getConfig(): BehaviorSubject<BackendConfig> {
        return ConfigService.getInstance().getConfig();
    }

    public static getConfigOneTime(): BackendConfig {
        return ConfigService.getInstance().getConfigOneTime();
    }

    public static registerValidator(validator: ConfigValidator): void {
        return ConfigService.getInstance().registerValidator(validator);
    }

    private _updateAll(): void {
        this._config_update.next(this._config);
    }

    private _load(): void {
        let config: BackendConfig = this._default_config;
        if (fs.existsSync('./ozwconfig.json')) {
            const rawconf = fs.readFileSync('./ozwconfig.json');
            config = JSON.parse(rawconf.toString("utf-8"));
            if (Object.keys(config).length === 0) {
                config = this._default_config;
            }
        }
        this._config = config;
    }

    private _store(): void {
        const rawconf = JSON.stringify(this._config);
        fs.writeFileSync('./ozwconfig.json', rawconf);
    }

    public load(): void {
        this._load();
        this._updateAll();
    }


    public store(): void {
        this._store();
        this._updateAll();
    }

    public registerValidator(validator: ConfigValidator): void {
        this._validators.push(validator);
    }

    public setConfig(config: BackendConfig): boolean {
        let valid: boolean = true;
        if (this._validators.length === 0) {
            logger.info("no validators, refuse setting config.");
            return false;
        }
        this._validators.forEach( (validator: ConfigValidator) => {
            if (!validator.validConfig(config)) {
                logger.info("invalid config, don't set.");
                valid = false;
            }
        });
        if (!valid) {
            return false;
        }
        logger.info("set config");
        this._config = config;
        this.store();
        return true;
    }

    public getConfig(): BehaviorSubject<BackendConfig> {
        return this._config_update;
    }

    public getConfigOneTime(): BackendConfig {
        return this._config;
    }
}
