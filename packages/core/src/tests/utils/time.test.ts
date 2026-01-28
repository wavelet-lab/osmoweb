import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { sleep, usleep, now, timestampToTimeString } from '@/utils/time';

describe('Time Utils', () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    describe('sleep', () => {
        it('should resolve after specified seconds', async () => {
            const promise = sleep(2);

            // Fast-forward time by 2 seconds
            vi.advanceTimersByTime(2000);

            await expect(promise).resolves.toBeUndefined();
        });

        it('should convert seconds to milliseconds correctly', async () => {
            const spy = vi.spyOn(globalThis, 'setTimeout');

            sleep(1.5);

            expect(spy).toHaveBeenCalledWith(expect.any(Function), 1500);

            spy.mockRestore();
        });

        it('should handle zero seconds', async () => {
            const promise = sleep(0);

            vi.advanceTimersByTime(0);

            await expect(promise).resolves.toBeUndefined();
        });

        it('should handle fractional seconds', async () => {
            const spy = vi.spyOn(globalThis, 'setTimeout');

            sleep(0.5);

            expect(spy).toHaveBeenCalledWith(expect.any(Function), 500);

            spy.mockRestore();
        });
    });

    describe('usleep', () => {
        it('should resolve after specified milliseconds', async () => {
            const promise = usleep(1000);

            vi.advanceTimersByTime(1000);

            await expect(promise).resolves.toBeUndefined();
        });

        it('should use milliseconds directly', async () => {
            const spy = vi.spyOn(globalThis, 'setTimeout');

            usleep(250);

            expect(spy).toHaveBeenCalledWith(expect.any(Function), 250);

            spy.mockRestore();
        });

        it('should handle zero milliseconds', async () => {
            const promise = usleep(0);

            vi.advanceTimersByTime(0);

            await expect(promise).resolves.toBeUndefined();
        });
    });

    describe('now', () => {
        beforeEach(() => {
            vi.useRealTimers(); // Use real timers for performance.now()
        });

        it('should return a number', () => {
            const result = now();
            expect(typeof result).toBe('number');
        });

        it('should return performance.now() value', () => {
            const spy = vi.spyOn(performance, 'now').mockReturnValue(123.456);

            const result = now();

            expect(result).toBe(123.456);
            expect(spy).toHaveBeenCalled();

            spy.mockRestore();
        });

        it('should return increasing values on subsequent calls', () => {
            const first = now();
            const second = now();

            expect(second).toBeGreaterThanOrEqual(first);
        });
    });

    describe('timestampToTimeString', () => {
        it('should format timestamp correctly with hours, minutes, seconds, and milliseconds', () => {
            // January 1, 2024, 14:30:45.123
            const timestamp = new Date(2024, 0, 1, 14, 30, 45, 123).getTime();

            const result = timestampToTimeString(timestamp);

            expect(result).toBe('14:30:45.123');
        });

        it('should pad single digit hours, minutes, and seconds with zeros', () => {
            // January 1, 2024, 09:05:03.050
            const timestamp = new Date(2024, 0, 1, 9, 5, 3, 50).getTime();

            const result = timestampToTimeString(timestamp);

            expect(result).toBe('09:05:03.050');
        });

        it('should pad single and double digit milliseconds with zeros', () => {
            // Test single digit milliseconds
            const timestamp1 = new Date(2024, 0, 1, 12, 0, 0, 7).getTime();
            expect(timestampToTimeString(timestamp1)).toBe('12:00:00.007');

            // Test double digit milliseconds
            const timestamp2 = new Date(2024, 0, 1, 12, 0, 0, 45).getTime();
            expect(timestampToTimeString(timestamp2)).toBe('12:00:00.045');

            // Test triple digit milliseconds
            const timestamp3 = new Date(2024, 0, 1, 12, 0, 0, 999).getTime();
            expect(timestampToTimeString(timestamp3)).toBe('12:00:00.999');
        });

        it('should handle midnight correctly', () => {
            const timestamp = new Date(2024, 0, 1, 0, 0, 0, 0).getTime();

            const result = timestampToTimeString(timestamp);

            expect(result).toBe('00:00:00.000');
        });

        it('should handle end of day correctly', () => {
            const timestamp = new Date(2024, 0, 1, 23, 59, 59, 999).getTime();

            const result = timestampToTimeString(timestamp);

            expect(result).toBe('23:59:59.999');
        });

        it('should work with current timestamp', () => {
            const timestamp = Date.now();
            const result = timestampToTimeString(timestamp);

            // Should match the pattern HH:MM:SS.mmm
            expect(result).toMatch(/^\d{2}:\d{2}:\d{2}\.\d{3}$/);
        });

        it('should handle different timezones consistently', () => {
            // Create timestamp in a specific timezone context
            const timestamp = 1704110445123; // Fixed timestamp
            const result = timestampToTimeString(timestamp);

            // Should always format the same way regardless of system timezone
            expect(typeof result).toBe('string');
            expect(result).toMatch(/^\d{2}:\d{2}:\d{2}\.\d{3}$/);
        });
    });

    describe('integration tests', () => {
        it('should work together - sleep and timestampToTimeString', async () => {
            vi.useRealTimers();

            const before = Date.now();
            const beforeString = timestampToTimeString(before);

            await usleep(10); // Small delay

            const after = Date.now();
            const afterString = timestampToTimeString(after);

            expect(beforeString).toMatch(/^\d{2}:\d{2}:\d{2}\.\d{3}$/);
            expect(afterString).toMatch(/^\d{2}:\d{2}:\d{2}\.\d{3}$/);
            expect(after).toBeGreaterThan(before);
        });
    });
});