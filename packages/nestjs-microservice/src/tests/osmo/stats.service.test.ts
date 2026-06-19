import { afterEach, describe, expect, it, vi } from "vitest";
import { StatsService } from "@/osmo/stats/stats.service";

describe("StatsService", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("uses configured VTY addresses and falls back for invalid values", async () => {
    const values: Record<string, string> = {
      STATS_ENABLED: "true",
      STATS_INTERVAL_MS: "2500",
      OSMO_TCP_BSC_URI: "bsc.internal",
      OSMO_TCP_BSC_PORT: "14242",
      OSMO_TCP_HLR_URI: "hlr.internal",
      OSMO_TCP_HLR_PORT: "invalid",
      OSMO_TCP_MGW_URI: "mgw.internal",
      OSMO_TCP_MGW_PORT: "14243",
      OSMO_TCP_MSC_URI: "msc.internal",
      OSMO_TCP_MSC_PORT: "14254",
      OSMO_TCP_STP_URI: "stp.internal",
      OSMO_TCP_STP_PORT: "14239",
    };
    const config = { get: vi.fn((key: string) => values[key]) };
    const collector = {
      addController: vi.fn(),
      collect: vi.fn().mockResolvedValue([]),
    };
    const writer = { write: vi.fn().mockResolvedValue(undefined) };
    vi.spyOn(globalThis, "setInterval").mockReturnValue(1 as any);

    const service = new StatsService(config as any, collector as any);
    service.registerWriter(writer);
    await service.onModuleInit();

    const controllers = Object.fromEntries(
      collector.addController.mock.calls.map(([id, controller]) => [
        id,
        controller,
      ])
    ) as Record<string, any>;
    expect(controllers["osmo-bsc"].vty.host).toBe("bsc.internal");
    expect(controllers["osmo-bsc"].vty.port).toBe(14242);
    expect(controllers["osmo-hlr"].vty.host).toBe("hlr.internal");
    expect(controllers["osmo-hlr"].vty.port).toBe(4258);
    expect(controllers["osmo-mgw"].vty.port).toBe(14243);
    expect(controllers["osmo-msc"].vty.port).toBe(14254);
    expect(controllers["osmo-stp"].vty.port).toBe(14239);
    expect(setInterval).toHaveBeenCalledWith(expect.any(Function), 2500);
  });
});
