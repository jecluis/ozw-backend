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
    Post
} from 'tsoa';
import { Logger } from 'tslog';
import { ZWaveDriver, OZWDriverStatus } from '../driver/ZWaveDriver';
import { ENOENT, ENODEV } from 'constants';
import { ConfigService } from '../driver/ConfigService';
import { SimpleReply } from './types';
import { NetworkService, NetworkStatus } from '../network/NetworkService';


const logger: Logger = new Logger({name: "api-network"});
const driver: ZWaveDriver = ZWaveDriver.getInstance();
const svc: NetworkService = NetworkService.getInstance();



export interface NetworkStatusItem {
    driver: OZWDriverStatus;
    network: NetworkStatus;
}


@Route("/api/network")
export class NetworkController extends Controller {

    constructor() { super(); }

    @Get('/status')
    public async getNetworkStatus(): Promise<NetworkStatusItem> {
        logger.debug("get network status");
        return {
            driver: driver.getStatus(),
            network: svc.getStatus()
        };
    }

    @Get('/devices')
    public async getAvailableDevices(): Promise<string[]> {
        logger.debug("get available devices");
        return driver.getAvailableDevices();
    }

    @Post('/start')
    public async startNetwork(): Promise<SimpleReply> {
        logger.debug("start network");
        svc.start();
        const err = driver.start();
        let errstr = "success";
        if (err < 0) {
            if (err === -ENOENT) {
                const cfg = ConfigService.getConfig();
                errstr = `no such device '${cfg.zwave.device}'`;
            } else if (err === -ENODEV) {
                errstr = "device not specified";
            } else {
                errstr = "unknown internal error";
            }
        }
        return {
            rc: err,
            str: errstr
        };
    }

    @Post('/stop')
    public async stopNetwork(): Promise<SimpleReply> {
        driver.stop();
        svc.stop();
        return {
            rc: 0,
            str: "stopping"
        };
    }

    @Get('/ready')
    public async getIsReady(): Promise<boolean> {
        return driver.isReady();
    }
}
