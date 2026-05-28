import { Module } from '@nestjs/common';
import { OsmoServices, osmoDefaultParams } from '@osmoweb/backend-core';
import { osmoProviders } from './osmo.providers';
import { CoreRouterAdapter } from './core-router.adapter';
import { AbisOmlGateway } from './gateways/abis-oml.gateway';
import { AbisRslGateway } from './gateways/abis-rsl.gateway';
import { ControlGateway } from './gateways/control.gateway';
import { MediaGateway } from './gateways/media.gateway';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { StatsModule } from './stats/stats.module';
import { BtsController } from './controllers/bts.controller';
import { OSMO_PARAMS } from './tokens';
import { LoggingModule } from '@websdr/nestjs-microservice/common';
import { AuthModule, JwtAuthGuard } from '@websdr/nestjs-microservice/auth';

@Module({
    imports: [ConfigModule, AuthModule, LoggingModule, StatsModule],
    controllers: [BtsController],
    providers: [
        {
            inject: [ConfigService],
            provide: OSMO_PARAMS,
            useFactory: (config: ConfigService) => {
                const parseNumber = (key: string, defaultValue: number): number => {
                    const raw = config.get<string | number | undefined>(key);
                    const parsed = Number(raw);
                    return isNaN(parsed) || parsed <= 0 ? defaultValue : parsed;
                };

                const parseString = (key: string, defaultValue: string): string => {
                    const val = config.get<string | undefined>(key);
                    return (val || defaultValue).toString().trim();
                };

                const serviceConfigs = [
                    { envUriKey: 'OSMO_UDP_MEDIA_URI', envPortKey: 'OSMO_UDP_MEDIA_PORT', defaultKey: OsmoServices.OSMO_UDP_MEDIA },
                    { envUriKey: 'OSMO_TCP_ABIS_OML_URI', envPortKey: 'OSMO_TCP_ABIS_OML_PORT', defaultKey: OsmoServices.OSMO_TCP_ABIS_OML },
                    { envUriKey: 'OSMO_TCP_ABIS_RSL_URI', envPortKey: 'OSMO_TCP_ABIS_RSL_PORT', defaultKey: OsmoServices.OSMO_TCP_ABIS_RSL },
                    { envUriKey: 'OSMO_TCP_HLR_URI', envPortKey: 'OSMO_TCP_HLR_PORT', defaultKey: OsmoServices.OSMO_TCP_HLR },
                    { envUriKey: 'OSMO_TCP_BSC_URI', envPortKey: 'OSMO_TCP_BSC_PORT', defaultKey: OsmoServices.OSMO_TCP_BSC },
                ];

                return {
                    port: parseNumber('OSMO_SERVER_PORT', osmoDefaultParams.port),
                    services: serviceConfigs.map(cfg => ({
                        serviceUri: parseString(cfg.envUriKey, osmoDefaultParams.services[cfg.defaultKey]?.serviceUri ?? ''),
                        servicePort: parseNumber(cfg.envPortKey, osmoDefaultParams.services[cfg.defaultKey]?.servicePort ?? 0),
                    })),
                    controlUri: parseString('OSMO_CONTROL_URI', osmoDefaultParams.controlUri),
                    abisOmlUri: parseString('OSMO_ABIS_OML_URI', osmoDefaultParams.abisOmlUri),
                    abisRslUri: parseString('OSMO_ABIS_RSL_URI', osmoDefaultParams.abisRslUri),
                    mediaUri: parseString('OSMO_MEDIA_URI', osmoDefaultParams.mediaUri),
                    poolSize: parseNumber('OSMO_WORKER_POOL_SIZE', osmoDefaultParams.poolSize),
                };
            },
        },
        JwtAuthGuard,
        ...osmoProviders,
        CoreRouterAdapter,
        AbisOmlGateway,
        AbisRslGateway,
        ControlGateway,
        MediaGateway,
    ],
})
export class OsmoModule { }