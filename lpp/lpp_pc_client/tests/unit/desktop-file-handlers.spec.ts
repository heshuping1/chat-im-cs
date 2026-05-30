import { describe, expect, it, vi } from "vitest";

const cacheLocalMediaFile = vi.fn(async () => ({
  filePath: "/app-cache/clip.mp4",
  fileUrl: "file:///app-cache/clip.mp4",
}));

vi.mock("electron", () => ({
  clipboard: {
    writeBuffer: vi.fn(),
    writeText: vi.fn(),
  },
  dialog: {
    showSaveDialog: vi.fn(),
  },
  nativeImage: {
    createFromBuffer: vi.fn(),
  },
  shell: {
    openPath: vi.fn(async () => ""),
    showItemInFolder: vi.fn(),
  },
}));

vi.mock("../../src/main/media-storage", () => ({
  assertAllowedLocalMediaFilePath: vi.fn((path: string) => path),
  cacheLocalMediaFile,
  cacheMediaPosterFile: vi.fn(),
  ensureLocalMediaFile: vi.fn(),
  getLocalMediaStatus: vi.fn(),
  readLocalOrRemoteImageBuffer: vi.fn(),
}));

vi.mock("../../src/main/video-player-window", () => ({
  openVideoPlayerWindow: vi.fn(),
}));

describe("desktop file handlers", () => {
  it("passes the preload-derived source path through the local media cache handler", async () => {
    const { registerDesktopFileHandlers } = await import("../../src/main/desktop-file-handlers");
    const handlers = new Map<string, (...args: unknown[]) => unknown>();

    registerDesktopFileHandlers({
      appIconPath: "/app/icon.ico",
      preloadPath: "/app/preload.cjs",
      register: (method, handler) => {
        handlers.set(method, handler as (...args: unknown[]) => unknown);
      },
    });

    const source = { kind: "path", sourcePath: "/Users/eric/Movies/clip.mp4" };
    await expect(
      handlers.get("cacheLocalMediaFile")?.(
        {},
        {
          fileName: "clip.mp4",
          kind: "video",
          url: "blob:local-video",
        },
        source,
      ),
    ).resolves.toMatchObject({
      fileUrl: "file:///app-cache/clip.mp4",
    });

    expect(cacheLocalMediaFile).toHaveBeenCalledWith(
      expect.objectContaining({
        fileName: "clip.mp4",
        kind: "video",
      }),
      source,
    );
  });
});
