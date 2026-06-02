import { describe, expect, it } from "vitest";
import type { MessageItemDto } from "../../src/renderer/data/api/types";
import { evaluateMessageDetailSync } from "../../src/renderer/data/message-detail-sync";

function message(overrides: Partial<MessageItemDto> = {}): MessageItemDto {
  return {
    messageId: "m-1",
    conversationId: "direct-1",
    conversationSeq: 1,
    messageType: "text",
    preview: "hello",
    sentAt: "2026-06-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("message detail sync model", () => {
  it("does not sync when detail has already caught up by sequence", () => {
    const decision = evaluateMessageDetailSync({
      messages: [message({ conversationSeq: 12 })],
      target: {
        targetId: "direct-1",
        targetType: "direct",
        lastMessageSeq: 12,
      },
    });

    expect(decision.needsSync).toBe(false);
  });

  it("syncs when the conversation summary sequence is ahead of detail", () => {
    const decision = evaluateMessageDetailSync({
      messages: [message({ conversationSeq: 11 })],
      target: {
        targetId: "direct-1",
        targetType: "direct",
        lastMessageSeq: 12,
      },
    });

    expect(decision).toMatchObject({
      needsSync: true,
      reason: "summary-seq-ahead",
      syncKey: "direct:direct-1:seq:12",
    });
  });

  it("syncs when the summary last message id is missing from detail", () => {
    const decision = evaluateMessageDetailSync({
      messages: [message({ messageId: "m-11", conversationSeq: 11 })],
      target: {
        targetId: "direct-1",
        targetType: "direct",
        lastMessageId: "m-12",
      },
    });

    expect(decision).toMatchObject({
      needsSync: true,
      reason: "summary-message-id-missing",
      syncKey: "direct:direct-1:id:m-12",
    });
  });

  it("syncs empty detail when the active summary has a latest message", () => {
    const decision = evaluateMessageDetailSync({
      messages: [],
      target: {
        targetId: "direct-1",
        targetType: "direct",
        lastMessageSeq: 3,
        lastMessageId: "m-3",
      },
    });

    expect(decision.needsSync).toBe(true);
    expect(decision.reason).toBe("summary-seq-ahead");
  });

  it("uses timestamp fallback for customer service summaries without seq/id", () => {
    const decision = evaluateMessageDetailSync({
      messages: [message({ conversationId: "thread-1", sentAt: "2026-06-01T00:00:00.000Z" })],
      target: {
        targetId: "thread-1",
        targetType: "temp_session",
        lastMessageAt: "2026-06-01T00:01:00.000Z",
        lastMessagePreview: "new visitor text",
      },
    });

    expect(decision).toMatchObject({
      needsSync: true,
      reason: "summary-time-ahead",
      syncKey: "temp_session:thread-1:at:2026-06-01T00:01:00.000Z",
    });
  });

  it("does not let messages from another target satisfy the active target", () => {
    const decision = evaluateMessageDetailSync({
      messages: [message({ conversationId: "direct-2", conversationSeq: 99 })],
      target: {
        targetId: "direct-1",
        targetType: "direct",
        lastMessageSeq: 2,
      },
    });

    expect(decision.needsSync).toBe(true);
    expect(decision.reason).toBe("summary-seq-ahead");
  });

  it("allows customer service thread ids to match detail messages by conversation id", () => {
    const decision = evaluateMessageDetailSync({
      messages: [
        message({
          conversationId: "conversation-1",
          sentAt: "2026-06-01T00:01:00.000Z",
        }),
      ],
      target: {
        targetId: "thread-1",
        targetType: "temp_session",
        alternateTargetIds: ["conversation-1"],
        lastMessageAt: "2026-06-01T00:01:00.000Z",
      },
    });

    expect(decision.needsSync).toBe(false);
  });
});
