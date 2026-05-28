import { VtyCommandError } from '@/osmoctrl/vty.client';
import { OsmoBaseController } from './osmobase.controller';
import type { OsmoBaseStats } from './osmobase.controller';
import { detectGSMBandFromArfcn, GSMBand } from '@osmoweb/core';

export interface BscTimeslotStats {
    tch: number;
    sdcch: number;
    pdch: number;
    other: number;
}

export interface BscStats extends OsmoBaseStats {
    btsCount: number;
    connectedBts: number;
    omlDown: number;
    trxCount: number;
    timeslots: BscTimeslotStats;
    rateCounters: Record<string, number>;
}

export interface BscBtsTrxConfig {
    id: number;
    arfcn?: number;
}

export interface BscBtsConfig {
    type?: string; // e.g. "osmo-bts"
    unitId?: { site: number; bts: number }; // for IPA BTS: "ipa unit-id <site> <bts>"
    lac?: number; // "location-area-code <LAC>"
    ci?: number; // "cell-identity <CI>"
    band?: GSMBand; // e.g. DCS1800
    description?: string;
    trx?: BscBtsTrxConfig[]; // TRX configuration list
    gprs?: boolean; // enable GPRS (true) or disable (false)
}

// Interface for getBts result
export interface BscBtsInfo extends BscBtsConfig {
    id: number;
    connected?: boolean;
    nmState?: {
        state: string;
        adminLocked?: boolean; // inferred from state string
    };
    omlState?: string;
}

function toOsmoBscBand(band: GSMBand): string {
    switch (band) {
        case GSMBand.GSM_850:
            return 'GSM850';
        case GSMBand.GSM_900:
        case GSMBand.EGSM_900:
            return 'GSM900';
        case GSMBand.DCS_1800:
            return 'DCS1800';
        case GSMBand.PCS_1900:
            return 'PCS1900';
    }
}

function fromOsmoBscBand(band: string, arfcn?: number): GSMBand {
    if (typeof arfcn === 'number')
            return detectGSMBandFromArfcn(arfcn)?.[0] ?? GSMBand.GSM_900;

    switch (band) {
        case 'GSM850':
            return GSMBand.GSM_850;
        case 'GSM900':
            return GSMBand.GSM_900;
        case 'DCS1800':
            return GSMBand.DCS_1800;
        case 'PCS1900':
            return GSMBand.PCS_1900;
        default:
            return band as GSMBand;
    }
}

function inferBscBtsConnected(info: Pick<BscBtsInfo, 'nmState' | 'omlState'>): boolean | undefined {
    const nmState = info.nmState?.state.toLowerCase();
    if (nmState) {
        if (nmState.includes("oper 'enabled'") && nmState.includes("avail 'ok'")) return true;
        if (nmState.includes("oper 'null'") || nmState.includes("avail 'power off'")) return false;
    }

    const omlState = info.omlState?.toLowerCase();
    if (omlState === 'connected') return true;
    if (omlState === 'disconnected' || omlState === 'down') return false;
    return undefined;
}

export class BscController extends OsmoBaseController {

    constructor(host: string = 'localhost', vtyPort: number = 4242, debug: boolean = false) {
        super(host, vtyPort, debug);
    }

    private parseBts(output: string): {
        btsCount: number;
        connectedBts: number;
        omlDown: number;
        trxCount: number;
        timeslots: BscTimeslotStats;
    } {
        let btsCount = 0;
        let connectedBts = 0;
        let omlDown = 0;
        let trxCount = 0;
        const slots: BscTimeslotStats = { tch: 0, sdcch: 0, pdch: 0, other: 0 };

        const lines = output.split('\n').map(l => l.trim());
        for (const line of lines) {
            // Header line, e.g.:
            // "BTS 0 is of osmo-bts type in band DCS1800, has CI 6969 LAC 1, BSIC 63 (...) and 1 TRX"
            const header = line.match(/^BTS\s+(\d+)\b.*?(?:\band\s+(\d+)\s+TRX\b)?/i);
            if (header) {
                btsCount++;
                if (header[2]) trxCount += parseInt(header[2], 10) || 0;
                continue;
            }

            // OML link state lines, e.g.: "OML Link state: connected|disconnected"
            const oml = line.match(/^OML\s+Link\s+state:\s*([A-Za-z]+)/i);
            if (oml && oml[1]) {
                const state = oml[1].toLowerCase();
                if (state.includes('connected')) connectedBts++;
                else if (state.includes('disconnected') || state.includes('down')) omlDown++;
                continue;
            }

            // Optional: aggregate channel totals later if needed.
        }
        return { btsCount, connectedBts, omlDown, trxCount, timeslots: slots };
    }

    private checkBtsId(id: number): void {
        if (!Number.isInteger(id) || id < 0 || id > 65535) throw new Error('Invalid BTS id');
    }

    // Extract BTS ids from "show bts" output
    private parseBtsIds(output: string): number[] {
        const ids: number[] = [];
        for (const raw of output.split('\n')) {
            const m = raw.trim().match(/^BTS\s+(\d+)\b/i);
            if (m && m[1]) {
                const id = parseInt(m[1], 10);
                if (!Number.isNaN(id)) ids.push(id);
            }
        }
        return Array.from(new Set(ids)).sort((a, b) => a - b);
    }

    // Parser for detailed information of a single BTS
    private parseBtsDetails(btsId: number, output: string): BscBtsInfo {
        const info: BscBtsInfo = { id: btsId, trx: [] };
        const lines = output.split('\n').map(l => l.trim());
        let currentTrx: BscBtsTrxConfig | undefined;
        let numTrxFromHeader: number | undefined;
        let bsicFromHeader: number | undefined;
        let arfcnFromList: number | undefined;
        let rawBand: string | undefined;

        const ensureTrx0 = () => {
            if (!info.trx || info.trx.length === 0) {
                currentTrx = { id: 0 };
                info.trx = [currentTrx];
            } else if (!currentTrx) {
                currentTrx = info.trx[0];
            }
        };

        for (const line of lines) {
            // Header line shape:
            // "BTS 0 is of osmo-bts type in band DCS1800, has CI 6969 LAC 1, BSIC 63 (...) and 1 TRX"
            let m =
                line.match(/^BTS\s+(\d+)\s+is\s+of\s+([A-Za-z0-9\-_]+)\s+type\b.*?\bhas\b.*?\bCI\s+(\d+)\s+LAC\s+(\d+),\s+BSIC\s+(\d+).*?(?:\band\s+(\d+)\s+TRX\b)?/i);
            if (m) {
                if (m[2]) info.type = m[2];
                if (m[3]) info.ci = parseInt(m[3], 10);
                if (m[4]) info.lac = parseInt(m[4], 10);
                if (m[5]) bsicFromHeader = parseInt(m[5], 10);
                if (m[6]) numTrxFromHeader = parseInt(m[6], 10);

                // band (present in header as "in band XXX")
                const bm = line.match(/\bin\s+band\s+([A-Za-z0-9/_-]+)/i);
                if (bm && bm[1]) rawBand = bm[1];

                continue;
            }

            // BTS type fallback: "type osmo-bts" or "is of type osmo-bts"
            m = line.match(/\bis\s+of\s+type\s+([A-Za-z0-9\-_]+)/i) || line.match(/\btype\b[:\s]+([A-Za-z0-9\-_]+)/i);
            if (m && m[1]) {
                info.type = m[1];
                continue;
            }

            // Description: "Description: (null)" or "Description: My BTS"
            m = line.match(/^Description:\s*(.+)$/i);
            if (m && m[1]) {
                const desc = m[1].trim();
                if (desc && desc.toLowerCase() !== '(null)') info.description = desc;
                continue;
            }

            // Unit ID: "Unit ID: 6969/0/0, OML Stream ID 0xff" (take first two parts)
            m = line.match(/Unit\s+ID:\s*(\d+)\s*\/\s*(\d+)(?:\s*\/\s*\d+)?/i);
            if (m && m[1] && m[2]) {
                info.unitId = { site: parseInt(m[1], 10), bts: parseInt(m[2], 10) };
                continue;
            }

            // NM state
            m = line.match(/^NM\s+state:\s*(.+)$/i);
            if (m && m[1]) {
                info.nmState = {
                    state: m[1],
                    adminLocked: /Admin\s*'Locked'/i.test(m[1]),
                };
                continue;
            }

            // OML link state
            m = line.match(/^OML\s+Link\s+state:\s*([A-Za-z]+)/i);
            if (m && m[1]) {
                info.omlState = m[1].toLowerCase();
                continue;
            }

            // LAC / CI shorthand tokens (e.g. "has CI 6969 LAC 1")
            m = line.match(/\bLAC\s+(\d+)\b/i);
            if (m && m[1]) info.lac = parseInt(m[1], 10);
            m = line.match(/\bCI\s+(\d+)\b/i);
            if (m && m[1]) info.ci = parseInt(m[1], 10);

            // TRX block (if present)
            m = line.match(/^(?:TRX|trx)\s+(\d+)/i);
            if (m && m[1]) {
                currentTrx = { id: parseInt(m[1], 10) };
                info.trx!.push(currentTrx);
                continue;
            }

            // ARFCNs line: "ARFCNs: 871" (may list multiple; take the first number)
            m = line.match(/^ARFCNs:\s*(.+)$/i);
            if (m && m[1]) {
                const firstNum = m[1].match(/\d+/);
                if (firstNum && firstNum[0]) arfcnFromList = parseInt(firstNum[0], 10);
                continue;
            }

            // Fallback ARFCN/BSIC patterns inside TRX block (if any)
            if (currentTrx) {
                m = line.match(/\barfcn\b\s*[:=]?\s*(\d+)/i);
                if (m && m[1]) currentTrx.arfcn = parseInt(m[1], 10);
                // m = line.match(/\bbsic\b\s*[:=]?\s*(\d+)/i);
                // if (m && m[1]) currentTrx.bsic = parseInt(m[1], 10);
            }
        }

        // If we saw BSIC/ARFCN in header/list but no TRX details, populate TRX 0
        if (typeof bsicFromHeader === 'number' || typeof arfcnFromList === 'number' || typeof numTrxFromHeader === 'number') {
            // Create placeholders for all TRX if header told us how many
            if (typeof numTrxFromHeader === 'number' && numTrxFromHeader > 0) {
                info.trx = Array.from({ length: numTrxFromHeader }, (_, i) => ({ id: i }));
                currentTrx = info.trx[0];
            } else {
                ensureTrx0();
            }
            if (typeof arfcnFromList === 'number' && currentTrx && typeof currentTrx.arfcn !== 'number') {
                currentTrx.arfcn = arfcnFromList;
            }
            // if (typeof bsicFromHeader === 'number' && currentTrx && typeof currentTrx.bsic !== 'number') {
            //     currentTrx.bsic = bsicFromHeader;
            // }
        }

        if (rawBand) {
            info.band = fromOsmoBscBand(rawBand, info.trx?.[0]?.arfcn);
        }
        info.connected = inferBscBtsConnected(info);

        return info;
    }

    async getStats(): Promise<BscStats> {
        const baseStats = await super.getStats();
        const [bts, stats] = await Promise.allSettled([
            this.vty.execChecked('show bts'),
            this.vty.execChecked('show stats')
        ]);

        const btsParsed = bts.status === 'fulfilled'
            ? this.parseBts(bts.value.output)
            : { btsCount: 0, connectedBts: 0, omlDown: 0, trxCount: 0, timeslots: { tch: 0, sdcch: 0, pdch: 0, other: 0 } };
        const rateCounters = stats.status === 'fulfilled' ? this.parseRateCounters(stats.value.output) : {};

        return {
            ...baseStats,
            ...btsParsed,
            rateCounters
        };
    }

    // Get information for all BTS
    async getAllBts(): Promise<BscBtsInfo[]> {
        await this.ensureConnected();
        const list = await this.vty.execChecked('show bts');
        const ids = this.parseBtsIds(list.output);
        if (ids.length === 0) return [];

        type VtyExecResult = { output: string };
        const detailPromises: Promise<VtyExecResult>[] = ids.map((id: number) =>
            this.vty.execChecked(`show bts ${id}`) as Promise<VtyExecResult>
        );
        const details: PromiseSettledResult<VtyExecResult>[] = await Promise.allSettled(detailPromises);

        const results: BscBtsInfo[] = [];
        details.forEach((res: PromiseSettledResult<VtyExecResult>, idx: number) => {
            if (res.status === 'fulfilled' && ids[idx] !== undefined) {
                results.push(this.parseBtsDetails(ids[idx], res.value.output));
            }
        });
        return results;
    }

    private isNotFound(output: string): boolean {
        const text = output.trim();
        if (/%\s*can't\s+find/i.test(text)) return true;
        return false;
    }

    // Get information for a specific BTS by id
    async getBts(btsId: number): Promise<BscBtsInfo> {
        this.checkBtsId(btsId);
        await this.ensureConnected();
        const res = await this.vty.execChecked(`show bts ${btsId}`);
        if (this.isNotFound(res.output)) {
            throw new Error('BTS not found');
        }
        return this.parseBtsDetails(btsId, res.output);
    }

    private async runConfigCommands(cmds: string[]): Promise<void> {
        try {
            await this.ensureConnected();
            // Execute sequentially to avoid config node confusion
            await this.vty.execBatch(cmds);
        } catch (e) {
            if (e instanceof VtyCommandError) {
                console.error(`Failed command "${e.cmd}": ${e.errorLine}`);
            }
            throw e;
        }
    }

    async addBts(btsId: number, cfg: BscBtsConfig = {}, persist = false): Promise<void> {
        await this.updateBts(btsId, cfg, persist);
    }

    async updateBts(btsId: number, cfg: BscBtsConfig = {}, persist = false): Promise<void> {
        this.checkBtsId(btsId);
        const btsExists = await this.btsExists(btsId);

        const cmds: string[] = ['configure terminal', 'network', `bts ${btsId}`];

        if (cfg.type && !btsExists) cmds.push(`type ${cfg.type}`);
        if (cfg.band) cmds.push(`band ${toOsmoBscBand(cfg.band)}`);
        if (cfg.description) cmds.push(`description ${cfg.description}`);
        if (cfg.unitId) cmds.push(`ipa unit-id ${cfg.unitId.site} ${cfg.unitId.bts}`);
        cmds.push(`location_area_code ${cfg.lac ?? 1}`);
        if (typeof cfg.ci === 'number') cmds.push(`cell_identity ${cfg.ci}`);
        cmds.push('base_station_id_code 63');
        cmds.push('ms max power 15');
        cmds.push('cell reselection hysteresis 4');
        cmds.push('rxlev access min 0');
        cmds.push('radio-link-timeout 32');
        cmds.push('channel allocator ascending');
        cmds.push('rach tx integer 9');
        cmds.push('rach max transmission 7');
        cmds.push('channel-descrption attach 1');
        cmds.push('channel-descrption bs-pa-mfrms 5');
        cmds.push('channel-descrption bs-ag-blks-res 1');
        cmds.push('rach emergency call allowed 1');
        cmds.push('no access-control-class-ramping');
        cmds.push('access-control-class-ramping-step-size 1');
        cmds.push('early-classmark-sending allowed');
        cmds.push('early-classmark-sending-3g allowed');
        cmds.push('oml ipa stream-id 255 line 0');
        cmds.push('neighbor-list mode manual');
        cmds.push('codec-support fr hr amr');
        cmds.push('no force-combined-si');
        cmds.push('osmux only');

        if (cfg.gprs === true) {
            cmds.push('gprs mode gprs');
            cmds.push('gprs routing area 0');
            cmds.push('gprs cell bvci 2');
            cmds.push('gprs nsei 101');
            cmds.push('gprs nsvc 0 nsvci 101');
            cmds.push('gprs nsvc 0 local udp port 23023');
            cmds.push('gprs nsvc 0 remote udp port 23000');
            cmds.push('gprs nsvc 0 remote ip 127.0.0.1');
            cmds.push('gprs egprs-packet-channel-request');
        } else {
            cmds.push('gprs mode none');
        }

        if (Array.isArray(cfg.trx)) {
            for (const t of cfg.trx) {
                if (!Number.isInteger(t.id) || t.id < 0) continue;
                cmds.push(`trx ${t.id}`);
                cmds.push('rf_locked 0');
                if (typeof t.arfcn === 'number') cmds.push(`arfcn ${t.arfcn}`);
                cmds.push('nominal power 20');
                cmds.push('max_power_red 4');
                cmds.push('rsl e1 tei 0');
                cmds.push('timeslot 0');
                cmds.push('phys_chan_config CCCH');
                cmds.push('hopping enabled 0');
                cmds.push('exit');
                cmds.push('timeslot 1');
                cmds.push('phys_chan_config SDCCH8');
                cmds.push('hopping enabled 0');
                cmds.push('exit');
                cmds.push('timeslot 2');
                cmds.push('phys_chan_config TCH/F');
                cmds.push('hopping enabled 0');
                cmds.push('exit');
                cmds.push('timeslot 3');
                cmds.push('phys_chan_config TCH/F');
                cmds.push('hopping enabled 0');
                cmds.push('exit');
                cmds.push('timeslot 4');
                cmds.push('phys_chan_config TCH/F');
                cmds.push('hopping enabled 0');
                cmds.push('exit');
                cmds.push('timeslot 5');
                cmds.push('phys_chan_config TCH/F');
                cmds.push('hopping enabled 0');
                cmds.push('exit');
                cmds.push('timeslot 6');
                cmds.push('phys_chan_config TCH/H');
                cmds.push('hopping enabled 0');
                cmds.push('exit');
                cmds.push('timeslot 7');
                cmds.push('phys_chan_config TCH/F');
                cmds.push('hopping enabled 0');
                cmds.push('exit');
                cmds.push('exit');
            }
        }

        cmds.push('end');
        if (persist) cmds.push('write memory');

        await this.runConfigCommands(cmds);
    }

    async btsExists(btsId: number): Promise<boolean> {
        this.checkBtsId(btsId);
        await this.ensureConnected();
        try {
            const res = await this.vty.execChecked(`show bts ${btsId}`);
            return !this.isNotFound(res.output);
        } catch { /* ignore */ }
        return false;
    }

    /* BTS deletion is not supported by osmo-bsc
    async deleteBts(btsId: number, persist = false): Promise<void> {
        this.checkBtsId(btsId);
        // There are no commands to delete BTS, we will reuse unneeded BTS ids by reconfiguring them
    }
    */
}
