import { OsmoBaseController } from './osmobase.controller';
import type { OsmoBaseStats } from './osmobase.controller';

export interface MscStats extends OsmoBaseStats {
    activeCalls: number;
    subscriberConnections: number;
    rateCounters: Record<string, number>;
    smsPerMinute?: number;   // aggregated per-minute SMS rate
    luPerMinute?: number;    // aggregated per-minute LU rate
}

export class MscController extends OsmoBaseController {

    constructor(host: string = 'localhost', vtyPort: number = 4254, debug: boolean = false) {
        super(host, vtyPort, debug);
    }

    // Parse "show rate-counters" flexible formats into a map name -> { perSecond, perMinute, perHour }
    private parseRateLines(output: string): Record<string, { perSecond?: number; perMinute?: number; perHour?: number }> {
        const rates: Record<string, { perSecond?: number; perMinute?: number; perHour?: number }> = {};
        for (const raw of output.split('\n')) {
            const line = raw.trim();
            if (!line || line.startsWith('#')) continue;

            const nameMatch = line.match(/^(.+?):/);
            const name = nameMatch?.[1]?.trim();
            if (!name) continue;

            // Try variants like: "name: 0.00/s 1.23/min 12.3/h"
            const v1 = line.match(/([0-9.]+)\s*\/s/i);
            const v1m = line.match(/([0-9.]+)\s*\/m(?:in)?/i);
            const v1h = line.match(/([0-9.]+)\s*\/h/i);

            // Try variants like: "name: (1s) 0.00 (1m) 0.10 (1h) 1.23"
            const v2s = line.match(/\(1s\)\s*([0-9.]+)/i);
            const v2m = line.match(/\(1m\)\s*([0-9.]+)/i);
            const v2h = line.match(/\(1h\)\s*([0-9.]+)/i);

            const perSecond = parseFloat(v1?.[1] ?? v2s?.[1] ?? '');
            const perMinute = parseFloat(v1m?.[1] ?? v2m?.[1] ?? '');
            const perHour = parseFloat(v1h?.[1] ?? v2h?.[1] ?? '');

            rates[name] = {
                perSecond: isNaN(perSecond) ? undefined : perSecond,
                perMinute: isNaN(perMinute) ? undefined : perMinute,
                perHour: isNaN(perHour) ? undefined : perHour,
            };
        }
        return rates;
    }

    private parseRateCounters(output: string): Record<string, number> {
        const result: Record<string, number> = {};
        for (const raw of output.split('\n')) {
            const line = raw.trim();
            if (!line) continue;
            const m = line.match(/^(.+?)[\s:=]+([0-9]+)\s*(?:\(|$)/);
            if (m && m[1] && m[2]) {
                const name = m[1].trim();
                const val = parseInt(m[2], 10);
                if (!isNaN(val)) result[name] = val;
            }
        }
        return result;
    }

    private numFrom(output: string, re: RegExp): number {
        const m = output.match(re);
        if (m && m[1]) {
            const v = parseInt(m[1], 10);
            if (!isNaN(v)) return v;
        }
        return 0;
    }

    async getStats(): Promise<MscStats> {
        const baseStats = await super.getStats();

        const [stats, rate] = await Promise.allSettled([
            this.vty.execChecked('show stats'),
            this.vty.execChecked('show rate-counters'),
        ]);

        let activeCalls = 0;
        let subscriberConnections = 0;
        let rateCounters: Record<string, number> = {};
        let smsPerMinute: number | undefined;
        let luPerMinute: number | undefined;

        if (stats.status === 'fulfilled') {
            const out = stats.value.output;
            // Extract key MSC metrics from "network statistics" and VLR sections
            activeCalls = this.numFrom(out, /Currently\s+active\s+calls\s*:\s*(\d+)/i);
            subscriberConnections = this.numFrom(out, /Number\s+of\s+subscribers\s+present\s+in\s+VLR\s*:\s*(\d+)/i);
            rateCounters = this.parseRateCounters(out);
        }

        if (rate.status === 'fulfilled') {
            const map = this.parseRateLines(rate.value.output);
            // Be strict for SMS and include loc_update* for LU
            const smsRe = /^sms[:_]/i;
            const luRe = /^(loc[_-]?update|lu[:_])/i;

            smsPerMinute = Object.entries(map)
                .filter(([k]) => smsRe.test(k))
                .reduce((acc, [, v]) => acc + (v.perMinute ?? 0), 0);

            luPerMinute = Object.entries(map)
                .filter(([k]) => luRe.test(k))
                .reduce((acc, [, v]) => acc + (v.perMinute ?? 0), 0);
        }

        return {
            ...baseStats,
            activeCalls,
            subscriberConnections,
            rateCounters,
            smsPerMinute,
            luPerMinute,
        };
    }
}