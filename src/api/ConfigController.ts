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
    Body
} from 'tsoa';

import { Logger } from 'tslog';
import { BackendConfig, ConfigService } from '../driver/ConfigService';


const logger: Logger = new Logger({name: "api-config"});
const svc: ConfigService = ConfigService.getInstance();

export interface APIConfigItem {
    config: BackendConfig;
}

@Route("/api/config")
export class ConfigController extends Controller {

    constructor() { super(); }

    @Get("")
    public async getConfig(): Promise<APIConfigItem> {
        const item: APIConfigItem = {
            config: svc.getConfigOneTime()
        };
        logger.debug("get config");
        return item;
    }

    @Post("")
    public async setConfig(
        @Body() value: APIConfigItem
    ): Promise<boolean> {
        logger.debug("setting config");
        // do not allow a completely empty config.
        if (Object.keys(value).length === 0 ||
            Object.keys(value.config).length === 0) {
            return false;
        }
        if (!svc.setConfig(value.config)) {
            return false;
        }
        return true;
    }
}
