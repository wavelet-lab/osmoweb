import { WebSocketGateway } from '@nestjs/websockets';
import type { OnGatewayConnection } from '@nestjs/websockets';
import { IncomingMessage } from 'http';
import type WebSocket from 'ws';
import { CoreRouterAdapter } from '@/osmo/core-router.adapter';

@WebSocketGateway({ path: '/wsdr/osmo/media' })
export class MediaGateway implements OnGatewayConnection {
    constructor(private readonly adapter: CoreRouterAdapter) { }

    handleConnection(client: WebSocket, request: IncomingMessage) {
        void this.adapter.handle('media', client, request);
    }
}
