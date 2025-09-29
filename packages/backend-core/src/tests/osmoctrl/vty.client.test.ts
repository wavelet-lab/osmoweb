import { beforeAll, afterAll, describe, expect, test } from 'vitest';
import net, { Server, Socket } from 'net';
import { VtyClient } from '@/osmoctrl/vty.client';
import { HlrController } from '@/osmoctrl/controllers/hlr.controller';

// Simple in-memory HLR store for the mock VTY
type Sub = { imsi: string; msisdn?: string; algo2g?: string; algo3g?: string; ki?: string; opc?: string };
const store = new Map<string, Sub>();

function startMockVty(): Promise<{ server: Server; port: number }> {
    return new Promise((resolve, reject) => {
        const server = net.createServer();

        server.on('connection', (sock: Socket) => {
            let rxBuf = '';
            const eol = '\r\n';

            // Send banner + prompt (non-privileged)
            sock.write(`Welcome to the OsmoHLR VTY interface${eol}`);
            sock.write(`OsmoHLR>${eol}`);

            sock.on('data', (chunk: Buffer) => {
                rxBuf += chunk.toString('utf8');
                let idx: number;
                while ((idx = rxBuf.indexOf('\n')) !== -1) {
                    const raw = rxBuf.slice(0, idx);
                    rxBuf = rxBuf.slice(idx + 1);
                    const line = raw.replace(/\r$/, '').trim();
                    if (!line) continue;

                    // Echo command (like real VTY)
                    sock.write(line + eol);

                    // Handle commands
                    if (line.toLowerCase() === 'enable') {
                        // Enter enable mode (privileged)
                        sock.write(`OsmoHLR#${eol}`);
                        continue;
                    }

                    if (line.match(/^terminal\s+length\s+([0-9]+)$/i)) {
                        // set terminal lines to the specified length
                        sock.write(`OsmoHLR#${eol}`);
                        continue;
                    }

                    if (line.toLowerCase() === 'show runtime') {
                        sock.write(`Uptime: 1 days 02:03:04${eol}`);
                        sock.write(`OsmoHLR#${eol}`);
                        continue;
                    }

                    if (line.toLowerCase() === 'show subscribers all') {
                        // Dump all IMSIs
                        for (const sub of store.values()) {
                            sock.write(` Subscriber: IMSI ${sub.imsi}${eol}`);
                            if (sub.msisdn) sock.write(`  MSISDN: ${sub.msisdn}${eol}`);
                        }
                        sock.write(`OsmoHLR#${eol}`);
                        continue;
                    }

                    // subscriber imsi <imsi> create|delete|update ... | show
                    const m = line.match(/^subscriber\s+imsi\s+([0-9]+)\s+(show|delete|create|update)\b(.*)$/i);
                    if (m) {
                        const imsi = m[1];
                        const actionRaw = m[2];
                        const restRaw = m[3];

                        // Guard against missing capture groups
                        if (!imsi || !actionRaw) {
                            sock.write(`% Unknown command.${eol}`);
                            sock.write(`OsmoHLR#${eol}`);
                            continue;
                        }

                        const imsiStr = imsi as string;
                        const action = (actionRaw as string).toLowerCase();
                        const rest = (restRaw ?? '').trim();

                        if (action === 'create') {
                            if (!store.has(imsiStr)) store.set(imsiStr, { imsi: imsiStr });
                            sock.write(`Created subscriber ${imsiStr}${eol}`);
                            sock.write(`OsmoHLR#${eol}`);
                            continue;
                        }

                        if (action === 'delete') {
                            if (store.has(imsiStr)) {
                                store.delete(imsiStr);
                                sock.write(`Deleted subscriber ${imsiStr}${eol}`);
                            } else {
                                sock.write(`% No subscriber with IMSI ${imsiStr}${eol}`);
                            }
                            sock.write(`OsmoHLR#${eol}`);
                            continue;
                        }

                        if (action === 'update') {
                            const sub = store.get(imsiStr);
                            if (!sub) {
                                sock.write(`% No subscriber with IMSI ${imsiStr}${eol}`);
                                sock.write(`OsmoHLR#${eol}`);
                                continue;
                            }
                            // Handle msisdn
                            const msisdnMatch = rest.match(/^msisdn\s+(none|[0-9]+)/i);
                            if (msisdnMatch) {
                                const v = msisdnMatch[1];
                                if (typeof v === 'string') {
                                    if (v.toLowerCase() === 'none') delete sub.msisdn;
                                    else sub.msisdn = v;
                                    sock.write(`Updated MSISDN${eol}`);
                                    sock.write(`OsmoHLR#${eol}`);
                                    continue;
                                }
                            }
                            // Handle aud2g
                            const aud2gMatch = rest.match(/^aud2g\s+([A-Za-z0-9-]+)\s+ki\s+([A-Fa-f0-9]+)/i);
                            if (aud2gMatch && typeof aud2gMatch[1] === 'string' && typeof aud2gMatch[2] === 'string') {
                                sub.algo2g = aud2gMatch[1];
                                sub.ki = aud2gMatch[2];
                                sock.write(`Updated AUD2G${eol}`);
                                sock.write(`OsmoHLR#${eol}`);
                                continue;
                            }
                            // Handle aud3g milenage k <ki> [opc <opc>]
                            const aud3gMatch = rest.match(/^aud3g\s+milenage\s+k\s+([A-Fa-f0-9]+)(?:\s+opc\s+([A-Fa-f0-9]+))?/i);
                            if (aud3gMatch && typeof aud3gMatch[1] === 'string') {
                                sub.algo3g = 'milenage';
                                sub.ki = aud3gMatch[1];
                                if (typeof aud3gMatch[2] === 'string') sub.opc = aud3gMatch[2];
                                sock.write(`Updated AUD3G${eol}`);
                                sock.write(`OsmoHLR#${eol}`);
                                continue;
                            }

                            sock.write(`OK${eol}`);
                            sock.write(`OsmoHLR#${eol}`);
                            continue;
                        }

                        if (action === 'show') {
                            const sub = store.get(imsiStr);
                            if (!sub) {
                                sock.write(`% No subscriber with IMSI ${imsiStr}${eol}`);
                                sock.write(`OsmoHLR#${eol}`);
                                continue;
                            }
                            sock.write(`Subscriber: IMSI ${sub.imsi}${eol}`);
                            sock.write(` MSISDN: ${sub.msisdn ?? 'none'}${eol}`);
                            if (sub.algo2g) sock.write(` AUD2G: ${sub.algo2g}${eol}`);
                            if (sub.algo3g) sock.write(` AUD3G: ${sub.algo3g}${eol}`);
                            sock.write(`OsmoHLR#${eol}`);
                            continue;
                        }
                    }

                    // Default
                    sock.write(`% Unknown command.${eol}`);
                    sock.write(`OsmoHLR#${eol}`);
                }
            });
        });

        server.listen(0, '127.0.0.1', () => {
            const addr = server.address();
            if (!addr || typeof addr === 'string') {
                reject(new Error('Failed to bind mock VTY'));
                return;
            }
            resolve({ server, port: addr.port });
        });

        server.on('error', reject);
    });
}

let srv: Server;
let port: number;

beforeAll(async () => {
    const s = await startMockVty();
    srv = s.server;
    port = s.port;
});

afterAll(async () => {
    await new Promise<void>((resolve) => srv.close(() => resolve()));
    store.clear();
});

describe('VtyClient', () => {
    test('connect, enable and exec show runtime', async () => {
        const vty = new VtyClient('127.0.0.1', port, false);
        await vty.connect();
        await vty.enable();
        const res = await vty.execChecked('show runtime');
        expect(res.output).toMatch(/Uptime/i);
        vty.close();
    });
});

describe('HlrController via VTY', () => {
    test('getStats, add/get/delete subscriber', async () => {
        const hlr = new HlrController('127.0.0.1', port, false);

        const stats1 = await hlr.getStats();
        expect(stats1.subscriberCount).toBe(0);

        await hlr.addSubscriber({
            imsi: '001010000000001',
            msisdn: '1234567890',
            algorithm: 'comp128v1',
            ki: '00112233445566778899AABBCCDDEEFF',
        });

        const existsAfterAdd = await hlr.subscriberExists('001010000000001');
        expect(existsAfterAdd).toBe(true);

        const sub = await hlr.getSubscriber('001010000000001');
        expect(sub.imsi).toBe('001010000000001');
        expect(sub.msisdn).toBe('1234567890');

        // Update msisdn
        await hlr.updateSubscriber('001010000000001', { msisdn: '0987654321' });
        const sub2 = await hlr.getSubscriber('001010000000001');
        expect(sub2.msisdn).toBe('0987654321');

        // Delete
        await hlr.deleteSubscriber('001010000000001');
        const existsAfterDelete = await hlr.subscriberExists('001010000000001');
        expect(existsAfterDelete).toBe(false);

        hlr.disconnect();
    }, 15000);
});