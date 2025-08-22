export interface ServiceAddr {
    serviceUri: string,
    servicePort: number,
}

export interface OsmoParams {
    port: number;
    services: Array<ServiceAddr>;
    controlUri: string;
    abisOmlUri: string;
    abisRslUri: string;
    mediaUri: string;
    poolSize: number
}

export enum OsmoServices {
    OSMO_UDP_MEDIA = 0,
    OSMO_TCP_ABIS_OML = 1,
    OSMO_TCP_ABIS_RSL = 2,
    OSMO_TCP_HLR = 3,
    OSMO_TCP_BSC = 4,
}
