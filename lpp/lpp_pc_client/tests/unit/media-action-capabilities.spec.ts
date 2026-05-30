import { describe, expect, it } from "vitest";

import { getMediaActionCapabilities } from "../../src/renderer/messages/runtime/mediaActionCapabilities";
import type { DesktopApi } from "../../src/shared/desktop-api";

describe("media action capabilities", () => {
  it("disables all desktop media actions without desktopApi", () => {
    expect(getMediaActionCapabilities(undefined)).toEqual({
      canCacheMediaFile: false,
      canCopyMediaFile: false,
      canEditMediaFile: false,
      canOpenMediaFile: false,
      canOpenVideoPlayer: false,
      canRevealInFolder: false,
      canSaveMediaAs: false,
    });
  });

  it("allows copy when native copy or cache fallback is available", () => {
    expect(getMediaActionCapabilities(apiWith("copyMediaFile")).canCopyMediaFile).toBe(true);
    expect(getMediaActionCapabilities(apiWith("cacheMediaFile")).canCopyMediaFile).toBe(true);
  });

  it("reports each desktop media capability independently", () => {
    expect(
      getMediaActionCapabilities(
        apiWith("openMediaFile", "saveMediaAs", "revealMediaInFolder", "editMediaFile", "openVideoPlayer"),
      ),
    ).toMatchObject({
      canEditMediaFile: true,
      canOpenMediaFile: true,
      canOpenVideoPlayer: true,
      canRevealInFolder: true,
      canSaveMediaAs: true,
    });
  });
});

function apiWith(...methods: Array<keyof DesktopApi>) {
  return Object.fromEntries(methods.map((method) => [method, async () => undefined])) as DesktopApi;
}
