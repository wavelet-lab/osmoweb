import { Logger } from '@nestjs/common';
import { forEachOsmoService, forEachCollectedStat } from '@osmoweb/backend-core';
import type { StatsWriter, CollectedStats } from '@osmoweb/backend-core';

export interface PrometheusOptions {
    // Either a full push URL (including /metrics or /metrics/job/...),
    // or a base URL like http://pushgateway:9091 — adapter will construct
    // per-job endpoints: /metrics/job/<job>/instance/<instance>
    pushGatewayUrl: string;
}

export class PrometheusAdapter implements StatsWriter {
    protected readonly logger = new Logger(PrometheusAdapter.name);
    private opts: PrometheusOptions;

    constructor(opts: PrometheusOptions) {
        this.opts = opts;
        this.logger.log(`Initialized PrometheusAdapter with pushGatewayUrl=${opts.pushGatewayUrl}`);
    }

    async write(stats: CollectedStats): Promise<void> {
        if (!this.opts.pushGatewayUrl) return;
        
        // For each service, POST metrics to Pushgateway under job/instance grouping
        const promises: Promise<any>[] = [];
        forEachOsmoService(stats, (service, items) => {
            this.logger.debug?.(`Preparing stats for service "${service}"`);

            // Build body in exposition format
            const lines: string[] = [];
            forEachCollectedStat(items, (key, value) => {
                const line = this.generateMetricString(key, value);
                if (line) lines.push(line);
            });
            if (lines.length === 0) return; // skip if no metrics to push
            const pushUrl = this.buildWriteUrl(this.opts.pushGatewayUrl, service);

            this.logger.debug?.(`Pushing ${lines.length} stats to Prometheus Pushgateway at ${pushUrl}`);

            promises.push(
                fetch(pushUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
                    body: lines.join('\n') + '\n',
                }).catch((err) => {
                    this.logger.error(`Failed to push metrics to ${pushUrl}: ${(err as Error).message ?? err}`);
                    return null;
                })
            );
        });

        await Promise.allSettled(promises);
    }

    private escapeMetricName(k: string): string {
        // Prometheus metric name rules: [A-Za-z_:][A-Za-z0-9_:]*
        let name = String(k).replace(/[^A-Za-z0-9_:]/g, '_');
        if (!/^[A-Za-z_:]/.test(name)) name = '_' + name; // ensure valid first char
        return name;
    }

    private escapeStringFieldValue(v: string): string {
        return String(v).replace(/"/g, '\\"');
    }

    private buildWriteUrl(url: string, service: string): string {
        if (!/\/metrics(\/|$)/.test(url) && !/\/job\//.test(url)) {
            // pushgateway expects /metrics/job/<job>/instance/<instance>. We push aggregated
            // for the job by omitting instance (use job-only): /metrics/job/<job>
            const baseUrl = url.replace(/\/$/, '');
            return `${baseUrl}/metrics/job/${encodeURIComponent(service)}`;
        }
        return url; // already contains /metrics or /job/, use as-is
    }

    // returns a single field piece like: key=123 or key="str"
    private generateMetricString(key: string, value: any): string {
        const k = this.escapeMetricName(key);
        if (k === 'status') {
            const statusVal = value === 'connected' ? 1 : 0;
            return `${k} ${statusVal}`;
        }

        if (k === 'timestamp') {
            return `${k} ${value}`;
        }

        if (typeof value === 'number') {
            return `${k} ${value}`;
        }

        if (typeof value === 'string') {
            const sanitizedVal = this.escapeStringFieldValue(value);
            return `${k}{value="${sanitizedVal}"} 1`;
        }

        return '';
    }
}

export default PrometheusAdapter;
