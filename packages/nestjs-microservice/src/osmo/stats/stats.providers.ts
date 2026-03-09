import type { LoggerService, Provider } from '@nestjs/common';
import {
    StatsCollector, InfluxAdapter, PrometheusAdapter
} from '@osmoweb/backend-core/osmostats';
import { ConfigService } from '@nestjs/config';
import { StatsService } from './stats.service';
import { LOGGER, createContextLogger } from '@websdr/nestjs-microservice/common'

export const osmoStatsProviders: Provider[] = [
    {
        inject: [LOGGER],
        provide: StatsCollector,
        useFactory: (logger: LoggerService) => {
            const ctxLogger = createContextLogger(logger, 'StatsCollector');
            return new StatsCollector(ctxLogger);
        },
    },
    {
        inject: [ConfigService, StatsCollector, LOGGER],
        provide: StatsService,
        useFactory: (config: ConfigService, collector: StatsCollector, logger: LoggerService) => {
            const ctxLogger = createContextLogger(logger, 'StatsService');
            return new StatsService(config, collector, ctxLogger);
        },
    },
    {
        inject: [ConfigService, StatsService, LOGGER],
        provide: 'STATS_INIT',
        useFactory: (config: ConfigService, statsService: StatsService, logger: LoggerService) => {
            const influxUrl = config.get<string>('INFLUXDB_URL');
            if (influxUrl) {
                const ctxLogger = createContextLogger(logger, 'InfluxAdapter');
                const org = config.get<string>('INFLUXDB_ORG');
                const token = config.get<string>('INFLUXDB_TOKEN');
                const bucket = config.get<string>('INFLUXDB_BUCKET');
                statsService.registerWriter(new InfluxAdapter({ url: influxUrl, org, token, bucket }, ctxLogger));
            }

            const promUrl = config.get<string>('PROMETHEUS_PUSH_URL');
            if (promUrl) {
                const ctxLogger = createContextLogger(logger, 'PrometheusAdapter');
                statsService.registerWriter(new PrometheusAdapter({ pushGatewayUrl: promUrl }, ctxLogger));
            }

            return true;
        }
    },
];
