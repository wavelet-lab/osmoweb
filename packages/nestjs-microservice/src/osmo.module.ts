import { Module } from '@nestjs/common';
import { osmoProviders, OSMO_PARAMS } from '@/osmo/osmo.providers';
import { CoreRouterAdapter } from '@/osmo/core-router.adapter';
import { AbisOmlGateway } from '@/osmo/gateways/abis-oml.gateway';
import { AbisRslGateway } from '@/osmo/gateways/abis-rsl.gateway';
import { ControlGateway } from '@/osmo/gateways/control.gateway';
import { MediaGateway } from '@/osmo/gateways/media.gateway';
import type { OsmoParams } from '@osmoweb/backend-core';

@Module({
    providers: [
        {
            provide: OSMO_PARAMS,
            useFactory: (): OsmoParams => ({
                port: Number(process.env.OSMO_SERVER_PORT) || 3000,
                services: [
                    {
                        serviceUri: process.env.OSMO_UDP_MEDIA_URI || 'localhost',
                        servicePort: Number(process.env.OSMO_UDP_MEDIA_PORT) || 1984,
                    },
                    {
                        serviceUri: process.env.OSMO_TCP_ABIS_OML_URI || 'localhost',
                        servicePort: Number(process.env.OSMO_TCP_ABIS_OML_PORT) || 3002,
                    },
                    {
                        serviceUri: process.env.OSMO_TCP_ABIS_RSL_URI || 'localhost',
                        servicePort: Number(process.env.OSMO_TCP_ABIS_RSL_PORT) || 3003,
                    },
                    {
                        serviceUri: process.env.OSMO_TCP_HLR_URI || 'localhost',
                        servicePort: Number(process.env.OSMO_TCP_HLR_PORT) || 4258,
                    },
                    {
                        serviceUri: process.env.OSMO_TCP_BSC_URI || 'localhost',
                        servicePort: Number(process.env.OSMO_TCP_BSC_PORT) || 4242,
                    },
                ],
                controlUri: process.env.OSMO_CONTROL_URI || '/wsdr/osmo/control',
                abisOmlUri: process.env.OSMO_ABIS_OML_URI || '/wsdr/osmo/abis_oml',
                abisRslUri: process.env.OSMO_ABIS_RSL_URI || '/wsdr/osmo/abis_rsl',
                mediaUri: process.env.OSMO_MEDIA_URI || '/wsdr/osmo/media',
                poolSize: Number(process.env.OSMO_WORKER_POOL_SIZE) || 4,
            }),
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