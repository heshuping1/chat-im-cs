import { describe, expect, it, vi } from "vitest";

const cacheLocalMediaFile = vi.fn(async () => ({
  filePath: "/app-cache/clip.mp4",
  fileUrl: "file:///app-cache/clip.mp4",
}));
const ensureLocalMediaFile = vi.fn(async () => ({
  filePath: "/app-cache/remote.png",
  fileUrl: "file:///app-cache/remote.png",
}));

const fileSystemMocks = vi.hoisted(() => ({
  copyFile: vi.fn(),
  readFile: vi.fn(),
  writeFile: vi.fn(),
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

vi.mock("node:fs/promises", () => fileSystemMocks);

vi.mock("../../src/main/media-storage", () => ({
  assertAllowedLocalMediaFilePath: vi.fn((path: string) => path),
  cacheLocalMediaFile,
  cacheMediaPosterFile: vi.fn(),
  ensureLocalMediaFile,
  getLocalMediaStatus: vi.fn(),
  readLocalOrRemoteImageBuffer: vi.fn(),
}));

vi.mock("../../src/main/video-player-window", () => ({
  openVideoPlayerWindow: vi.fn(),
}));

describe("desktop file handlers", () => {
  it("returns a failed cache result for background media cache misses without rejecting IPC", async () => {
    ensureLocalMediaFile.mockRejectedValueOnce(new Error("media asset is not accessible"));
    const { registerDesktopFileHandlers } = await import("../../src/main/desktop-file-handlers");
    const handlers = new Map<string, (...args: unknown[]) => unknown>();

    registerDesktopFileHandlers({
      appIconPath: "/app/icon.ico",
      preloadPath: "/app/preload.cjs",
      register: (method, handler) => {
        handlers.set(method, handler as (...args: unknown[]) => unknown);
      },
    });

    await expect(
      handlers.get("cacheMediaFile")?.(
        {},
        {
          fileName: "remote.png",
          kind: "image",
          url: "https://cdn.example.test/missing.png",
        },
      ),
    ).resolves.toEqual({
      errorMessage: "media asset is not accessible",
      filePath: "",
      fileUrl: "",
      status: "failed",
    });
  });

  it("keeps explicit media open actions rejectable when media cache fails", async () => {
    ensureLocalMediaFile.mockRejectedValueOnce(new Error("media asset is not accessible"));
    const { registerDesktopFileHandlers } = await import("../../src/main/desktop-file-handlers");
    const handlers = new Map<string, (...args: unknown[]) => unknown>();

    registerDesktopFileHandlers({
      appIconPath: "/app/icon.ico",
      preloadPath: "/app/preload.cjs",
      register: (method, handler) => {
        handlers.set(method, handler as (...args: unknown[]) => unknown);
      },
    });

    await expect(
      handlers.get("openMediaFile")?.(
        {},
        {
          fileName: "remote.png",
          kind: "image",
          url: "https://cdn.example.test/missing.png",
        },
      ),
    ).rejects.toThrow("media asset is not accessible");
  });

  it("returns no data url for display media cache misses without rejecting IPC", async () => {
    ensureLocalMediaFile.mockRejectedValueOnce(new Error("MEDIA_SIGNATURE_EXPIRED"));
    const { registerDesktopFileHandlers } = await import("../../src/main/desktop-file-handlers");
    const handlers = new Map<string, (...args: unknown[]) => unknown>();

    registerDesktopFileHandlers({
      appIconPath: "/app/icon.ico",
      preloadPath: "/app/preload.cjs",
      register: (method, handler) => {
        handlers.set(method, handler as (...args: unknown[]) => unknown);
      },
    });

    await expect(
      handlers.get("readMediaFileAsDataUrl")?.(
        {},
        {
          fileName: "clip-poster.jpg",
          kind: "image",
          url: "https://cdn.example.test/clip-poster.jpg?sig=expired",
        },
      ),
    ).resolves.toBeUndefined();
  });

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

  it("saves downloaded bytes and reveals the saved file", async () => {
    const { dialog, shell } = await import("electron");
    vi.mocked(dialog.showSaveDialog).mockResolvedValue({
      canceled: false,
      filePath: "/Users/eric/Downloads/report.csv",
    });
    const { registerDesktopFileHandlers } = await import("../../src/main/desktop-file-handlers");
    const handlers = new Map<string, (...args: unknown[]) => unknown>();

    registerDesktopFileHandlers({
      appIconPath: "/app/icon.ico",
      preloadPath: "/app/preload.cjs",
      register: (method, handler) => {
        handlers.set(method, handler as (...args: unknown[]) => unknown);
      },
    });

    await expect(
      handlers.get("saveAndRevealFile")?.(
        {},
        {
          bytes: new Uint8Array([97, 44, 98]),
          defaultName: "report.csv",
          filters: [{ name: "CSV", extensions: ["csv"] }],
        },
      ),
    ).resolves.toBe("/Users/eric/Downloads/report.csv");

    expect(fileSystemMocks.writeFile).toHaveBeenCalledWith(
      "/Users/eric/Downloads/report.csv",
      Buffer.from([97, 44, 98]),
    );
    expect(shell.showItemInFolder).toHaveBeenCalledWith("/Users/eric/Downloads/report.csv");
  });
});
