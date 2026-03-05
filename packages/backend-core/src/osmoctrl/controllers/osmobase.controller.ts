import { VtyClient } from '@/osmoctrl/vty.client';

export interface OsmoBaseStats {
    status: 'connected' | 'disconnected';
    uptime: number; // seconds
    rateCounters?: Record<string, number>;
}

export class OsmoBaseController {
    private _vty: VtyClient;
    private _debug: boolean;

    constructor(host: string, vtyPort: number, debug: boolean = false) {
        this._debug = debug;
        this._vty = new VtyClient(host, vtyPort, debug);
    }

    get vty(): VtyClient {
        return this._vty;
    }

    async ensureConnected() {
        if (!this._vty.isConnected) {
            await this._vty.connect();
            await this._vty.enable();
        }
    }

    async connect(): Promise<void> {
        await this.ensureConnected();
    }

    /**
     * Parse uptime from various osmo-*-vty outputs and return a normalized string like "1d 2h 3m 4s".
     * Examples of supported formats:
     *  - "OsmoBSC has been running for 0d 1h 58m 16s"
     *  - "Uptime: 1d 2h 3m 4s"
     */
    private parseUptime(output: string): string {
        const lines = output.split('\n').map(l => l.trim()).filter(Boolean);
        for (const line of lines) {
            const mRunning = line.match(/has\s+been\s+running\s+for\s+(.+?)\s*$/i);
            if (mRunning?.[1]) return mRunning[1].trim();

            const mUptime = line.match(/\buptime\b[^:]*:\s*(.+)$/i);
            if (mUptime?.[1]) return mUptime[1].trim();
        }
        return 'n/a';
    }

    /**
     * Public helper: always read uptime from a VIEW-mode (non-enabled) session.
     * This avoids "% Unknown command." when the main session is in enable/configure.
     */
    async getUptime(): Promise<number> {
        try {
            const { output } = await this._vty.execView('show uptime');
            const uptimeStr = this.parseUptime(output);
            const match = uptimeStr.match(/(\d+)d\s+(\d+)h\s+(\d+)m\s+(\d+)s/);
            if (match) {
                const [, days, hours, minutes, seconds] = match.map(Number);
                const totalSeconds = (((days ?? 0) * 24 + (hours ?? 0)) * 60 + (minutes ?? 0)) * 60 + (seconds ?? 0);
                return totalSeconds;
            }
        } catch { /* ignore */ }

        return 0;
    }

    protected parseRateCounters(output: string): Record<string, number> {
        const result: Record<string, number> = {};
        for (const raw of output.split('\n')) {
            const line = raw.trim();
            if (!line) continue;
            // name: value OR name = value
            const m = line.match(/^(.+?)[\s:=]+([0-9]+)\s*(?:\(|$)/);
            if (m && m[1] && m[2]) {
                const name = m[1].trim();
                const val = parseInt(m[2], 10);
                if (!isNaN(val)) result[name] = val;
            }
        }
        return result;
    }

    async getStats(): Promise<OsmoBaseStats> {
        await this.ensureConnected();

        const uptime = await this.getUptime();

        return { status: this._vty.isConnected ? 'connected' : 'disconnected', uptime };
    }

    disconnect(): void {
        this._vty.close();
    }

    isConnected(): boolean {
        return this._vty.isConnected;
    }
}