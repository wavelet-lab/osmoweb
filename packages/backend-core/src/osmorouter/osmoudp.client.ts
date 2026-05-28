import udp from 'dgram';
import { Buffer } from 'buffer';
import { CircularBuffer } from '@websdr/core/utils';
import type { ServiceAddr } from '@/osmorouter/lib/common.types';
import type { LoggerInterface } from '@websdr/core/utils';
import { SimpleLogger } from '@websdr/core/utils';

export class OsmoUdpClient {
    protected readonly logger;
    protected circularBuffer = new CircularBuffer<Buffer>(100);
    protected client: udp.Socket;
    protected _onConnect: () => void;
    protected _onDisconnect: () => void;
    protected _onMessageInternal: (msg: Buffer, rinfo: udp.RemoteInfo) => void;
    protected _onError: (err: Error) => void;
    protected _name: string = '';
    protected uri: string;
    protected port: number;
    protected bindPort: number = -1;
    onMessage: ((msg: Buffer) => void) | undefined = undefined;

    constructor(params: ServiceAddr, name: string = '', logger?: LoggerInterface) {
        this._name = name;
        this.logger = logger ?? new SimpleLogger(OsmoUdpClient.name);
        this.uri = params.serviceUri;
        this.port = params.servicePort;
        this._onConnect = this.onConnect.bind(this);
        this._onDisconnect = this.onDisconnect.bind(this);
        this._onMessageInternal = this.onMessageInternal.bind(this);
        this._onError = this.onError.bind(this);
        this.client = udp.createSocket('udp4');
    }

    get name() {
        return this._name !== '' ? this._name : this.port.toString();
    }

    connect(port: number) {
        try {
            this.client.addListener('connect', this._onConnect);
            this.client.addListener('close', this._onDisconnect);
            this.client.addListener('message', this._onMessageInternal);
            this.client.addListener('error', this._onError);
            this.logger.log(`OsmoUdpClient(${this.name}).connect to port ${port}`);
            this.bindPort = port;//getPortPoolInstance().reservePort(this);
            this.client.bind({
                address: 'localhost',
                port: this.bindPort,
                exclusive: true,
            });
            this.client.connect(this.port, this.uri);
            this.logger.log(`Created connection from ${this.uri}:${this.bindPort} to ${this.uri}:${this.port}`);
        } catch (err) {
            this.logger.error(`Unable configure Media socket at ${this.uri}:${this.bindPort}`, err);
        }
    }

    disconnect() {
        try {
            this.client.removeListener('connect', this._onConnect);
            this.client.removeListener('close', this._onDisconnect);
            this.client.removeListener('message', this._onMessageInternal);
            this.client.removeListener('error', this._onError);
            // getPortPoolInstance().freePort(this.bindPort, this);
            // this.client.disconnect();
            this.client.close();
        } catch (err) {
            this.logger.error(err);
        }
    }

    async *get() {
        let running = true;

        while (running) {
            while (!this.circularBuffer.isEmpty()) {
                const buf = this.circularBuffer.front();
                yield buf;
                this.circularBuffer.pop_front();
            }
            await this.circularBuffer.waitForChangeSize();
        }
    }

    onConnect() {
        this.logger.log(`OsmoUdpClient(${this._name}).onConnect: connection to ${this.uri}:${this.port} (bindind to port ${this.bindPort}) established`)
    }

    onDisconnect() {
        this.logger.log(`OsmoUdpClient(${this._name}).onDisconnect: disconnected from ${this.uri}:${this.port}`)
        this.disconnect();
    }

    onMessageInternal(msg: Buffer, rinfo: udp.RemoteInfo) {
        this.logger.debug?.(`OsmoUdpClient(${this._name}).onMessage: Data received from server : ${msg.toString('hex')}`)
        this.logger.debug?.(`OsmoUdpClient(${this._name}).onMessage: Received ${msg.byteLength} bytes from ${rinfo.address}:${rinfo.port}`)
        this.circularBuffer.push_back(msg);
        if (this.onMessage) this.onMessage(msg);
    }

    onError(err: Error) {
        this.logger.error(`OsmoUdpClient(${this._name}).onError: ${err}`)
        this.disconnect();
    }

    send(data: Buffer) {
        try {
            this.client.send(data);
        } catch (error) {
            this.logger.error(`OsmoUdpClient(${this._name}).sendData: ${error}`)
            this.disconnect();
        }
    }
}
