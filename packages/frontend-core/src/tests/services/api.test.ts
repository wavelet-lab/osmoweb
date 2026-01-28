import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { apiFetch, setApiBase } from '@/services/api';

describe('apiFetch', () => {
    let originalFetch: typeof fetch | undefined;

    // const apiBase = 'http://localhost:3000';
    const apiBase = '/api/v1';

    beforeEach(() => {
        originalFetch = (globalThis as any).fetch;
        // Ensure a predictable base for tests unless a test overrides it explicitly
        setApiBase(apiBase);
    });

    afterEach(() => {
        // restore original fetch and clear manual base
        (globalThis as any).fetch = originalFetch;
        setApiBase(undefined);
        vi.clearAllMocks();
    });

    it('resolves with parsed JSON on successful response and calls fetch with normalized URL', async () => {
        const mockJson = { hello: 'world' };
        const mockResponse = {
            ok: true,
            status: 200,
            headers: new Headers({ 'content-type': 'application/text' }),
            json: vi.fn().mockResolvedValue(mockJson),
            text: vi.fn().mockResolvedValue('OK'),
        };
        (globalThis as any).fetch = vi.fn().mockResolvedValue(mockResponse);

        const res = await apiFetch('/test/path');
        expect(res).toEqual('OK');
        expect((globalThis as any).fetch).toHaveBeenCalledTimes(1);
        expect((globalThis as any).fetch).toHaveBeenCalledWith(`${apiBase}/test/path`, { credentials: 'include' });
    });

    it('resolves with parsed JSON on successful response and calls fetch with normalized URL (JSON)', async () => {
        const mockJson = { hello: 'world' };
        const mockResponse = {
            ok: true,
            status: 200,
            headers: new Headers({ 'content-type': 'application/json' }),
            json: vi.fn().mockResolvedValue(mockJson),
            text: vi.fn().mockResolvedValue('OK'),
        };
        (globalThis as any).fetch = vi.fn().mockResolvedValue(mockResponse);

        const res = await apiFetch('/test/path');
        expect(res).toEqual(mockJson);
        expect((globalThis as any).fetch).toHaveBeenCalledTimes(1);
        expect((globalThis as any).fetch).toHaveBeenCalledWith(`${apiBase}/test/path`, { credentials: 'include' });
    });

    it('throws an Error with status and text when response is not ok', async () => {
        const mockResponse = {
            ok: false,
            status: 500,
            json: vi.fn(),
            text: vi.fn().mockResolvedValue('server error'),
        };
        (globalThis as any).fetch = vi.fn().mockResolvedValue(mockResponse);

        await expect(apiFetch('/fail')).rejects.toThrow('API error 500: server error');
        expect((globalThis as any).fetch).toHaveBeenCalledWith(`${apiBase}/fail`, { credentials: 'include' });
    });

    it('throws an Error with status and text when response is not ok (JSON)', async () => {
        const mockResponse = {
            ok: false,
            status: 500,
            headers: new Headers({ 'content-type': 'application/json' }),
            json: vi.fn().mockResolvedValue({ error: 'server error' }),
            text: vi.fn().mockResolvedValue('server error'),
        };
        (globalThis as any).fetch = vi.fn().mockResolvedValue(mockResponse);

        await expect(apiFetch('/fail')).rejects.toThrowError(new Error('API error 500', { cause: { error: 'server error' } }));

        expect((globalThis as any).fetch).toHaveBeenCalledWith(`${apiBase}/fail`, { credentials: 'include' });
    });

    it('normalizes base and path slashes when using an absolute api base', async () => {
        setApiBase('https://api.example.com'); // trailing slash
        const mockJson = { ok: true };
        const mockResponse = {
            ok: true,
            status: 200,
            headers: new Headers({ 'content-type': 'application/json' }),
            json: vi.fn().mockResolvedValue(mockJson),
            text: vi.fn().mockResolvedValue('OK'),
        };
        (globalThis as any).fetch = vi.fn().mockResolvedValue(mockResponse);

        const res = await apiFetch('/foo'); // leading slash
        expect(res).toEqual(mockJson);
        expect((globalThis as any).fetch).toHaveBeenCalledWith('https://api.example.com/foo', { credentials: 'include' });
    });

});
// Tests for getEnvApiBase (indirectly via the public getApiBase)
describe('getEnvApiBase via getApiBase', () => {
    let originalApiBaseGlobal: any;
    let originalVite: string | undefined;
    let originalApiUrl: string | undefined;
    let getApiBaseFn: () => string;

    const restoreEnv = () => {
        if (originalApiBaseGlobal === undefined) {
            delete (globalThis as any).__API_BASE__;
        } else {
            (globalThis as any).__API_BASE__ = originalApiBaseGlobal;
        }
        if (originalVite === undefined) delete process.env.VITE_API_URL;
        else process.env.VITE_API_URL = originalVite;
        if (originalApiUrl === undefined) delete process.env.API_URL;
        else process.env.API_URL = originalApiUrl;
    };

    beforeEach(async () => {
        const mod = await import('@/services/api');
        getApiBaseFn = mod.getApiBase;

        originalApiBaseGlobal = (globalThis as any).__API_BASE__;
        originalVite = process.env.VITE_API_URL;
        originalApiUrl = process.env.API_URL;

        delete (globalThis as any).__API_BASE__;
        delete process.env.VITE_API_URL;
        delete process.env.API_URL;

        setApiBase(undefined); // ensure manual base does not override env/global
    });

    afterEach(() => {
        restoreEnv();
        setApiBase(undefined);
    });

    it('prefers global __API_BASE__ over env vars', () => {
        (globalThis as any).__API_BASE__ = 'https://global.example';
        process.env.VITE_API_URL = 'https://vite.example';
        process.env.API_URL = 'https://api.example';
        expect(getApiBaseFn()).toBe('https://global.example');
    });

    it('uses process.env.VITE_API_URL when __API_BASE__ is not set', () => {
        process.env.VITE_API_URL = 'https://vite.example';
        expect(getApiBaseFn()).toBe('https://vite.example');
    });

    it('falls back to process.env.API_URL when VITE_API_URL is not set', () => {
        process.env.API_URL = 'https://api.example';
        expect(getApiBaseFn()).toBe('https://api.example');
    });

    it('returns "/" when neither global nor env vars are set', () => {
        expect(getApiBaseFn()).toBe('/');
    });

    it('ignores empty string __API_BASE__ and uses env', () => {
        (globalThis as any).__API_BASE__ = '';
        process.env.VITE_API_URL = 'https://vite.example';
        expect(getApiBaseFn()).toBe('https://vite.example');
    });
});
