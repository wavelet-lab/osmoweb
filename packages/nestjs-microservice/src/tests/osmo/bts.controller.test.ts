import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { BtsController } from '@/osmo/controllers/bts.controller';
import { BtsManager } from '@osmoweb/backend-core';
import { HttpException, HttpStatus } from '@nestjs/common';

describe('BtsController.getBts', () => {
    let controller: BtsController;

    beforeEach(() => {
        // construct with an empty params object; internal BscController will be replaced per-test
        controller = new BtsController({} as any);
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('returns BTS data when user has assigned bts and bsc.getBts succeeds', async () => {
        // arrange: stub BtsManager.getByUuid to return a bts object
        vi.spyOn(BtsManager.prototype, 'getByUuid').mockReturnValue({ id: 'bts-123' } as any);
        // replace private bsc with a mock
        (controller as any).bsc = { getBts: vi.fn().mockResolvedValue({ id: 'bts-123', name: 'my-bts' }) };

        const req = { user: { sub: 'user-1' } } as any;

        // act
        const res = await controller.getBts(req);

        // assert
        expect(res).toEqual({ id: 'bts-123', name: 'my-bts' });
        expect((controller as any).bsc.getBts).toHaveBeenCalledWith('bts-123');
    });

    it('throws BAD_REQUEST when no user id in token', async () => {
        const req = { user: {} } as any;
        const err = await controller.getBts(req).catch(e => e);
        expect(err).toBeInstanceOf(HttpException);
        expect(err.getStatus()).toBe(HttpStatus.BAD_REQUEST);
        expect(String(err.message)).toMatch(/No user id in token/i);
    });

    it('throws NOT_FOUND when no BTS assigned to user', async () => {
        vi.spyOn(BtsManager.prototype, 'getByUuid').mockReturnValue(null);
        const req = { user: { sub: 'user-2' } } as any;
        const err = await controller.getBts(req).catch(e => e);
        expect(err).toBeInstanceOf(HttpException);
        expect(err.getStatus()).toBe(HttpStatus.NOT_FOUND);
        expect(String(err.message)).toMatch(/No BTS assigned to user/i);
    });

    it('maps "BTS not found" error from bsc to NOT_FOUND HttpException', async () => {
        vi.spyOn(BtsManager.prototype, 'getByUuid').mockReturnValue({ id: 'bts-404' } as any);
        (controller as any).bsc = { getBts: vi.fn().mockRejectedValue(new Error('BTS not found on remote')) };

        const req = { user: { sub: 'user-3' } } as any;
        const err = await controller.getBts(req).catch(e => e);
        expect(err).toBeInstanceOf(HttpException);
        expect(err.getStatus()).toBe(HttpStatus.NOT_FOUND);
        expect(String(err.message)).toMatch(/BTS not found/i);
    });

    it('returns INTERNAL_SERVER_ERROR for other bsc errors', async () => {
        vi.spyOn(BtsManager.prototype, 'getByUuid').mockReturnValue({ id: 'bts-err' } as any);
        (controller as any).bsc = { getBts: vi.fn().mockRejectedValue(new Error('connection refused')) };

        const req = { user: { sub: 'user-4' } } as any;
        const err = await controller.getBts(req).catch(e => e);
        expect(err).toBeInstanceOf(HttpException);
        expect(err.getStatus()).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
        expect(String(err.message)).toMatch(/connection refused/i);
    });
});