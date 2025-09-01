import { describe, it, expect } from 'vitest';
import { getJournalLogLevelFromOsmoLogLevel } from '@/osmo/osmoLogger';
import { JournalLogLevel } from '@/utils/journal';

describe('Osmo Logging Utils', () => {
    describe('getJournalLogLevel', () => {
        it('should map LOGL_FATAL (8) to JournalLogLevel.FATAL', () => {
            expect(getJournalLogLevelFromOsmoLogLevel(8)).toBe(JournalLogLevel.FATAL);
        });

        it('should map LOGL_ERROR (7) to JournalLogLevel.ERROR', () => {
            expect(getJournalLogLevelFromOsmoLogLevel(7)).toBe(JournalLogLevel.ERROR);
        });

        it('should map LOGL_NOTICE (5) to JournalLogLevel.WARNING', () => {
            expect(getJournalLogLevelFromOsmoLogLevel(5)).toBe(JournalLogLevel.WARNING);
        });

        it('should map LOGL_INFO (3) to JournalLogLevel.INFO', () => {
            expect(getJournalLogLevelFromOsmoLogLevel(3)).toBe(JournalLogLevel.INFO);
        });

        it('should map LOGL_DEBUG (1) to JournalLogLevel.DEBUG', () => {
            expect(getJournalLogLevelFromOsmoLogLevel(1)).toBe(JournalLogLevel.DEBUG);
        });

        it('should default to JournalLogLevel.DEBUG for unknown values', () => {
            expect(getJournalLogLevelFromOsmoLogLevel(0)).toBe(JournalLogLevel.DEBUG);
            expect(getJournalLogLevelFromOsmoLogLevel(2)).toBe(JournalLogLevel.DEBUG);
            expect(getJournalLogLevelFromOsmoLogLevel(4)).toBe(JournalLogLevel.DEBUG);
            expect(getJournalLogLevelFromOsmoLogLevel(6)).toBe(JournalLogLevel.DEBUG);
            expect(getJournalLogLevelFromOsmoLogLevel(9)).toBe(JournalLogLevel.DEBUG);
            expect(getJournalLogLevelFromOsmoLogLevel(-1)).toBe(JournalLogLevel.DEBUG);
            expect(getJournalLogLevelFromOsmoLogLevel(100)).toBe(JournalLogLevel.DEBUG);
        });

        it('should handle edge case values', () => {
            expect(getJournalLogLevelFromOsmoLogLevel(Number.MAX_SAFE_INTEGER)).toBe(JournalLogLevel.DEBUG);
            expect(getJournalLogLevelFromOsmoLogLevel(Number.MIN_SAFE_INTEGER)).toBe(JournalLogLevel.DEBUG);
            expect(getJournalLogLevelFromOsmoLogLevel(0)).toBe(JournalLogLevel.DEBUG);
        });
    });
});