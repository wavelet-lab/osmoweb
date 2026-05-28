import { describe, it, expect, beforeEach } from 'vitest';
import { BtsManager, createIpaFromUuid } from '@/osmo/bts.manager';
import { GSMBand } from '@osmoweb/core';

describe('BtsManager', () => {
    let mgr: BtsManager;

    beforeEach(() => {
        mgr = new BtsManager({ assignmentTtlMs: 1000 });
    });

    it('same uuid returns same BTS id', () => {
        const first = mgr.allocate('user-1', '1.2.3.4', { band: GSMBand.GSM_900, arfcn: 1, now: 10 });
        const second = mgr.allocate('user-1', '1.2.3.5', { now: 20 });
        expect(second.id).toBe(first.id);
        expect(second.ip).toBe('1.2.3.5');
        expect(second.lastSeen).toBe(20);
        expect(mgr.countAssigned()).toBe(1);
    });

    it('same uuid keeps same osmux_port after update', () => {
        const first = mgr.allocate('user-1', 'ip', { band: GSMBand.GSM_900, arfcn: 1 });
        const second = mgr.updateForUuid('user-1', 'ip', { band: GSMBand.DCS_1800, arfcn: 512 });
        expect(second.btsCfg.osmux_port).toBe(first.btsCfg.osmux_port);
        expect(second.btsCfg.band).toBe(GSMBand.DCS_1800);
        expect(second.btsCfg.arfcn).toBe(512);
    });

    it('same uuid with different instanceId gets different assignments', () => {
        const first = mgr.allocate('user-1', 'ip', { instanceId: 'tab-1' });
        const second = mgr.allocate('user-1', 'ip', { instanceId: 'tab-2' });
        expect(first.id).toBe(0);
        expect(second.id).toBe(1);
        expect(mgr.getByUuid('user-1')).toBeNull();
        expect(mgr.getByUuid('user-1', 'tab-1')).toBe(first);
        expect(mgr.getByUuid('user-1', 'tab-2')).toBe(second);
    });

    it('same instanceId under different uuid gets different assignments', () => {
        const first = mgr.allocate('user-1', 'ip', { instanceId: 'tab-1' });
        const second = mgr.allocate('user-2', 'ip', { instanceId: 'tab-1' });
        expect(first.id).toBe(0);
        expect(second.id).toBe(1);
        expect(mgr.getByUuid('user-1', 'tab-1')).toBe(first);
        expect(mgr.getByUuid('user-2', 'tab-1')).toBe(second);
    });

    it('instanceId equal to another uuid does not access that user assignment', () => {
        const owner = mgr.allocate('user-1', 'ip');
        const attacker = mgr.allocate('user-2', 'ip', { instanceId: 'user-1' });
        expect(owner.id).toBe(0);
        expect(attacker.id).toBe(1);
        expect(mgr.releaseByUuid('user-2', 'user-1')).toBe(true);
        expect(mgr.getByUuid('user-1')).toBe(owner);
    });

    it('different uuid gets different sequential BTS ids', () => {
        expect(mgr.allocate('a', 'ip').id).toBe(0);
        expect(mgr.allocate('b', 'ip').id).toBe(1);
        expect(mgr.allocate('c', 'ip').id).toBe(2);
    });

    it('allocation after syncFromBsc reuses existing inactive BSC ids first', () => {
        mgr.syncFromBsc([inactiveBsc(0), inactiveBsc(1), inactiveBsc(2)]);
        expect(mgr.allocate('user-1', 'ip').id).toBe(0);
        expect(mgr.allocate('user-2', 'ip').id).toBe(1);
        expect(mgr.allocate('user-3', 'ip').id).toBe(2);
        expect(mgr.allocate('user-4', 'ip').id).toBe(3);
    });

    it('allocation after syncFromBsc skips BTS ids that BSC reports as active', () => {
        mgr.syncFromBsc([activeBsc(0)]);
        expect(mgr.allocate('user-1', 'ip').id).toBe(1);
    });

    it('allocation after syncFromBsc skips BTS ids with unknown connection state', () => {
        mgr.syncFromBsc([{ id: 0 }]);
        expect(mgr.allocate('user-1', 'ip').id).toBe(1);
    });

    it('released id is reused', () => {
        const first = mgr.allocate('a', 'ip');
        mgr.releaseByUuid('a');
        const second = mgr.allocate('b', 'ip');
        expect(second.id).toBe(first.id);
    });

    it('active assignments never share osmux_port', () => {
        const ports = new Set<number>();
        for (let i = 0; i < 5; i++) {
            const assignment = mgr.allocate(`user-${i}`, 'ip');
            expect(ports.has(assignment.btsCfg.osmux_port)).toBe(false);
            ports.add(assignment.btsCfg.osmux_port);
        }
    });

    it('ipa is deterministic for uuid + bts id', () => {
        expect(createIpaFromUuid('user-1', 12)).toEqual(createIpaFromUuid('user-1', 12));
        expect(createIpaFromUuid('user-1', 12).ipa).toMatch(/^\d+\/12\/0$/);
    });

    it('releaseByUuid frees assignment and port', () => {
        const first = mgr.allocate('a', 'ip');
        expect(mgr.releaseByUuid('a')).toBe(true);
        expect(mgr.getByUuid('a')).toBeNull();
        const second = mgr.allocate('b', 'ip');
        expect(second.id).toBe(first.id);
        expect(second.btsCfg.osmux_port).toBe(first.btsCfg.osmux_port);
    });

    it('cleanupExpiredAssignments frees stale assignment', () => {
        const first = mgr.allocate('a', 'ip', { now: 0 });
        expect(mgr.cleanupExpiredAssignments(1001)).toBe(1);
        expect(mgr.getById(first.id)).toBeNull();
        const second = mgr.allocate('b', 'ip');
        expect(second.id).toBe(first.id);
        expect(second.btsCfg.osmux_port).toBe(first.btsCfg.osmux_port);
    });

    it('cleanupDisconnectedBscAssignments does not free live runtime assignment reported disconnected by BSC', () => {
        const first = mgr.allocate('a', 'ip');
        expect(mgr.cleanupDisconnectedBscAssignments([inactiveBsc(first.id)])).toBe(0);
        expect(mgr.getByUuid('a')).toBe(first);
    });

    it('cleanupDisconnectedBscAssignments frees backend-disconnected assignment reported disconnected by BSC', () => {
        const first = mgr.allocate('a', 'ip');
        mgr.markDisconnectedById(first.id);
        expect(mgr.cleanupDisconnectedBscAssignments([inactiveBsc(first.id)])).toBe(1);
        expect(mgr.getByUuid('a')).toBeNull();
        const second = mgr.allocate('b', 'ip');
        expect(second.id).toBe(first.id);
        expect(second.btsCfg.osmux_port).toBe(first.btsCfg.osmux_port);
    });

    it('cleanupDisconnectedBscAssignments keeps assignment reported active by BSC', () => {
        const first = mgr.allocate('a', 'ip');
        expect(mgr.cleanupDisconnectedBscAssignments([activeBsc(first.id)])).toBe(0);
        expect(mgr.getByUuid('a')).toBe(first);
    });

    it('markSeenById and markDisconnectedById update websocket-driven state', () => {
        const first = mgr.allocate('a', 'ip', { now: 1 });
        expect(mgr.markDisconnectedById(first.id, 2)).toBe(true);
        expect(mgr.getById(first.id)?.connected).toBe(false);
        expect(mgr.getById(first.id)?.lastSeen).toBe(2);

        expect(mgr.markSeenById(first.id, 3)).toBe(true);
        expect(mgr.getById(first.id)?.connected).toBe(true);
        expect(mgr.getById(first.id)?.lastSeen).toBe(3);
    });

    it('syncFromBsc does not wipe active uuid assignment', () => {
        const active = mgr.allocate('a', 'ip', { band: GSMBand.GSM_900, arfcn: 1 });
        mgr.syncFromBsc([activeBsc(active.id), inactiveBsc(10000)]);
        expect(mgr.getByUuid('a')).toBe(active);
        expect(mgr.allocate('b', 'ip').id).toBe(10000);
    });

    it('no available port produces a clear error', () => {
        mgr = new BtsManager({ osmuxPortStart: 7000, osmuxPortCount: 1 });
        mgr.allocate('a', 'ip');
        expect(() => mgr.allocate('b', 'ip')).toThrow('No available osmux_port');
    });
});

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
