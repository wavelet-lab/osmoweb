import type { OsmoController } from '@/osmo/controllers/controller.type';
import { WebSocket } from 'ws';
import { IncomingMessage } from 'http';
import type { LoggerInterface } from '@osmoweb/core/utils';
import { SimpleLogger } from '@osmoweb/core/utils';

export class DefaultController implements OsmoController {
  protected readonly log: LoggerInterface;

  constructor(logger?: LoggerInterface) {
    this.log = logger ?? new SimpleLogger(DefaultController.name);
  }

  handle = async (_: WebSocket, req: IncomingMessage) => {
    this.log.error(`${req.url} not found`);
  }
}