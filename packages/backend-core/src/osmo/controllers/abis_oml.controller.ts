import type WebSocket from 'ws';
import type { OsmoController } from '@/osmo/controllers/controller.type';
import { OsmoTcpClient } from '@/osmo/osmotcp.client';
import { OsmoServices } from '@/osmo/lib/common.types';
import type { OsmoParams } from '@/osmo/lib/common.types';
import type { LoggerInterface } from '@osmoweb/core/utils';
import { SimpleLogger } from '@osmoweb/core/utils';

export class AbisOmlController implements OsmoController {
    protected readonly log: LoggerInterface;

    constructor(private readonly osmoParams: OsmoParams, logger?: LoggerInterface) {
        this.log = logger ?? new SimpleLogger(AbisOmlController.name);
    }

    handle = async (client: WebSocket) => {
        const service = this.osmoParams.services[OsmoServices.OSMO_TCP_ABIS_OML];
        if (service === undefined) {
            this.log.error('OML service not found');
            client.close();
            return;
        }
        const osmoClient = new OsmoTcpClient(service, 'OML');

        // osmoClient.onData = (data: Buffer) => {
        //     client.send(data);
        // }

        client.onmessage = (msg: WebSocket.MessageEvent) => {
            if (msg.data instanceof Buffer) {
                this.log.debug?.('ABIS_OML send: ', msg.data.toString('hex'));
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
        //         this.log.error('OML disconnected from WebSocket client');
        //         running = false;
        //     }
        //     await sleep(0.1);
        // }
        for await (const buffer of osmoClient.get()) {
            if (buffer !== undefined) {
                client.send(buffer/* , (error) => {
                this.log.error('ABIS_OML send error:', error, ': disconnect from WebSocket client');
                running = false;
            } */);
            }
            if (!osmoClient.connected || client.readyState === client.CLOSED) {
                this.log.error('OML disconnected from WebSocket client');
                running = false;
            }
            if (!running) break;
        }
        client.close();
        osmoClient.disconnect();
    };
}
