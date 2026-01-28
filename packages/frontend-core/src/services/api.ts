// Minimal API helper for the frontend
// Use import.meta.env.VITE_API_URL for absolute API base, or rely on the dev proxy (/api)

let apiBase: string | undefined = undefined;

/**
 * Set the API base URL dynamically (call from your app initialization).
 * Example: setApiBase('http://localhost:3000')
 */
export function setApiBase(base?: string) {
    apiBase = base;
}

/** Determine the API base URL by checking multiple locations (manual -> global -> env for SSR). */
function getEnvApiBase(): string | undefined {
    const g = globalThis as any;

    // 1) Explicit global variable (can be set from index.html)
    if (typeof g.__API_BASE__ === 'string' && g.__API_BASE__) {
        return g.__API_BASE__;
    }

    // 2) process.env (SSR / Node). In browsers globalThis.process is usually undefined.
    const proc = g.process as any | undefined;
    if (proc && proc.env) {
        if (proc.env.VITE_API_URL) return proc.env.VITE_API_URL;
        if (proc.env.API_URL) return proc.env.API_URL;
    }

    // 3) We do not read import.meta.env directly here to stay environment-agnostic.
    //    If import.meta.env is required, call setApiBase(import.meta.env.VITE_API_URL) at build/runtime.

    return undefined;
}

/** Return the current API base URL (manual -> env -> fallback '/'). */
export function getApiBase(): string {
    const base = apiBase ?? getEnvApiBase();
    return base ? String(base) : '/';
}

export function apiUrl(path = ''): string {
    const base = getApiBase();
    // If base looks like a relative path ("/api"), ensure the leading slash and normalize slashes
    if (base.startsWith('/')) {
        return `${base.replace(/\/+$/, '')}/${path.replace(/^\/+/, '')}`;
    }
    return `${base.replace(/\/+$/, '')}/${path.replace(/^\/+/, '')}`;
}

export async function apiFetch<T = any>(path: string, init?: RequestInit): Promise<T> {
    const url = apiUrl(path);
    const res = await fetch(url, { ...init, credentials: 'include' });

    const contentType = res?.headers?.get("content-type");

    if (!res.ok) {
        // try to provide better error messages
        let errorBody: any;
        if (contentType?.includes("application/json")) {
            errorBody = await res.json();
            throw new Error(`API error ${res.status}`, { cause: errorBody });
        } else {
            errorBody = await res.text();
            throw new Error(`API error ${res.status}: ${errorBody}`);
        }
    }

    if (contentType?.includes("application/json")) {
        return (await res.json()) as unknown as T;
    }

    // Fallback: return raw text (useful for plain responses)
    return (await res.text()) as unknown as T;
}

export default {
    setApiBase,
    getApiBase,
    apiUrl,
    apiFetch,
};
