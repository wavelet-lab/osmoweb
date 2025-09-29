import { apiFetch } from './api';
import type { BscBtsConfig, BscBtsInfo } from '@osmoweb/backend-core';
/**
 * Fetch BTS info for the current user.
 * GET /api/v1/osmo/bts
 */
export async function getBts(): Promise<BscBtsInfo> {
    return apiFetch('/api/v1/osmo/bts');
}

/**
 * Update (create/configure) BTS for the current user.
 * PUT /api/v1/osmo/bts
 */
export async function updateBts(cfg?: BscBtsConfig): Promise<any> {
    return apiFetch('/api/v1/osmo/bts', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cfg ?? {}),
    });
}

export default {
    getBts,
    updateBts,
};