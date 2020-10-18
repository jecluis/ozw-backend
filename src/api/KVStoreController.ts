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
    Path,
    Res,
    TsoaResponse,
    Body,
    Put,
    Delete
} from 'tsoa';
import { Logger } from 'tslog';
import { KVStore } from '../kvstore/KVStore';

const logger: Logger = new Logger({name: "api-kvstore"});

interface APIKVStoreReply {
    key: string;
    value: any;
    result: boolean;
}

interface APIKVStoreRequest {
    value: string;
}

@Route("/api/kvstore")
export class KVStoreController extends Controller {

    constructor() { super(); }

    @Get("/get/{_key}")
    public async get(
        @Path() _key: string
    ): Promise<APIKVStoreReply> {
        const kvstore: KVStore = KVStore.open();
        if (!kvstore.exists(_key)) {
            return {
                key: _key,
                value: false,
                result: false
            };
        }
        const _value: any = kvstore.get(_key);
        return {
            key: _key,
            value: _value,
            result: true
        };
    }

    @Put("/put/{_key}")
    public async put(
        @Path() _key: string,
        @Body() _value: APIKVStoreRequest
    ): Promise<APIKVStoreReply> {
        const kvstore: KVStore = KVStore.open();
        logger.info(`put > key: ${_key}, value: ${_value.value}`);
        kvstore.put(_key, _value.value);
        return {
            key: _key,
            value: false,
            result: true
        };
    }

    @Get("/exists/{_key}")
    public async exists(
        @Path() _key: string
    ): Promise<APIKVStoreReply> {
        const kvstore: KVStore = KVStore.open();
        return {
            key: _key,
            value: false,
            result: kvstore.exists(_key)
        };
    }

    @Delete("/remove/{_key}")
    public async remove(
        @Path() _key: string
    ): Promise<APIKVStoreReply> {
        const kvstore: KVStore = KVStore.open();
        kvstore.remove(_key);
        return {
            key: _key,
            value: false,
            result: true
        };
    }
}
