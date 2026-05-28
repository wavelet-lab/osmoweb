import { IPAccessProto, Osmo } from '@/osmo/osmo'
import { NngWebSocket, Protocol } from '@websdr/frontend-core/transport';
import { assert } from '@websdr/frontend-core/common';
import { WebUsbSourceSink } from '@websdr/frontend-core/webusb';
import type { WebUsbSourceSinkParams } from '@websdr/frontend-core/webusb';
import { StreamMeter } from '@websdr/frontend-core/telemetry';
import { COMPLEX_INT16_SIZE } from '@websdr/core/common'
import { OSMO_TRK_CHUNK_SIZE, OSMO_TRX_PKT_SIZE } from '@osmoweb/core/osmo';
import { CircularBuffer } from '@websdr/core/utils';
import type { JournalLogItem } from '@websdr/core/utils';
import { DataType } from '@websdr/core/common';
import { endpointToOsmoWsUrl } from './osmoWsUrl';
import { WebUsbManagerMode } from '@websdr/frontend-core/webusb';

const OsmoWorkerDebug: boolean = false;

enum WSTypes {
    CONTROL = 'control',
    ABIS_OML = 'abis_oml',
    ABIS_RSL = 'abis_rsl',
    ABIS = 'abis',
    MEDIA = 'media',
}
type WSTypesKeys = keyof typeof WSTypes;

interface OsmoWSTemplate<T> {
    control: T,
    abis_rsl: T,
    abis_oml: T,
    abis: T,
    media: T,
}
type OsmoWSKey = keyof OsmoWSTemplate<any>

type OsmoWS = OsmoWSTemplate<NngWebSocket>;
export type OsmoWSUrls = OsmoWSTemplate<string>;
type OsmoWSHandlers = OsmoWSTemplate<(event: Event) => any>;

function assertSharedArrayBuffer(buffer: ArrayBufferLike, context: string): asserts buffer is SharedArrayBuffer {
    if (typeof SharedArrayBuffer === 'undefined' || !(buffer instanceof SharedArrayBuffer)) {
        throw new TypeError(`${context}: expected SharedArrayBuffer`);
    }
}

class NetCache {
    protected _buffer: ArrayBuffer;
    protected _bufferView: Uint8Array<ArrayBuffer>;
    protected _bufferPos: number = 0;

    constructor(bufferLen = 1 * 1024 * 1024) {
        this._buffer = new ArrayBuffer(bufferLen);
        this._bufferView = new Uint8Array(this._buffer);
        this.clear();
    }

    get buffer(): Uint8Array<ArrayBuffer> {
        return this._bufferView.subarray(0, this._bufferPos);
    }

    push(data: Uint8Array<ArrayBufferLike>) {
        this._bufferView.set(data, this._bufferPos);
        this._bufferPos += data.byteLength;
    }

    clear() {
        this._bufferPos = 0;
    }
}

export class OsmoTrxWorker {
    static oneSendBufferSizeWOHeader = OSMO_TRK_CHUNK_SIZE * COMPLEX_INT16_SIZE;
    static oneSendBufferSize = OsmoTrxWorker.oneSendBufferSizeWOHeader/*  + ControlWebUsb.HEADER_SIZE */;
    static sendBufferSize = 2 * OsmoTrxWorker.oneSendBufferSize;
    protected _sendBuffer: ArrayBuffer | null = null;
    protected _sendBufferOffset = 0;
    protected startWrite = false;
    protected writeBufferOffset = 0;
    protected _lastTimestamp: bigint = BigInt(0);
    protected _wr_ahead_avg: number = 0;
    protected _readDumpCnt = 0;

    streamMeterDataHandler: ProxyHandler<StreamMeter> = {
        set(obj: StreamMeter, prop: keyof typeof StreamMeter, newValue: any, receiver: any): boolean {
            if (obj && prop in obj) {
                if (prop as keyof StreamMeter !== 'lastSend') {
                    const cur = Date.now();
                    if (cur > obj.lastSend + 200) {
                        postMessage({ type: 'METER_DATA', value: JSON.stringify(obj) });
                        obj.lastSend = cur;
                    }
                }
                obj[prop] = newValue;
                return true;
            }
            return false;
        },
    };

    protected _osmo?: Osmo;
    protected _worker?: Worker;
    protected _streamMeterData = new StreamMeter();
    protected _streamMeterDataProxy = new Proxy(this._streamMeterData, this.streamMeterDataHandler);
    protected _webUsbSourceSink: WebUsbSourceSink;
    protected _wses: Partial<OsmoWS> = {};
    protected _onWSOpen: EventListenerOrEventListenerObject;
    protected _onWSClose: EventListenerOrEventListenerObject;
    protected _onWSESOpen: OsmoWSHandlers;
    protected _onWSESMessage: OsmoWSHandlers;
    protected _onReceiveData: (buf: SharedArrayBuffer, overrun: number, timestamp: bigint) => void
    protected command_proceed: boolean = false;
    protected start_promise?: (val: boolean) => void;
    protected _rsl_buffer = new CircularBuffer<Uint8Array>(100);
    protected _abisOmlBuffer = new NetCache(1 * 1024 * 1024);
    protected _abisRslBuffer = new NetCache(1 * 1024 * 1024);
    protected _rsl_connected = false;
    protected _mediaSendPool: Uint8Array<ArrayBuffer> | null = null;
    protected _fd: number = -1;
    protected _vendorId?: number;
    protected _productId?: number;
    protected _bts?: number;
    protected inpkt: number = 0;
    protected outpkt: number = 0;
    protected _tm_cnt: number = 0;
    protected _tm_frames: number = 0;
    command_starting: boolean = false;
    urls: Partial<OsmoWSUrls>;

    constructor(params = OsmoTrxWorkerInitialParams) {
        this._worker = params.worker;
        this._osmo = globalThis.osmo;
        assert(this._osmo !== undefined);
        this._osmo.onWriteLog = this.onWriteLog.bind(this);
        this._osmo.onLog = this.onLog.bind(this);
        this._osmo.onStart = this.onStart.bind(this);
        this._osmo.onStop = this.onStop.bind(this);
        this._osmo.onSetRxFrequency = this.onSetRxFrequency.bind(this);
        this._osmo.onSetTxFrequency = this.onSetTxFrequency.bind(this);
        this._osmo.onMediaData = this.onMediaData.bind(this);
        this._osmo.onAbisData = this.onAbisData.bind(this);
        this._osmo.onWriteSamples = this.onWriteSamples.bind(this);
        this._osmo.onRslConnect = this.onRslConnect.bind(this);
        this._osmo.init();
        this.urls = params.urls !== undefined ? params.urls : OsmoTrxWorkerInitialParams.urls!;
        this._vendorId = params.vendorId;
        this._productId = params.productId;
        this._bts = params.bts;
        // this._streamMeterDataProxy.visible = true;

        this._onWSOpen = this.onWSOpen.bind(this);
        this._onWSClose = this.onWSClose.bind(this);
        //The order of handlers is important here
        this._onWSESOpen = {
            control: this.onWSOpen.bind(this),
            abis_rsl: this.onWSOpen.bind(this),
            abis_oml: this.onWSOpen.bind(this),
            abis: this.onWSOpen.bind(this),
            media: this.onWSMediaOpen.bind(this),
        };
        this._onWSESMessage = {
            control: this.onWSControlMessage.bind(this),
            abis_rsl: this.onWSAbisRslMessage.bind(this),
            abis_oml: this.onWSAbisOmlMessage.bind(this),
            abis: this.onWSAbisMessage.bind(this),
            media: this.onWSMediaMessage.bind(this),
        };
        this._onReceiveData = this.onReceiveData.bind(this);

        const usbParams: WebUsbSourceSinkParams = {};
        usbParams.type = DataType.ci16;
        usbParams.mode = WebUsbManagerMode.SINGLE;
        usbParams.rate = 1_083_333;
        usbParams.packet_size = OSMO_TRX_PKT_SIZE;
        usbParams.throttleon = 0;
        usbParams.rx = {
            frequency: 908_400_000,
            bandwidth: 500_000,
            gain: 2,
        };
        usbParams.tx = {
            frequency: 953_400_000,
            bandwidth: 500_000,
            gain: 0,
        };
        usbParams.streamMeterData = this._streamMeterDataProxy;
        usbParams.onData = this._onReceiveData;

        this._webUsbSourceSink = new WebUsbSourceSink(usbParams);
    }

    get fd() {
        return this._fd;
    }

    async openWs(ws2open: Array<WSTypes> = []): Promise<boolean> {
        let ret: boolean = true;
        if (globalThis.debug_mode || OsmoWorkerDebug) console.log('openWS(', ws2open, ')')
        for (let wsType in WSTypes) {
            if (globalThis.debug_mode || OsmoWorkerDebug) console.log('wsType', wsType);
            if (ws2open.length > 0 && ws2open.indexOf(WSTypes[wsType as WSTypesKeys]) === -1) continue;
            const key: OsmoWSKey = WSTypes[wsType as WSTypesKeys];
            const url_suffix = this.urls[key];
            if (url_suffix !== undefined) {
                const url = endpointToOsmoWsUrl(url_suffix);
                if (globalThis.debug_mode || OsmoWorkerDebug) console.log('Connecting to ws url', url);
                this._wses[key] = new NngWebSocket({
                    url: url,
                    protocol: Protocol.UNKNOWN,
                    binaryType: NngWebSocket.ARRAYBUFFER,
                    reconnectTime: -1,
                });
                const ws = this._wses[key]!;
                ws.addEventListener('open', this._onWSESOpen[key]);
                ws.addEventListener('close', this._onWSClose);
                ws.addEventListener('message', this._onWSESMessage[key]);
                await ws.open();
            }
        }

        return ret;
    }

    async openBasicWS(urls: Partial<OsmoWSUrls>) {
        Object.assign(this.urls, urls);
        await this.openWs([WSTypes.ABIS_OML, WSTypes.ABIS_RSL, WSTypes.MEDIA]);
    }

    async openUsbByVidPid(vid: number, pid: number) {
        if (globalThis.debug_mode || OsmoWorkerDebug) console.log('openUsbByVidPid', vid, pid)
        const dev = await globalThis.webUsbDeviceManager?.open(vid, pid);
        if (!dev) return -1;
        this.openUsb(dev.fd);
    }

    openBts(bts: number, band: string, arfcn: number, ip_access_uid: string, osmux_port: number) {
        this._bts = bts;
        return this._osmo?.applyBtsConfig(band, arfcn, ip_access_uid, osmux_port);
    }

    async openUsb(fd: number) {
        if (this._fd !== fd) {
            if (globalThis.debug_mode || OsmoWorkerDebug) console.log('openUsb', fd)
            this._fd = fd;
            if (this._fd >= 0) {
                await this._webUsbSourceSink.open(this._fd);
                this._webUsbSourceSink.start();
            }
        }
    }

    async closeWs(ws2close: Array<WSTypes> = []) {
        this._rsl_connected = false;
        for (let wsType in WSTypes) {
            const key: OsmoWSKey = WSTypes[wsType as WSTypesKeys];
            if (ws2close.length > 0 && ws2close.indexOf(WSTypes[wsType as WSTypesKeys]) === -1) continue;
            const ws = this._wses[key];
            if (ws !== undefined) {
                await ws.close();
                ws.removeEventListener('open', this._onWSESOpen[key]);
                ws.removeEventListener('close', this._onWSClose);
                this._wses[key] = undefined;
            }
        }
    }

    async closeUsb() {
        if (this._fd !== -1) {
            this._webUsbSourceSink.close();
            this._fd = -1;
        }
    }

    async close() {
        this.closeWs();
        this.closeUsb();
    }

    async start() {
        try {
            // if (this._fd >= 0) await this._webUsbSourceSink.start();
        } catch (err) {
            console.error('OsmoTrxWorker: ', err);
        }
    }

    async stop() {
        await this._webUsbSourceSink.stop();
    }

    async sendOmlBuffer() {
        const abisOmlWs = this._wses[WSTypes.ABIS_OML];
        if (abisOmlWs && this._abisOmlBuffer.buffer.length > 0) {
            abisOmlWs.send(this._abisOmlBuffer.buffer);
            this._abisOmlBuffer.clear();
        }
    }

    async sendRslBuffer() {
        if (!this._rsl_connected) return;
        const abisRslWs = this._wses[WSTypes.ABIS_RSL];
        if (abisRslWs && this._abisRslBuffer.buffer.length > 0) {
            abisRslWs.send(this._abisRslBuffer.buffer);
            this._abisRslBuffer.clear();
        }
    }

    async onReceiveData(buf: SharedArrayBuffer, overrun: number, timestamp: bigint) {
        try {
            this._lastTimestamp = timestamp + BigInt(this._webUsbSourceSink.packet_size);

            if (this._osmo) {
                const chunk_size = OSMO_TRK_CHUNK_SIZE
                const iq_chunk_size = 2 * chunk_size
                const view1 = new Int16Array(buf, 0, iq_chunk_size);
                const view2 = new Int16Array(buf, COMPLEX_INT16_SIZE * chunk_size, iq_chunk_size);
                await this._osmo.sendRxShortData(view1, overrun, timestamp, overrun * this._webUsbSourceSink.packet_size);
                await this._osmo.sendRxShortData(view2, 0, timestamp + BigInt(chunk_size), 0);

                if (this._osmo.started_scheduler_timer) {
                    await this._osmo.sendSchedulerTimer(1 + overrun);
                }

                const params = {
                    data: new Int16Array(),
                    timestamp: BigInt(0),
                    skippackets: 0,
                }
                let res: number;
                let cnt = 0;
                while ((res = await this._osmo.getTxShortVector(params)) !== Osmo.ENODATA) {
                    await this.onWriteSamples(params.data, params.timestamp);
                    ++cnt;
                }

                this.sendOmlBuffer();
                this.sendRslBuffer();
            }
            ++this.inpkt;
        } catch (err) {
            console.error(err);
        }
    }

    onStart(): boolean {
        setTimeout(() => this._webUsbSourceSink.startStream(), 1000);
        return true;
    }

    onStop(): boolean {
        this._webUsbSourceSink.stopStream();
        return true;
    }

    onWriteLog(msg: string) {
        this._worker?.postMessage({ type: 'WRITE_LOG', msg: msg })
    }

    onLog(log: JournalLogItem) {
        this._worker?.postMessage({ type: 'LOG', log: log })
    }

    onChangeParameter(param: string, value: any) {
        this._worker?.postMessage({ type: 'PARAM_CHANGED', param: param, value: value });
    }

    onSetRxFrequency(frequency: number): boolean {
        if (globalThis.debug_mode || OsmoWorkerDebug) console.log(`onSetRxFrequency(${frequency})`);
        this._webUsbSourceSink.setRxFrequency(frequency);
        this.onChangeParameter('rx_frequency', frequency);
        return true;
    }

    onSetTxFrequency(frequency: number): boolean {
        if (globalThis.debug_mode || OsmoWorkerDebug) console.log(`onSetTxFrequency(${frequency})`);
        this._webUsbSourceSink.setTxFrequency(frequency);
        this.onChangeParameter('tx_frequency', frequency);
        return true;
    }

    async onWriteSamples(data: Int16Array<ArrayBufferLike>, timestamp: bigint): Promise<number> {
        const len = (data.length - 16) >> 1;
        this._wr_ahead_avg = (this._wr_ahead_avg + Number(timestamp - this._lastTimestamp)) >> 1;
        this._streamMeterDataProxy.wr_ahead_avg = this._wr_ahead_avg;
        if (this._lastTimestamp + BigInt(2500) + BigInt(500) > timestamp) {
            ++this._streamMeterDataProxy.skipped;
            return len;
        }
        if (data.byteLength > 0 && timestamp >= BigInt(2_000_000)) {
            ++this.outpkt;
            if (this.outpkt === 1) {
                console.log(`FIRST PACKET AT ${Date.now()}`)
            }
            const txBuffer = data.buffer;
            assertSharedArrayBuffer(txBuffer, 'onWriteSamples');
            await this._webUsbSourceSink.sendData(txBuffer, data.byteOffset, OsmoTrxWorker.sendBufferSize, DataType.ci16, BigInt(timestamp)/*  - BigInt(80) */, OSMO_TRK_CHUNK_SIZE);
        }
        return len;
    }

    onMediaData(data: Uint8Array<ArrayBufferLike>): number {
        if (globalThis.debug_mode || OsmoWorkerDebug) console.log('onMediaData(', data, ')')
        // WebSocket.send disallows ArrayBufferView backed by SharedArrayBuffer.
        // Use a reusable non-shared pool to minimize allocations and GC pressure.
        if (!this._mediaSendPool || this._mediaSendPool.byteLength < data.length) {
            this._mediaSendPool = new Uint8Array(data.length);
        }
        this._mediaSendPool.set(data, 0);
        const viewToSend = this._mediaSendPool.subarray(0, data.length);
        this._wses[WSTypes.MEDIA]?.send(viewToSend);
        return data.length;
    }

    onAbisData(ts_nr: number, data: Uint8Array<ArrayBufferLike>): number {
        if (globalThis.debug_mode || OsmoWorkerDebug) console.log('onAbisData(', ts_nr, data, ')')
        let ret = 0;
        if (ts_nr === 1) {
            this._abisOmlBuffer.push(data);
            ret = data.length;
        } else if (ts_nr === 2) {
            this._abisRslBuffer.push(data);
            ret = data.length;
        } else {
            console.error('Unexpected ts_nr =', ts_nr)
        }
        return ret;
    }

    onRslConnect(ts_nr: number): number {
        if (globalThis.debug_mode || OsmoWorkerDebug) console.log('onRslConnect(', ts_nr, ')')
        while (!this._rsl_buffer.isEmpty()) {
            const buf = this._rsl_buffer.front();
            if (buf === undefined) break;
            const view = new Uint8Array(buf);
            (async () => await this._osmo?.sendAbisData(2, view))();
            this._rsl_buffer.pop_front();
        }

        this._rsl_connected = true;
        this.sendRslBuffer();

        return 0;
    }

    async onWSControlMessage(event: Event) {
        const msg = event as MessageEvent
        if (msg.data instanceof ArrayBuffer) {
            const view = new Uint8Array(msg.data);
            if (globalThis.debug_mode || OsmoWorkerDebug) console.log('Received control message', view)
        }
    }

    async onWSAbisOmlMessage(event: Event) {
        const msg = event as MessageEvent
        if (msg.data instanceof ArrayBuffer) {
            const view = new Uint8Array(msg.data);
            if (globalThis.debug_mode || OsmoWorkerDebug) console.log('Received Abis OML message', view)
            await osmo?.sendAbisData(1, view);

            this.sendOmlBuffer();
        }
    }

    async onWSAbisRslMessage(event: Event) {
        const msg = event as MessageEvent
        if (msg.data instanceof ArrayBuffer) {
            const view = new Uint8Array(msg.data);
            if (globalThis.debug_mode || OsmoWorkerDebug) console.log('Received Abis RSL message', view)
            if (!this._rsl_connected) {
                this._rsl_buffer.push_back(view);
            } else {
                await osmo?.sendAbisData(2, view);

                this.sendRslBuffer();
            }
        }
    }

    async onWSAbisMessage(event: Event) {
        const msg = event as MessageEvent
        if (msg.data instanceof ArrayBuffer) {
            let offs = 0;
            while (msg.data.byteLength - offs >= 3) {
                const view = new Uint8Array(msg.data, offs);
                const len = (view[0]! << 8) + view[1]!;
                const proto = view[2]!;
                if (view.length < len + 3) break;
                const data = view.subarray(0, len + 3);
                let protoStr = '';
                switch (proto) {
                    case IPAccessProto.IPAC_PROTO_OML:
                        await osmo?.sendAbisData(1, data);
                        protoStr = protoStr !== '' ? protoStr : 'OML';
                        break;
                    case IPAccessProto.IPAC_PROTO_IPACCESS:
                        await osmo?.sendAbisData(1, data);
                        protoStr = protoStr !== '' ? protoStr : 'IPACCESS';
                    case IPAccessProto.IPAC_PROTO_RSL:
                        if (!this._rsl_connected) {
                            this._rsl_buffer.push_back(data);
                        } else {
                            await osmo?.sendAbisData(2, data);
                        }
                        protoStr = protoStr !== '' ? protoStr : 'RSL';
                        break;
                }
                if (globalThis.debug_mode || OsmoWorkerDebug) console.log(`len=${len}, proto=${proto} (${protoStr}), data.len=${data.length}}`, data);
                offs += len + 3;
            }
            this.sendOmlBuffer();
            this.sendRslBuffer();
        }
    }

    async onWSMediaMessage(event: Event) {
        const msg = event as MessageEvent
        if (typeof msg.data === 'string') {
            if (globalThis.debug_mode || OsmoWorkerDebug) console.log('Received string media message', msg.data);
        } else if (msg.data instanceof ArrayBuffer) {
            const view = new Uint8Array(msg.data);
            if (globalThis.debug_mode || OsmoWorkerDebug) console.log('Received media message', view)
            await osmo?.sendMediaData(view);
        }
    }

    protected checkCloudConnected() {
        if (this._wses[WSTypes.ABIS_OML]?.isConnected() && this._wses[WSTypes.ABIS_RSL]?.isConnected() && this._wses[WSTypes.MEDIA]?.isConnected())
            this._streamMeterDataProxy.cloud_up();
        else
            this._streamMeterDataProxy.cloud_down();
    }

    onWSOpen(event: Event) {
        console.log('OsmoTrxWorker: connected to url', (event.target as NngWebSocket).url);
        this.checkCloudConnected();
    }

    onWSMediaOpen(event: Event) {
        console.log('OsmoTrxWorker(MEDIA): connected to url', (event.target as NngWebSocket).url);
        this._wses[WSTypes.MEDIA]?.send(JSON.stringify({ bts: this._bts }));
        this.checkCloudConnected();
    }

    onWSClose(event: Event) {
        console.log('OsmoTrxWorker: disconnected from url', (event.target as NngWebSocket).url);
        this.checkCloudConnected();
    }

    setParameter(parameter: string, value: any) {
        let ret = false;
        if (parameter === 'urls') {
            this.urls = value;
            ret = true;
        }
        if (parameter === 'bts') {
            this._bts = value;
            ret = true;
        }
        return ret;
    }

    destroy() {
        this.stop();
        this._osmo?.deinit();
    }
}

export interface OsmoTrxWorkerParams extends Partial<WebUsbSourceSinkParams> {
    worker?: Worker;
    urls: Partial<OsmoWSUrls>,
    vendorId?: number,
    productId?: number,
    bts?: number,
};

export const OsmoTrxWorkerInitialParams: OsmoTrxWorkerParams = {
    urls: {
        control: '/wsdr/osmo/control',
        abis_oml: '/wsdr/osmo/abis_oml',
        abis_rsl: '/wsdr/osmo/abis_rsl',
        media: '/wsdr/osmo/media',
    },
};
