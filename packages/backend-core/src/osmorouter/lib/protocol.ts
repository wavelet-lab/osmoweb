import type { IncomingMessage } from 'http';
// import { OsmoProtocol } from './common.types';

// const allowedProtocols = new Set<string>([]);

export const getOsmoProtocol = (req: IncomingMessage): string | false => {
  const protocol = req.headers['sec-websocket-protocol'];
  // if (!allowedProtocols.has(protocol)) {
  //   throw new Error(`Unknown protocol ${protocol}`);
  // }
  return protocol ?? false;
}