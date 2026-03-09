import { forEachOsmoService, forEachCollectedStat } from '@/osmostats/stats';
import type { StatsWriter, CollectedStats } from '@/osmostats/stats';
import type { LoggerInterface } from '@websdr/core/utils';
import { SimpleLogger } from '@websdr/core/utils';

export interface InfluxOptions {
    url: string; // write endpoint
    org?: string;
    bucket?: string;
    token?: string;
}

export class InfluxAdapter implements StatsWriter {
    protected readonly logger: LoggerInterface;
    private opts: InfluxOptions;

    constructor(opts: InfluxOptions, logger?: LoggerInterface) {
        this.opts = opts;
        this.logger = logger ?? new SimpleLogger(InfluxAdapter.name);
        this.logger.log(`Initialized InfluxAdapter with url=${opts.url}`);
    }

    async write(stats: CollectedStats): Promise<void> {
        if (!this.opts.url) return;

        // Convert to InfluxDB line-protocol (small, safe subset)
        const lines: string[] = [];
        forEachOsmoService(stats, (service, items) => {
            const tags = `id=${this.escapeTagValue(service)}`;
            const fieldParts: string[] = [];
            let tsNs = 0;
            forEachCollectedStat(items, (key, value) => {
                if (key === 'timestamp') {
                    tsNs = Number(value) * 1_000_000; // convert ms to ns for InfluxDB timestamp, and use it as the line timestamp instead of a field
                    return; // skip timestamp as a field, use it as the line timestamp instead
                }
                const field = this.generateMetricString(key, value);
                if (field) fieldParts.push(field);
            });
            if (fieldParts.length === 0) return; // skip if no fields
            lines.push(`osmo_stats,${tags} ${fieldParts.join(',')} ${tsNs}`);
        });

        const pushUrl = this.buildWriteUrl(this.opts.url);

        this.logger.debug?.(`Pushing ${lines.length} stats to InfluxDB at ${pushUrl}`);

        try {
            const res = await fetch(pushUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'text/plain; charset=utf-8',
                    ...(this.opts.token ? { Authorization: `Token ${this.opts.token}` } : {}),
                },
                body: lines.join('\n') + '\n',
            });

            if (!res.ok) {
                this.logger.error(`Influx push returned ${res.status} ${res.statusText} for ${this.opts.url}`);
            }
        } catch (err) {
            this.logger.error(`Failed to push metrics to InfluxDB at ${this.opts.url}: ${(err as Error).message ?? err}`);
            // swallow the error to avoid crashing the whole process
        }
    }

    private escapeTagValue(v: any): string {
        return String(v).replace(/([ ,=])/g, "\\$1");
    }

    private escapeMetricName(k: string): string {
        return String(k).replace(/([ ,=])/g, "\\$1");
    }

    private escapeStringFieldValue(v: string): string {
        return String(v).replace(/"/g, '\\"');
    }

    private buildWriteUrl(url: string): string {
        if (!/\/api(\/|$)/.test(url)) {
            const baseUrl = url.replace(/\/$/, ''); // remove trailing slash if any
            if (this.opts.org && this.opts.bucket)
                return `${baseUrl}/api/v2/write?org=${encodeURIComponent(this.opts.org)}&bucket=${encodeURIComponent(this.opts.bucket)}&precision=ns`;
            // fallback: at least add the write path with ns precision
            return `${baseUrl}/api/v2/write?precision=ns`;
        }
        return url; // already contains /api/v2/write, use as-is
    }

    // returns a single field piece like: key=123 or key="str"
    private generateMetricString(key: string, value: any): string {
        const k = this.escapeMetricName(key);

        if (key === 'status') {
            const statusVal = value === 'connected' ? 1 : 0;
            return `${k}=${statusVal}`;
        }

        if (k === 'timestamp') {
            // skip timestamp as a field, use it as the line timestamp instead
            return '';
        }

        if (typeof value === 'number' && Number.isFinite(value)) {
            return `${k}=${value}`;
        }

        if (typeof value === 'boolean') {
            return `${k}=${value ? 'true' : 'false'}`;
        }

        if (typeof value === 'string') {
            const escaped = this.escapeStringFieldValue(String(value ?? ''));
            return `${k}="${escaped}"`;
        }

        return ''; // skip unsupported types (objects, arrays, etc.)
    }
}

export default InfluxAdapter;
