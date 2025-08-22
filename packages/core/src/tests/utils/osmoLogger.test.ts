import { describe, it, expect } from 'vitest';
import { OsmoLogLevel, getOsmoLogLevel } from '@/utils/osmoLogger';
import type { LogItem, OsmoLogLevelKeys } from '@/utils/osmoLogger';

describe('Logging Utils', () => {
    describe('LogLevel enum', () => {
        it('should have correct string values', () => {
            expect(OsmoLogLevel.DEBUG).toBe('DEBUG');
            expect(OsmoLogLevel.INFO).toBe('INFO');
            expect(OsmoLogLevel.WARNING).toBe('WARNING');
            expect(OsmoLogLevel.ERROR).toBe('ERROR');
            expect(OsmoLogLevel.FATAL).toBe('FATAL');
        });

        it('should have all expected log levels', () => {
            const levels = Object.values(OsmoLogLevel);
            expect(levels).toHaveLength(5);
            expect(levels).toContain('DEBUG');
            expect(levels).toContain('INFO');
            expect(levels).toContain('WARNING');
            expect(levels).toContain('ERROR');
            expect(levels).toContain('FATAL');
        });
    });

    describe('LogItem interface', () => {
        it('should accept valid log item structure', () => {
            const logItem: LogItem = {
                timestamp: Date.now(),
                subSystem: 'test-system',
                logLevel: OsmoLogLevel.INFO,
                message: 'Test message'
            };

            expect(logItem.timestamp).toBeTypeOf('number');
            expect(logItem.subSystem).toBeTypeOf('string');
            expect(logItem.logLevel).toBe(OsmoLogLevel.INFO);
            expect(logItem.message).toBeTypeOf('string');
        });
    });

    describe('getOsmoLogLevel', () => {
        it('should map LOGL_FATAL (8) to OsmoLogLevel.FATAL', () => {
            expect(getOsmoLogLevel(8)).toBe(OsmoLogLevel.FATAL);
        });

        it('should map LOGL_ERROR (7) to OsmoLogLevel.ERROR', () => {
            expect(getOsmoLogLevel(7)).toBe(OsmoLogLevel.ERROR);
        });

        it('should map LOGL_NOTICE (5) to OsmoLogLevel.WARNING', () => {
            expect(getOsmoLogLevel(5)).toBe(OsmoLogLevel.WARNING);
        });

        it('should map LOGL_INFO (3) to OsmoLogLevel.INFO', () => {
            expect(getOsmoLogLevel(3)).toBe(OsmoLogLevel.INFO);
        });

        it('should map LOGL_DEBUG (1) to OsmoLogLevel.DEBUG', () => {
            expect(getOsmoLogLevel(1)).toBe(OsmoLogLevel.DEBUG);
        });

        it('should default to OsmoLogLevel.DEBUG for unknown values', () => {
            expect(getOsmoLogLevel(0)).toBe(OsmoLogLevel.DEBUG);
            expect(getOsmoLogLevel(2)).toBe(OsmoLogLevel.DEBUG);
            expect(getOsmoLogLevel(4)).toBe(OsmoLogLevel.DEBUG);
            expect(getOsmoLogLevel(6)).toBe(OsmoLogLevel.DEBUG);
            expect(getOsmoLogLevel(9)).toBe(OsmoLogLevel.DEBUG);
            expect(getOsmoLogLevel(-1)).toBe(OsmoLogLevel.DEBUG);
            expect(getOsmoLogLevel(100)).toBe(OsmoLogLevel.DEBUG);
        });

        it('should handle edge case values', () => {
            expect(getOsmoLogLevel(Number.MAX_SAFE_INTEGER)).toBe(OsmoLogLevel.DEBUG);
            expect(getOsmoLogLevel(Number.MIN_SAFE_INTEGER)).toBe(OsmoLogLevel.DEBUG);
            expect(getOsmoLogLevel(0)).toBe(OsmoLogLevel.DEBUG);
        });
    });

    describe('Type compatibility', () => {
        it('should work with OsmoLogLevelKeys type', () => {
            const keys: OsmoLogLevelKeys[] = ['DEBUG', 'INFO', 'WARNING', 'ERROR', 'FATAL'];

            keys.forEach(key => {
                expect(OsmoLogLevel[key]).toBeDefined();
                expect(typeof OsmoLogLevel[key]).toBe('string');
            });
        });

        it('should create valid LogItem with all log levels', () => {
            const timestamp = Date.now();
            const subSystem = 'test';
            const message = 'test message';

            Object.values(OsmoLogLevel).forEach(level => {
                const logItem: LogItem = {
                    timestamp,
                    subSystem,
                    logLevel: level,
                    message
                };

                expect(logItem.logLevel).toBe(level);
            });
        });
    });
});