import { describe, it, expect, vi, beforeEach, afterAll } from "vitest";
import type { Mock } from "vitest";

vi.mock("@/services/api", () => ({ apiFetch: vi.fn() }));

import { apiFetch } from "@/services/api";
import { login } from "@/services/auth";

const mockedApiFetch = apiFetch as Mock;

describe("login", () => {
    beforeEach(() => {
        vi.resetAllMocks();
    });

    it("generates a client_uuid when missing, calls apiFetch and stores/returns token", async () => {
        mockedApiFetch.mockResolvedValue({
            ok: true,
            status: 200,
            json: async () => ({ token: "jwt-token-1" })
        });

        await login();

        expect(mockedApiFetch).toHaveBeenCalledTimes(1);
        expect(mockedApiFetch).toHaveBeenCalledWith(
            "/api/auth/guest",
            expect.objectContaining({ method: "POST" })
        );
    });

    it("uses existing client_uuid, does not call randomUUID, calls apiFetch with existing uuid", async () => {
        mockedApiFetch.mockResolvedValue({
            ok: true,
            status: 200,
            json: async () => ({ token: "jwt-token-2" })
        });

        await login();

        expect(mockedApiFetch).toHaveBeenCalledTimes(1);
        expect(mockedApiFetch).toHaveBeenCalledWith(
            "/api/auth/guest",
            expect.objectContaining({ method: "POST" })
        );
    });
});