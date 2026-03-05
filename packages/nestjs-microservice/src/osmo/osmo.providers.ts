import type { LoggerService, Provider } from '@nestjs/common';
import type { LoggerInterface } from '@websdr/core/utils';
import { Router } from '@osmoweb/backend-core';
import type { OsmoParams } from '@osmoweb/backend-core';
import { LOGGER, createContextLogger } from '@websdr/nestjs-microservice/common'
import { OSMO_PARAMS } from './tokens';

export const osmoProviders: Provider[] = [
    {
        provide: Router,
        useFactory: (params: OsmoParams, logger: LoggerService) => {
            const ctxLogger = createContextLogger(logger, 'OsmoRouter');
            const router = new Router(ctxLogger as unknown as LoggerInterface);
            router.init(params);
            return router;
        },
        inject: [OSMO_PARAMS, LOGGER],
    },
];
