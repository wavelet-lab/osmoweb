import { WebSocket } from 'ws';
import { IncomingMessage } from 'http';
import type { OsmoController } from '@/osmorouter/controllers/controller.type';
import type { LoggerInterface } from '@osmoweb/core/utils';
import { SimpleLogger } from '@osmoweb/core/utils';

export class DefaultController implements OsmoController {
  protected readonly logger: LoggerInterface;

  constructor(logger?: LoggerInterface) {
    this.logger = logger ?? new SimpleLogger(DefaultController.name);
  }

  handle = async (_: WebSocket, req: IncomingMessage) => {
    this.logger.error(`${req.url} not found`);
  }
}