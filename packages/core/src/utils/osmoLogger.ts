export enum OsmoLogLevel {
    DEBUG = 'DEBUG',	// debugging information
    INFO = 'INFO',	    // general information
    WARNING = 'WARNING',// abnormal/unexpected condition
    ERROR = 'ERROR',	// error condition, requires user action
    FATAL = 'FATAL',	// fatal, program aborted
}

export type OsmoLogLevelKeys = keyof typeof OsmoLogLevel;

export interface LogItem {
    timestamp: number,
    subSystem: string,
    logLevel: OsmoLogLevel,
    message: string,
}

export function getOsmoLogLevel(loglevel: number): OsmoLogLevel {
    /* Osmo logging levels:
    #define LOGL_DEBUG	1	// debugging information
    #define LOGL_INFO	3	// general information
    #define LOGL_NOTICE	5	// abnormal/unexpected condition
    #define LOGL_ERROR	7	// error condition, requires user action
    #define LOGL_FATAL	8	// fatal, program aborted
    */
    let ret: OsmoLogLevel;
    switch (loglevel) {
        case 8:
            return OsmoLogLevel.FATAL;
        case 7:
            return OsmoLogLevel.ERROR;
        case 5:
            return OsmoLogLevel.WARNING;
        case 3:
            return OsmoLogLevel.INFO;
        case 1:
        default:
            return OsmoLogLevel.DEBUG;
    }
}
