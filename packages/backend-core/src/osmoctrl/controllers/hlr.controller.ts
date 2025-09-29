import { OsmoBaseController } from './osmobase.controller';
import type { OsmoBaseStats } from './osmobase.controller';

export interface HlrSubscriber {
    imsi: string;
    msisdn?: string;
    algorithm?: string;
    ki?: string;
    opc?: string;
    active?: boolean;
}

export interface HlrStats extends OsmoBaseStats {
    subscriberCount: number;
}

export class HlrController extends OsmoBaseController {

    constructor(host: string = 'localhost', vtyPort: number = 4258, debug: boolean = false) {
        super(host, vtyPort, debug);
    }

    async getStats(): Promise<HlrStats> {
        const baseStats = await super.getStats();

        const resSubs = await this.vty.execChecked('show subscribers all');
        const imsis = Array.from(resSubs.output.matchAll(/IMSI[ :=]\s*([0-9]+)/gi)).map(m => m[1]);

        return {
            ...baseStats,
            subscriberCount: imsis.length,
        };
    }

    async getSubscribers(): Promise<Array<string | undefined>> {
        await super.ensureConnected();
        const res = await this.vty.execChecked('show subscribers all');
        const imsis = Array.from(res.output.matchAll(/IMSI[ :=]\s*([0-9]+)/gi)).map(m => m[1]);
        return Array.from(new Set(imsis));
    }

    private isNotFound(output: string): boolean {
        const text = output.trim();
        if (/%\s*no\s+subscriber/i.test(text)) return true;
        return false;
    }

    async getSubscriber(imsi: string): Promise<HlrSubscriber> {
        if (!imsi) throw new Error('IMSI is required');
        await this.ensureConnected();

        const res = await this.vty.execChecked(`subscriber imsi ${imsi} show`);
        if (this.isNotFound(res.output)) {
            throw new Error('Subscriber not found');
        }

        const msisdn = res.output.match(/MSISDN[ :=]\s*([0-9]+)/i)?.[1];
        const aud2g = res.output.match(/AUD2G[ :=]\s*([A-Za-z0-9-]+)/i)?.[1];
        const aud3g = res.output.match(/AUD3G[ :=]\s*([A-Za-z0-9-]+)/i)?.[1];
        const algorithm = aud2g || aud3g;

        const subscriber: HlrSubscriber = { imsi };
        if (msisdn !== undefined && msisdn.toLowerCase() !== 'none') subscriber.msisdn = msisdn;
        if (algorithm !== undefined) subscriber.algorithm = algorithm;

        return subscriber;
    }

    async addSubscriber(sub: HlrSubscriber): Promise<void> {
        if (!sub?.imsi) throw new Error('IMSI is required');
        await this.ensureConnected();
        if (await this.subscriberExists(sub.imsi)) {
            throw new Error('Subscriber already exists');
        }
        await this.vty.execChecked(`subscriber imsi ${sub.imsi} create`);
        await this.updateSubscriber(sub.imsi, sub);
    }

    async updateSubscriber(imsi: string, sub: Partial<HlrSubscriber>): Promise<void> {
        if (!imsi) throw new Error('IMSI is required');
        await this.ensureConnected();

        if (sub.msisdn) {
            await this.vty.execChecked(`subscriber imsi ${imsi} update msisdn ${sub.msisdn}`);
        }
        if (sub.algorithm) {
            if ((/^comp128v[123]$/i.test(sub.algorithm) || /^xor-2g$/i.test(sub.algorithm)) && sub.ki) {
                await this.vty.execChecked(`subscriber imsi ${imsi} update aud2g ${sub.algorithm} ki ${sub.ki}`);
            } else if ((/^milenage$/i.test(sub.algorithm) || /^tuak$/i.test(sub.algorithm) || /^xor-3g$/i.test(sub.algorithm)) && sub.ki) {
                const opcPart = sub.opc ? `opc ${sub.opc}` : '';
                await this.vty.execChecked(`subscriber imsi ${imsi} update aud3g milenage k ${sub.ki} ${opcPart}`.trim());
            }
        }
    }

    async subscriberExists(imsi: string): Promise<boolean> {
        if (!imsi) return false;
        await this.ensureConnected();
        try {
            const res = await this.vty.execChecked(`subscriber imsi ${imsi} show`);
            return !this.isNotFound(res.output);
        } catch { /* ignore */ }
        return false;
    }

    async deleteSubscriber(imsi: string): Promise<void> {
        if (!imsi) throw new Error('IMSI is required');
        await this.ensureConnected();
        await this.vty.execChecked(`subscriber imsi ${imsi} delete`);
    }
}