/*
 * Copyright (C) 2020  Joao Eduardo Luis <joao@wipwd.dev>
 *
 * This file is part of wip:wd's openzwave backend (ozw-backend).
 * ozw-backend is free software: you can redistribute it and/or modify it under
 * the terms of the EUROPEAN UNION PUBLIC LICENSE v1.2, as published by the
 * European Comission.
 */

// these come somewhat directly from openzwave-shared, because tsoa complains
// otherwise. Unfortunate, but such is life.

export type ValueType =
			| "bool"
			| "byte"
			| "decimal"
			| "int"
			| "list"
			| "schedule"
			| "short"
			| "string"
			| "button"
			| "raw"
			| "max"
			| "bitset";
		export type ValueGenre = "basic" | "user" | "system" | "config" | "count";

export interface NetworkValueId {
	node_id: number;
	class_id: number;
	instance: number;
	index: number;
}

export interface Value<T = boolean | number | string> {
	value_id: string;
	node_id: number;
	class_id: number;
	type: ValueType;
	genre: ValueGenre;
	instance: number;
	index: number;
	label: string;
	units: string;
	help: string;
	read_only: boolean;
	write_only: boolean;
	min: number;
	max: number;
	is_polled: boolean;
	values?: string[];
	value: T;
}

export interface NetworkValue {
	id: NetworkValueId;
	value: Value;
	last_seen: Date;
}