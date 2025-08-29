import type { Provider } from '@nestjs/common';
import { Router } from '@osmoweb/backend-core';
import type { OsmoParams } from '@osmoweb/backend-core';

export const OSMO_PARAMS = Symbol('OSMO_PARAMS');

export const osmoProviders: Provider[] = [
    {
        provide: Router,
        useFactory: (params: OsmoParams) => {
            const router = new Router();
            router.init(params);
            return router;
        },
        inject: [OSMO_PARAMS],
    },
];
