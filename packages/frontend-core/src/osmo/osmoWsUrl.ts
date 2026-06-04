import { getEnvValue } from '@websdr/frontend-core/common';
import { apiWsUrl } from '@websdr/frontend-core/services';

type OsmoEnv = {
    VITE_OSMO_PORT?: string;
    OSMO_PORT?: string;
};

function getEnvOsmoPort(): number | undefined {
    const envOsmoPort = getEnvValue<OsmoEnv>(["VITE_OSMO_PORT", "OSMO_PORT"]);
    return envOsmoPort === undefined ? undefined : Number(envOsmoPort);
}

export function endpointToOsmoWsUrl(endpoint: string): string {
    let ret: string = '';
    if (!endpoint) return ret;
    if (endpoint.startsWith('ws://') || endpoint.startsWith('wss://'))
        ret = endpoint;
    else
        ret = apiWsUrl(endpoint, getEnvOsmoPort());

    return ret;
}
