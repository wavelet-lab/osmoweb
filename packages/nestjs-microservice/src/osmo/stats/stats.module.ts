import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { osmoStatsProviders } from './stats.providers';
import { LoggingModule } from '@websdr/nestjs-microservice/common';

@Module({
    imports: [ConfigModule, LoggingModule],
    providers: [...osmoStatsProviders],
})
export class StatsModule {}
