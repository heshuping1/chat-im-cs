import { describe, expect, it } from "vitest";

import { summarizeDiagnosticValue } from "../../src/renderer/data/customer-service/cs-routing-diagnostics";

describe("customer-service routing diagnostics", () => {
  it("never leaks sensitive fields or message content when plaintext mode is enabled", () => {
    expect(
      summarizeDiagnosticValue({
        eventName: "msg.new",
        tenantToken: "secret-token",
        scopeKey:
          "https://chat.example.test|eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.raw.signature|tenant-1|user-1",
        conversationId: "conversation-abcdef",
        message: {
          conversationType: "direct",
          body: { text: "haishibuxinga111" },
          senderRole: "visitor",
        },
      }, { plaintext: true }),
    ).toEqual({
      eventName: "msg.new",
      tenantToken: "[redacted]",
      scopeKey: expect.stringMatching(/^\[scope-key len=\d+ hash=[a-f0-9]{12}\]$/),
      conversationId: "conversation-abcdef",
      message: {
        conversationType: "direct",
        body: "[redacted-content len=27]",
        senderRole: "visitor",
      },
    });
  });

  it("redacts message content and sensitive values when plaintext mode is disabled", () => {
    expect(
      summarizeDiagnosticValue({
        eventName: "msg.new",
        tenantToken: "secret-token",
        conversationId: "conversation-abcdef",
        message: {
          conversationType: "direct",
          body: { text: "visitor message should not be logged" },
          senderRole: "visitor",
        },
      }, { plaintext: false }),
    ).toEqual({
      eventName: "msg.new",
      tenantToken: "[redacted]",
      conversationId: "...abcdef",
      message: {
        conversationType: "direct",
        body: "[redacted-content len=47]",
        senderRole: "visitor",
      },
    });
  });
});
