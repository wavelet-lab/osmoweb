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

export const osmoServiceAddrMap: { [key in OsmoServices]: ServiceAddr } = {
    [OsmoServices.OSMO_UDP_MEDIA]: { serviceUri: 'localhost', servicePort: 1984 },
    [OsmoServices.OSMO_TCP_ABIS_OML]: { serviceUri: 'localhost', servicePort: 3002 },
    [OsmoServices.OSMO_TCP_ABIS_RSL]: { serviceUri: 'localhost', servicePort: 3003 },
    [OsmoServices.OSMO_TCP_HLR]: { serviceUri: 'localhost', servicePort: 4258 },
    [OsmoServices.OSMO_TCP_BSC]: { serviceUri: 'localhost', servicePort: 4242 },
}

export const osmoDefaultParams: OsmoParams = {
    port: 8800,
    services: [
        osmoServiceAddrMap[OsmoServices.OSMO_UDP_MEDIA],
        osmoServiceAddrMap[OsmoServices.OSMO_TCP_ABIS_OML],
        osmoServiceAddrMap[OsmoServices.OSMO_TCP_ABIS_RSL],
        osmoServiceAddrMap[OsmoServices.OSMO_TCP_HLR],
        osmoServiceAddrMap[OsmoServices.OSMO_TCP_BSC],
    ],
    controlUri: '/wsdr/osmo/control',
    abisOmlUri: '/wsdr/osmo/abis_oml',
    abisRslUri: '/wsdr/osmo/abis_rsl',
    mediaUri: '/wsdr/osmo/media',
    poolSize: 4
}
