/*
 * Copyright (C) 2020  Joao Eduardo Luis <joao@wipwd.dev>
 *
 * This file is part of wip:wd's openzwave backend (ozw-backend).
 * ozw-backend is free software: you can redistribute it and/or modify it under
 * the terms of the EUROPEAN UNION PUBLIC LICENSE v1.2, as published by the
 * European Comission.
 */

import * as promClient from 'prom-client';
import { Driver } from './Driver';

export class PrometheusDriver extends Driver {
    private static instance: PrometheusDriver;

    // private registry: promClient.Registry;
    private gauge_watt = new promClient.Gauge({
        name: "home_energy_consumption_W",
        help: "watt consumed", labelNames: ["node"]
    });
    private gauge_voltage = new promClient.Gauge({
        name: "home_voltage_V", help: "voltage", labelNames: ["node"]
    });
    private gauge_current = new promClient.Gauge({
        name: "home_current_A", help: "current used", labelNames: ["node"]
    });


    private constructor() {
        super("prometheus", false);
    }

    public static getInstance(): PrometheusDriver {
        if (!PrometheusDriver.instance) {
            PrometheusDriver.instance = new PrometheusDriver();
        }
        return PrometheusDriver.instance;
    }

    public static put(nodeid: number, unit: string, value: number): void {
        const inst = PrometheusDriver.getInstance();
        inst.put(nodeid, unit, value);
    }

    protected _startup(): boolean { return true; }
    protected _shutdown(): boolean { return true; }
    protected _shouldUpdateConfig(): boolean { return true; }
    protected _updatedConfig(): void { }

    public put(nodeid: number, unit: string, value: number): void {

        if (unit === "A") {
            this.gauge_current.labels(`node-${nodeid}`).set(value);
        } else if (unit === "W") {
            this.gauge_watt.labels(`node-${nodeid}`).set(value);
        } else if (unit === "V") {
            this.gauge_voltage.labels(`node-${nodeid}`).set(value);
        }
    }
}
