import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { BtsController } from '@/osmo/controllers/bts.controller';
import { BtsManager } from '@osmoweb/backend-core';
import { HttpException, HttpStatus } from '@nestjs/common';
import { GSMBand } from '@osmoweb/core';

describe('BtsController', () => {
    let controller: BtsController;
    let manager: BtsManager;
    let bsc: { getAllBts: ReturnType<typeof vi.fn>; updateBts: ReturnType<typeof vi.fn> };

    beforeEach(() => {
        controller = new BtsController({} as any);
        manager = new BtsManager();
        bsc = {
            getAllBts: vi.fn().mockResolvedValue([]),
            updateBts: vi.fn().mockResolvedValue(undefined),
        };
        (controller as any).btsManager = manager;
        (controller as any).bsc = bsc;
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('GET returns current user BTS', async () => {
        const assignment = manager.allocate('user-1', 'ip', { band: GSMBand.GSM_900, arfcn: 10 });
        const res = await controller.getBts({ user: { sub: 'user-1' } } as any);
        expect(res).toEqual(assignment.btsCfg);
    });

    it('GET without assignment returns 404', async () => {
        const err = await controller.getBts({ user: { sub: 'user-2' } } as any).catch(e => e);
        expect(err).toBeInstanceOf(HttpException);
        expect(err.getStatus()).toBe(HttpStatus.NOT_FOUND);
    });

    it('DELETE releases current user BTS', async () => {
        const assignment = manager.allocate('user-1', 'ip', { band: GSMBand.GSM_900, arfcn: 10 });
        await expect(controller.releaseBts({ user: { sub: 'user-1' } } as any)).resolves.toEqual({ released: true });
        expect(manager.getByUuid('user-1')).toBeNull();
        expect(manager.allocate('user-2', 'ip').id).toBe(assignment.id);
    });

    it('DELETE releases BTS by body instanceId when provided', async () => {
        const assignment = manager.allocate('user-1', 'ip', { instanceId: 'tab-1', band: GSMBand.GSM_900, arfcn: 10 });
        await expect(controller.releaseBts({ user: { sub: 'user-1' } } as any, { instanceId: 'tab-1' })).resolves.toEqual({ released: true });
        expect(manager.getByUuid('user-1', 'tab-1')).toBeNull();
        expect(manager.allocate('user-1', 'ip', { instanceId: 'tab-2' }).id).toBe(assignment.id);
    });

    it('DELETE without assignment returns 404', async () => {
        const err = await controller.releaseBts({ user: { sub: 'user-2' } } as any).catch(e => e);
        expect(err).toBeInstanceOf(HttpException);
        expect(err.getStatus()).toBe(HttpStatus.NOT_FOUND);
    });

    it('PUT syncs from BSC before new allocation', async () => {
        await controller.updateBts(req('user-1'), { band: GSMBand.GSM_900, arfcn: 12 });
        expect(bsc.getAllBts).toHaveBeenCalledTimes(1);
    });

    it('PUT after BSC with id 10000 reuses id 10000 after backend restart', async () => {
        bsc.getAllBts.mockResolvedValue([inactiveBsc(10000)]);
        const res = await controller.updateBts(req('user-1'), { band: GSMBand.GSM_900, arfcn: 12 });
        expect(res.id).toBe(10000);
    });

    it('PUT after active BSC with id 0 allocates id 1', async () => {
        bsc.getAllBts.mockResolvedValue([activeBsc(0)]);
        const res = await controller.updateBts(req('user-1'), { band: GSMBand.GSM_900, arfcn: 12 });
        expect(res.id).toBe(1);
    });

    it('PUT uses user uuid and body instanceId as BTS assignment key when provided', async () => {
        const first = await controller.updateBts(req('same-user'), { instanceId: 'tab-1', band: GSMBand.GSM_900, arfcn: 12 });
        const second = await controller.updateBts(req('same-user'), { instanceId: 'tab-2', band: GSMBand.GSM_900, arfcn: 12 });

        expect(first.id).toBe(0);
        expect(second.id).toBe(1);
        expect(manager.getByUuid('same-user')).toBeNull();
        expect(manager.getByUuid('same-user', 'tab-1')?.id).toBe(0);
        expect(manager.getByUuid('same-user', 'tab-2')?.id).toBe(1);
    });

    it('PUT isolates the same instanceId across different user uuids', async () => {
        const first = await controller.updateBts(req('user-1'), { instanceId: 'tab-1', band: GSMBand.GSM_900, arfcn: 12 });
        const second = await controller.updateBts(req('user-2'), { instanceId: 'tab-1', band: GSMBand.GSM_900, arfcn: 12 });

        expect(first.id).toBe(0);
        expect(second.id).toBe(1);
        expect(manager.getByUuid('user-1', 'tab-1')?.id).toBe(0);
        expect(manager.getByUuid('user-2', 'tab-1')?.id).toBe(1);
    });

    it('PUT does not allow instanceId to impersonate another user uuid', async () => {
        const owner = await controller.updateBts(req('user-1'), { band: GSMBand.GSM_900, arfcn: 12 });
        const second = await controller.updateBts(req('user-2'), { instanceId: 'user-1', band: GSMBand.GSM_900, arfcn: 13 });

        expect(owner.id).toBe(0);
        expect(second.id).toBe(1);
        expect(manager.getByUuid('user-1')?.id).toBe(0);
        expect(manager.getByUuid('user-2', 'user-1')?.id).toBe(1);
    });

    it('PUT reuses old uuid BTS when BSC reports it disconnected', async () => {
        const old = manager.allocate('old-uuid', 'ip', { band: GSMBand.GSM_900, arfcn: 12 });
        manager.markDisconnectedById(old.id);
        bsc.getAllBts.mockResolvedValue([inactiveBsc(old.id)]);

        const res = await controller.updateBts(req('new-uuid'), { band: GSMBand.GSM_900, arfcn: 12 });

        expect(res.id).toBe(old.id);
        expect(manager.getByUuid('old-uuid')).toBeNull();
    });

    it('PUT calls BscController.updateBts with expected id/config', async () => {
        const res = await controller.updateBts(req('user-1'), { band: GSMBand.DCS_1800, arfcn: 512 });
        expect(bsc.updateBts).toHaveBeenCalledWith(res.id, {
            type: 'osmo-bts',
            band: GSMBand.DCS_1800,
            description: 'user user-1',
            unitId: expect.objectContaining({ bts: res.id }),
            ci: res.cell_identity,
            trx: [{ id: 0, arfcn: 512 }],
            gprs: false,
        }, false);
    });

    it('PUT includes owner and instanceId in BSC description when instanceId is provided', async () => {
        const res = await controller.updateBts(req('user-1'), { instanceId: 'tab-1', band: GSMBand.DCS_1800, arfcn: 512 });
        expect(bsc.updateBts).toHaveBeenCalledWith(res.id, expect.objectContaining({
            description: 'user user-1 instance tab-1',
        }), false);
    });

    it('PUT returns id, band, arfcn, ipa, cell_identity, osmux_port', async () => {
        const res = await controller.updateBts(req('user-1'), { band: GSMBand.GSM_900, arfcn: 12 });
        expect(res).toMatchObject({
            id: expect.any(Number),
            band: GSMBand.GSM_900,
            arfcn: 12,
            ipa: expect.any(String),
            cell_identity: expect.any(Number),
            osmux_port: expect.any(Number),
        });
    });

    it('PUT supports top-level arfcn', async () => {
        const res = await controller.updateBts(req('user-1'), { band: GSMBand.GSM_900, arfcn: 33 });
        expect(res.arfcn).toBe(33);
    });

    it('PUT supports trx[0].arfcn if compatible', async () => {
        const res = await controller.updateBts(req('user-1'), { band: GSMBand.GSM_900, trx: [{ id: 0, arfcn: 44 }] });
        expect(res.arfcn).toBe(44);
        expect(bsc.updateBts.mock.calls[0]?.[1].trx).toEqual([{ id: 0, arfcn: 44 }]);
    });

    it('throws BAD_REQUEST when no user id in token', async () => {
        const err = await controller.updateBts({ user: {} } as any, { band: GSMBand.GSM_900, arfcn: 1 }).catch(e => e);
        expect(err).toBeInstanceOf(HttpException);
        expect(err.getStatus()).toBe(HttpStatus.BAD_REQUEST);
    });

    it('throws BAD_REQUEST when band or arfcn is missing', async () => {
        const missingBand = await controller.updateBts(req('user-1'), { arfcn: 1 } as any).catch(e => e);
        const missingArfcn = await controller.updateBts(req('user-1'), { band: GSMBand.GSM_900 } as any).catch(e => e);
        expect(missingBand.getStatus()).toBe(HttpStatus.BAD_REQUEST);
        expect(missingArfcn.getStatus()).toBe(HttpStatus.BAD_REQUEST);
    });

    it('throws BAD_REQUEST when band and arfcn do not match', async () => {
        const err = await controller.updateBts(req('user-1'), { band: GSMBand.GSM_900, arfcn: 512 }).catch(e => e);
        expect(err).toBeInstanceOf(HttpException);
        expect(err.getStatus()).toBe(HttpStatus.BAD_REQUEST);
        expect(String(err.message)).toMatch(/out of range/i);
        expect(bsc.getAllBts).not.toHaveBeenCalled();
        expect(bsc.updateBts).not.toHaveBeenCalled();
    });
});

function req(uuid: string) {
    return {
        user: { sub: uuid },
        ip: '127.0.0.1',
        headers: {},
    } as any;
}

function activeBsc(id: number) {
    return {
        id,
        connected: true,
        nmState: { state: "Oper 'Enabled', Admin 'Unlocked', Avail 'OK'" },
        omlState: 'connected',
    };
}

function inactiveBsc(id: number) {
    return {
        id,
        connected: false,
        nmState: { state: "Oper 'NULL', Admin 'Locked', Avail 'Power off'" },
        omlState: 'disconnected',
    };
}
