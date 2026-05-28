import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { apiFetch } from '@websdr/frontend-core/services';
import btsDefault, { getBts, releaseBts, updateBts } from '../../services/bts';
import { GSMBand } from '@osmoweb/core';

// Mock the @websdr/frontend-core/services module used by auth.ts
vi.mock("@websdr/frontend-core/services", () => ({
    apiFetch: vi.fn(),
}));


describe('bts service', () => {
    beforeEach(() => {
        vi.mocked(apiFetch).mockReset();
    });

    afterEach(() => {
        vi.resetAllMocks();
    });

    it('getBts calls apiFetch with correct endpoint and returns data', async () => {
        const data = { id: 'bts1' };
        vi.mocked(apiFetch).mockResolvedValue(data);
        const res = await getBts();
        expect(vi.mocked(apiFetch)).toHaveBeenCalledWith('/api/v1/osmo/bts');
        expect(res).toBe(data);
    });

    it('updateBts sends PUT with JSON body when config provided and returns response', async () => {
        const cfg = { band: GSMBand.GSM_900, arfcn: 12 };
        const resp = { success: true };
        vi.mocked(apiFetch).mockResolvedValue(resp);
        const result = await updateBts(cfg);
        expect(vi.mocked(apiFetch)).toHaveBeenCalledWith('/api/v1/osmo/bts', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(cfg),
        });
        expect(result).toBe(resp);
    });

    it('updateBts sends empty object when called without config', async () => {
        const resp = { success: true };
        vi.mocked(apiFetch).mockResolvedValue(resp);
        await updateBts(undefined);
        expect(vi.mocked(apiFetch)).toHaveBeenCalledWith('/api/v1/osmo/bts', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({}),
        });
    });

    it('releaseBts sends DELETE and returns response', async () => {
        const resp = { released: true };
        vi.mocked(apiFetch).mockResolvedValue(resp);
        const result = await releaseBts();
        expect(vi.mocked(apiFetch)).toHaveBeenCalledWith('/api/v1/osmo/bts', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({}),
        });
        expect(result).toBe(resp);
    });

    it('releaseBts sends instanceId when provided', async () => {
        const resp = { released: true };
        vi.mocked(apiFetch).mockResolvedValue(resp);
        await releaseBts('tab-1');
        expect(vi.mocked(apiFetch)).toHaveBeenCalledWith('/api/v1/osmo/bts', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ instanceId: 'tab-1' }),
        });
    });

    it('default export exposes getBts and updateBts', () => {
        expect(btsDefault.getBts).toBe(getBts);
        expect(btsDefault.releaseBts).toBe(releaseBts);
        expect(btsDefault.updateBts).toBe(updateBts);
    });
});
