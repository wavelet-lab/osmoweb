import { apiFetch } from '@websdr/frontend-core/services';
import type { BscBtsConfig, BtsConfig } from '@osmoweb/backend-core';
import type { GSMBand } from '@osmoweb/core';

export type { BtsConfig };
export type BtsUpdateInput = BscBtsConfig & {
    instanceId?: string;
    band?: GSMBand;
    arfcn?: number;
};
/**
 * Fetch BTS info for the current user.
 * GET /api/v1/osmo/bts
 */
export async function getBts(): Promise<BtsConfig> {
    return apiFetch('/api/v1/osmo/bts');
}

/**
 * Update (create/configure) BTS for the current user.
 * PUT /api/v1/osmo/bts
 */
export async function updateBts(cfg?: BtsUpdateInput): Promise<BtsConfig> {
    return apiFetch('/api/v1/osmo/bts', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cfg ?? {}),
    });
}

export async function releaseBts(instanceId?: string): Promise<{ released: boolean }> {
    const body = instanceId ? { instanceId } : {};
    return apiFetch('/api/v1/osmo/bts', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
    });
}

export default {
    getBts,
    releaseBts,
    updateBts,
};
