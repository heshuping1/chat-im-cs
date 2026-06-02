import { describe, expect, it } from "vitest";

import {
  desktopIpcChannelByMethod,
  type DesktopApiMethod,
} from "../../src/shared/desktop-api";
import {
  validateCacheMediaFilePayload,
  validateCsRoutingDiagnosticPayload,
  validateDesktopApiCall,
  validateDesktopIpcCall,
  validateDesktopAuthSessionPayload,
  validateDiagnosticsPayload,
  validateMessageReminderDiagnosticPayload,
  validateNotifyPayload,
  validateTaskbarBadgePayload,
  validateTrayStatus,
  validateVideoPlayerPayload,
} from "../../src/shared/desktop-api-validation";

describe("desktop api validation", () => {
  it("keeps desktop ipc channels whitelisted and unique", () => {
    const methods = Object.keys(desktopIpcChannelByMethod) as DesktopApiMethod[];
    const channels = Object.values(desktopIpcChannelByMethod);

    expect(methods).toContain("notify");
    expect(methods).toContain("cacheLocalMediaFile");
    expect(methods).toContain("openAppProfile");
    expect(methods).toContain("getAppInstanceProfile");
    expect(methods).toContain("recordCsRoutingDiagnostic");
    expect(methods).toContain("recordMessageReminderDiagnostic");
    expect(desktopIpcChannelByMethod.cacheLocalMediaFile).toBe("desktop:cache-local-media-file");
    expect(desktopIpcChannelByMethod.recordCsRoutingDiagnostic).toBe(
      "desktop:record-cs-routing-diagnostic",
    );
    expect(desktopIpcChannelByMethod.recordMessageReminderDiagnostic).toBe(
      "desktop:record-message-reminder-diagnostic",
    );
    expect(channels.every((channel) => channel.startsWith("desktop:"))).toBe(true);
    expect(new Set(channels).size).toBe(channels.length);
  });

  it("validates notification, tray and no-argument calls", () => {
    expect(
      validateNotifyPayload({
        body: "B",
        channel: "serviceQueue",
        conversationId: "c1",
        iconDataUrl: "data:image/png;base64,abcd",
        silent: true,
        targetId: "t1",
        targetModule: "onlineService",
        title: "T",
      }),
    ).toEqual({
      title: "T",
      body: "B",
      channel: "serviceQueue",
      conversationId: "c1",
      iconDataUrl: "data:image/png;base64,abcd",
      silent: true,
      targetId: "t1",
      targetModule: "onlineService",
    });
    expect(validateTrayStatus("busy")).toBe("busy");
    expect(validateDesktopApiCall("captureScreenshot", ["ignored"])).toEqual([]);
    expect(validateDesktopApiCall("getAppInstanceProfile", ["ignored"])).toEqual([]);
    expect(validateDesktopApiCall("setTaskbarBadge", [{ count: 84, urgent: true }])).toEqual([
      { count: 84, urgent: true },
    ]);
    expect(validateTaskbarBadgePayload({ count: 0 })).toEqual({ count: 0, urgent: undefined });
    expect(validateDesktopApiCall("openAppProfile", ["client-2"])).toEqual(["client-2"]);
    expect(validateDesktopApiCall("openAppProfile", [undefined])).toEqual([]);
    expect(() => validateTrayStatus("root")).toThrow("Invalid tray status");
    expect(() => validateDesktopApiCall("openAppProfile", ["客服二号"])).toThrow(
      "appProfile.profileId",
    );
    expect(() =>
      validateNotifyPayload({ title: "T", body: "B", channel: "marketing" }),
    ).toThrow("notify.channel");
    expect(() =>
      validateNotifyPayload({ title: "T", body: "B", targetModule: "dataCenter" }),
    ).toThrow("notify.targetModule");
    expect(() =>
      validateNotifyPayload({ title: "T", body: "B", iconDataUrl: "https://assets.example/a.png" }),
    ).toThrow("notify.iconDataUrl");
    expect(() =>
      validateNotifyPayload({ title: "T", body: "B", iconDataUrl: "data:text/plain;base64,abcd" }),
    ).toThrow("notify.iconDataUrl");
    expect(() =>
      validateNotifyPayload({
        title: "T",
        body: "B",
        iconDataUrl: `data:image/png;base64,${"a".repeat(512 * 1024)}`,
      }),
    ).toThrow("notify.iconDataUrl");
    expect(() => validateTaskbarBadgePayload({ count: -1 })).toThrow("taskbarBadge.count");
    expect(() => validateTaskbarBadgePayload({ count: 1.5 })).toThrow("taskbarBadge.count");
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

  it("validates customer-service routing diagnostics and redacts sensitive fields", () => {
    expect(
      validateCsRoutingDiagnosticPayload({
        at: "2026-06-02T01:40:00.000Z",
        event: "msg.new",
        source: "gateway-router",
        phase: "received",
        route: "im",
        classification: { tenantToken: "raw-token", route: "im" },
        summary: { body: { text: "hello" }, conversationId: "conversation-1" },
      }),
    ).toEqual({
      at: "2026-06-02T01:40:00.000Z",
      event: "msg.new",
      source: "gateway-router",
      phase: "received",
      route: "im",
      classification: { tenantToken: "[redacted]", route: "im" },
      summary: { body: { text: "hello" }, conversationId: "conversation-1" },
    });
    expect(() =>
      validateDesktopApiCall("recordCsRoutingDiagnostic", [
        { event: "msg.new", source: "gateway-router", phase: "received" },
      ]),
    ).toThrow("csRouting.at");
  });

  it("validates message reminder diagnostics and redacts sensitive fields", () => {
    expect(
      validateMessageReminderDiagnosticPayload({
        at: "2026-06-02T01:40:00.000Z",
        event: "im.read.reduce",
        source: "gateway-im-side-effects",
        phase: "reduce",
        route: "background_conversation",
        classification: { tenantToken: "raw-token", unreadAfter: 1 },
        summary: { body: { text: "hello" }, conversationId: "conversation-1" },
      }),
    ).toEqual({
      at: "2026-06-02T01:40:00.000Z",
      event: "im.read.reduce",
      source: "gateway-im-side-effects",
      phase: "reduce",
      route: "background_conversation",
      classification: { tenantToken: "[redacted]", unreadAfter: 1 },
      summary: { body: { text: "hello" }, conversationId: "conversation-1" },
    });
    expect(() =>
      validateDesktopApiCall("recordMessageReminderDiagnostic", [
        { event: "im.read.reduce", source: "gateway-im-side-effects", phase: "reduce" },
      ]),
    ).toThrow("messageReminder.at");
  });

  it("validates IM unread lifecycle diagnostic payloads", () => {
    const cases = [
      {
        at: "2026-06-02T01:40:00.000Z",
        event: "app.renderer.mounted",
        source: "app",
        phase: "mounted",
        route: "messages",
        classification: {
          activeModule: "messages",
          desktopApiPresent: true,
          safeActiveModule: "messages",
        },
      },
      {
        at: "2026-06-02T01:40:01.000Z",
        event: "gateway.bridge.lifecycle",
        source: "gateway-bridge",
        phase: "started",
        route: "gateway",
        classification: {
          gatewayHost: "api.example.test",
          state: "Connected",
        },
      },
      {
        at: "2026-06-02T01:40:02.000Z",
        event: "im.store.mark-local",
        source: "workspace-store-core",
        phase: "mark",
        route: "local-read",
        classification: {
          activeConversationId: "conversation-1",
          activeModule: "messages",
          conversationId: "conversation-1",
          readSeq: 12,
          unreadAfter: 0,
        },
      },
    ];

    for (const payload of cases) {
      expect(validateDesktopApiCall("recordMessageReminderDiagnostic", [payload])[0]).toEqual(
        payload,
      );
    }
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
