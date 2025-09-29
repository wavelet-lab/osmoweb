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