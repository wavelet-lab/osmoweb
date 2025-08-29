import type { IncomingMessage } from 'http';
import type WebSocket from 'ws';
import { Injectable } from '@nestjs/common';
import { Router } from '@osmoweb/backend-core';

@Injectable()
export class CoreRouterAdapter {
    constructor(private readonly router: Router) { }

    handle(token: string, client: WebSocket, request: IncomingMessage): Promise<void> {
        return this.router.resolve(token).handle(client, request);
    }
}
