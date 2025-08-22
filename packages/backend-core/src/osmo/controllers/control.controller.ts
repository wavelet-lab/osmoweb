import type WebSocket from 'ws';
import type { OsmoController } from '@/osmo/controllers/controller.type';
import { OsmoTcpClient } from '@/osmo/osmotcp.client';
import { OsmoServices } from '@/osmo/lib/common.types';
import type { OsmoParams } from '@/osmo/lib/common.types';
import { sleep } from '@osmoweb/core/utils';
import type {
    BtsConfig, GetBtsListRequest, GetBtsListResponse, CommonOsmoResponse, LockBtsRequest,
    LockBtsResponse, UnlockBtsRequest, UnlockBtsResponse, CommonOsmoRequest, ErrorResponse
} from '@/osmo/lib/protocol.types';
import { getBtsPoolInstance } from '@/osmo/btspool';
import type { BtsItem } from '@/osmo/btspool';
import type { LoggerInterface } from '@osmoweb/core/utils';
import { SimpleLogger } from '@osmoweb/core/utils';

export class ControlController implements OsmoController {
    protected readonly log: LoggerInterface;

    constructor(private readonly osmoParams: OsmoParams, logger?: LoggerInterface) {
        this.log = logger ?? new SimpleLogger(ControlController.name);
    }

    parseRequest(req: CommonOsmoRequest, client: WebSocket): CommonOsmoResponse | undefined {
        let code = 0;
        const btsPool = getBtsPoolInstance();
        switch (req.event) {
            case 'get-bts-list':
                const bts_list_response: GetBtsListResponse = {
                    event: req.event,
                    bts: btsPool.btses.map((v: BtsItem, idx: number) => ({ ...v.cfg, id: idx, locked: v.locked })),
                };
                return bts_list_response;
            case 'lock-bts':
                code = btsPool.lockBts(req.id, client);
                const lock_bts_response: LockBtsResponse = {
                    event: req.event,
                    id: req.id,
                    result: { code: code },
                };
                return lock_bts_response;
            case 'unlock-bts':
                code = btsPool.unlockBts(req.id, client);
                const unlock_bts_response: UnlockBtsResponse = {
                    event: req.event,
                    id: req.id,
                    result: { code: code },
                };
                return unlock_bts_response;
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
            this.log.error('HLR service not found');
            client.close();
            return;
        }
        const serviceBsc = this.osmoParams.services[OsmoServices.OSMO_TCP_BSC];
        if (serviceBsc === undefined) {
            this.log.error('BSC service not found');
            client.close();
            return;
        }
        const osmoHlrClient = new OsmoTcpClient(serviceHlr, 'HLR');
        const osmoBscClient = new OsmoTcpClient(serviceBsc, 'BSC');

        client.onmessage = (msg: WebSocket.MessageEvent) => {
            if (typeof msg.data === 'string') {
                this.log.debug?.('Control receive: ', msg.data);
                const req = JSON.parse(msg.data);
                const res = this.parseRequest(req, client);
                this.log.debug?.('Control send: ', res);
                if (res !== undefined) client.send(JSON.stringify(res));
            }
        }

        client.onclose = () => {
            osmoHlrClient.disconnect();
            osmoBscClient.disconnect();
            getBtsPoolInstance().unlockBtsByClient(client);
        }

        client.onerror = () => {
            osmoHlrClient.disconnect();
            osmoBscClient.disconnect();
            getBtsPoolInstance().unlockBtsByClient(client);
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