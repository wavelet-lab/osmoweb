// Re-export all backend core functionalities
export {
    validateOsmoRequest,
    validateOsmoResponse,
} from './protocol.types';
export type {
    OsmoRequestTypes,
    ControlName,
    BtsConfig,
    CommonOsmoRequest,
    GetBtsListRequest,
    CommonOsmoResponse,
    GetBtsListResponse,
    ErrorResponse,
} from './protocol.types';
