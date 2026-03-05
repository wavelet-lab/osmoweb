import type { RawData } from 'ws';
import type { CommonOsmoRequest } from '@/osmorouter/lib/protocol.types';
import { decoder } from '@/osmorouter/lib/decoder';
import type { LoggerInterface } from '@websdr/core/utils';

export const OsmoParser = (log: LoggerInterface) => {
    const decode = decoder();
    return (data: RawData): { id: RawData, request: CommonOsmoRequest } => {
        const id = data.slice(0, 4); //binary
        let message: string;

        if (data instanceof ArrayBuffer) {
            const view = new Uint8Array(data);
            message = decode(view.subarray(4));
        } else if (data instanceof Buffer) {
            message = data.subarray(4).toString();
        } else {
            message = data.join('').substring(4); //assume it's an array of bytes
        }

        log.debug?.(`Req: ${message}`);

        try {
            return { id, request: JSON.parse(message) };
        } catch (err) {
            log.error?.(message);
            throw new Error(String(err));
        }
    }
};

export type OsmoParserFunc = (data: RawData) => { id: RawData, request: CommonOsmoRequest }