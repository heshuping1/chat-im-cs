import { describe, expect, it } from "vitest";

import {
  desktopIpcChannelByMethod,
  type DesktopApiMethod,
} from "../../src/shared/desktop-api";
import {
  validateCacheMediaFilePayload,
  validateChatArchiveFilePayload,
  validateAppLogPayload,
  validateCsRoutingDiagnosticPayload,
  validateDesktopApiCall,
  validateDesktopIpcCall,
  validateDesktopAuthSessionPayload,
  validateClientUpdatePreferences,
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
    expect(methods).toContain("getLaunchAtStartup");
    expect(methods).toContain("setLaunchAtStartup");
    expect(methods).toContain("getMinimizeToTray");
    expect(methods).toContain("setMinimizeToTray");
    expect(methods).toContain("getUpdatePreferences");
    expect(methods).toContain("setUpdatePreferences");
    expect(methods).toContain("getUpdateState");
    expect(methods).toContain("checkForUpdates");
    expect(methods).toContain("downloadUpdate");
    expect(methods).toContain("installUpdate");
    expect(methods).toContain("quitApp");
    expect(methods).toContain("recordCsRoutingDiagnostic");
    expect(methods).toContain("writeAppLog");
    expect(methods).toContain("recordMessageReminderDiagnostic");
    expect(methods).toContain("saveChatArchiveFile");
    expect(methods).toContain("openChatArchiveFile");
    expect(desktopIpcChannelByMethod.cacheLocalMediaFile).toBe("desktop:cache-local-media-file");
    expect(desktopIpcChannelByMethod.saveChatArchiveFile).toBe(
      "desktop:save-chat-archive-file",
    );
    expect(desktopIpcChannelByMethod.openChatArchiveFile).toBe(
      "desktop:open-chat-archive-file",
    );
    expect(desktopIpcChannelByMethod.getLaunchAtStartup).toBe(
      "desktop:get-launch-at-startup",
    );
    expect(desktopIpcChannelByMethod.setLaunchAtStartup).toBe(
      "desktop:set-launch-at-startup",
    );
    expect(desktopIpcChannelByMethod.getMinimizeToTray).toBe(
      "desktop:get-minimize-to-tray",
    );
    expect(desktopIpcChannelByMethod.setMinimizeToTray).toBe(
      "desktop:set-minimize-to-tray",
    );
    expect(desktopIpcChannelByMethod.checkForUpdates).toBe("desktop:check-for-updates");
    expect(desktopIpcChannelByMethod.downloadUpdate).toBe("desktop:download-update");
    expect(desktopIpcChannelByMethod.installUpdate).toBe("desktop:install-update");
    expect(desktopIpcChannelByMethod.quitApp).toBe("desktop:quit-app");
    expect(desktopIpcChannelByMethod.recordCsRoutingDiagnostic).toBe(
      "desktop:record-cs-routing-diagnostic",
    );
    expect(desktopIpcChannelByMethod.writeAppLog).toBe("desktop:write-app-log");
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
    expect(validateDesktopApiCall("getLaunchAtStartup", ["ignored"])).toEqual([]);
    expect(validateDesktopApiCall("setLaunchAtStartup", [true])).toEqual([true]);
    expect(validateDesktopApiCall("setLaunchAtStartup", [false])).toEqual([false]);
    expect(validateDesktopApiCall("getMinimizeToTray", ["ignored"])).toEqual([]);
    expect(validateDesktopApiCall("getUpdatePreferences", ["ignored"])).toEqual([]);
    expect(validateDesktopApiCall("getUpdateState", ["ignored"])).toEqual([]);
    expect(validateDesktopApiCall("checkForUpdates", ["ignored"])).toEqual([]);
    expect(validateDesktopApiCall("downloadUpdate", ["ignored"])).toEqual([]);
    expect(validateDesktopApiCall("installUpdate", ["ignored"])).toEqual([]);
    expect(validateDesktopApiCall("quitApp", ["ignored"])).toEqual([]);
    expect(validateDesktopApiCall("setMinimizeToTray", [true])).toEqual([true]);
    expect(validateDesktopApiCall("setMinimizeToTray", [false])).toEqual([false]);
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
    expect(() => validateDesktopApiCall("setLaunchAtStartup", ["yes"])).toThrow(
      "launchAtStartup.enabled",
    );
    expect(() => validateDesktopApiCall("setMinimizeToTray", ["yes"])).toThrow(
      "minimizeToTray.enabled",
    );
  });

  it("validates media payloads without changing valid fields", () => {
    expect(
      validateCacheMediaFilePayload({
        accountId: "u1",
        authToken: "token",
        cacheIdentity: "media:019e-photo-id",
        conversationId: "c1",
        fileName: "report.xlsx",
        kind: "file",
        url: "https://assets.example/report.xlsx",
      }),
    ).toEqual({
      accountId: "u1",
      authToken: "token",
      cacheIdentity: "media:019e-photo-id",
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
      summary: { body: "[redacted-content len=16]", conversationId: "conversation-1" },
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
        classification: {
          scopeKey:
            "https://chat.example.test|eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.raw.signature|tenant-1|user-1",
          tenantToken: "raw-token",
          unreadAfter: 1,
        },
        summary: { body: { text: "hello" }, conversationId: "conversation-1" },
      }),
    ).toEqual({
      at: "2026-06-02T01:40:00.000Z",
      event: "im.read.reduce",
      source: "gateway-im-side-effects",
      phase: "reduce",
      route: "background_conversation",
      classification: {
        scopeKey: expect.stringMatching(/^\[scope-key len=\d+ hash=[a-f0-9]{12}\]$/),
        tenantToken: "[redacted]",
        unreadAfter: 1,
      },
      summary: { body: "[redacted-content len=16]", conversationId: "conversation-1" },
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

  it("validates client update preferences", () => {
    expect(
      validateClientUpdatePreferences({
        autoCheck: true,
        channel: "stable",
        downloadMode: "differential-first",
      }),
    ).toEqual({
      autoCheck: true,
      channel: "stable",
      downloadMode: "differential-first",
    });
    expect(
      validateDesktopApiCall("setUpdatePreferences", [
        { autoCheck: false, channel: "beta", downloadMode: "differential-first" },
      ]),
    ).toEqual([{ autoCheck: false, channel: "beta", downloadMode: "differential-first" }]);
    expect(() =>
      validateDesktopApiCall("setUpdatePreferences", [
        { autoCheck: "yes", channel: "stable", downloadMode: "differential-first" },
      ]),
    ).toThrow("clientUpdate.autoCheck");
    expect(() =>
      validateClientUpdatePreferences({
        autoCheck: true,
        channel: "nightly",
        downloadMode: "differential-first",
      }),
    ).toThrow("clientUpdate.channel");
    expect(() =>
      validateClientUpdatePreferences({
        autoCheck: true,
        channel: "stable",
        downloadMode: "full-only",
      }),
    ).toThrow("clientUpdate.downloadMode");
  });

  it("validates app log payloads and redacts sensitive context", () => {
    expect(
      validateAppLogPayload({
        module: "auth",
        event: "auth.space.switch.apply",
        phase: "role",
        result: "ok",
        level: "info",
        traceId: "trace-1",
        context: {
          tenantId: "tenant-1",
          tenantRole: 2,
          sessionRole: 0,
          tenantToken: "raw-token",
        },
      }),
    ).toEqual({
      module: "auth",
      event: "auth.space.switch.apply",
      phase: "role",
      result: "ok",
      level: "info",
      traceId: "trace-1",
      occurredAt: undefined,
      reason: undefined,
      context: {
        tenantId: "tenant-1",
        tenantRole: 2,
        sessionRole: 0,
        tenantToken: "[redacted]",
      },
      error: undefined,
    });
    expect(() =>
      validateDesktopApiCall("writeAppLog", [
        { module: "debug", event: "x", phase: "x", result: "ok" },
      ]),
    ).toThrow("appLog.module");
    expect(() =>
      validateDesktopApiCall("writeAppLog", [
        { module: "auth", event: "x", phase: "x", result: "success" },
      ]),
    ).toThrow("appLog.result");
    expect(() =>
      validateDesktopApiCall("writeAppLog", [
        { module: "auth", event: "x", phase: "x", result: "ok", level: "verbose" },
      ]),
    ).toThrow("appLog.level");
  });

  it("validates chat archive file payloads without accepting paths or unsafe extensions", () => {
    expect(
      validateChatArchiveFilePayload({
        content: "{\"version\":1}",
        defaultName: "lpp-chat-export-2026-06-03.json",
        kind: "export",
      }),
    ).toEqual({
      content: "{\"version\":1}",
      defaultName: "lpp-chat-export-2026-06-03.json",
      kind: "export",
    });
    expect(
      validateDesktopApiCall("saveChatArchiveFile", [
        {
          content: "{\"version\":1}",
          defaultName: "lpp-chat-backup-2026-06-03.lpp-chat-backup",
          filePath: "/tmp/forged.lpp-chat-backup",
          kind: "backup",
        },
      ]),
    ).toEqual([
      {
        content: "{\"version\":1}",
        defaultName: "lpp-chat-backup-2026-06-03.lpp-chat-backup",
        kind: "backup",
      },
    ]);
    expect(validateDesktopApiCall("openChatArchiveFile", ["ignored"])).toEqual([]);
    expect(() =>
      validateChatArchiveFilePayload({
        content: "{}",
        defaultName: "backup.json",
        kind: "backup",
      }),
    ).toThrow("chatArchive.defaultName");
    expect(() =>
      validateChatArchiveFilePayload({
        content: "{}",
        defaultName: "export.exe",
        kind: "export",
      }),
    ).toThrow("chatArchive.defaultName");
    expect(() =>
      validateChatArchiveFilePayload({
        content: "x".repeat(26 * 1024 * 1024),
        defaultName: "backup.lpp-chat-backup",
        kind: "backup",
      }),
    ).toThrow("chatArchive.content is too long");
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
