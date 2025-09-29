export interface CtrlCommand {
    id: number,
    variable: string,
    value?: string,
}

export interface CtrlResponse {
    id: number,
    variable: string,
    value: string,
    error?: string,
}

export enum CtrlCommandType {
    GET = 'GET',
    SET = 'SET',
    TRAP = 'TRAP'
}

export enum CtrlResponseType {
    GET_REPLY = 'GET_REPLY',
    SET_REPLY = 'SET_REPLY',
    ERROR = 'ERROR',
    TRAP = 'TRAP',
}

export interface OsmoComponent {
    name: string,
    host: string,
    ctrlPort: number,
    vtyPort?: number,
}

export const OSMO_COMPONENTS: Record<string, OsmoComponent> = {
    STP: { name: 'osmo-stp', host: 'localhost', ctrlPort: 4239, vtyPort: 4239 },
    HLR: { name: 'osmo-hlr', host: 'localhost', ctrlPort: 4259, vtyPort: 4258 },
    MGW: { name: 'osmo-mgw', host: 'localhost', ctrlPort: 4246, vtyPort: 4243 },
    MSC: { name: 'osmo-msc', host: 'localhost', ctrlPort: 4254, vtyPort: 4254 },
    BSC: { name: 'osmo-bsc', host: 'localhost', ctrlPort: 4249, vtyPort: 4242 },
};

export interface CtrlTrapEvent {
    variable: string,
    value: string,
}