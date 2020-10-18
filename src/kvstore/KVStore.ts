import fs from 'fs';
import { Logger } from 'tslog';

const logger: Logger = new Logger({name: 'kvstore'});

export class KVStore {
    private static instance: KVStore;

    constructor(private _path: string) {
        if (!fs.existsSync(_path)) {
            fs.mkdirSync(_path, {recursive: true});
        }
    }

    public static open(path?: string): KVStore {
        if (KVStore.instance) {
            return KVStore.instance;
        }
        if (!path) {
            throw Error("must specify path on first open");
        }
        KVStore.instance = new KVStore(path);
        return KVStore.instance;
    }

    private _validKey(k: string): boolean {
        const valid: RegExp = new RegExp("^[a-zA-Z0-9]+[\\w.-]*$");
        return valid.test(k);
    }

    public put(key: string, value: string): void {
        if (!this._validKey(key)) {
            throw Error("invalid key");
        }
        // const actual_value: string = JSON.stringify(value);
        const actual_value: string = value;
        const path: string = `${this._path}/${key}.json`;
        fs.writeFileSync(path, actual_value, {encoding: "utf-8"});
    }

    public get(key: string): string|undefined {
        if (!this._validKey(key)) {
            throw Error("invalid key");
        }
        const path: string = `${this._path}/${key}.json`;
        if (!fs.existsSync(path)) {
            return undefined;
        }
        const buffer: Buffer = fs.readFileSync(path);
        return buffer.toString("utf-8");
    }

    public exists(key: string): boolean {
        if (!this._validKey(key)) {
            throw Error("invalid key");
        }
        const path: string = `${this._path}/${key}.json`;
        return fs.existsSync(path);
    }

    public remove(key: string): void {
        if (!this._validKey(key)) {
            throw Error("invalid key");
        }
        const path: string = `${this._path}/${key}.json`;
        if (!fs.existsSync(path)) {
            return;
        }
        fs.unlinkSync(path);
    }
}
