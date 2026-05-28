import { GSMBand } from '@osmoweb/core';

//common
export type OsmoRequestTypes = 'get-bts-list';

export interface ControlName {
    event: OsmoRequestTypes;
}

export type CommonOsmoRequest = GetBtsListRequest;

// Main request validator
export function validateOsmoRequest(data: any): CommonOsmoRequest | undefined {
    if (isGetBtsListRequest(data)) return data;
    return undefined;
}

//requests with type guards

export interface GetBtsListRequest extends ControlName {
    event: 'get-bts-list';
}

export function isGetBtsListRequest(data: any): data is GetBtsListRequest {
    return data && data.event === 'get-bts-list';
}

//responses

export type CommonOsmoResponse = GetBtsListResponse | ErrorResponse;

export function validateOsmoResponse(data: any): CommonOsmoResponse | undefined {
    if (isGetBtsListResponse(data)) return data;
    if (isErrorResponse(data)) return data;
    return undefined;
}

export interface BtsConfig {
    id: number;
    band: GSMBand;
    ipa: string;
    arfcn: number;
    cell_identity: number;
    osmux_port: number;
}

export function isBtsConfig(data: any): data is BtsConfig {
    return data
        && typeof data.id === 'number'
        && typeof data.band === 'string'
        && Object.values(GSMBand).includes(data.band)
        && typeof data.ipa === 'string'
        && typeof data.arfcn === 'number'
        && typeof data.cell_identity === 'number'
        && typeof data.osmux_port === 'number';
}

export interface GetBtsListResponse extends ControlName {
    event: 'get-bts-list';
    bts: Array<BtsConfig>;
}

export function isGetBtsListResponse(data: any): data is GetBtsListResponse {
    return data && data.event === 'get-bts-list' && Array.isArray(data.bts) && data.bts.every(isBtsConfig);
}

export interface ErrorResponse {
    error: { code?: number, description?: string },
}

export function isErrorResponse(data: any): data is ErrorResponse {
    return data
        && data.error !== undefined
        && (data.error.description === undefined || typeof data.error.description === 'string')
        && (data.error.code === undefined || typeof data.error.code === 'number');
}
