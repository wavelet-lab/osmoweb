import { Module } from '@nestjs/common';
import type { Provider } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { StatsService } from './stats.service';
import { StatsCollector } from '@osmoweb/backend-core';
import { InfluxAdapter } from './influx.adapter';
import { PrometheusAdapter } from './prometheus.adapter';

const StatsCollectorProvider: Provider = {
    provide: StatsCollector,
    useFactory: () => new StatsCollector(),
};

const StatsInitProvider: Provider = {
    provide: 'STATS_INIT',
    inject: [ConfigService, StatsService],
    useFactory: (config: ConfigService, statsService: StatsService) => {
        const influxUrl = config.get<string>('INFLUXDB_URL');
        if (influxUrl) {
            const org = config.get<string>('INFLUXDB_ORG');
            const token = config.get<string>('INFLUXDB_TOKEN');
            const bucket = config.get<string>('INFLUXDB_BUCKET');
            statsService.registerWriter(new InfluxAdapter({ url: influxUrl, org, token, bucket }));
        }

        const promUrl = config.get<string>('PROMETHEUS_PUSH_URL');
        if (promUrl) {
            statsService.registerWriter(new PrometheusAdapter({ pushGatewayUrl: promUrl }));
        }

        return true;
    },
};

@Module({
    imports: [ConfigModule],
    providers: [StatsCollectorProvider, StatsService, StatsInitProvider],
    exports: [StatsCollector, StatsService],
})
export class StatsModule {}

export default StatsModule;
