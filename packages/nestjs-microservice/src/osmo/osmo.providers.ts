import { Logger } from '@nestjs/common';
import type { Provider } from '@nestjs/common';
import type { LoggerInterface } from '@osmoweb/core/utils';
import { Router } from '@osmoweb/backend-core';
import type { OsmoParams } from '@osmoweb/backend-core';
import { LOGGER, createContextLogger } from '@/common/logging.module'
import { OSMO_PARAMS } from './tokens';

export const osmoProviders: Provider[] = [
    {
        provide: Router,
        useFactory: (params: OsmoParams, logger: Logger) => {
            const ctxLogger = createContextLogger(logger, 'OsmoRouter');
            const router = new Router(ctxLogger as unknown as LoggerInterface);
            router.init(params);
            return router;
        },
        inject: [OSMO_PARAMS, LOGGER],
    },
];
