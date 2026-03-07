import { OsmoBaseController } from './osmobase.controller';
import type { OsmoBaseStats } from './osmobase.controller';

export interface MgwStats extends OsmoBaseStats {
    endpointCount: number;
    connectionCount: number;
    rateCounters: Record<string, number>;
}

export class MgwController extends OsmoBaseController {
    constructor(host: string = 'localhost', vtyPort: number = 4243, debug: boolean = false) {
        super(host, vtyPort, debug);
    }

    // Parse from "mgw trunk ... (virtual-0:common)" block of "show stats"
    private parseEndpointsFromStats(output: string): { endpointCount: number; connectionCount: number } {
        const lines = output.split('\n').map(l => l.trim());
        let endpointCount = 0;
        let inUse = 0;

        for (const line of lines) {
            let m = line.match(/Number of endpoints that exist on the trunk:\s*(\d+)/i);
            if (m && m[1]) {
                const v = parseInt(m[1], 10);
                if (!isNaN(v)) endpointCount = v;
            }
            m = line.match(/Number of endpoints in use:\s*(\d+)/i);
            if (m && m[1]) {
                const v = parseInt(m[1], 10);
                if (!isNaN(v)) inUse = v;
            }
        }

        return { endpointCount, connectionCount: inUse };
    }

    async getStats(): Promise<MgwStats> {
        const baseStats = await super.getStats();

        const stats = await this.vty.execChecked('show stats');
        const rateCounters = this.parseRateCounters(stats.output);
        const epParsed = this.parseEndpointsFromStats(stats.output);

        return {
            ...baseStats,
            ...epParsed,
            rateCounters
        };
    }
}