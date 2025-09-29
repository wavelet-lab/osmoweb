import { OsmoUdpClient } from "./osmoudp.client"

interface PortBind {
    port: number,
    client: OsmoUdpClient | undefined,
}

export class PortPool {
    protected _portsPool: Array<PortBind>;
    protected _lastIdx: number = -1;

    constructor(start_port: number = 6000, cnt: number = 10) {
        if (cnt <= 0) {
            throw new Error("PortPool: count of ports must be greater than 0");
        }
        this._portsPool = new Array<PortBind>(cnt);
        for (let i = 0; i < cnt; ++i) {
            this._portsPool[i] = { port: start_port + i, client: undefined };
        }
    }

    reservePort(client: OsmoUdpClient): number {
        let port = -1;
        let i = (this._lastIdx + 1) % this._portsPool.length;
        let tryCnt = this._portsPool.length;
        while (--tryCnt >= 0) {
            if (this._portsPool[i] !== undefined && this._portsPool[i]!.client === undefined) {
                this._portsPool[i]!.client = client;
                port = this._portsPool[i]!.port;
                this._lastIdx = i;
                break;
            }
            ++i;
        }
        return port;
    }

    freePort(port: number, client: OsmoUdpClient) {
        if (port < 0 || port > this._portsPool.length) {
            throw new Error(`PortPool: port ${port} is out of range`);
        }
        const i = port - this._portsPool[0]!.port;
        if (i >= 0 && i < this._portsPool.length && this._portsPool[i]!.client === client) {
            this._portsPool[i]!.client = undefined;
        }
    }
}

let portPool: PortPool | undefined = undefined;

export function getPortPoolInstance(): PortPool {
    if (portPool === undefined) {
        portPool = new PortPool();
    }
    return portPool;
}
