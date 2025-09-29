import { VtyClient } from '@/osmoctrl/vty.client';

export interface OsmoBaseStats {
    status: 'connected' | 'disconnected';
    uptime: string;
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
     * Parse uptime from various osmo-*-vty outputs.
     * Supports:
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
    async getUptime(): Promise<string> {
        try {
            const { output } = await this._vty.execView('show uptime');
            return this.parseUptime(output);
        } catch {
            return 'n/a';
        }
    }

    async getStats(): Promise<OsmoBaseStats> {
        await this.ensureConnected();

        return {
            status: this._vty.isConnected ? 'connected' : 'disconnected',
            uptime: await this.getUptime(),
        };
    }

    disconnect(): void {
        this._vty.close();
    }

    isConnected(): boolean {
        return this._vty.isConnected;
    }
}