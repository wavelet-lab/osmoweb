import type { RawData } from 'ws';
import type { CommonOsmoResponse } from '@/osmo/lib/protocol.types';
import type { LoggerInterface } from '@osmoweb/core/utils';
import { encoder } from '@/osmo/lib/decoder';

export const OsmoResponse = (log: LoggerInterface) => {
  const encode = encoder();
  return (id: RawData, response: CommonOsmoResponse) => {
    const msg = JSON.stringify(response);
    log.debug?.(`Res: ${msg}`);
    const idView = new Uint8Array(id as Buffer);
    const msgEncoded = encode(msg);
    const buffer = new Uint8Array(idView.length + msgEncoded.length)
    buffer.set(idView, 0);
    buffer.set(msgEncoded, idView.length);
    return buffer;
  };
}

export type OsmoResponseFunc = (id: RawData, response: CommonOsmoResponse) => Uint8Array;
