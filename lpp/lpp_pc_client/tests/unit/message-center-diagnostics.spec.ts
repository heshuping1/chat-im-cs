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
});
