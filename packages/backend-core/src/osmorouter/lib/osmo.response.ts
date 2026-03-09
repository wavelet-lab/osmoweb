import type { RawData } from 'ws';
import type { CommonOsmoResponse } from '@/osmorouter/lib/protocol.types';
import { encoder } from '@/osmorouter/lib/decoder';
import type { LoggerInterface } from '@websdr/core/utils';

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
