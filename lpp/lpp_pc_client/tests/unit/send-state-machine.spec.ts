import { describe, expect, it } from "vitest";

import {
  chatSendFailureContext,
  createChatSendDiagnosticRecord,
  createUploadProgressDiagnosticSummary,
  initialChatSendStatusForKind,
  logChatSendDiagnostic,
  persistedSendDiagnosticsStorageKey,
  reduceChatSendState,
} from "../../src/renderer/data/send/send-state-machine";

describe("send state machine", () => {
  it("uses current local echo semantics for text and media messages", () => {
    expect(initialChatSendStatusForKind("text")).toBe("sending");
    expect(initialChatSendStatusForKind("image")).toBe("uploading");
    expect(initialChatSendStatusForKind("video")).toBe("uploading");
    expect(initialChatSendStatusForKind("file")).toBe("uploading");
  });

  it("accepts the expected media upload lifecycle transitions", () => {
    expect(reduceChatSendState("uploading", { type: "pause" })).toMatchObject({
      accepted: true,
      state: "paused",
    });
    expect(reduceChatSendState("paused", { type: "resume_upload" })).toMatchObject({
      accepted: true,
      state: "uploading",
    });
    expect(reduceChatSendState("uploading", { type: "upload_succeeded" })).toMatchObject({
      accepted: true,
      state: "sending",
    });
    expect(reduceChatSendState("sending", { type: "send_succeeded" })).toMatchObject({
      accepted: true,
      state: "sent",
    });
  });

  it("rejects invalid transitions without mutating the current state", () => {
    expect(reduceChatSendState("sent", { type: "pause" })).toEqual({
      accepted: false,
      changed: false,
      state: "sent",
      reason: "invalid_transition",
    });
  });

  it("creates sanitized diagnostics for failed transitions", () => {
    expect(
      createChatSendDiagnosticRecord({
        channel: "im",
        phase: "transition",
        result: "failed",
        action: "send_failed",
        from: "sending",
        to: "failed",
        reason: "network_error",
        context: {
          conversationId: "c1",
          localMessageId: "local-1",
          auth: "Bearer secret-token",
          filePath: "/Users/eric/Desktop/private.png",
        },
      }),
    ).toMatchObject({
      module: "send",
      taskId: "P4-MSG-005B",
      channel: "im",
      result: "failed",
      reason: "network_error",
      context: {
        conversationId: "c1",
        localMessageId: "local-1",
        auth: "Bearer ***",
        filePath: "[local-path]",
      },
    });
  });

  it("creates send diagnostics with stable routing fields and sanitized context", () => {
    const record = createChatSendDiagnosticRecord({
      taskId: "P4-MSG-005D",
      channel: "customer_service",
      phase: "upload",
      result: "ok",
      action: "upload_progress",
      context: {
        authToken: "raw-token",
        filePath: "C:/Users/hesp/Desktop/customer.png",
        localTaskId: "task-1",
        threadId: "thread-1",
      },
    });

    expect(record).toMatchObject({
      module: "send",
      taskId: "P4-MSG-005D",
      channel: "customer_service",
      phase: "upload",
      result: "ok",
      action: "upload_progress",
      context: {
        authToken: "[redacted]",
        filePath: "[local-path]",
        localTaskId: "task-1",
        threadId: "thread-1",
      },
    });
    expect(record.traceId).toMatch(/^send-customer_service-upload-/);
  });

  it("persists a bounded sanitized diagnostics buffer for later export", () => {
    const values = new Map<string, string>();
    const originalWindow = globalThis.window;
    Object.defineProperty(globalThis, "window", {
      configurable: true,
      value: {
        localStorage: {
          getItem: (key: string) => values.get(key) ?? null,
          setItem: (key: string, value: string) => values.set(key, value),
        },
      },
    });

    try {
      logChatSendDiagnostic({
        channel: "im",
        phase: "send",
        result: "failed",
        action: "send_failed",
        reason: "当前账号没有权限执行此操作",
        context: {
          auth: "Bearer raw-token",
          filePath: "/Users/eric/Desktop/private.mp4",
          failureStage: "send",
          path: "/api/client/v1/groups/g1/messages",
        },
      });
    } finally {
      Object.defineProperty(globalThis, "window", {
        configurable: true,
        value: originalWindow,
      });
    }

    const persisted = JSON.parse(values.get(persistedSendDiagnosticsStorageKey) ?? "[]");
    expect(persisted).toHaveLength(1);
    expect(persisted[0]).toMatchObject({
      module: "send",
      phase: "send",
      result: "failed",
      reason: "当前账号没有权限执行此操作",
      context: {
        auth: "Bearer ***",
        filePath: "[local-path]",
        failureStage: "send",
        path: "/api/client/v1/groups/g1/messages",
      },
    });
  });

  it("extracts API status, code and request id for send failure diagnostics", () => {
    expect(
      chatSendFailureContext(new Error("plain error"), {
        path: "/api/client/v1/direct-chats/c1/messages",
      }),
    ).toMatchObject({
      path: "/api/client/v1/direct-chats/c1/messages",
    });
    expect(
      chatSendFailureContext(
        {
          message: "forbidden",
          code: "MSG_MEMBER_FORBIDDEN",
          requestId: "req-1",
          status: 403,
        },
        { path: "/api/client/v1/direct-chats/c1/messages" },
      ),
    ).toMatchObject({
      code: "MSG_MEMBER_FORBIDDEN",
      path: "/api/client/v1/direct-chats/c1/messages",
      requestId: "req-1",
      status: 403,
    });
  });

  it("summarizes upload progress events for diagnosing fast and sparse video uploads", () => {
    expect(
      createUploadProgressDiagnosticSummary({
        completedAt: 1_240,
        fileSize: 8_192,
        localTaskId: "task-video",
        messageKind: "video",
        percents: [10, 40, 80, 100],
        phase: "uploading_media",
        startedAt: 1_000,
      }),
    ).toMatchObject({
      completedByProgress: true,
      durationMs: 240,
      eventCount: 4,
      fileSize: 8_192,
      firstPercent: 10,
      lastPercent: 100,
      localTaskId: "task-video",
      messageKind: "video",
      phase: "uploading_media",
      progressSparse: false,
    });

    expect(
      createUploadProgressDiagnosticSummary({
        completedAt: 1_200,
        fileSize: 8_192,
        localTaskId: "task-fast",
        messageKind: "video",
        percents: [100],
        phase: "uploading_media",
        startedAt: 1_000,
      }),
    ).toMatchObject({
      completedByProgress: true,
      durationMs: 200,
      eventCount: 1,
      fastCompleted: true,
      progressSparse: false,
    });

    expect(
      createUploadProgressDiagnosticSummary({
        completedAt: 2_000,
        fileSize: 8_192,
        localTaskId: "task-sparse",
        messageKind: "video",
        percents: [100],
        phase: "uploading_media",
        startedAt: 1_000,
      }),
    ).toMatchObject({
      completedByProgress: true,
      durationMs: 1_000,
      eventCount: 1,
      fastCompleted: false,
      progressSparse: true,
    });
  });
});
