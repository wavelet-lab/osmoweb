import { describe, it, expect, beforeEach } from 'vitest';
import { BtsManager } from '@/osmo/bts.manager';

describe('BtsManager', () => {
    let mgr: BtsManager;

    beforeEach(() => {
        mgr = new BtsManager();
    });

    it('allocates sequential ids starting from 0 and sets fields', () => {
        const a = mgr.allocate('user-1', '1.2.3.4');
        expect(a.id).toBe(0);
        expect(a.uuid).toBe('user-1');
        expect(a.ip).toBe('1.2.3.4');
        expect(a.connected).toBe(true);
        expect(typeof a.createdAt).toBe('number');
        expect(typeof a.lastSeen).toBe('number');
        expect(a.lastSeen).toBeGreaterThanOrEqual(a.createdAt);

        // counts and free calculation
        expect(mgr.countAssigned()).toBe(1);
        expect(mgr.dumpState().nextSeqId).toBe(1);
        expect(mgr.countFree()).toBe(BtsManager.MAX_BTS - 1);
    });

    it('re-allocating same uuid updates ip/connected/lastSeen and keeps id', () => {
        const first = mgr.allocate('user-x', '10.0.0.1');
        const id = first.id;
        const beforeLastSeen = first.lastSeen!;

        const second = mgr.allocate('user-x', '10.0.0.2');
        expect(second.id).toBe(id);
        expect(second.ip).toBe('10.0.0.2');
        expect(second.connected).toBe(true);
        expect(second.lastSeen).toBeGreaterThanOrEqual(beforeLastSeen);

        // still only one assignment
        expect(mgr.countAssigned()).toBe(1);
    });

    it('getByUuid and getById return correct assignments or null', () => {
        expect(mgr.getByUuid('nope')).toBeNull();
        expect(mgr.getById(0)).toBeNull();

        const a = mgr.allocate('u1', '0.0.0.0');
        expect(mgr.getByUuid('u1')!.id).toBe(a.id);
        expect(mgr.getById(a.id)!.uuid).toBe('u1');
    });

    it('releaseByUuid removes mapping and makes id available for reuse', () => {
        const a0 = mgr.allocate('a', 'ip-a');
        const a1 = mgr.allocate('b', 'ip-b');
        const a2 = mgr.allocate('c', 'ip-c');

        expect(mgr.countAssigned()).toBe(3);

        expect(mgr.releaseByUuid('b')).toBe(true);
        expect(mgr.getByUuid('b')).toBeNull();
        expect(mgr.countAssigned()).toBe(2);

        // release unknown uuid returns false
        expect(mgr.releaseByUuid('nonexistent')).toBe(false);

        // Free id should be reused (smallest free id chosen)
        // release another to create multiple free ids
        expect(mgr.releaseById(a0.id)).toBe(true);

        const d = mgr.allocate('d', 'ip-d');
        // smallest free id was a0.id (0), it should be reused
        expect(d.id).toBe(a0.id);
    });

    it('releaseById returns false for unknown id and true for existing', () => {
        expect(mgr.releaseById(9999)).toBe(false);
        const a = mgr.allocate('z', 'ip-z');
        expect(mgr.releaseById(a.id)).toBe(true);
        expect(mgr.releaseById(a.id)).toBe(false); // already released
    });

    it('markDisconnected toggles connected flag but keeps assignment', () => {
        expect(mgr.markDisconnected('missing')).toBe(false);

        const a = mgr.allocate('user-d', '1.1.1.1');
        expect(a.connected).toBe(true);

        expect(mgr.markDisconnected('user-d')).toBe(true);
        const rec = mgr.getByUuid('user-d')!;
        expect(rec.connected).toBe(false);

        // still assigned until explicit release
        expect(mgr.countAssigned()).toBe(1);
        expect(mgr.countFree()).toBe(BtsManager.MAX_BTS - 1);
    });

    it('throws when no available BTS ids (nextSeqId >= MAX_BTS)', () => {
        // force internal state to simulate exhausted ids
        (mgr as any).nextSeqId = BtsManager.MAX_BTS;
        expect(() => mgr.allocate('overflow', '0.0.0.0')).toThrow('No available BTS ids');
    });
});