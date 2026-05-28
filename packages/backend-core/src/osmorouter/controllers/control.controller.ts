import type WebSocket from 'ws';
import type { OsmoController } from '@/osmorouter/controllers/controller.type';
import { OsmoTcpClient } from '@/osmorouter/osmotcp.client';
import { OsmoServices } from '@/osmorouter/lib/common.types';
import type { OsmoParams } from '@/osmorouter/lib/common.types';
import type {
    GetBtsListResponse, CommonOsmoResponse, CommonOsmoRequest, ErrorResponse
} from '@/osmorouter/protocol/protocol.types';
import { getBtsManagerInstance } from '@/osmo/bts.manager';
import { sleep } from '@websdr/core/utils';
import type { LoggerInterface } from '@websdr/core/utils';
import { SimpleLogger } from '@websdr/core/utils';

export class ControlController implements OsmoController {
    protected readonly logger: LoggerInterface;

    constructor(private readonly osmoParams: OsmoParams, logger?: LoggerInterface) {
        this.logger = logger ?? new SimpleLogger(ControlController.name);
    }

    parseRequest(req: CommonOsmoRequest, _client: WebSocket): CommonOsmoResponse | undefined {
        switch (req.event) {
            case 'get-bts-list':
                const bts_list_response: GetBtsListResponse = {
                    event: req.event,
                    bts: getBtsManagerInstance().dumpState().knownBtsIds
                        .map((id: number) => getBtsManagerInstance().getById(id))
                        .filter((bts) => bts !== null)
                        .map((bts) => getBtsManagerInstance().toBtsConfig(bts!)),
                };
                return bts_list_response;
            default:
                const error_response: ErrorResponse = {
                    error: { description: `Unknown request ${req}` },
                };
                return error_response;
        }
    }

    handle = async (client: WebSocket) => {
        const serviceHlr = this.osmoParams.services[OsmoServices.OSMO_TCP_HLR];
        if (serviceHlr === undefined) {
            this.logger.error('HLR service not found');
            client.close();
            return;
        }
        const serviceBsc = this.osmoParams.services[OsmoServices.OSMO_TCP_BSC];
        if (serviceBsc === undefined) {
            this.logger.error('BSC service not found');
            client.close();
            return;
        }
        const osmoHlrClient = new OsmoTcpClient(serviceHlr, 'HLR');
        const osmoBscClient = new OsmoTcpClient(serviceBsc, 'BSC');

        client.onmessage = (msg: WebSocket.MessageEvent) => {
            if (typeof msg.data === 'string') {
                this.logger.debug?.('Control receive: ', msg.data);
                const req = JSON.parse(msg.data);
                const res = this.parseRequest(req, client);
                this.logger.debug?.('Control send: ', res);
                if (res !== undefined) client.send(JSON.stringify(res));
            }
        }

        client.onclose = () => {
            osmoHlrClient.disconnect();
            osmoBscClient.disconnect();
        }

        client.onerror = () => {
            osmoHlrClient.disconnect();
            osmoBscClient.disconnect();
        }

        osmoHlrClient.onData = (data: Buffer) => {

        }

        osmoBscClient.onData = (data: Buffer) => {

        }

        // osmoHlrClient.connect();
        // osmoBscClient.connect();

        while (osmoHlrClient.connected && osmoBscClient.connected) {
            await sleep(0.1);
        }
    };
}


/*

1) Creating new BSC:


2) Creating new MSISDN:


 */
