import { downloadFile } from '@websdr/frontend-core/utils';
import type { OsmoTrxWorkerParams, OsmoWSUrls } from '@/osmo/osmoTrxWorker';
import { StreamMeter } from '@websdr/frontend-core/telemetry';
import { PromiseHelper } from '@websdr/core/utils';
import type { JournalLogItem } from '@websdr/core/utils';

export type BtsStatsGroup = 'stats' | 'rate-counters' | 'bts' | 'trx' | 'transceiver' | 'websdr';

let osmoTrxManager: OsmoTrxManager | undefined = undefined;

export function getOsmoTrxManagerInstance(params: Partial<OsmoTrxManagerParams> = OsmoTrxManagerInitialParams): OsmoTrxManager {
    if (osmoTrxManager === undefined) {
        osmoTrxManager = new OsmoTrxManagerWorker(params);
    }
    if (osmoTrxManager === undefined) throw new Error("osmoTrxManager can't be undefined")
    return osmoTrxManager;
}

export abstract class OsmoTrxManager {
    protected _streamMeterData: StreamMeter | undefined = undefined;
    onWriteLog: (msg: string) => void = (msg: string) => { };
    onLog: (log: JournalLogItem) => void = (log: JournalLogItem) => { };
    onChangeParameter: (param: string, value: any) => void = (param: string, value: any) => { };

    abstract open_bts(bts: number, band: string, arfcn: number, ip_access_uid: string, osmux_port: number): Promise<number>;
    abstract open_usb(vendorId?: number, productId?: number): Promise<number>;
    abstract open_ws(urls: Partial<OsmoWSUrls>): Promise<boolean>;
    abstract close(): Promise<void>;
    abstract getBtsStats(group: BtsStatsGroup): Promise<string>;
    abstract setParameter(param: string, value: any): Promise<void>;
    abstract sendCommand(cmd: string): Promise<Record<string, any>>;
    abstract startWorker(params: Partial<OsmoTrxWorkerParams>): Promise<void>;
    abstract stopWorker(): Promise<void>;
    abstract start(): Promise<void>;
    abstract stop(): Promise<void>;
}

export class OsmoTrxManagerWorker extends OsmoTrxManager {
    protected _worker?: Worker;
    protected _promiseHelper: PromiseHelper = new PromiseHelper();
    protected _onWorkerMessage: (...args: any[]) => void;
    protected _onWorkerError: (...args: any[]) => void;

    constructor(params: Partial<OsmoTrxManagerParams> = OsmoTrxManagerInitialParams) {
        super();
        this._onWorkerMessage = this.onWorkerMessage.bind(this);
        this._onWorkerError = this.onWorkerError.bind(this);
        this._streamMeterData = params.streamMeterData ?? OsmoTrxManagerInitialParams.streamMeterData;
    }

    async open_bts(bts: number, band: string, arfcn: number, ip_access_uid: string, osmux_port: number): Promise<number> {
        if (!this._worker) {
            await this.startWorker();
            if (!this._worker) throw new Error('OsmoTrxManager: error creating worker');
        }
        const [id, ret] = this._promiseHelper.createPromise<number>();
        this._worker.postMessage({ type: 'OPEN_BTS', id: id, bts: bts, band: band, arfcn: arfcn, ip_access_uid: ip_access_uid, osmux_port: osmux_port });
        return ret;
    }


    async open_usb(vendorId?: number, productId?: number): Promise<number> {
        if (vendorId === undefined || productId === undefined) return -1;
        if (!this._worker) {
            await this.startWorker();
            if (!this._worker) throw new Error('OsmoTrxManager: error creating worker');
        }
        const [id, ret] = this._promiseHelper.createPromise<number>();
        this._worker.postMessage({ type: 'OPEN_USB', id: id, vendorId: vendorId, productId: productId });
        return ret;
    }

    async open_ws(urls: Partial<OsmoWSUrls>): Promise<boolean> {
        if (urls === undefined) return false;
        if (!this._worker) {
            await this.startWorker();
            if (!this._worker) throw new Error('OsmoTrxManager: error creating worker');
        }
        const [id, ret] = this._promiseHelper.createPromise<boolean>();
        this._worker.postMessage({ type: 'OPEN_WS', id: id, urls: JSON.stringify(urls) });
        return ret;
    }

    async close_usb(): Promise<void> {
        if (!this._worker) return;
        const [id, ret] = this._promiseHelper.createPromise<void>();
        this._worker.postMessage({ type: 'CLOSE_USB', id: id });
        return ret;
    }

    async close_ws(): Promise<void> {
        if (!this._worker) return;
        const [id, ret] = this._promiseHelper.createPromise<void>();
        this._worker.postMessage({ type: 'CLOSE_WS', id: id });
        return ret;
    }

    async close(): Promise<void> {
        if (!this._worker) return;
        const [id, ret] = this._promiseHelper.createPromise<void>();
        this._worker.postMessage({ type: 'CLOSE', id: id });
        return ret;
    }

    async getBtsStats(group: BtsStatsGroup): Promise<string> {
        if (!this._worker) throw new Error('OsmoTrxManager: worker is not running');
        const [id, ret] = this._promiseHelper.createPromise<string>();
        this._worker.postMessage({ type: 'GET_BTS_STATS', id: id, group });
        return ret;
    }

    async setParameter(param: string, value: any): Promise<void> {
        if (!this._worker) throw new Error('OsmoTrxManager: worker is not running');
        const [id, ret] = this._promiseHelper.createPromise<void>()
        this._worker.postMessage({ type: 'SET_PARAMETER', id: id, param: param, value: JSON.stringify(value) });
        return ret;
    }

    async sendCommand(cmd: string): Promise<Record<string, any>> {
        if (!this._worker) throw new Error('OsmoTrxManager: worker is not running');
        const [id, ret] = this._promiseHelper.createPromise<Record<string, any>>()
        this._worker.postMessage({ type: 'SEND_COMMAND', id: id, cmd: cmd });
        return ret;
    }

    async start(params: Partial<OsmoTrxWorkerParams> = {}): Promise<void> {
        if (!this._worker) throw new Error('OsmoTrxManager: worker is not running');
        const [id, ret] = this._promiseHelper.createPromise<void>()
        this._worker.postMessage({ type: 'START', id: id, config: JSON.stringify(params) });
        return ret;
    }

    async stop(): Promise<void> {
        if (!this._worker) throw new Error('OsmoTrxManager: worker is not running');
        const [id, ret] = this._promiseHelper.createPromise<void>()
        this._worker.postMessage({ type: 'STOP', id: id });
        return ret;
    }

    async startWorker(params: Partial<OsmoTrxWorkerParams> = {}): Promise<void> {
        this._worker = new Worker(new URL('./osmoTrx.worker.js', import.meta.url), { type: 'module' });
        this._worker.addEventListener('message', this._onWorkerMessage);
        this._worker.addEventListener('error', this._onWorkerError);
        return this.start(params);
    }

    async stopWorker(): Promise<void> {
        if (this._worker !== undefined) {
            const [id, ret] = this._promiseHelper.createPromise<void>()
            this._worker.postMessage({ type: 'STOP', id: id });
            this._worker.terminate();
            return ret;
        }
    }

    protected onWorkerMessage(event: Event) {
        const msg = (event as MessageEvent).data;
        if (globalThis.debug_mode) console.log('Message from OsmoTrxWorker', msg)
        let promise = undefined;
        if (typeof msg.id === 'number') promise = this._promiseHelper.getPromise(msg.id);
        switch (msg.type) {
            case 'WRITE_LOG':
                this.onWriteLog(msg.msg);
                break;
            case 'LOG':
                this.onLog(msg.log);
                break;
            case 'WRITE':
                downloadFile(msg.buffer, 'write2usb.bin');
                break;
            case 'METER_DATA':
                if (this._streamMeterData !== undefined) {
                    const meter = JSON.parse(msg.value);
                    if (meter._state !== undefined) {
                        this._streamMeterData.update(meter._state);
                    } else {
                        delete meter['config'];
                        Object.assign(this._streamMeterData, meter);
                        this._streamMeterData.flush();
                    }
                }
                break;
            case 'PARAM_CHANGED':
                this.onChangeParameter(msg.param, msg.value);
                break;
            case 'START':
            case 'STOP':
                this.onChangeParameter('worker_started', msg.type === 'START' ? true : false);
                break;
            case 'OPEN_USB':
            case 'OPEN_BTS':
            case 'OPEN_WS':
            case 'CLOSE':
            case 'CLOSE_USB':
            case 'CLOSE_WS':
            case 'GET_BTS_STATS':
            case 'SEND_COMMAND':
            case 'SET_PARAMETER':
                if (promise) {
                    if (msg.res === 'ok') {
                        this._promiseHelper.promiseResolve(promise, msg.ret);
                    } else {
                        this._promiseHelper.promiseReject(promise, msg.err);
                    }
                }
                break;
            default:
                console.error('OsmoTrxManager: Unknown message', msg, 'was received')
        }
        if (promise !== undefined) this._promiseHelper.deletePromise(msg.id);
    }

    protected onWorkerError(evt: Event) {
        const event: ErrorEvent = evt as ErrorEvent
        console.error('OsmoTrx: Worker error: ', event)
    }

}

export interface OsmoTrxManagerParams {
    streamMeterData?: StreamMeter;
}

export const OsmoTrxManagerInitialParams: OsmoTrxManagerParams = {
    streamMeterData: undefined,
}
