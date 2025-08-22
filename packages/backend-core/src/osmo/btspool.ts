import type WebSocket from 'ws';
import fs from 'fs';
import type { BtsConfig } from '@/osmo/lib/protocol.types'

export interface BtsItem {
    cfg: BtsConfig,
    client: WebSocket | undefined,
    locked: boolean,
}

export class BtsPool {
    protected _btses = new Array<BtsItem>();

    constructor() {
        const rawdata = fs.readFileSync('bts-config.json');
        const bts_config = JSON.parse(rawdata.toString());
        this._btses = [];
        bts_config.bts.forEach((bc: BtsConfig) => {
            this._btses.push({ locked: false, client: undefined, cfg: bc })
        })
    }

    get btses() {
        return this._btses;
    }

    getBtsItem(id: number): BtsItem | undefined {
        if (id < 0 || id > this._btses.length) return undefined;
        return this._btses[id];
    }

    lockBts(id: number, client: WebSocket): number {
        let ret = -1;
        if (id < 0 || id > this._btses.length || this._btses[id] === undefined) ret = -1;
        else if (this._btses[id].locked) ret = -2;
        else {
            this.unlockBtsByClient(client);
            this._btses[id].locked = true;
            this._btses[id].client = client;
            ret = id;
        }
        return ret;
    }

    unlockBts(id: number, client: WebSocket): number {
        let ret = -1;
        if (id < 0 || id > this._btses.length || this._btses[id] === undefined) ret = -1;
        else if (!this._btses[id].locked) ret = -2;
        else if (this._btses[id].client !== client) ret = -3;
        else {
            this._btses[id].locked = false;
            this._btses[id].client = undefined;
            ret = id;
        }
        return ret;
    }

    unlockBtsByClient(client: WebSocket) {
        for (let i = 0; i < this._btses.length; ++i) {
            if (this._btses[i] !== undefined && this._btses[i]!.client === client) {
                this._btses[i]!.locked = false;
                this._btses[i]!.client = undefined;
                break;
            }
        }
    }
}

let btsPool: BtsPool | undefined = undefined;

export function getBtsPoolInstance(): BtsPool {
    if (btsPool === undefined) {
        btsPool = new BtsPool();
    }
    return btsPool;
}
