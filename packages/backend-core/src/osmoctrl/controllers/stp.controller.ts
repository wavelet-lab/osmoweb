import { OsmoBaseController } from './osmobase.controller';
import type { OsmoBaseStats } from './osmobase.controller';

export interface StpStats extends OsmoBaseStats {
    rateCounters: Record<string, number>;
}

export class StpController extends OsmoBaseController {
    constructor(host: string = 'localhost', vtyPort: number = 4239, debug: boolean = false) {
        super(host, vtyPort, debug);
    }

    async getStats(): Promise<StpStats> {
        const baseStats = await super.getStats();

        const stats = await this.vty.execChecked('show stats');
        const rateCounters = this.parseRateCounters(stats.output);

        return {
            ...baseStats,
            rateCounters
        };
    }
}