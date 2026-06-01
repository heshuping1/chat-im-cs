import { describe, expect, it, vi } from "vitest";
import {
  configFetchCandidates,
  latencyText,
  latencyTone,
  parseSiteLineConfig,
  primarySiteLine,
  selectFirstAvailableSite,
  siteLineManager,
  type SiteLineStorage,
} from "../../src/renderer/data/network/site-line-manager";

function memoryStorage(initial: Record<string, string> = {}): SiteLineStorage {
  const values = new Map(Object.entries(initial));
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
  };
}

describe("site line manager", () => {
  it("parses APP compatible site line config and normalizes urls", () => {
    const sites = parseSiteLineConfig({
      data: {
        configLine: [
          { siteId: "hk", displayName: "香港线路", host: "hk.example.com/" },
          { code: "sg", label: "新加坡线路", chatUrl: "https://sg.example.com/" },
          { id: "main-1", name: "主站1", apiBaseUrl: "https://chat.hearteasechat.com" },
        ],
      },
    });

    expect(sites).toEqual([
      expect.objectContaining({
        id: "hk",
        name: "香港线路",
        apiBaseUrl: "https://hk.example.com",
      }),
      expect.objectContaining({
        id: "sg",
        name: "新加坡线路",
        apiBaseUrl: "https://sg.example.com",
      }),
    ]);
  });

  it("orders config fetch candidates as current site, cached sites, then S3 fallback", () => {
    expect(
      configFetchCandidates({
        currentSite: {
          id: "hk",
          name: "香港线路",
          apiBaseUrl: "https://hk.example.com",
          configFileUrl: "https://hk.example.com/config.json",
        },
        cachedSwitchableSites: [
          {
            id: "sg",
            name: "新加坡线路",
            apiBaseUrl: "https://sg.example.com",
            configFileUrl: "https://sg.example.com/config.json",
          },
        ],
        fallbackS3ConfigFileUrl: "https://s3.example.com/lines.json",
      }),
    ).toEqual([
      "https://hk.example.com/config.json",
      "https://sg.example.com/config.json",
      "https://s3.example.com/lines.json",
    ]);
  });

  it("selects the first available site using the APP probe rule", async () => {
    const selected = await selectFirstAvailableSite(
      [
        primarySiteLine,
        { id: "hk", name: "香港线路", apiBaseUrl: "https://hk.example.com" },
        { id: "sg", name: "新加坡线路", apiBaseUrl: "https://sg.example.com" },
      ],
      vi.fn(async (site) => site.id === "hk"),
    );

    expect(selected.id).toBe("hk");
  });

  it("bootstraps from fallback config and persists only switchable sites", async () => {
    const storage = memoryStorage();
    const result = await siteLineManager.bootstrap({
      storage,
      fallbackS3ConfigFileUrl: "https://s3.example.com/lines.json",
      fetchConfig: vi.fn(async () => [
        { id: "hk", name: "香港线路", apiBaseUrl: "https://hk.example.com" },
      ]),
      probe: vi.fn(async (site) => site.id === "hk"),
    });

    expect(result.currentSite.id).toBe("hk");
    expect(result.switchableSites.map((site) => site.id)).toEqual(["main-1", "hk"]);
    expect(storage.getItem("site_line_current_site_id_v1")).toBe("hk");
    expect(storage.getItem("site_line_cached_switchable_sites_v1")).toContain("hk");
    expect(storage.getItem("site_line_cached_switchable_sites_v1")).not.toContain("main-1");
  });

  it("formats latency status with APP thresholds", () => {
    expect(latencyText(undefined)).toBe("未测试");
    expect(latencyText(undefined, true)).toBe("测试中");
    expect(latencyText(null)).toBe("不可用");
    expect(latencyText(79)).toBe("79 ms");
    expect(latencyTone(undefined)).toBe("muted");
    expect(latencyTone(79)).toBe("success");
    expect(latencyTone(80)).toBe("warning");
    expect(latencyTone(180)).toBe("danger");
    expect(latencyTone(null)).toBe("danger");
  });
});
