import type WebSocket from "ws";
import type { IncomingMessage } from "http";

export interface OsmoController {
  handle(client: WebSocket, request: IncomingMessage): Promise<void>;
}

export interface OsmoControllerClass {
  new(...args: any[]): OsmoController;
}