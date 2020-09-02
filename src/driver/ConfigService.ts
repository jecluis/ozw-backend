/*
 * Copyright (C) 2020  Joao Eduardo Luis <joao@wipwd.dev>
 *
 * This file is part of wip:wd's openzwave backend (ozw-backend).
 * ozw-backend is free software: you can redistribute it and/or modify it under
 * the terms of the EUROPEAN UNION PUBLIC LICENSE v1.2, as published by the
 * European Comission.
 */

export interface BackendConfig {
	http: {
		host: string;
		port: number;
	};
	zwave: ZWaveConfig;
}

export interface ZWaveConfig {
	device: string;
}


export class ConfigService {

	private static instance: ConfigService;
	private constructor() { }
	public static getInstance(): ConfigService {
		if (!ConfigService.instance) {
			ConfigService.instance = new ConfigService();
		}
		return ConfigService.instance;
	}

	private _config: BackendConfig = {
		http: {
			host: "0.0.0.0",
			port: 31337
		},
		zwave: {
			device: ""
		}
	};

	public getConfig(): BackendConfig {
		return this._config;
	}

	public static getConfig(): BackendConfig {
		return ConfigService.getInstance().getConfig();
	}
}