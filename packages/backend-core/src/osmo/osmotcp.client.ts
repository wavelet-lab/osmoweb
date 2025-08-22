import net from 'net';
import { Buffer } from 'buffer';
import { CircularBuffer } from '@osmoweb/core';
import type { ServiceAddr } from '@/osmo/lib/common.types';
import type { LoggerInterface } from '@osmoweb/core/utils';
import { SimpleLogger } from '@osmoweb/core/utils';

export class OsmoTcpClient {
    protected readonly log: LoggerInterface;
    protected circularBuffer = new CircularBuffer<Buffer>(100);
    protected _onConnect: () => void;
    protected _onDisconnect: () => void;
    protected _onDataInternal: (data: Buffer) => void;
    protected _onError: (err: Error) => void;
    protected client: net.Socket;
    protected uri: string;
    protected port: number;
    protected _name: string = '';
    protected _connected = false;
    onData: ((data: Buffer) => void) | undefined = undefined;

    constructor(params: ServiceAddr, name: string = '', logger?: LoggerInterface) {
        this._name = name;
        this.log = logger ?? new SimpleLogger(OsmoTcpClient.name);
        this.uri = params.serviceUri;
        this.port = params.servicePort;
        this._onConnect = this.onConnect.bind(this);
        this._onDisconnect = this.onDisconnect.bind(this);
        this._onDataInternal = this.onDataInternal.bind(this);
        this._onError = this.onError.bind(this);
        this.client = new net.Socket();
        this.client.setNoDelay(true);
        this.client.setKeepAlive(true, 30_000);
    }

    get connected() {
        return this._connected;
    }

    get name() {
        return this._name !== '' ? this._name : this.port.toString();
    }

    connect() {
        try {
            this._connected = true;
            this.client.addListener('connect', this._onConnect);
            this.client.addListener('close', this._onDisconnect);
            this.client.addListener('data', this._onDataInternal);
            this.client.addListener('error', this._onError);
            this.client.connect(this.port, this.uri);
        } catch (err) {
            this.log.error(err)
        }
    }

    disconnect() {
        try {
            this.client.removeListener('connect', this._onConnect);
            this.client.removeListener('close', this._onDisconnect);
            this.client.removeListener('data', this._onDataInternal);
            this.client.removeListener('error', this._onError);
            this.client.destroy();
            this._connected = false;
        } catch (err) {
            this.log.error(err)
        }
    }

    async *get() {
        let running = true;

        while (running && this._connected) {
            while (!this.circularBuffer.isEmpty()) {
                const buf = this.circularBuffer.front();
                yield buf;
                this.circularBuffer.pop_front();
            }
            await this.circularBuffer.waitForChangeSize();
        }
    }

    onConnect() {
        this.log.log(`OsmoTcpClient(${this.name}).onConnect: connection to ${this.uri}:${this.port} established`)
        this._connected = true;
    }

    onDisconnect() {
        this.log.log(`OsmoTcpClient(${this.name}).onDisconnect: disconnected from ${this.uri}:${this.port}`)
        this._connected = false;
    }

    onDataInternal(data: Buffer) {
        this.log.debug?.(`OsmoTcpClient(${this.name}).onData: Data received from server: ${data.toString('hex')}`)
        this.log.debug?.(`OsmoTcpClient(${this.name}).onData: Received ${data.byteLength} bytes`)
        this.circularBuffer.push_back(data);
        if (this.onData) this.onData(data);
    }

    onError(err: Error) {
        this.log.error(`OsmoTcpClient(${this.name}).onError: ${err}`)
    }

    send(data: Buffer) {
        this.client.write(data, (error) => {
            if (error) {
                this.log.error(`OsmoTcpClient(${this.name}).sendData: ${error}`)
                this.disconnect();
            }/*  else {
                this.log.debug?.(`OsmoTcpClient(${this.name}).sendData: Data sent !!!`)
            } */
        });
    }
}