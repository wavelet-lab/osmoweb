import { JournalLogLevel } from '@/utils/journal';

export function getJournalLogLevelFromOsmoLogLevel(loglevel: number): JournalLogLevel {
    /* Osmo logging levels:
    #define LOGL_DEBUG	1	// debugging information
    #define LOGL_INFO	3	// general information
    #define LOGL_NOTICE	5	// abnormal/unexpected condition
    #define LOGL_ERROR	7	// error condition, requires user action
    #define LOGL_FATAL	8	// fatal, program aborted
    */
    let ret: JournalLogLevel;
    switch (loglevel) {
        case 8:
            return JournalLogLevel.FATAL;
        case 7:
            return JournalLogLevel.ERROR;
        case 5:
            return JournalLogLevel.WARNING;
        case 3:
            return JournalLogLevel.INFO;
        case 1:
        default:
            return JournalLogLevel.DEBUG;
    }
}
