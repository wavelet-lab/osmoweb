import { Module, Global } from '@nestjs/common';
import type { DynamicModule, LoggerService } from '@nestjs/common';

export const LOGGER = Symbol('LOGGER');

export function createContextLogger(base: any, context: string): LoggerService {
    const call = (method: string, ...args: any[]) => {
        const fn = base?.[method] ?? base?.log;
        if (!fn) return;
        if (method === 'error' || method === 'fatal') {
            const [message, trace] = args;
            fn.call(base, message, trace ?? undefined, context);
        } else {
            const [message] = args;
            fn.call(base, message, context);
        }
    };

    return {
        log: (msg: any) => call('log', msg),
        error: (msg: any, trace?: string) => call('error', msg, trace),
        fatal: (msg: any, trace?: string) => call('fatal', msg, trace),
        warn: (msg: any) => call('warn', msg),
        debug: (msg: any) => call('debug', msg),
        verbose: (msg: any) => call('verbose', msg),
    };
}


@Global()
@Module({})
export class LoggingModule {
    static forRoot(loggerInstance: unknown): DynamicModule {
        return {
            module: LoggingModule,
            providers: [
                {
                    provide: LOGGER,
                    useValue: loggerInstance
                }
            ],
            exports: [LOGGER],
        };
    }
}