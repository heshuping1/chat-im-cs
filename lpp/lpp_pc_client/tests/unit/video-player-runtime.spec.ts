import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  inlineVideoPreviewSrc,
  openDesktopVideoPlayer,
} from "../../src/renderer/media/runtime/videoPlayer";

describe("openDesktopVideoPlayer", () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    Object.defineProperty(globalThis, "window", {
      configurable: true,
      value: {},
    });
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    delete (globalThis as { window?: unknown }).window;
    vi.restoreAllMocks();
  });

  it("opens the desktop player with the server video source first", async () => {
    const openVideoPlayer = vi.fn(async () => "cached-file");
    (window as Window & { desktopApi: { openVideoPlayer: typeof openVideoPlayer } }).desktopApi = {
      openVideoPlayer,
    };

    await expect(
      openDesktopVideoPlayer({
        authToken: "token",
        displaySrc: "https://cdn.example.com/current-visible-video.mp4",
        remoteSrc: "https://cdn.example.com/stale-server-video.mp4",
        posterSrc: "https://cdn.example.com/poster.jpg",
        media: {
          fileName: "clip.mp4",
          width: 720,
          height: 1280,
          durationSeconds: 18,
          sizeBytes: 12345,
        },
        mediaCacheContext: { accountId: "u1", conversationId: "c1" },
      }),
    ).resolves.toBe(true);

    expect(openVideoPlayer).toHaveBeenCalledWith(
      expect.objectContaining({
        url: "https://cdn.example.com/stale-server-video.mp4",
        authToken: "token",
        posterUrl: "https://cdn.example.com/poster.jpg",
        accountId: "u1",
        conversationId: "c1",
      }),
    );
  });

  it("uses a local cached file video source before the server source", async () => {
    const openVideoPlayer = vi.fn(async () => "cached-file");
    (window as Window & { desktopApi: { openVideoPlayer: typeof openVideoPlayer } }).desktopApi = {
      openVideoPlayer,
    };

    await expect(
      openDesktopVideoPlayer({
        authToken: "token",
        displaySrc: "file:///Users/eric/Library/Application%20Support/startlink/startlink-files/u1/c1/Videos/clip.mp4",
        remoteSrc: "https://cdn.example.com/server-video.mp4",
        media: {
          fileName: "clip.mp4",
          width: 720,
          height: 1280,
        },
      }),
    ).resolves.toBe(true);

    expect(openVideoPlayer).toHaveBeenCalledWith(
      expect.objectContaining({
        url: "file:///Users/eric/Library/Application%20Support/startlink/startlink-files/u1/c1/Videos/clip.mp4",
      }),
    );
  });

  it("uses explicit local open urls before preview and server video sources", async () => {
    const openVideoPlayer = vi.fn(async () => "cached-file");
    const onDiagnostic = vi.fn();
    (window as Window & { desktopApi: { openVideoPlayer: typeof openVideoPlayer } }).desktopApi = {
      openVideoPlayer,
    };

    await expect(
      openDesktopVideoPlayer({
        displaySrc: "blob:http://127.0.0.1:5173/preview",
        localOpenSrc: "file:///Users/eric/Library/Application%20Support/startlink/startlink-files/u1/c1/Videos/local-open.mp4",
        remoteSrc: "https://cdn.example.com/server-video.mp4",
        media: {
          fileName: "clip.mp4",
          width: 720,
          height: 1280,
        },
        onDiagnostic,
      }),
    ).resolves.toBe(true);

    expect(openVideoPlayer).toHaveBeenCalledWith(
      expect.objectContaining({
        url: "file:///Users/eric/Library/Application%20Support/startlink/startlink-files/u1/c1/Videos/local-open.mp4",
      }),
    );
    expect(onDiagnostic).toHaveBeenCalledWith(
      expect.objectContaining({
        event: "open.prepare",
        sourceKind: "file",
        hasLocalOpenUrl: true,
        openedWithInitialFileUrl: true,
      }),
    );
  });

  it("opens an explicit local file url even when no inline display source exists", async () => {
    const openVideoPlayer = vi.fn(async () => "cached-file");
    const onDiagnostic = vi.fn();
    (window as Window & { desktopApi: { openVideoPlayer: typeof openVideoPlayer } }).desktopApi = {
      openVideoPlayer,
    };

    await expect(
      openDesktopVideoPlayer({
        localOpenSrc: "file:///Users/eric/Library/Application%20Support/startlink/startlink-files/u1/c1/Videos/materialized.mp4",
        remoteSrc: undefined,
        media: {
          fileName: "materialized.mp4",
          width: 720,
          height: 1280,
        },
        onDiagnostic,
      }),
    ).resolves.toBe(true);

    expect(openVideoPlayer).toHaveBeenCalledWith(
      expect.objectContaining({
        url: "file:///Users/eric/Library/Application%20Support/startlink/startlink-files/u1/c1/Videos/materialized.mp4",
      }),
    );
    expect(onDiagnostic).toHaveBeenCalledWith(
      expect.objectContaining({
        event: "open.prepare",
        sourceKind: "file",
        hasLocalOpenUrl: true,
        openedWithInitialFileUrl: true,
      }),
    );
  });

  it("records a degraded remote open when no local open url is available", async () => {
    const openVideoPlayer = vi.fn(async () => "cached-file");
    const onDiagnostic = vi.fn();
    (window as Window & { desktopApi: { openVideoPlayer: typeof openVideoPlayer } }).desktopApi = {
      openVideoPlayer,
    };

    await expect(
      openDesktopVideoPlayer({
        displaySrc: "blob:http://127.0.0.1:5173/preview",
        remoteSrc: "https://cdn.example.com/server-video.mp4?token=secret",
        media: {
          fileName: "clip.mp4",
          width: 720,
          height: 1280,
        },
        onDiagnostic,
      }),
    ).resolves.toBe(true);

    expect(openVideoPlayer).toHaveBeenCalledWith(
      expect.objectContaining({
        url: "https://cdn.example.com/server-video.mp4?token=secret",
      }),
    );
    expect(onDiagnostic).toHaveBeenCalledWith(
      expect.objectContaining({
        event: "open.prepare",
        sourceKind: "http",
        hasLocalOpenUrl: false,
        openedWithInitialFileUrl: false,
      }),
    );
  });


  it("opens a local cached file even when a blob poster can no longer be fetched", async () => {
    const openVideoPlayer = vi.fn(async () => "cached-file");
    const onDiagnostic = vi.fn();
    (window as Window & { desktopApi: { openVideoPlayer: typeof openVideoPlayer } }).desktopApi = {
      openVideoPlayer,
    };
    globalThis.fetch = vi.fn(async () => {
      throw new Error("Failed to fetch");
    }) as typeof fetch;

    await expect(
      openDesktopVideoPlayer({
        displaySrc: "file:///Users/eric/Library/Application%20Support/startlink/startlink-files/u1/c1/Videos/clip.mp4",
        posterSrc: "blob:http://127.0.0.1:5173/stale-poster",
        media: {
          fileName: "clip.mp4",
          width: 720,
          height: 1280,
        },
        onDiagnostic,
      }),
    ).resolves.toBe(true);

    expect(openVideoPlayer).toHaveBeenCalledWith(
      expect.objectContaining({
        url: "file:///Users/eric/Library/Application%20Support/startlink/startlink-files/u1/c1/Videos/clip.mp4",
      }),
    );
    expect(openVideoPlayer.mock.calls[0]?.[0]).not.toHaveProperty("posterUrl");
    expect(onDiagnostic).toHaveBeenCalledWith(
      expect.objectContaining({
        event: "poster.resolve_failed",
        posterKind: "blob",
        sourceKind: "file",
      }),
    );
  });

  it("omits data url posters so poster validation cannot block opening cached videos", async () => {
    const openVideoPlayer = vi.fn(async () => "cached-file");
    (window as Window & { desktopApi: { openVideoPlayer: typeof openVideoPlayer } }).desktopApi = {
      openVideoPlayer,
    };

    await expect(
      openDesktopVideoPlayer({
        displaySrc: "file:///Users/eric/Library/Application%20Support/startlink/startlink-files/u1/c1/Videos/clip.mp4",
        posterSrc: `data:image/jpeg;base64,${"a".repeat(10_000)}`,
        media: {
          fileName: "clip.mp4",
          width: 720,
          height: 1280,
        },
      }),
    ).resolves.toBe(true);

    expect(openVideoPlayer).toHaveBeenCalledWith(
      expect.objectContaining({
        url: "file:///Users/eric/Library/Application%20Support/startlink/startlink-files/u1/c1/Videos/clip.mp4",
      }),
    );
    expect(openVideoPlayer.mock.calls[0]?.[0]).not.toHaveProperty("posterUrl");
  });

  it("uses local/browser-safe urls as inline video preview sources only inside desktop", () => {
    const fileUrl =
      "file:///Users/eric/Library/Application%20Support/startlink/startlink-files/u1/c1/Videos/clip.mp4";
    expect(inlineVideoPreviewSrc(fileUrl)).toBeUndefined();
    expect(inlineVideoPreviewSrc(fileUrl, { allowDesktopFile: true })).toBe(fileUrl);
    expect(inlineVideoPreviewSrc("blob:http://127.0.0.1:5173/video")).toBe(
      "blob:http://127.0.0.1:5173/video",
    );
    expect(inlineVideoPreviewSrc("https://cdn.example.com/video.mp4")).toBeUndefined();
  });

  it("falls back to the displayed source when no server video source is available", async () => {
    const openVideoPlayer = vi.fn(async () => "cached-file");
    (window as Window & { desktopApi: { openVideoPlayer: typeof openVideoPlayer } }).desktopApi = {
      openVideoPlayer,
    };

    await expect(
      openDesktopVideoPlayer({
        authToken: "token",
        displaySrc: "https://cdn.example.com/current-visible-video.mp4",
        media: {
          fileName: "clip.mp4",
          width: 720,
          height: 1280,
        },
      }),
    ).resolves.toBe(true);

    expect(openVideoPlayer).toHaveBeenCalledWith(
      expect.objectContaining({
        url: "https://cdn.example.com/current-visible-video.mp4",
      }),
    );
  });

  it("normalizes relative server video and poster urls before crossing into Electron main", async () => {
    Object.defineProperty(window, "location", {
      configurable: true,
      value: { origin: "https://pc.example.test" },
    });
    const openVideoPlayer = vi.fn(async () => "cached-file");
    (window as Window & { desktopApi: { openVideoPlayer: typeof openVideoPlayer } }).desktopApi = {
      openVideoPlayer,
    };

    await expect(
      openDesktopVideoPlayer({
        authToken: "token",
        displaySrc: "blob:local-visible-video",
        remoteSrc: "/media/clip.mp4",
        posterSrc: "/media/poster.jpg",
        media: {
          fileName: "clip.mp4",
          width: 576,
          height: 1280,
        },
      }),
    ).resolves.toBe(true);

    expect(openVideoPlayer).toHaveBeenCalledWith(
      expect.objectContaining({
        url: "https://pc.example.test/media/clip.mp4",
        posterUrl: "https://pc.example.test/media/poster.jpg",
      }),
    );
  });
});
