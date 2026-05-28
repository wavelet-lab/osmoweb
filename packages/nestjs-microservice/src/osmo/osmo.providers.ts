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
            const createLogger = (context: string) => createContextLogger(logger, context) as unknown as LoggerInterface;
            const router = new Router(createLogger('OsmoRouter'), createLogger);
            router.init(params);
            return router;
        },
        inject: [OSMO_PARAMS, LOGGER],
    },
];
