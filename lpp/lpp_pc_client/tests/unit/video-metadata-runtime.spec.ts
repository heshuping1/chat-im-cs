import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  initialVideoDurationSeconds,
  rememberVideoDurationSeconds,
} from "../../src/renderer/media/runtime/videoMetadataRuntime";

describe("videoMetadataRuntime", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.defineProperty(globalThis, "window", {
      configurable: true,
      value: {
        localStorage: {
          getItem: vi.fn().mockReturnValue(null),
          setItem: vi.fn(),
        },
      },
    });
  });

  it("keeps discovered video duration across chat preview remounts", () => {
    expect(initialVideoDurationSeconds("video:media:clip-1")).toBeUndefined();

    rememberVideoDurationSeconds("video:media:clip-1", 7.4);

    expect(initialVideoDurationSeconds("video:media:clip-1")).toBe(7.4);
  });

  it("prefers server supplied duration and persists it for later remounts", () => {
    expect(initialVideoDurationSeconds("video:media:clip-2", 18)).toBe(18);

    rememberVideoDurationSeconds("video:media:clip-2", 18);

    expect(initialVideoDurationSeconds("video:media:clip-2")).toBe(18);
  });

  it("restores persisted video duration after renderer reload", async () => {
    const persisted = JSON.stringify([["video:media:clip-3", 12.6]]);
    window.localStorage.getItem = vi.fn().mockReturnValue(persisted);

    vi.resetModules();
    const runtime = await import("../../src/renderer/media/runtime/videoMetadataRuntime");

    expect(runtime.initialVideoDurationSeconds("video:media:clip-3")).toBe(12.6);
  });
});
