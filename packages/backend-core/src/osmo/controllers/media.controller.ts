import type WebSocket from 'ws';
import type { OsmoController } from '@/osmo/controllers/controller.type';
import { OsmoUdpClient } from '@/osmo/osmoudp.client';
import { OsmoServices } from '@/osmo/lib/common.types';
import type { OsmoParams } from '@/osmo/lib/common.types';
import { sleep } from '@osmoweb/core';
import { getBtsPoolInstance } from '@/osmo/btspool';
import { IncomingMessage } from 'http';
import type { LoggerInterface } from '@osmoweb/core/utils';
import { SimpleLogger } from '@osmoweb/core/utils';

export class MediaController implements OsmoController {
    protected readonly log: LoggerInterface;

    constructor(private readonly osmoParams: OsmoParams, logger?: LoggerInterface) {
        this.log = logger ?? new SimpleLogger(MediaController.name);
    }

    handle = async (client: WebSocket, clientreq: IncomingMessage) => {
        let clientId = `${clientreq.socket.remoteAddress}:${clientreq.socket.remotePort}`;
        let port = -1;
        const service = this.osmoParams.services[OsmoServices.OSMO_UDP_MEDIA];
        if (service === undefined) {
            this.log.error('MEDIA service not found');
            client.close();
            return;
        }
        const osmoClient = new OsmoUdpClient(service, `MEDIA (${clientId})`);

        // osmoClient.onMessage = (msg: Buffer) => {
        //     client.send(msg);
        // }

        client.onmessage = (msg: WebSocket.MessageEvent) => {
            try {
                if (typeof msg.data === 'string') {
                    const req = JSON.parse(msg.data)
                    if (req.bts !== undefined) {
                        const bts = getBtsPoolInstance().getBtsItem(req.bts);
                        if (bts !== undefined) {
                            port = bts.cfg.osmux_port;
                        }
                        this.log.log(`Client ${clientId} choose bts ${req.bts} with port ${port}`);
                    }
                } else if (msg.data instanceof Buffer) {
                    this.log.debug?.(`Media send to client ${clientId}:`, msg.data.toString('hex'));
                    osmoClient.send(msg.data);
                }
            } catch (err) {
                this.log.error(err);
            }
        }

        client.onclose = () => {
            osmoClient.disconnect();
        }

        client.onerror = () => {
            osmoClient.disconnect();
        }

        while (port < 0) {
            this.log.log(`MEDIA Waiting for client ${clientId}...`)
            await sleep(1);
        }
        osmoClient.connect(port);
        let running = true;
        // while (running) {
        //     if (client.readyState === client.CLOSED) {
        //         this.log.error('MEDIA disconnected from WebSocket client');
        //         running = false;
        //     }
        //     await sleep(0.1);
        // }
        for await (const buffer of osmoClient.get()) {
            if (buffer !== undefined) {
                client.send(buffer/* , (error) => {
                this.log.error('MEDIA send error:', error, ': disconnect from WebSocket client');
                running = false;
            } */);
            }
            if (client.readyState === client.CLOSED) {
                this.log.error(`RSL disconnect from WebSocket client ${clientId}`);
                break;
            }
            if (!running) break;
        }
        client.close();
    };
}
