import { COMPLEX_INT16_SIZE } from '@websdr/core/common';
export { COMPLEX_INT16_SIZE };

// Osmo parameters
export const OSMO_TRK_CHUNK_SIZE = 2500;
export const OSMO_TRX_PKT_SIZE = 2 * OSMO_TRK_CHUNK_SIZE;
export const OSMO_TRX_PKT_BYTESIZE = OSMO_TRX_PKT_SIZE * COMPLEX_INT16_SIZE;
