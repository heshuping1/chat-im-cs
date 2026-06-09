import { describe, expect, it } from "vitest";

import type { MessageItemDto } from "../../src/renderer/data/api-client";
import {
  pendingGroupReadReceiptSnapshotTargets,
  syncGroupReadReceiptSnapshot,
} from "../../src/renderer/data/read-receipts";

const identity = { userId: "u-self", displayName: "Me" };

function message(overrides: Partial<MessageItemDto> = {}): MessageItemDto {
  return {
    conversationId: "group-1",
    conversationSeq: 8,
    direction: "out",
    isMine: true,
    messageId: "m-target",
    messageType: "text",
    senderUserId: "u-self",
    sentAt: "2026-06-09T09:00:00.000Z",
    status: "sent",
    ...overrides,
  } as MessageItemDto;
}

describe("read receipt domain", () => {
  it("syncs a group read receipt snapshot onto the matching own message", () => {
    const messages = [message({ readCount: undefined })];

    expect(
      syncGroupReadReceiptSnapshot({
        conversationType: "group",
        identity,
        messageId: "m-target",
        messageSeq: 8,
        messages,
        readCount: 2,
      }),
    ).toMatchObject([{ messageId: "m-target", readCount: 2 }]);
  });

  it("does not let an older snapshot reduce a realtime read count", () => {
    const messages = [message({ readCount: 3 })];

    const next = syncGroupReadReceiptSnapshot({
      conversationType: "group",
      identity,
      messageId: "m-target",
      messageSeq: 8,
      messages,
      readCount: 2,
    });

    expect(next).toBe(messages);
    expect(next).toMatchObject([{ messageId: "m-target", readCount: 3 }]);
  });

  it("keeps snapshot sync scoped to eligible own group messages", () => {
    const messages = [
      message({ messageId: "peer", direction: "in", isMine: false, senderUserId: "u-peer" }),
      message({ messageId: "failed", status: "failed" }),
      message({ messageId: "seq-less", conversationSeq: undefined }),
      message({ messageId: "other", conversationSeq: 9, readCount: 0 }),
    ];

    expect(
      syncGroupReadReceiptSnapshot({
        conversationType: "direct",
        identity,
        messageId: "other",
        messageSeq: 9,
        messages,
        readCount: 2,
      }),
    ).toBe(messages);

    const next = syncGroupReadReceiptSnapshot({
      conversationType: "group",
      identity,
      messageId: "missing-id",
      messageSeq: 9,
      messages,
      readCount: 2,
    });

    expect(next).toMatchObject([
      { messageId: "peer" },
      { messageId: "failed" },
      { messageId: "seq-less" },
      { messageId: "other", readCount: 2 },
    ]);
    expect(next[0]).not.toHaveProperty("readCount");
    expect(next[1]).not.toHaveProperty("readCount");
    expect(next[2]).not.toHaveProperty("readCount");
  });

  it("selects recent own group messages for automatic read receipt snapshot sync", () => {
    const messages = [
      message({ messageId: "full", conversationSeq: 10, readCount: 3 }),
      message({ messageId: "pending-old", conversationSeq: 11, readCount: 0 }),
      message({ messageId: "peer", conversationSeq: 12, direction: "in", isMine: false, senderUserId: "u-peer" }),
      message({ messageId: "sending", conversationSeq: 13, status: "sending" }),
      message({ messageId: "pending-new", conversationSeq: 14, readCount: 1 }),
    ];

    expect(
      pendingGroupReadReceiptSnapshotTargets({
        identity,
        maxTargets: 2,
        messages,
        totalReadableMembers: 3,
      }),
    ).toEqual([
      { messageId: "pending-new", messageSeq: 14, readCount: 1 },
      { messageId: "pending-old", messageSeq: 11, readCount: 0 },
    ]);
  });
});
