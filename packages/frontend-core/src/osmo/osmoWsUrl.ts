import { getEnvValue } from '@websdr/frontend-core/common';
import { getApiBase } from '@websdr/frontend-core/services';

type OsmoEnv = {
    VITE_OSMO_PORT?: string;
    OSMO_PORT?: string;
};

function getEnvOsmoPort(): string | undefined {
    const envOsmoPort = getEnvValue<OsmoEnv>(["VITE_OSMO_PORT", "OSMO_PORT"]);
    return envOsmoPort === undefined ? undefined : String(envOsmoPort);
}

export function endpointToOsmoWsUrl(endpoint: string): string {
    let ret: string = '';
    if (!endpoint) return ret;
    if (endpoint.startsWith('ws://') || endpoint.startsWith('wss://'))
        ret = endpoint;
    else {
        const locUrl = new URL(getApiBase());
        if (locUrl.protocol === "https:") locUrl.protocol = "wss:";
        else locUrl.protocol = "ws:";
        locUrl.port = getEnvOsmoPort() ?? locUrl.port;
        locUrl.pathname = endpoint;
        ret = locUrl.toString();
    }
    return ret;
}
