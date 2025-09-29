import { EventEmitter } from 'events';
import { Socket } from 'net';

export interface VtyResponse {
    command: string;
    output: string;
}

// Error class for failed VTY commands
export class VtyCommandError extends Error {
    constructor(
        public readonly cmd: string,
        public readonly errorLine: string,
        public readonly output: string
    ) {
        super(`VTY command failed: "${cmd}" -> ${errorLine}`);
        this.name = 'VtyCommandError';
    }
}

interface PendingCommand {
    cmd: string;
    lines: string[];
    resolve: (r: VtyResponse) => void;
    reject: (e: Error) => void;
    timer: NodeJS.Timeout;
    awaitingEcho: boolean;       // true until we see the exact echo or any non-prompt output
    sawAnyOutput: boolean;       // tracks if any non-prompt output was received
};

interface VtyCommand {
    cmd: string;
    resolve: (r: VtyResponse) => void;
    reject: (e: Error) => void;
    timeoutMs: number;
}

export class VtyClient extends EventEmitter {
    private readonly _promptRegex = /^Osmo[^\r\n]*[>#]\s*$/; // e.g. "OsmoHLR#"
    private readonly _eol = '\r\n';

    private _socket = new Socket();
    private _rxBuf = '';
    private _connected = false;

    private pending: PendingCommand | undefined = undefined;
    private queue: Array<VtyCommand> = [];

    // Keep connection params to spawn short-lived "view mode" clients
    private readonly _host: string;
    private readonly _port: number;
    private readonly _debug: boolean;

    constructor(host: string, port: number, debug = false) {
        super();
        this._host = host;
        this._port = port;
        this._debug = debug;
        this.setup();
    }

    get isConnected(): boolean {
        return this._connected;
    }

    get host(): string {
        return this._host;
    }

    get port(): number {
        return this._port;
    }

    private setup() {
        this._socket.setNoDelay(true);

        this._socket.on('connect', () => {
            if (this._debug) console.debug(`[VTY] connected ${this._host}:${this._port}`);
            // Trigger prompt output on connect
            this._socket.write(this._eol);
        });

        this._socket.on('data', (data: Buffer) => {
            // Strip telnet IAC negotiation and convert to text
            const text = this.stripTelnet(data);
            this._rxBuf += text;

            let idx: number;
            while ((idx = this._rxBuf.indexOf('\n')) !== -1) {
                const raw = this._rxBuf.slice(0, idx);
                this._rxBuf = this._rxBuf.slice(idx + 1);
                const line = raw.replace(/\r$/, '');
                if (this._debug) console.debug(`[VTY RX] ${line}`);
                this.onLine(line);
            }

            // Handle prompt received without trailing newline only
            if (this._rxBuf.length > 0) {
                const maybeLine = this._rxBuf.replace(/\r$/, '');
                if (this._promptRegex.test(maybeLine)) {
                    if (this._debug) console.debug(`[VTY RX] ${maybeLine} (no-eol)`);
                    this._rxBuf = '';
                    this.onLine(maybeLine);
                }
            }
        });

        this._socket.on('error', (err) => {
            if (this._debug) console.error('[VTY] error', err);
            if (this.pending) {
                const p = this.pending;
                this.pending = undefined;
                clearTimeout(p.timer);
                p.reject(err);
            }
            this.emit('error', err);
        });

        this._socket.on('close', () => {
            if (this._debug) console.debug('[VTY] closed');
            this._connected = false;
            this.emit('close');
        });
    }

    // Minimal telnet negotiation: reply WONT/DONT and strip all IAC sequences
    private stripTelnet(buf: Buffer): string {
        const IAC = 255;
        const DO = 253;
        const DONT = 254;
        const WILL = 251;
        const WONT = 252;
        const SB = 250;
        const SE = 240;

        const out: number[] = [];
        let i = 0;

        while (i < buf.length) {
            const byte = buf[i]!;
            if (byte === IAC) {
                if (i + 1 >= buf.length) break;
                const cmd = buf[i + 1]!;

                if (cmd === WILL || cmd === WONT || cmd === DO || cmd === DONT) {
                    if (i + 2 >= buf.length) break;
                    const opt = buf[i + 2]!;
                    if (cmd === WILL || cmd === WONT) {
                        this._socket.write(Buffer.from([IAC, DONT, opt]));
                    } else {
                        this._socket.write(Buffer.from([IAC, WONT, opt]));
                    }
                    i += 3;
                    continue;
                }

                if (cmd === SB) {
                    i += 2;
                    while (i < buf.length) {
                        const b2 = buf[i]!;
                        if (b2 === IAC && i + 1 < buf.length && buf[i + 1]! === SE) {
                            i += 2;
                            break;
                        }
                        i++;
                    }
                    continue;
                }

                // Skip other telnet commands (IAC <cmd>)
                i += 2;
                continue;
            }

            out.push(byte);
            i++;
        }

        return Buffer.from(out).toString('utf8');
    }

    private onLine(line: string) {
        // First prompt marks ready
        if (!this._connected && this._promptRegex.test(line)) {
            this._connected = true;
            this.emit('ready');
            this.drainQueue();
            return;
        }

        // If waiting for a response, collect until next prompt
        if (this.pending) {
            // If echo has not been seen yet
            if (this.pending.awaitingEcho) {
                // Ignore any prompt lines until we saw echo or any non-prompt output
                if (this._promptRegex.test(line)) return;

                // If line equals the echoed command -> switch to collecting output
                if (line.trim() === this.pending.cmd.trim()) {
                    this.pending.awaitingEcho = false;
                    return;
                }

                // Some VTYs may not echo; treat first non-prompt line as start of output
                this.pending.awaitingEcho = false;
                if (line.length > 0) this.pending.sawAnyOutput = true;
                this.pending.lines.push(line);
                return;
            }

            // Echo seen or suppressed; now collect output
            if (this._promptRegex.test(line)) {
                // Only resolve if we actually saw any output or echo
                const p = this.pending;
                this.pending = undefined;
                clearTimeout(p.timer);

                // Remove command echo if it somehow slipped into lines
                const filtered = p.lines.filter((l) => l.trim().length > 0 && l.trim() !== p.cmd.trim());
                p.resolve({ command: p.cmd, output: filtered.join('\n') });

                // Proceed with next queued command
                this.drainQueue();
            } else {
                if (line.length > 0) this.pending.sawAnyOutput = true;
                this.pending.lines.push(line);
            }
        }
    }

    async connect(timeoutMs = 5000): Promise<void> {
        return new Promise((resolve, reject) => {
            const onReady = () => { cleanup(); resolve(); };
            const onErr = (e: Error) => { cleanup(); reject(e); };
            const timer = setTimeout(() => { cleanup(); reject(new Error(`VTY connect timeout ${timeoutMs}ms`)); }, timeoutMs);
            const cleanup = () => {
                clearTimeout(timer);
                this.off('ready', onReady);
                this.off('error', onErr);
            };

            this.on('ready', onReady);
            this.on('error', onErr);
            this._socket.connect(this._port, this._host);
        });
    }

    async enable(timeoutMs = 3000): Promise<void> {
        await this.execChecked('enable', timeoutMs);
        await this.execChecked('terminal length 0', 2000);
        if (this._debug) console.debug('[VTY] entered enable mode');
    }

    /**
     * Execute a command in VTY and return full output (including any error lines).
    */
    async exec(cmd: string, timeoutMs = 5000): Promise<VtyResponse> {
        return new Promise((resolve, reject) => {
            this.queue.push({ cmd, resolve, reject, timeoutMs });
            this.drainQueue();
        });
    }

    /**
     * Execute a command in VIEW mode using a short-lived connection.  
     * This does NOT alter the state (enable/configure) of the main session.
     */
    async execView(command: string): Promise<{ output: string }> {
        const client = new VtyClient(this._host, this._port, this._debug);
        await client.connect(); // stay in non-enabled VIEW mode
        try {
            const res = await client.execChecked(command);
            return { output: res?.output ?? '' };
        } finally {
            try {
                client.close();
            } catch { /* ignore */ }
        }
    }

    // Precompiled VTY output error patterns
    private readonly _vtyErrorPatterns: RegExp[] = [
        /^%+\s*(?:Error|Unknown command|Ambiguous command|Command incomplete|Command failed|Invalid input|Rejected|Not allowed|No such|Cannot|Failed|Operation not permitted|.*is not of|.*is not supported)/i,
        /^VTY configuration is locked by other VTY$/i,
    ];

    /**
     * Detect an error line in VTY output (returns the first error line if found)
     */
    private parseCommandError(output: string): string | undefined {
        if (!output) return undefined;

        for (const raw of output.split('\n')) {
            const line = raw.trim();
            if (!line) continue;

            if (this._vtyErrorPatterns.some((r) => r.test(line))) {
                return line.replace(/^%+\s*/, '');
            }
        }
        return undefined;
    }

    /**
     * Execute a command and fail if VTY output indicates a protocol error
     */
    async execChecked(cmd: string, timeoutMs = 5000): Promise<VtyResponse> {
        const res = await this.exec(cmd, timeoutMs);
        if (this._debug) console.debug(`[VTY BATCH] ${cmd} -> ${res.output}`);
        const err = this.parseCommandError(res.output);
        if (err) {
            throw new VtyCommandError(cmd, err, res.output);
        }
        return res;
    }

    /**
     * Execute a batch of commands in VTY mode
     */
    async execBatch(cmds: string[]): Promise<void> {
        for (const cmd of cmds) {
            await this.execChecked(cmd);
        }
    }


    private drainQueue() {
        if (!this._connected || this.pending || this.queue.length === 0) return;

        const next = this.queue.shift()!;
        const timer = setTimeout(() => {
            if (this.pending && this.pending.cmd === next.cmd) {
                const p = this.pending;
                this.pending = undefined;
                next.reject(new Error(`VTY command timeout: ${next.cmd}`));
                this.drainQueue();
            }
        }, next.timeoutMs);

        this.pending = {
            cmd: next.cmd,
            lines: [],
            resolve: next.resolve,
            reject: next.reject,
            timer,
            awaitingEcho: true,
            sawAnyOutput: false
        };

        if (this._debug) console.debug(`[VTY TX] ${next.cmd}`);
        this._socket.write(next.cmd + this._eol);
    }

    close() {
        try { this._socket.end(); } catch { /* ignore */ }
    }
}