import type WebSocket from 'ws';
import type { OsmoController } from '@/osmo/controllers/controller.type';
import { OsmoTcpClient } from '@/osmo/osmotcp.client';
import { OsmoServices } from '@/osmo/lib/common.types';
import type { OsmoParams } from '@/osmo/lib/common.types';
import type { LoggerInterface } from '@osmoweb/core/utils';
import { SimpleLogger } from '@osmoweb/core/utils';

export class AbisRslController implements OsmoController {
    protected readonly log: LoggerInterface;

    constructor(private readonly osmoParams: OsmoParams, logger?: LoggerInterface) {
        this.log = logger ?? new SimpleLogger(AbisRslController.name);
    }

    handle = async (client: WebSocket) => {
        const service = this.osmoParams.services[OsmoServices.OSMO_TCP_ABIS_RSL];
        if (service === undefined) {
            this.log.error('RSL service not found');
            client.close();
            return;
        }
        const osmoClient = new OsmoTcpClient(service, 'RSL');

        // osmoClient.onData = (data: Buffer) => {
        //     client.send(data);
        // }

        client.onmessage = (msg: WebSocket.MessageEvent) => {
            if (msg.data instanceof Buffer) {
                this.log.debug?.('ABIS_RSL send: ', msg.data.toString('hex'));
                osmoClient.send(msg.data);
            }
        }

        client.onclose = () => {
            osmoClient.disconnect();
        }

        client.onerror = () => {
            osmoClient.disconnect();
        }

        osmoClient.connect();
        let running = true;
        // while (running) {
        //     if (!osmoClient.connected || client.readyState === client.CLOSED) {
        //         this.log.error('RSL disconnected from WebSocket client');
        //         running = false;
        //     }
        //     await sleep(0.1);
        // }
        for await (const buffer of osmoClient.get()) {
            if (buffer !== undefined) {
                client.send(buffer/* , (error) => {
                this.log.error('ABIS_RSL send error:', error, ': disconnect from WebSocket client');
                running = false;
            } */);
            }
            if (!osmoClient.connected || client.readyState === client.CLOSED) {
                this.log.error('RSL disconnected from WebSocket client');
                running = false;
            }
            if (!running) break;
        }
        client.close();
        osmoClient.disconnect();
    };
}
