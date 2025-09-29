import { Injectable, Logger, LOG_LEVELS } from '@nestjs/common';
import type { LogLevel } from '@nestjs/common';

export type { LogLevel };

export type LoggerLevels = LogLevel[] | false | undefined;

export function parseLogLevels(raw?: string): LoggerLevels {
    const s = (raw ?? '').toString().trim();
    if (s.length === 0) return undefined;
    const lowered = s.toLowerCase();
    if (['false', 'off', 'none'].includes(lowered)) return false;
    if (['true', 'on', 'all'].includes(lowered)) return LOG_LEVELS;
    const parts = lowered.split(',').map((p) => p.trim()).filter(Boolean);
    const allowed: LogLevel[] = LOG_LEVELS;
    const invalid = parts.filter((p) => !allowed.includes(p as LogLevel));
    if (invalid.length > 0) console.warn(`Invalid LOG_LEVEL(S): ${invalid.join(',')}. Ignoring them.`);
    const valid = parts.filter((p) => allowed.includes(p as LogLevel));
    return valid.length > 0 ? valid as LogLevel[] : undefined;
}

@Injectable()
export class LoggerLevelService {
    private current: LoggerLevels = undefined;

    getCurrent(): LoggerLevels {
        return this.current;
    }

    setLevels(levels: LoggerLevels) {
        // Apply globally to Nest Logger
        if (levels === this.current) return;
        if (levels !== undefined) {
            Logger.overrideLogger(levels);
            // console.log('LoggerLevelService: applied levels -> ', levels);
        }
        this.current = levels;
    }

    setLevelsFromString(raw?: string) {
        const parsed = parseLogLevels(raw);
        if (parsed !== null) this.setLevels(parsed as any);
    }
}

export default LoggerLevelService;
