import { Logger } from '@nestjs/common';
import { OsmoBaseController } from './controllers/osmobase.controller';
import type { OsmoBaseStats } from './controllers/osmobase.controller';

export interface CollectedStat {
    id: string;
    stats: OsmoBaseStats;
    timestamp: number;
}

export type CollectedStats = Array<CollectedStat>;

// Group stats by service (use `id` as service name, fallback to 'osmo') and invoke handler
export function forEachOsmoService(stats: CollectedStats, handler: (service: string, items: CollectedStats) => void): void {
    const groups: Record<string, CollectedStats> = {};
    for (const s of stats) {
        const service = (s.id || 'osmo').toString();
        groups[service] = groups[service] || [];
        groups[service].push(s);
    }

    for (const service of Object.keys(groups)) {
        const items = groups[service];
        if (!items || items.length === 0) continue;
        handler(service, items);
    }
}

export function forEachCollectedStat(stats: CollectedStats, handler: (key: string, value: any) => void): void {
    for (const s of stats) {
        // Convert each stat into a Prometheus metric line. For simplicity, we convert all keys to metrics,
        for (const key of Object.keys(s.stats))
            handler(key, s.stats[key as keyof typeof s.stats]);
        // Add rate counters if present
        if (s.stats.rateCounters) {
            for (const key of Object.keys(s.stats.rateCounters))
                handler(key, s.stats.rateCounters[key as keyof typeof s.stats.rateCounters]);
        }
        handler('timestamp', s.timestamp); // add timestamp as a separate metric
    }
}

export interface StatsWriter {
    write(stats: CollectedStats): Promise<void>;
}

export class StatsCollector {
    protected readonly logger = new Logger(StatsCollector.name);
    private controllers: { id: string; controller: OsmoBaseController }[] = [];

    addController(id: string, controller: OsmoBaseController) {
        this.controllers.push({ id, controller });
    }

    async collect(): Promise<CollectedStats> {
        const results: CollectedStats = [];
        const now = Date.now();

        for (const item of this.controllers) {
            try {
                await item.controller.connect();
                const stats = await item.controller.getStats();
                item.controller.disconnect();
                this.logger.debug(`Collected stats from controller ${item.id}: count=${Object.keys(stats).length}`);
                results.push({ id: item.id, stats, timestamp: now });
            } catch (err) {
                this.logger.error(`Failed to collect stats from controller ${item.id}: ${(err as Error).message}`);
                results.push({ id: item.id, stats: { status: 'disconnected', uptime: 0 }, timestamp: now });
            }
        }

        return results;
    }
}

export default StatsCollector;
