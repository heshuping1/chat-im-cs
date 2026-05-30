import { describe, expect, it } from "vitest";
import { createVideoPlayerWindowLayout } from "../../src/main/video-player-window-layout";

describe("video player window layout", () => {
  it("keeps vertical videos comfortable instead of filling the full work area", () => {
    const layout = createVideoPlayerWindowLayout(
      { width: 1440, height: 900 },
      { width: 720, height: 1280 },
    );

    expect(layout.height).toBeGreaterThanOrEqual(690);
    expect(layout.height).toBeLessThanOrEqual(760);
    expect(layout.width).toBeLessThan(560);
  });

  it("uses a moderate wide-player size for landscape videos", () => {
    const layout = createVideoPlayerWindowLayout(
      { width: 1440, height: 900 },
      { width: 1920, height: 1080 },
    );

    expect(layout.width).toBeGreaterThanOrEqual(900);
    expect(layout.width).toBeLessThanOrEqual(1040);
    expect(layout.height).toBeLessThan(620);
  });

  it("keeps square videos medium sized and inside small work areas", () => {
    const square = createVideoPlayerWindowLayout(
      { width: 1440, height: 900 },
      { width: 1000, height: 1000 },
    );
    const small = createVideoPlayerWindowLayout(
      { width: 800, height: 560 },
      { width: 720, height: 1280 },
    );

    expect(square.width).toBeGreaterThanOrEqual(600);
    expect(square.width).toBeLessThanOrEqual(720);
    expect(square.height).toBeGreaterThanOrEqual(580);
    expect(square.height).toBeLessThanOrEqual(720);
    expect(small.width).toBeLessThanOrEqual(720);
    expect(small.height).toBeLessThanOrEqual(480);
  });
});
