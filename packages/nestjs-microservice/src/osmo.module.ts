import { Module } from '@nestjs/common';
import { osmoProviders, OSMO_PARAMS } from '@/osmo/osmo.providers';
import { CoreRouterAdapter } from '@/osmo/core-router.adapter';
import { AbisOmlGateway } from '@/osmo/gateways/abis-oml.gateway';
import { AbisRslGateway } from '@/osmo/gateways/abis-rsl.gateway';
import { ControlGateway } from '@/osmo/gateways/control.gateway';
import { MediaGateway } from '@/osmo/gateways/media.gateway';
import type { OsmoParams } from '@osmoweb/backend-core';
import { OsmoServices, osmoDefaultParams } from '@osmoweb/backend-core';


@Module({
    providers: [
        {
            provide: OSMO_PARAMS,
            useFactory: (): OsmoParams => {
                const parseEnvNumberValue = (value: string | undefined, defaultValue: number): number => {
                    const parsed = Number(value);
                    return isNaN(parsed) || parsed <= 0 ? defaultValue : parsed;
                };

                const parseEnvStringValue = (value: string | undefined, defaultValue: string): string => {
                    return value?.trim() || defaultValue;
                };

                const serviceConfigs = [
                    { envUriKey: 'OSMO_UDP_MEDIA_URI', envPortKey: 'OSMO_UDP_MEDIA_PORT', defaultKey: OsmoServices.OSMO_UDP_MEDIA },
                    { envUriKey: 'OSMO_TCP_ABIS_OML_URI', envPortKey: 'OSMO_TCP_ABIS_OML_PORT', defaultKey: OsmoServices.OSMO_TCP_ABIS_OML },
                    { envUriKey: 'OSMO_TCP_ABIS_RSL_URI', envPortKey: 'OSMO_TCP_ABIS_RSL_PORT', defaultKey: OsmoServices.OSMO_TCP_ABIS_RSL },
                    { envUriKey: 'OSMO_TCP_HLR_URI', envPortKey: 'OSMO_TCP_HLR_PORT', defaultKey: OsmoServices.OSMO_TCP_HLR },
                    { envUriKey: 'OSMO_TCP_BSC_URI', envPortKey: 'OSMO_TCP_BSC_PORT', defaultKey: OsmoServices.OSMO_TCP_BSC },
                ];

                return {
                    port: parseEnvNumberValue(process.env.OSMO_SERVER_PORT, osmoDefaultParams.port),
                    services: serviceConfigs.map(config => ({
                        serviceUri: parseEnvStringValue(process.env[config.envUriKey], osmoDefaultParams.services[config.defaultKey]?.serviceUri ?? ''),
                        servicePort: parseEnvNumberValue(process.env[config.envPortKey], osmoDefaultParams.services[config.defaultKey]?.servicePort ?? 0),
                    })),
                    controlUri: parseEnvStringValue(process.env.OSMO_CONTROL_URI, osmoDefaultParams.controlUri),
                    abisOmlUri: parseEnvStringValue(process.env.OSMO_ABIS_OML_URI, osmoDefaultParams.abisOmlUri),
                    abisRslUri: parseEnvStringValue(process.env.OSMO_ABIS_RSL_URI, osmoDefaultParams.abisRslUri),
                    mediaUri: parseEnvStringValue(process.env.OSMO_MEDIA_URI, osmoDefaultParams.mediaUri),
                    poolSize: parseEnvNumberValue(process.env.OSMO_WORKER_POOL_SIZE, osmoDefaultParams.poolSize),
                }
            },
        },
        ...osmoProviders,
        CoreRouterAdapter,
        AbisOmlGateway,
        AbisRslGateway,
        ControlGateway,
        MediaGateway,
    ],
})
export class OsmoModule { }