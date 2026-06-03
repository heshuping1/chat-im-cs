import { describe, expect, it } from "vitest";
import { createImReadDiagnosticRecord } from "../../src/renderer/data/im-read/im-read-diagnostics";

describe("im read diagnostics", () => {
  it("creates structured read diagnostic records", () => {
    const record = createImReadDiagnosticRecord({
      event: "im-read.mark-local",
      phase: "mark",
      result: "success",
      reason: "local_conversation_read",
      context: {
        conversationId: "c1",
        conversationType: "direct",
        readSeq: 8,
      },
    });

    expect(record.module).toBe("im-read");
    expect(record.taskId).toBe("P2-ST-004D");
    expect(record.traceId).toMatch(/^im-read-mark-/);
    expect(record.context).toEqual({
      conversationId: "c1",
      conversationType: "direct",
      readSeq: 8,
    });
  });

  it("records read-status query timing without raw payload or token data", () => {
    const record = createImReadDiagnosticRecord({
      event: "im-read.read-status-query",
      phase: "query",
      result: "success",
      reason: "direct_read_status_done",
      context: {
        conversationId: "direct-1",
        conversationType: "direct",
        durationMs: 42,
        path: "/api/client/v1/direct-chats/direct-1/read-status",
        peerLastReadSeq: 19,
        route: "query",
      },
    });

    expect(record.context).toMatchObject({
      conversationId: "direct-1",
      conversationType: "direct",
      durationMs: 42,
      peerLastReadSeq: 19,
      route: "query",
    });
    expect(JSON.stringify(record)).not.toContain("token");
    expect(JSON.stringify(record)).not.toContain("Authorization");
  });

  it("records Gateway push read receipt fields for latency attribution", () => {
    const record = createImReadDiagnosticRecord({
      event: "im-read.gateway-receipt",
      phase: "received",
      result: "success",
      reason: "msg_read_received",
      context: {
        clientObservedAt: "2026-06-03T08:20:25.406Z",
        conversationId: "direct-1",
        conversationType: "direct",
        eventTime: "2026-06-03T08:20:25.000Z",
        peerReadSeq: 9,
        readSeq: 9,
        reader: "peer",
        route: "push",
        serverTime: "2026-06-03T08:20:25.000Z",
      },
    });

    expect(record.context).toMatchObject({
      conversationId: "direct-1",
      conversationType: "direct",
      readSeq: 9,
      reader: "peer",
      route: "push",
    });
  });

  it("records direct read receipt merge result", () => {
    const record = createImReadDiagnosticRecord({
      event: "im-read.read-status-merge",
      phase: "merge",
      result: "success",
      reason: "peer_read_advanced",
      context: {
        cacheUpdated: true,
        conversationId: "direct-1",
        conversationType: "direct",
        peerReadSeq: 12,
        previousPeerReadSeq: 8,
        route: "query",
      },
    });

    expect(record.context).toMatchObject({
      cacheUpdated: true,
      peerReadSeq: 12,
      previousPeerReadSeq: 8,
      route: "query",
    });
  });
});
