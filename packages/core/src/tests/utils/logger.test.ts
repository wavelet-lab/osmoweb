import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { SimpleLogger, LogLevels } from '@/utils/logger';
import type { LoggerInterface, LogLevel } from '@/utils/logger';

describe('Logger', () => {
    let logger: SimpleLogger;
    let loggerWithContext: SimpleLogger;
    let consoleLogSpy: any;
    let consoleErrorSpy: any;
    let consoleDebugSpy: any;
    let consoleInfoSpy: any;
    let consoleWarnSpy: any;

    beforeEach(() => {
        logger = new SimpleLogger();
        loggerWithContext = new SimpleLogger('TestContext');
        consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => { });
        consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => { });
        consoleDebugSpy = vi.spyOn(console, 'debug').mockImplementation(() => { });
        consoleInfoSpy = vi.spyOn(console, 'info').mockImplementation(() => { });
        consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => { });
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe('LOG_LEVELS', () => {
        it('should export correct log levels', () => {
            expect(LogLevels).toEqual(["verbose", "debug", "log", "warn", "error", "fatal"]);
        });
    });

    describe('LoggerInterface', () => {
        it('should define required methods', () => {
            expect(typeof logger.log).toBe('function');
            expect(typeof logger.error).toBe('function');
            expect(typeof logger.warn).toBe('function');
        });

        it('should define optional methods', () => {
            expect(typeof logger.debug).toBe('function');
            expect(typeof logger.verbose).toBe('function');
            expect(typeof logger.fatal).toBe('function');
        });
    });

    describe('SimpleLogger Constructor', () => {
        it('should create logger without context', () => {
            const loggerNoContext = new SimpleLogger();
            expect(loggerNoContext).toBeInstanceOf(SimpleLogger);
        });

        it('should create logger with context', () => {
            const loggerWithCtx = new SimpleLogger('MyContext');
            expect(loggerWithCtx).toBeInstanceOf(SimpleLogger);
        });

        it('should create logger with undefined context', () => {
            const loggerUndefinedCtx = new SimpleLogger(undefined);
            expect(loggerUndefinedCtx).toBeInstanceOf(SimpleLogger);
        });
    });

    describe('SimpleLogger without context', () => {
        describe('debug method', () => {
            it('should call console.debug with message only', () => {
                const message = 'Debug message';
                logger.debug(message);

                expect(consoleDebugSpy).toHaveBeenCalledTimes(1);
                expect(consoleDebugSpy).toHaveBeenCalledWith(message);
            });

            it('should call console.debug with message and optional parameters', () => {
                const message = 'Debug message';
                const param1 = { key: 'value' };
                const param2 = 123;
                const param3 = ['array', 'item'];

                logger.debug(message, param1, param2, param3);

                expect(consoleDebugSpy).toHaveBeenCalledTimes(1);
                expect(consoleDebugSpy).toHaveBeenCalledWith(message, param1, param2, param3);
            });

            it('should handle empty message', () => {
                logger.debug('');

                expect(consoleDebugSpy).toHaveBeenCalledTimes(1);
                expect(consoleDebugSpy).toHaveBeenCalledWith('');
            });

            it('should handle undefined and null parameters', () => {
                const message = 'Debug with null/undefined';
                logger.debug(message, undefined, null);

                expect(consoleDebugSpy).toHaveBeenCalledTimes(1);
                expect(consoleDebugSpy).toHaveBeenCalledWith(message, undefined, null);
            });

            it('should handle complex objects as parameters', () => {
                const message = 'Debug with complex data';
                const complexObj = {
                    nested: { deep: { value: 'test' } },
                    array: [1, 2, 3],
                    func: () => 'function'
                };

                logger.debug(message, complexObj);

                expect(consoleDebugSpy).toHaveBeenCalledTimes(1);
                expect(consoleDebugSpy).toHaveBeenCalledWith(message, complexObj);
            });
        });

        describe('other methods without context', () => {
            it('should call console.log with message and parameters', () => {
                const message = 'Log message';
                const param = 'extra';

                logger.log(message, param);

                expect(consoleLogSpy).toHaveBeenCalledTimes(1);
                expect(consoleLogSpy).toHaveBeenCalledWith(message, param);
            });

            it('should call console.error with message and parameters', () => {
                const message = 'Error message';
                const param = 'error details';

                logger.error(message, param);

                expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
                expect(consoleErrorSpy).toHaveBeenCalledWith(message, param);
            });

            it('should call console.info for verbose with message and parameters', () => {
                const message = 'Verbose message';
                const param = 'verbose details';

                logger.verbose(message, param);

                expect(consoleInfoSpy).toHaveBeenCalledTimes(1);
                expect(consoleInfoSpy).toHaveBeenCalledWith(message, param);
            });

            it('should call console.warn with message and parameters', () => {
                const message = 'Warning message';
                const param = 'warning details';

                logger.warn(message, param);

                expect(consoleWarnSpy).toHaveBeenCalledTimes(1);
                expect(consoleWarnSpy).toHaveBeenCalledWith(message, param);
            });

            it('should call console.error for fatal messages', () => {
                const message = 'Fatal error';
                const param = 'fatal details';

                logger.fatal(message, param);

                expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
                expect(consoleErrorSpy).toHaveBeenCalledWith(message, param);
            });
        });
    });

    describe('SimpleLogger with context', () => {
        describe('debug method with context', () => {
            it('should call console.debug with formatted message', () => {
                const message = 'Debug message';
                loggerWithContext.debug(message);

                expect(consoleDebugSpy).toHaveBeenCalledTimes(1);
                expect(consoleDebugSpy).toHaveBeenCalledWith('[TestContext] Debug message');
            });

            it('should call console.debug with formatted message and parameters', () => {
                const message = 'Debug with params';
                const param1 = { data: 'test' };
                const param2 = 456;

                loggerWithContext.debug(message, param1, param2);

                expect(consoleDebugSpy).toHaveBeenCalledTimes(1);
                expect(consoleDebugSpy).toHaveBeenCalledWith('[TestContext] Debug with params', param1, param2);
            });

            it('should handle empty message with context', () => {
                loggerWithContext.debug('');

                expect(consoleDebugSpy).toHaveBeenCalledTimes(1);
                expect(consoleDebugSpy).toHaveBeenCalledWith('[TestContext] ');
            });
        });

        describe('other methods with context', () => {
            it('should format log messages with context', () => {
                const message = 'Log message';
                loggerWithContext.log(message);

                expect(consoleLogSpy).toHaveBeenCalledWith('[TestContext] Log message');
            });

            it('should format error messages with context', () => {
                const message = 'Error message';
                loggerWithContext.error(message);

                expect(consoleErrorSpy).toHaveBeenCalledWith('[TestContext] Error message');
            });

            it('should format verbose messages with context', () => {
                const message = 'Verbose message';
                loggerWithContext.verbose(message);

                expect(consoleInfoSpy).toHaveBeenCalledWith('[TestContext] Verbose message');
            });

            it('should format warn messages with context', () => {
                const message = 'Warning message';
                loggerWithContext.warn(message);

                expect(consoleWarnSpy).toHaveBeenCalledWith('[TestContext] Warning message');
            });

            it('should format fatal messages with context', () => {
                const message = 'Fatal error';
                loggerWithContext.fatal(message);

                expect(consoleErrorSpy).toHaveBeenCalledWith('[TestContext] Fatal error');
            });
        });

        describe('context edge cases', () => {
            it('should handle special characters in context', () => {
                const specialLogger = new SimpleLogger('Test@Context#123');
                specialLogger.debug('Message');

                expect(consoleDebugSpy).toHaveBeenCalledWith('[Test@Context#123] Message');
            });

            it('should handle empty string context', () => {
                const emptyContextLogger = new SimpleLogger('');
                emptyContextLogger.debug('Message');

                expect(consoleDebugSpy).toHaveBeenCalledWith('[] Message');
            });

            it('should handle whitespace context', () => {
                const whitespaceLogger = new SimpleLogger('  ');
                whitespaceLogger.debug('Message');

                expect(consoleDebugSpy).toHaveBeenCalledWith('[  ] Message');
            });
        });
    });

    describe('interface implementation', () => {
        it('should implement LoggerInterface correctly', () => {
            const loggerInterface: LoggerInterface = new SimpleLogger();

            expect(loggerInterface).toBeInstanceOf(SimpleLogger);
            expect(typeof loggerInterface.log).toBe('function');
            expect(typeof loggerInterface.error).toBe('function');
            expect(typeof loggerInterface.warn).toBe('function');
            expect(typeof loggerInterface.debug).toBe('function');
            expect(typeof loggerInterface.verbose).toBe('function');
            expect(typeof loggerInterface.fatal).toBe('function');
        });

        it('should implement LoggerInterface with context correctly', () => {
            const loggerInterface: LoggerInterface = new SimpleLogger('InterfaceContext');

            expect(loggerInterface).toBeInstanceOf(SimpleLogger);
            loggerInterface.debug?.('Test message');
            expect(consoleDebugSpy).toHaveBeenCalledWith('[InterfaceContext] Test message');
        });
    });

    describe('multiple method calls', () => {
        it('should handle multiple debug calls independently without context', () => {
            logger.debug('First debug');
            logger.debug('Second debug', 'param');
            logger.debug('Third debug', 1, 2, 3);

            expect(consoleDebugSpy).toHaveBeenCalledTimes(3);
            expect(consoleDebugSpy).toHaveBeenNthCalledWith(1, 'First debug');
            expect(consoleDebugSpy).toHaveBeenNthCalledWith(2, 'Second debug', 'param');
            expect(consoleDebugSpy).toHaveBeenNthCalledWith(3, 'Third debug', 1, 2, 3);
        });

        it('should handle multiple debug calls independently with context', () => {
            loggerWithContext.debug('First debug');
            loggerWithContext.debug('Second debug', 'param');
            loggerWithContext.debug('Third debug', 1, 2, 3);

            expect(consoleDebugSpy).toHaveBeenCalledTimes(3);
            expect(consoleDebugSpy).toHaveBeenNthCalledWith(1, '[TestContext] First debug');
            expect(consoleDebugSpy).toHaveBeenNthCalledWith(2, '[TestContext] Second debug', 'param');
            expect(consoleDebugSpy).toHaveBeenNthCalledWith(3, '[TestContext] Third debug', 1, 2, 3);
        });

        it('should handle mixed logger instances', () => {
            logger.debug('No context');
            loggerWithContext.debug('With context');

            expect(consoleDebugSpy).toHaveBeenCalledTimes(2);
            expect(consoleDebugSpy).toHaveBeenNthCalledWith(1, 'No context');
            expect(consoleDebugSpy).toHaveBeenNthCalledWith(2, '[TestContext] With context');
        });
    });

    describe('type compatibility', () => {
        it('should work with LogLevel type', () => {
            const level: LogLevel = 'debug';
            expect(LogLevels).toContain(level);
        });

        it('should handle all log levels', () => {
            LogLevels.forEach(level => {
                expect(typeof level).toBe('string');
            });
        });
    });
});