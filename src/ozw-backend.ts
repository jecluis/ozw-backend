/*
 * Copyright (C) 2020  Joao Eduardo Luis <joao@wipwd.dev>
 *
 * This file is part of wip:wd's openzwave backend (ozw-backend).
 * ozw-backend is free software: you can redistribute it and/or modify it under
 * the terms of the EUROPEAN UNION PUBLIC LICENSE v1.2, as published by the
 * European Comission.
 */

import { HTTPDriver } from "./driver/HTTPDriver";
import { sleep } from './utils';
import { ZWaveDriver } from './driver/ZWaveDriver';
import { Logger } from 'tslog';


let logger: Logger = new Logger({name: 'ozw-backend'});


let keep_looping: boolean = true;
process.on('SIGINT', () => {
	logger.info("sigint received, shutdown.");
	keep_looping = false;
});


async function main() {
	try {
		let http = HTTPDriver.getInstance();
		let zwave = ZWaveDriver.getInstance();
		logger.info("starting up...");
		http.startup();

		while (keep_looping) {
			await sleep(1000);
		}
		logger.info("shutting down...");
		zwave.stop();
		http.shutdown();
	} catch (e) {
		console.log("error: ", e);
	}
	process.exit(0);
}

main();