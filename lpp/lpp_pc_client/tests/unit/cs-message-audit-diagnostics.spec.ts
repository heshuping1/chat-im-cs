import { afterEach, describe, expect, it, vi } from "vitest";

import {
  auditCustomerServiceMessage,
  customerServiceMessageAuditSummary,
  customerServiceMessagePreviewKind,
} from "../../src/renderer/data/customer-service/cs-message-audit-diagnostics";

describe("customer service message audit diagnostics", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("classifies generic previews without storing plaintext message content", () => {
    const record = auditCustomerServiceMessage({
      source: "http",
      stage: "send.http.done",
      traceId: "client-1",
      clientMsgId: "client-1",
      threadId: "thread-1",
      threadType: "temp_session",
      messageId: "server-1",
      message: {
        messageId: "server-1",
        messageType: "text",
        preview: "[Message]",
        body: {},
      },
      body: { text: "secret customer reply" },
    });

    expect(record).toMatchObject({
      bodyKeys: ["text"],
      clientMsgId: "client-1",
      event: "cs.message.audit",
      hasBodyText: true,
      messageId: "server-1",
      module: "cs-message-audit",
      previewKind: "generic_message",
      stage: "send.http.done",
      textLength: 21,
      traceId: "client-1",
    });
    expect(JSON.stringify(record)).not.toContain("secret customer reply");
  });

  it("buffers records for diagnostics records and export package consumers", () => {
    vi.stubGlobal("window", {
      localStorage: { getItem: () => "1" },
    });

    auditCustomerServiceMessage({
      source: "cache",
      stage: "cache.merge.sent",
      traceId: "client-2",
      clientMsgId: "client-2",
      messageId: "server-2",
      mergeDecision: "replace",
      matchedBy: "clientMsgId",
      beforeCount: 1,
      afterCount: 1,
      duplicateClientMsgIdCount: 1,
      duplicateMessageIdCount: 1,
      message: {
        body: { text: "hello" },
        messageId: "server-2",
        messageType: "text",
        preview: "hello",
      },
    });

    const diagnostics = (window as Window & {
      __lppCustomerServiceMessageAuditDiagnostics?: unknown[];
    }).__lppCustomerServiceMessageAuditDiagnostics;
    expect(diagnostics).toHaveLength(1);
    expect(diagnostics?.[0]).toMatchObject({
      matchedBy: "clientMsgId",
      mergeDecision: "replace",
      previewKind: "real",
    });
  });

  it("summarizes body shape and preview kind deterministically", () => {
    expect(customerServiceMessagePreviewKind("[消息]")).toBe("generic_message");
    expect(customerServiceMessagePreviewKind("")).toBe("empty");
    expect(customerServiceMessagePreviewKind("hello")).toBe("real");

    const first = customerServiceMessageAuditSummary(null, { text: "abc" }, "abc", "text");
    const second = customerServiceMessageAuditSummary(null, { text: "xyz" }, "xyz", "text");
    expect(first).toMatchObject({
      bodyKeys: ["text"],
      hasBodyText: true,
      messageType: "text",
      previewKind: "real",
      textLength: 3,
    });
    expect(first.bodyHash).toBe(second.bodyHash);
  });
});
