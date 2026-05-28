// Re-export osmo functionalities
export {
    BtsManager,
    getBtsManagerInstance,
    createIpaFromUuid,
    createCellIdentityFromUuid,
    assignmentToBtsConfig,
} from './bts.manager';
export type {
    BtsAssignment,
    BtsManagerOptions,
    BtsAllocateParams,
    BtsUpdateParams,
    IpaUnitId,
} from './bts.manager';
