import initOsmoTrxModule from '@/osmo-bts-trx-websdr/osmo-bts-trx-websdr';
import type { OsmoTrxModule } from '@/osmo-bts-trx-websdr/osmo-bts-trx-websdr';
import { Allocator } from '@websdr/core/utils';
import { COMPLEX_INT16_SIZE } from '@websdr/core/common';
import { OSMO_TRX_PKT_SIZE, OSMO_TRX_PKT_BYTESIZE } from '@osmoweb/core/osmo';
import type { JournalLogItem } from '@websdr/core/utils';
import { getJournalLogLevelFromOsmoLogLevel } from '@osmoweb/core/osmo';

const OsmoDebug: boolean = false;

declare global {
    var osmo: Osmo | undefined;
}

export async function initOsmo(overrides?: Partial<OsmoTrxModule>) {
    if (globalThis.osmoTrxModule === undefined)
        globalThis.osmoTrxModule = await initOsmoTrxModule(overrides/* {'locateFile' : locateFile} */);
    if (globalThis.osmoTrxModule !== undefined) {
        globalThis.osmo = new Osmo({ module: globalThis.osmoTrxModule });
    }
}

export const OsmoBands = {
    'GSM850': { value: 'GSM850', caption: 'GSM850', channels: [] },
    'EGSM900': { value: 'EGSM900', caption: 'EGSM900', channels: [] },
    'DCS1800': { value: 'DCS1800', caption: 'DCS1800', channels: [] },
    'PCS1900': { value: 'PCS1900', caption: 'PCS1900', channels: [] },
};

export type OsmoBandsKeys = keyof typeof OsmoBands;

export enum IPAccessProto {
    IPAC_PROTO_RSL = 0x00,
    IPAC_PROTO_IPACCESS = 0xfe,
    IPAC_PROTO_SCCP = 0xfd,
    IPAC_PROTO_OML = 0xff,
    /* OpenBSC extensions */
    IPAC_PROTO_OSMO = 0xee,
    IPAC_PROTO_MGCP_OLD = 0xfc,
};

export class Osmo {
    static OSMO_TRK_CHUNK_SIZE = 2500;
    static OSMO_TRX_PKT_SIZE = 2 * Osmo.OSMO_TRK_CHUNK_SIZE;
    static OSMO_TRX_PKT_BYTESIZE = Osmo.OSMO_TRX_PKT_SIZE * COMPLEX_INT16_SIZE;

    static ENODATA = -116;

    protected _module?: OsmoTrxModule;
    private rx_buf_i16_allocator?: Allocator;
    private media_buf_allocator?: Allocator;
    private abis_buf_allocator?: Allocator;
    private service_buf_allocator?: Allocator;
    private rx_buf_i16?: Int16Array;
    private media_buf?: Uint8Array;
    private abis_buf?: Uint8Array;
    private service_buf?: Uint32Array;
    protected _started_scheduler_timer: boolean = false;
    protected _started_scheduler_timer_interval: bigint = 0n;
    protected _schedulerTimer: string | number | NodeJS.Timeout | undefined = undefined;
    onStart?: () => boolean;
    onStop?: () => boolean;
    onSetRxFrequency?: (frequency: number) => boolean;
    onSetTxFrequency?: (frequency: number) => boolean;
    onWriteLog?: (str: string) => void;
    onLog?: (log: JournalLogItem) => void;
    onWriteSamples?: (data: Int16Array, timestamp: bigint) => Promise<number>;
    onMediaData?: (buf: Uint8Array) => number;
    onAbisData?: (ts_nr: number, buf: Uint8Array) => number;
    onRslConnect?: (ts_nr: number) => number;

    constructor(parms: OsmoParams) {
        this.module = parms.module;
    }

    protected alloc() {
        if (this._module !== undefined) {
            this.rx_buf_i16_allocator = new Allocator(this._module);
            this.media_buf_allocator = new Allocator(this._module);
            this.abis_buf_allocator = new Allocator(this._module);
            this.service_buf_allocator = new Allocator(this._module);

            this.rx_buf_i16 = this.rx_buf_i16_allocator?.allocInt16Buffer(OSMO_TRX_PKT_SIZE * COMPLEX_INT16_SIZE);
            this.media_buf = this.media_buf_allocator?.allocUint8Buffer(2048);
            this.abis_buf = this.abis_buf_allocator?.allocUint8Buffer(2048);
            this.service_buf = this.service_buf_allocator?.allocUint32Buffer(32 * Uint32Array.BYTES_PER_ELEMENT);
            this.service_buf.fill(0);
        }
    }

    protected dealloc() {
        this.rx_buf_i16_allocator?.dealloc();
        this.media_buf_allocator?.dealloc();
        this.abis_buf_allocator?.dealloc();
        this.service_buf_allocator?.dealloc();
    }

    set module(module: OsmoTrxModule | undefined) {
        if (this._module !== module) {
            if (this._module !== undefined)
                this.dealloc();
            this._module = module;
            if (this._module !== undefined)
                this.alloc();
        }
    }

    get module(): OsmoTrxModule | undefined {
        return this._module;
    }

    get started_scheduler_timer() {
        return this._started_scheduler_timer;
    }

    get started_scheduler_timer_interval() {
        return this._started_scheduler_timer_interval;
    }

    async init(params = { cfg_file: 'osmo-bts-trx.cfg' }): Promise<boolean> {
        if (!this._module) return false;
        const cfg_file = params.cfg_file;
        if (globalThis.debug_mode || OsmoDebug) console.log('osmo-bts cfg file path:', cfg_file);
        const cfg_file_buf = this._module._malloc(cfg_file.length);
        this._module.stringToAscii(cfg_file, cfg_file_buf);
        return this._module.ccall('osmobts_init', 'number', ['number'],
            [cfg_file_buf], { async: false }
        );
    }

    applyBtsConfig(band: string, arfcn: number, ip_access_uid: string, osmux_port: number): number {
        if (!this._module) throw new Error(`applyBtsConfig(${band}, ${arfcn}, ${ip_access_uid}, ${osmux_port}): module is not initialized`);
        if (globalThis.debug_mode || OsmoDebug) console.log(`applyBtsConfig(${band}, ${arfcn}, ${ip_access_uid}, ${osmux_port})`);
        const band_buf = this._module._malloc(band.length + 1);
        const ip_access_uid_buf = this._module._malloc(ip_access_uid.length + 1);
        this._module.stringToAscii(band, band_buf);
        this._module.stringToAscii(ip_access_uid, ip_access_uid_buf);
        const ret = this._module.ccall('osmobts_apply', 'number', ['number', 'number', 'number', 'number'],
            [band_buf, arfcn, ip_access_uid_buf, osmux_port], { async: false });
        this._module._free(band_buf);
        this._module._free(ip_access_uid_buf);

        return ret;
    }

    async deinit(): Promise<void> {
        if (!this._module) return;
        this.dealloc();
    }

    async sendSchedulerTimer(overrun: number) {
        if (this._started_scheduler_timer) {
            this._module?.ccall('on_sched_timer', 'void', ['number'], [overrun], { async: true });
        }
    }

    startSchedulerTimer(interval: bigint) {
        this._started_scheduler_timer = true;
        this._started_scheduler_timer_interval = interval;
    }

    stopSchedulerTimer() {
        this._started_scheduler_timer = false;
    }

    async sendRxShortData(data: Int16Array, overrun: number, timestamp: bigint, skipsamples: number): Promise<number> {
        if (!this._module) throw new Error(`sendRxShortData(${data}, ${overrun}, 0x${timestamp.toString(16)}): module is not initialized`);
        if (!this.rx_buf_i16) throw new Error(`sendRxShortData(${data}, ${overrun}, 0x${timestamp.toString(16)}): rx_buf_i16 is not allocated`);
        this.rx_buf_i16.set(data);
        return await this._module.ccall('osmobts_push_rx_short_vector', 'number', ['number', 'number', 'number', 'bigint', 'number'],
            [this.rx_buf_i16.byteOffset, (data.length/*  - 4 */) >> 1, overrun, timestamp, skipsamples], { async: true }
        );
    }

    async getTxShortVector(params: { data: Int16Array, timestamp: bigint, skippackets: number }): Promise<number> {
        if (!this._module) throw new Error(`getTxShortVector(${params.data.byteOffset}, 0x${params.timestamp.toString(16)}, ${params.skippackets}): module is not initialized`);
        if (!this.service_buf) throw new Error(`getTxShortVector(${params.data.byteOffset}, 0x${params.timestamp.toString(16)}, ${params.skippackets}): service_buf is not allocated`);
        const res = this._module.ccall('osmobts_get_tx_short_vector', 'number', ['number', 'number', 'number'],
            [this.service_buf.byteOffset + 0, this.service_buf.byteOffset + 8, this.service_buf.byteOffset + 12], { async: false }
        );
        if (res < 0 && res !== Osmo.ENODATA) throw new Error(`getTxShortVector(${params.data.byteOffset}, 0x${params.timestamp.toString(16)}, ${params.skippackets}): osmobts_get_tx_short_vector returned error code ${res}`)
        if (res >= 0) {
            params.timestamp = (BigInt(this.service_buf[1]!) << BigInt(32)) + BigInt(this.service_buf[0]!);
            params.data = new Int16Array(this._module.HEAP16.buffer, this.service_buf[2], OSMO_TRX_PKT_BYTESIZE);
            params.skippackets = this.service_buf[3]!;
        }
        return res;
    }

    async sendMediaData(data: Uint8Array): Promise<number> {
        if (!this._module) throw new Error(`sendMediaData(${data}): module is not initialized`);
        if (!this.media_buf) throw new Error(`sendMediaData(${data}): media_buf is not allocated`);
        this.media_buf.set(data);
        return await this._module.ccall('ws_osmux_push_raw_data', 'number', ['number', 'number'],
            [this.media_buf.byteOffset, data.length], { async: false }
        );
    }

    async sendAbisData(ts_nr: number, data: Uint8Array): Promise<number> {
        if (!this._module) throw new Error(`sendAbisData(${data}): module is not initialized`);
        if (!this.abis_buf) throw new Error(`sendAbisData(${data}): abis_buf is not allocated`);
        if (globalThis.debug_mode || OsmoDebug) console.log('sendAbisData(', ts_nr, data, ')')
        this.abis_buf.set(data);
        return await this._module.ccall('ws_ipa_push_raw_data', 'number', ['number', 'number', 'number'],
            [ts_nr, this.abis_buf.byteOffset, data.length], { async: true }
        );
    }

    async getBtsStats(group: 'stats' | 'rate-counters' | 'bts' | 'trx' | 'transceiver' | 'websdr'): Promise<string> {
        if (!this._module) throw new Error(`getBtsStats(${group}): module is not initialized`);
        const group_len = group.length + 1;
        const group_buf = this._module._malloc(group_len);
        const res_buf_len = 65535;
        const res_buf = this._module._malloc(res_buf_len);
        this._module.stringToAscii(group, group_buf);
        const res = await this._module.ccall('osmobts_get_stats', 'number', ['number', 'number', 'number'],
            [group_buf, res_buf, res_buf_len], { async: true }
        );
        let ret: string = '';
        if (res > 0)
            ret = this._module.AsciiToString(res_buf);
        this._module._free(group_buf);
        this._module._free(res_buf);
        if (res < 0)
            throw new Error(`getBtsStats(${group}): osmobts_get_stats returned error code ${res}`)
        
        if (globalThis.debug_mode || OsmoDebug) console.log(`getBtsStats(${group})=${res}, ret=${ret}`)

        return ret;
    }

    async debug() {
        console.log(JSON.parse(await this.getBtsStats('stats')));
        console.log(JSON.parse(await this.getBtsStats('rate-counters')));
        console.log(JSON.parse(await this.getBtsStats('bts')));
        console.log(JSON.parse(await this.getBtsStats('trx')));
        console.log(JSON.parse(await this.getBtsStats('transceiver')));
        console.log(JSON.parse(await this.getBtsStats('websdr')));
    }
}

interface OsmoParams {
    module?: OsmoTrxModule,
}

export function on_start(): boolean {
    if (globalThis.debug_mode || OsmoDebug)
        console.log(`on_start()`)
    const osmo = globalThis.osmo;
    if (osmo && osmo.onStart) {
        return osmo.onStart();
    }
    return false;
}

export function on_stop(): boolean {
    if (globalThis.debug_mode || OsmoDebug)
        console.log(`on_stop()`)
    const osmo = globalThis.osmo;
    if (osmo && osmo.onStop) {
        return osmo.onStop();
    }
    return false;
}

export function on_set_rx_frequency(frequency: number): boolean {
    if (globalThis.debug_mode || OsmoDebug)
        console.log(`on_set_rx_frequency(${frequency})`)
    const osmo = globalThis.osmo;
    if (osmo && osmo.onSetRxFrequency) {
        return osmo.onSetRxFrequency(frequency);
    }
    return false;
}

export function on_set_tx_frequency(frequency: number): boolean {
    if (globalThis.debug_mode || OsmoDebug)
        console.log(`on_set_tx_frequency(${frequency})`)
    const osmo = globalThis.osmo;
    if (osmo && osmo.onSetTxFrequency) {
        return osmo.onSetTxFrequency(frequency);
    }
    return false;
}

export function on_write_samples(data: number, len: number, timestamp: bigint): number {
    let ret = len;
    if (globalThis.debug_mode || OsmoDebug)
        console.log(`on_write_samples(${data}, ${len}, 0x${timestamp.toString(16)})`)
    const osmo = globalThis.osmo;
    if (osmo && osmo.onWriteSamples && osmo.module) {
        const buf = new Int16Array(osmo.module.HEAP8.buffer, data >> 0, len << 1);
        osmo.onWriteSamples(buf, timestamp);
    }
    return ret;
}

export function ws_osmux_deliver_cb(data: number, len: number): number {
    let ret = 0;
    if (globalThis.debug_mode || OsmoDebug)
        console.log(`on_ws_osmux_deliver_cb(${data}, ${len})`)
    const osmo = globalThis.osmo;
    if (osmo && osmo.onMediaData && osmo.module) {
        const buf = new Uint8Array(osmo.module.HEAP8.buffer, data >> 0, len >> 0);
        ret = osmo.onMediaData(buf);
    }
    return ret;
}

export function ws_ipa_send(ts_nr: number, data: number, len: number): number {
    let ret = 0;
    if (globalThis.debug_mode || OsmoDebug)
        console.log(`on_ws_ipa_send_cb(${ts_nr}, ${data}, ${len})`)
    const osmo = globalThis.osmo;
    if (osmo && osmo.onAbisData && osmo.module) {
        const buf = new Uint8Array(osmo.module.HEAP8.buffer, data >> 0, len >> 0);
        ret = osmo.onAbisData(ts_nr, buf);
    }
    return ret;
}

export function write_log(str: number): void {
    const osmo = globalThis.osmo;
    if (osmo && osmo.module) {
        const s = osmo.module.AsciiToString(str);
        if (globalThis.debug_mode || OsmoDebug)
            console.log(`write_log(${s}:`);
        if (osmo && osmo.onWriteLog)
            osmo.onWriteLog(s);
    }
}

export function on_log(subsys: number, level: number, msg: number): void {
    const osmo = globalThis.osmo;
    if (osmo && osmo.module) {
        const subsysStr = osmo.module.AsciiToString(subsys);
        const msgStr = osmo.module.AsciiToString(msg);
        /* Print log messages with level ERROR or higher to console for trace ability */
        if (globalThis.debug_mode || OsmoDebug) {
            if (level >= 7 /*Error*/) console.error(`on_log(${subsysStr}, ${level}, ${msgStr})`);
            else if (level >= 5 /*Notice*/) console.warn(`on_log(${subsysStr}, ${level}, ${msgStr})`);
            // else if (level >= 3 /*Info*/) console.info(`on_log(${subsysStr}, ${level}, ${msgStr})`);
            // else console.log(`on_log(${subsysStr}, ${level}, ${msgStr})`);
        } else {
            if (level >= 7 /*Error*/) console.error(`on_log(${subsysStr}, ${level}, ${msgStr})`);
        }
        if (osmo && osmo.onLog) {
            osmo.onLog({ timestamp: Date.now(), subSystem: subsysStr, logLevel: getJournalLogLevelFromOsmoLogLevel(level), message: msgStr });
        }
    }
}

export function start_timer_interval(interval: bigint): void {
    const osmo = globalThis.osmo;
    if (globalThis.debug_mode || OsmoDebug)
        console.log(`start_timer_interval(${interval})`);
    if (osmo) {
        osmo.startSchedulerTimer(interval);
    }
}

export function ws_rsl_connect_cb(ts_nr: number): number {
    const osmo = globalThis.osmo;
    if (globalThis.debug_mode || OsmoDebug)
        console.log(`on_ws_rsl_connect_cb(${ts_nr})`);
    if (osmo && osmo.onRslConnect) {
        return osmo.onRslConnect(ts_nr);
    }
    return -1;
}
