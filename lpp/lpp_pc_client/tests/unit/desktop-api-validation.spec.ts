import { describe, expect, it } from "vitest";

import {
  desktopIpcChannelByMethod,
  type DesktopApiMethod,
} from "../../src/shared/desktop-api";
import {
  validateCacheMediaFilePayload,
  validateDesktopApiCall,
  validateDesktopIpcCall,
  validateDesktopAuthSessionPayload,
  validateDiagnosticsPayload,
  validateNotifyPayload,
  validateTrayStatus,
  validateVideoPlayerPayload,
} from "../../src/shared/desktop-api-validation";

describe("desktop api validation", () => {
  it("keeps desktop ipc channels whitelisted and unique", () => {
    const methods = Object.keys(desktopIpcChannelByMethod) as DesktopApiMethod[];
    const channels = Object.values(desktopIpcChannelByMethod);

    expect(methods).toContain("notify");
    expect(methods).toContain("cacheLocalMediaFile");
    expect(desktopIpcChannelByMethod.cacheLocalMediaFile).toBe("desktop:cache-local-media-file");
    expect(channels.every((channel) => channel.startsWith("desktop:"))).toBe(true);
    expect(new Set(channels).size).toBe(channels.length);
  });

  it("validates notification, tray and no-argument calls", () => {
    expect(validateNotifyPayload({ title: "T", body: "B", conversationId: "c1" })).toEqual({
      title: "T",
      body: "B",
      conversationId: "c1",
    });
    expect(validateTrayStatus("busy")).toBe("busy");
    expect(validateDesktopApiCall("captureScreenshot", ["ignored"])).toEqual([]);
    expect(() => validateTrayStatus("root")).toThrow("Invalid tray status");
  });

  it("validates media payloads without changing valid fields", () => {
    expect(
      validateCacheMediaFilePayload({
        accountId: "u1",
        authToken: "token",
        conversationId: "c1",
        fileName: "report.xlsx",
        kind: "file",
        url: "https://assets.example/report.xlsx",
      }),
    ).toEqual({
      accountId: "u1",
      authToken: "token",
      conversationId: "c1",
      fileName: "report.xlsx",
      kind: "file",
      url: "https://assets.example/report.xlsx",
    });
    expect(() =>
      validateCacheMediaFilePayload({
        fileName: "report.xlsx",
        kind: "script",
        url: "https://assets.example/report.xlsx",
      }),
    ).toThrow("Invalid media.kind");
  });

  it("validates local media cache payload without accepting renderer supplied source paths", () => {
    expect(
      validateDesktopApiCall("cacheLocalMediaFile", [
        {
          accountId: "u1",
          conversationId: "c1",
          fileName: "clip.mp4",
          kind: "video",
          sourcePath: "/Users/eric/Movies/clip.mp4",
          url: "blob:local-video",
        },
        "/Users/eric/Movies/clip.mp4",
      ]),
    ).toEqual([
      {
        accountId: "u1",
        authToken: undefined,
        conversationId: "c1",
        fileName: "clip.mp4",
        kind: "video",
        url: "blob:local-video",
      },
    ]);
  });

  it("keeps preload-derived local media sources when validating main ipc args", () => {
    expect(
      validateDesktopIpcCall("cacheLocalMediaFile", [
        {
          accountId: "u1",
          conversationId: "c1",
          fileName: "clip.mp4",
          kind: "video",
          sourcePath: "/Users/eric/Movies/forged.mp4",
          url: "blob:local-video",
        },
        { kind: "path", sourcePath: "/Users/eric/Movies/clip.mp4" },
      ]),
    ).toEqual([
      {
        accountId: "u1",
        authToken: undefined,
        conversationId: "c1",
        fileName: "clip.mp4",
        kind: "video",
        url: "blob:local-video",
      },
      { kind: "path", sourcePath: "/Users/eric/Movies/clip.mp4" },
    ]);

    const bytes = new Uint8Array([1, 2, 3, 4]);
    expect(
      validateDesktopIpcCall("cacheLocalMediaFile", [
        {
          fileName: "pasted.pdf",
          kind: "file",
          url: "local-file:pc-local-media-1",
        },
        { kind: "bytes", bytes },
      ]),
    ).toEqual([
      {
        accountId: undefined,
        authToken: undefined,
        conversationId: undefined,
        fileName: "pasted.pdf",
        kind: "file",
        url: "local-file:pc-local-media-1",
      },
      { kind: "bytes", bytes },
    ]);

    expect(() =>
      validateDesktopIpcCall("cacheLocalMediaFile", [
        {
          fileName: "clip.mp4",
          kind: "video",
          url: "blob:local-video",
        },
        { kind: "path", sourcePath: "" },
      ]),
    ).toThrow("media.sourcePath");
    expect(() =>
      validateDesktopIpcCall("cacheLocalMediaFile", [
        {
          fileName: "clip.mp4",
          kind: "video",
          url: "blob:local-video",
        },
        { kind: "bytes", bytes: new Uint8Array() },
      ]),
    ).toThrow("media.sourceBytes");
  });

  it("validates video metadata and rejects invalid poster data urls", () => {
    expect(
      validateVideoPlayerPayload({
        fileName: "clip.mp4",
        height: "1280",
        kind: "video",
        title: "clip",
        url: "https://assets.example/clip.mp4",
        width: 720,
      }),
    ).toMatchObject({
      fileName: "clip.mp4",
      height: 1280,
      kind: "video",
      title: "clip",
      width: 720,
    });
    expect(() =>
      validateDesktopApiCall("cacheMediaPoster", [
        {
          dataUrl: "https://assets.example/poster.jpg",
          fileName: "poster.jpg",
          kind: "image",
          url: "https://assets.example/video.mp4",
        },
      ]),
    ).toThrow("data URL");
  });

  it("bounds diagnostics payloads and rejects invalid shapes", () => {
    const payload = validateDiagnosticsPayload({
      breadcrumbs: Array.from({ length: 205 }, (_, index) => `b${index}`),
      diagnostics: {
        auth: {
          recordCount: 1,
          records: [
            {
              refreshToken: "refresh-token",
              text: "failed with Bearer raw-token",
            },
          ],
        },
      },
      errors: [{ at: "now", message: "boom", requestId: "req-1" }],
      generatedAt: "2026-05-29T10:00:00.000Z",
      sessionId: "s1",
      traceId: "t1",
    });

    expect(payload.breadcrumbs).toHaveLength(200);
    expect(payload.diagnostics?.auth.records).toEqual([
      {
        refreshToken: "[redacted]",
        text: "failed with Bearer ***",
      },
    ]);
    expect(payload.errors).toEqual([{ at: "now", message: "boom", requestId: "req-1" }]);
    expect(payload.generatedAt).toBe("2026-05-29T10:00:00.000Z");
    expect(() => validateDiagnosticsPayload({ breadcrumbs: [], errors: [] })).toThrow(
      "diagnostics.sessionId",
    );
  });

  it("validates auth session payloads before secure storage IPC", () => {
    expect(
      validateDesktopAuthSessionPayload({
        apiBaseUrl: "https://api.example.com",
        displayName: "Tester",
        platformToken: "platform-token",
        tenantToken: "tenant-token",
      }),
    ).toMatchObject({
      apiBaseUrl: "https://api.example.com",
      displayName: "Tester",
      platformToken: "platform-token",
      tenantToken: "tenant-token",
    });
    expect(() =>
      validateDesktopApiCall("saveAuthSession", [
        {
          apiBaseUrl: "https://api.example.com",
          displayName: "Tester",
        },
      ]),
    ).toThrow("authSession.tenantToken");
  });

  it("rejects null bytes and oversized strings at the boundary", () => {
    expect(() => validateDesktopApiCall("openFile", ["bad\0path"])).toThrow(
      "invalid characters",
    );
    expect(() => validateDesktopApiCall("openExternal", ["javascript:alert(1)"])).toThrow(
      "protocol",
    );
    expect(() => validateDesktopApiCall("saveFile", ["a.txt", "x".repeat(6 * 1024 * 1024)])).toThrow(
      "saveFile.content is too long",
    );
  });
});
