import { describe, expect, it } from "vitest";

import {
  createChatSendDiagnosticRecord,
  initialChatSendStatusForKind,
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
});
