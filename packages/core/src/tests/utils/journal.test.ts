import { describe, it, expect } from 'vitest';
import { JournalLogLevel } from '@/utils/journal';
import type { JournalLogItem, JournalLogLevelKeys } from '@/utils/journal';

describe('Logging Utils', () => {
    describe('LogLevel enum', () => {
        it('should have correct string values', () => {
            expect(JournalLogLevel.DEBUG).toBe('DEBUG');
            expect(JournalLogLevel.INFO).toBe('INFO');
            expect(JournalLogLevel.WARNING).toBe('WARNING');
            expect(JournalLogLevel.ERROR).toBe('ERROR');
            expect(JournalLogLevel.FATAL).toBe('FATAL');
        });

        it('should have all expected log levels', () => {
            const levels = Object.values(JournalLogLevel);
            expect(levels).toHaveLength(5);
            expect(levels).toContain('DEBUG');
            expect(levels).toContain('INFO');
            expect(levels).toContain('WARNING');
            expect(levels).toContain('ERROR');
            expect(levels).toContain('FATAL');
        });
    });

    describe('JournalLogItem interface', () => {
        it('should accept valid log item structure', () => {
            const logItem: JournalLogItem = {
                timestamp: Date.now(),
                subSystem: 'test-system',
                logLevel: JournalLogLevel.INFO,
                message: 'Test message'
            };

            expect(logItem.timestamp).toBeTypeOf('number');
            expect(logItem.subSystem).toBeTypeOf('string');
            expect(logItem.logLevel).toBe(JournalLogLevel.INFO);
            expect(logItem.message).toBeTypeOf('string');
        });
    });

    describe('Type compatibility', () => {
        it('should work with JournalLogLevelKeys type', () => {
            const keys: JournalLogLevelKeys[] = ['DEBUG', 'INFO', 'WARNING', 'ERROR', 'FATAL'];

            keys.forEach(key => {
                expect(JournalLogLevel[key]).toBeDefined();
                expect(typeof JournalLogLevel[key]).toBe('string');
            });
        });

        it('should create valid OsmoLogItem with all log levels', () => {
            const timestamp = Date.now();
            const subSystem = 'test';
            const message = 'test message';

            Object.values(JournalLogLevel).forEach(level => {
                const logItem: JournalLogItem = {
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