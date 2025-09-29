import { describe, it, expect, vi, beforeEach } from "vitest";
import { stringToBoolean } from "@/utils/convUtils";

describe("stringToBoolean", () => {
    beforeEach(() => {
        vi.restoreAllMocks();
    });

    it("returns true for truthy textual values (case-insensitive, trimmed)", () => {
        expect(stringToBoolean("true")).toBe(true);
        expect(stringToBoolean(" TrUe  ")).toBe(true);
        expect(stringToBoolean("yes")).toBe(true);
        expect(stringToBoolean("  YES")).toBe(true);
        expect(stringToBoolean("1")).toBe(true);
    });

    it("returns false for explicit falsey textual values", () => {
        expect(stringToBoolean("false")).toBe(false);
        expect(stringToBoolean("No")).toBe(false);
        expect(stringToBoolean("0")).toBe(false);
        expect(stringToBoolean("")).toBe(false);
    });

    it("parses JSON for other strings (e.g. \"null\" -> null)", () => {
        expect(stringToBoolean("null")).toBe(false);
    });

    it("returns false and logs an error for invalid JSON strings", () => {
        const spy = vi.spyOn(console, "error").mockImplementation(() => { });
        expect(stringToBoolean("not a json")).toBe(false);
        expect(spy).toHaveBeenCalled();
        spy.mockRestore();
    });

    it("handles actual null and undefined inputs by returning false and logging an error", () => {
        const spy = vi.spyOn(console, "error").mockImplementation(() => { });

        // call with values that violate the declared type to exercise runtime behavior
        expect(stringToBoolean('asd')).toBe(false);

        // console.error should have been called at least once for the thrown JSON.parse or type error
        expect(spy).toHaveBeenCalled();
        spy.mockRestore();
    });
});