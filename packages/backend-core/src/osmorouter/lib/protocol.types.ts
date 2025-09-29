//common
export type OsmoRequestTypes = 'get-bts-list' | 'lock-bts' | 'unlock-bts';

export interface ControlName {
    event: OsmoRequestTypes;
}

export type CommonOsmoRequest = GetBtsListRequest | LockBtsRequest | UnlockBtsRequest;

// Main request validator
export function validateOsmoRequest(data: any): CommonOsmoRequest | undefined {
    if (isGetBtsListRequest(data)) return data;
    if (isLockBtsRequest(data)) return data;
    if (isUnlockBtsRequest(data)) return data;
    return undefined;
}

//requests with type guards

export interface GetBtsListRequest extends ControlName {
    event: 'get-bts-list';
}

export function isGetBtsListRequest(data: any): data is GetBtsListRequest {
    return data && data.event === 'get-bts-list';
}

export interface LockBtsRequest extends ControlName {
    event: 'lock-bts';
    id: number;
}

export function isLockBtsRequest(data: any): data is LockBtsRequest {
    return data && data.event === 'lock-bts' && typeof data.id === 'number';
}

export interface UnlockBtsRequest extends ControlName {
    event: 'unlock-bts';
    id: number;
}

export function isUnlockBtsRequest(data: any): data is UnlockBtsRequest {
    return data && data.event === 'unlock-bts' && typeof data.id === 'number';
}

//responses

export type CommonOsmoResponse = GetBtsListResponse | LockBtsResponse | UnlockBtsResponse | ErrorResponse;

export interface BtsConfig {
    id: number;
    band: string;
    'ip.access': string;
    arfcn: number;
    cell_identity: number;
    osmux_port: number;
}

export interface GetBtsListResponse extends ControlName {
    event: 'get-bts-list';
    bts: Array<BtsConfig>;
}


export interface LockBtsResponse extends ControlName {
    event: 'lock-bts',
    id: number,
    result: { code: number };
}

export interface UnlockBtsResponse extends ControlName {
    event: 'unlock-bts',
    id: number,
    result: { code: number };
}

export interface ErrorResponse {
    error?: { code?: number, description?: string },
}
