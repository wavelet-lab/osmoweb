export enum JournalLogLevel {
    DEBUG = 'DEBUG',	// debugging information
    INFO = 'INFO',	    // general information
    WARNING = 'WARNING',// abnormal/unexpected condition
    ERROR = 'ERROR',	// error condition, requires user action
    FATAL = 'FATAL',	// fatal, program aborted
}

export type JournalLogLevelKeys = keyof typeof JournalLogLevel;

export interface JournalLogItem {
    timestamp: number,
    subSystem: string,
    logLevel: JournalLogLevel,
    message: string,
}
