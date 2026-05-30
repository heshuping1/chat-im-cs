import { describe, expect, it } from "vitest";

import { createMessageCenterDiagnosticRecord } from "../../src/renderer/messages/diagnostics/message-center-diagnostics";

describe("message center diagnostics", () => {
  it("creates sanitized page diagnostics", () => {
    expect(
      createMessageCenterDiagnosticRecord({
        event: "command.invoked",
        phase: "command",
        result: "ok",
        reason: "send_media",
        context: {
          conversationId: "c1",
          localPath: "/Users/eric/Desktop/private.png",
          token: "Bearer secret-token",
        },
      }),
    ).toMatchObject({
      module: "message-center",
      taskId: "P5-IM-001E",
      event: "command.invoked",
      phase: "command",
      result: "ok",
      reason: "send_media",
      context: {
        conversationId: "c1",
        localPath: "[local-path]",
        token: "Bearer ***",
      },
    });
  });

  it("creates sanitized video open diagnostics without local paths", () => {
    expect(
      createMessageCenterDiagnosticRecord({
        event: "video.poster_ignored",
        phase: "media",
        result: "ignored",
        reason: "Failed to fetch file:///Users/eric/private/clip.mp4",
        context: {
          hasLocalCache: true,
          localPath: "/Users/eric/Library/Application Support/lpp-pc-client/LPP Files/u1/c1/video.mp4",
          posterKind: "blob",
          sourceKind: "file",
        },
      }),
    ).toMatchObject({
      event: "video.poster_ignored",
      phase: "media",
      result: "ignored",
      reason: "Failed to fetch file://[local-path]",
      context: {
        hasLocalCache: true,
        localPath: "[local-path]",
        posterKind: "blob",
        sourceKind: "file",
      },
    });
  });
});
