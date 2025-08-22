export const LogLevels = ["verbose", "debug", "log", "warn", "error", "fatal"] as const;

export type LogLevel = (typeof LogLevels)[number];

export interface LoggerInterface {
    log(message: any, ...optionalParams: any[]): void;
    error(message: any, ...optionalParams: any[]): void;
    warn(message: any, ...optionalParams: any[]): void;
    debug?(message: any, ...optionalParams: any[]): void;
    verbose?(message: any, ...optionalParams: any[]): void;
    fatal?(message: any, ...optionalParams: any[]): void;
}

export class SimpleLogger implements LoggerInterface {
    protected context?: string | undefined;

    constructor(context?: string) {
        this.context = context;
    };

    private constructMessage(message: string): string {
        if (this.context !== undefined) {
            return `[${this.context}] ${message}`;
        }
        return message;
    }

    log(message: any, ...optionalParams: any[]) {
        console.log(this.constructMessage(message), ...optionalParams);
    }

    error(message: any, ...optionalParams: any[]) {
        console.error(this.constructMessage(message), ...optionalParams);
    }

    warn(message: any, ...optionalParams: any[]) {
        console.warn(this.constructMessage(message), ...optionalParams);
    }

    debug(message: any, ...optionalParams: any[]) {
        console.debug(this.constructMessage(message), ...optionalParams);
    }

    verbose(message: any, ...optionalParams: any[]) {
        console.info(this.constructMessage(message), ...optionalParams);
    }

    fatal(message: any, ...optionalParams: any[]) {
        console.error(this.constructMessage(message), ...optionalParams);
    }
}
