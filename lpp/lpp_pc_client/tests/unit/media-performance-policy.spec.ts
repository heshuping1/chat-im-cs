import { describe, expect, it } from "vitest";

import { videoPreviewPreloadMode } from "../../src/renderer/media/runtime/mediaPerformancePolicy";

describe("media performance policy", () => {
  it("keeps video previews on metadata preload before playback", () => {
    expect(videoPreviewPreloadMode({ hasStarted: false, playing: false })).toBe("metadata");
  });

  it("allows full video preload after playback starts", () => {
    expect(videoPreviewPreloadMode({ hasStarted: true, playing: false })).toBe("auto");
    expect(videoPreviewPreloadMode({ hasStarted: false, playing: true })).toBe("auto");
  });
});
