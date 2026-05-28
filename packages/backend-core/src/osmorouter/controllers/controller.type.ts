import type WebSocket from "ws";
import type { IncomingMessage } from "http";
import type { LoggerInterface } from '@websdr/core/utils';

export interface OsmoController {
  handle(client: WebSocket, request: IncomingMessage): Promise<void>;
}

export interface OsmoControllerClass {
  new(...args: any[]): OsmoController;
}

export type LoggerFactory = (context: string) => LoggerInterface;
