/*
 * Copyright (C) 2020  Joao Eduardo Luis <joao@wipwd.dev>
 *
 * This file is part of wip:wd's openzwave backend (ozw-backend).
 * ozw-backend is free software: you can redistribute it and/or modify it under
 * the terms of the EUROPEAN UNION PUBLIC LICENSE v1.2, as published by the
 * European Comission.
 */

import { RegisterRoutes } from '../tsoa/routes';
import swaggerUi from 'swagger-ui-express';
import express, {
	Response as ExResponse, Request as ExRequest
} from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import fs from 'fs';
import { Logger } from 'tslog';
import { Server } from 'http';
import { ConfigService, BackendConfig } from './ConfigService';


let logger: Logger = new Logger({name: 'http-driver'});
let config: BackendConfig = ConfigService.getConfig();


export class HTTPDriver {

	private static instance: HTTPDriver;
	private constructor() {
		this.httpApp.use(cors());
		this.httpApp.use(bodyParser.urlencoded({extended: true}));
		this.httpApp.use(bodyParser.json());
		this.httpApp.use("/docs", swaggerUi.serve,
			async (_req: ExRequest, res: ExResponse) => {
				let swaggerstr = fs.readFileSync("src/tsoa/swagger.json");
				return res.send(
					swaggerUi.generateHTML(JSON.parse(swaggerstr.toString()))
				);
		});
		RegisterRoutes(this.httpApp);
	}

	public static getInstance(): HTTPDriver {
		if (!HTTPDriver.instance) {
			HTTPDriver.instance = new HTTPDriver();
		}
		return HTTPDriver.instance;
	}

	private httpApp = express();
	private httpServer?: Server = undefined;

	startup() {
		logger.info("starting http server");
		let host = config.http.host;
		let port = config.http.port;
		this.httpServer = this.httpApp.listen(port, host);
	}

	shutdown() {
		logger.info("shutting down http server");
		this.httpServer?.close(() => {
			logger.info("closed http server");
		});
	}
}