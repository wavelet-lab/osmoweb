import { Injectable } from '@nestjs/common';
import type { OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
    StatsCollector, BscController, HlrController, MgwController,
    MscController, StpController
} from '@osmoweb/backend-core';
import type { StatsWriter } from '@osmoweb/backend-core';
import { stringToBoolean } from '@websdr/core/utils'
import type { LoggerInterface } from '@websdr/core/utils';
import { SimpleLogger } from '@websdr/core/utils';

@Injectable()
export class StatsService implements OnModuleInit, OnModuleDestroy {
    protected readonly logger: LoggerInterface;
    private intervalHandle: NodeJS.Timeout | null = null;
    private writers: StatsWriter[] = [];

    constructor(private readonly config: ConfigService, private readonly collector: StatsCollector, logger?: LoggerInterface) {
        this.logger = logger ?? new SimpleLogger(StatsService.name);
        this.logger.log('StatsService initialized');
    }

    registerWriter(w: StatsWriter) {
        this.writers.push(w);
    }

    async onModuleInit() {
        const rawEnabled = this.config.get<string | boolean | undefined>('STATS_ENABLED') ?? true;
        const enabled = typeof rawEnabled === 'boolean' ? rawEnabled : stringToBoolean(rawEnabled);
        const interval = Number(this.config.get<number>('STATS_INTERVAL_MS') ?? 10_000);

        const writerNames = this.writers.map(w => w.constructor.name).join(', ') || 'none';
        this.logger.log(`StatsService onModuleInit: enabled=${enabled}, interval=${interval}ms, writers=${writerNames}`);

        if (!enabled || this.writers.length === 0) return;

        this.logger.log(`Starting stats polling every ${interval}ms`);
        this.collector.addController('osmo-bsc', new BscController());
        this.collector.addController('osmo-hlr', new HlrController());
        this.collector.addController('osmo-mgw', new MgwController());
        this.collector.addController('osmo-msc', new MscController());
        this.collector.addController('osmo-stp', new StpController());
        this.intervalHandle = setInterval(() => this.collectAndWrite().catch(err => this.logger.error(err)), interval);
        // run immediately once
        await this.collectAndWrite();
    }

    async collectAndWrite() {
        const stats = await this.collector.collect();
        await Promise.allSettled(this.writers.map(w => w.write(stats)));
    }

    async onModuleDestroy() {
        if (this.intervalHandle) {
            clearInterval(this.intervalHandle);
            this.intervalHandle = null;
        }
    }
}

export default StatsService;
