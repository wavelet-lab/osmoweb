import { describe, expect, it, vi } from 'vitest';
import { GSMBand } from '@osmoweb/core';
import { BscController } from '@/osmoctrl/controllers/bsc.controller';

describe('BscController.updateBts', () => {
    it('generates BTS/TRX configuration matching the osmo-bts profile', async () => {
        const controller = new BscController();
        const execBatch = vi.fn().mockResolvedValue(undefined);
        vi.spyOn(controller, 'btsExists').mockResolvedValue(false);
        (controller as any).runConfigCommands = execBatch;

        await controller.updateBts(0, {
            type: 'osmo-bts',
            band: GSMBand.EGSM_900,
            ci: 1,
            unitId: { site: 1801, bts: 0 },
            trx: [{ id: 0, arfcn: 975 }],
            gprs: false,
        });

        const cmds = execBatch.mock.calls[0]?.[0] as string[];
        expect(cmds).toEqual(expect.arrayContaining([
            'configure terminal',
            'network',
            'bts 0',
            'type osmo-bts',
            'band GSM900',
            'cell_identity 1',
            'location_area_code 1',
            'base_station_id_code 63',
            'ms max power 15',
            'cell reselection hysteresis 4',
            'rxlev access min 0',
            'radio-link-timeout 32',
            'channel allocator ascending',
            'rach tx integer 9',
            'rach max transmission 7',
            'channel-descrption attach 1',
            'channel-descrption bs-pa-mfrms 5',
            'channel-descrption bs-ag-blks-res 1',
            'rach emergency call allowed 1',
            'no access-control-class-ramping',
            'access-control-class-ramping-step-size 1',
            'early-classmark-sending allowed',
            'early-classmark-sending-3g allowed',
            'ipa unit-id 1801 0',
            'oml ipa stream-id 255 line 0',
            'neighbor-list mode manual',
            'codec-support fr hr amr',
            'no force-combined-si',
            'gprs mode none',
            'osmux only',
            'trx 0',
            'rf_locked 0',
            'arfcn 975',
            'nominal power 20',
            'max_power_red 4',
            'rsl e1 tei 0',
            'timeslot 0',
            'phys_chan_config CCCH',
            'timeslot 1',
            'phys_chan_config SDCCH8',
            'timeslot 2',
            'phys_chan_config TCH/F',
            'timeslot 6',
            'phys_chan_config TCH/H',
            'end',
        ]));
        expect(cmds.indexOf('gprs mode none')).toBeLessThan(cmds.indexOf('trx 0'));
        expect(cmds).not.toContain('no bs-power-control');
        expect(cmds).not.toContain('no ms-power-control');
        expect(cmds).not.toContain('no neighbors');
    });
});

describe('BscController BTS parser', () => {
    it('maps GSM900 with EGSM ARFCN to EGSM_900', () => {
        const controller = new BscController();
        const info = (controller as any).parseBtsDetails(0, `
BTS 0 is of osmo-bts type in band GSM900, has CI 1 LAC 1, BSIC 63 and 1 TRX
ARFCNs: 975
`);

        expect(info.band).toBe(GSMBand.EGSM_900);
    });

    it('maps GSM900 with regular GSM ARFCN to GSM_900', () => {
        const controller = new BscController();
        const info = (controller as any).parseBtsDetails(0, `
BTS 0 is of osmo-bts type in band GSM900, has CI 1 LAC 1, BSIC 63 and 1 TRX
ARFCNs: 12
`);

        expect(info.band).toBe(GSMBand.GSM_900);
    });

    it('sets connected true for enabled/ok NM state', () => {
        const controller = new BscController();
        const info = (controller as any).parseBtsDetails(0, `
BTS 0 is of osmo-bts type in band GSM900, has CI 1 LAC 1, BSIC 63 and 1 TRX
NM State: Oper 'Enabled', Admin 'Unlocked', Avail 'OK'
Site Mgr NM State: Oper 'Enabled', Admin 'Locked', Avail 'OK'
ARFCNs: 12
`);

        expect(info.connected).toBe(true);
    });

    it('sets connected true for real show bts output with OML connected uptime', () => {
        const controller = new BscController();
        const info = (controller as any).parseBtsDetails(0, `
BTS 0 is of osmo-bts type in band GSM900, has CI 19437 LAC 1, BSIC 63 (NCC=7, BCC=7) and 1 TRX
  Description: user f7fafead-d7fb-4f9a-9d8c-a2d445b25352
  ARFCNs: 978
  Unit ID: 59022/0/0, OML Stream ID 0xff
  NM State: Oper 'Enabled', Admin 'Unlocked', Avail 'OK'
  Site Mgr NM State: Oper 'Enabled', Admin 'Locked', Avail 'OK'
  GPRS: not configured
  OML Link: (r=127.0.0.1:59932<->l=127.0.0.1:3002)
  OML Link state: connected 0 days 0 hours 0 min. 22 sec.
`);

        expect(info.connected).toBe(true);
        expect(info.band).toBe(GSMBand.EGSM_900);
        expect(info.trx?.[0]?.arfcn).toBe(978);
    });

    it('sets connected false for null/power off NM state', () => {
        const controller = new BscController();
        const info = (controller as any).parseBtsDetails(0, `
BTS 0 is of osmo-bts type in band GSM900, has CI 1 LAC 1, BSIC 63 and 1 TRX
NM State: Oper 'NULL', Admin 'Locked', Avail 'Power off'
Site Mgr NM State: Oper 'NULL', Admin 'Locked', Avail 'Power off'
ARFCNs: 12
`);

        expect(info.connected).toBe(false);
    });
});
