import { describe, expect, it } from "vitest";
import {
  applyImReadSeqToConversationSnapshot,
  isLocalReadCoversLastMessage,
  localReadCoverReason,
  resolveEffectiveImUnreadCount,
} from "../../src/renderer/data/im-read/im-read-service";

describe("im read service", () => {
  it("uses the greatest server/local read seq to suppress unread", () => {
    expect(
      resolveEffectiveImUnreadCount({
        serverUnreadCount: 5,
        lastMessageSeq: 10,
        lastReadSeq: 4,
        localReadSeq: 10,
      }),
    ).toBe(0);
  });

  it("caps unread by last message delta when local read is behind", () => {
    expect(
      resolveEffectiveImUnreadCount({
        serverUnreadCount: 99,
        lastMessageSeq: 10,
        lastReadSeq: 7,
      }),
    ).toBe(3);
  });

  it("clears unread for self last message", () => {
    expect(resolveEffectiveImUnreadCount({ serverUnreadCount: 3, selfLastMessage: true })).toBe(0);
  });

  it("detects local read coverage by message key, timestamp, and seq", () => {
    expect(
      localReadCoverReason({
        localRead: { readSeq: 1, messageKey: "m1" },
        messageKeyMatches: true,
      }),
    ).toBe("message-key");
    expect(
      localReadCoverReason({
        localRead: { readSeq: 1, readAt: Date.parse("2026-05-29T10:00:00Z") },
        lastMessageAt: "2026-05-29T09:59:00Z",
      }),
    ).toBe("read-at");
    expect(
      localReadCoverReason({
        localRead: { readSeq: 8 },
        lastMessageSeq: 8,
      }),
    ).toBe("read-seq");
  });

  it("does not let readAt cover explicit unread when local read seq is behind", () => {
    expect(
      isLocalReadCoversLastMessage({
        localRead: {
          readSeq: 300,
          readAt: Date.parse("2026-06-02T04:00:00Z"),
        },
        lastMessageAt: "2026-06-02T03:56:14Z",
        lastMessageSeq: 302,
        serverUnreadCount: 2,
      }),
    ).toBe(false);
    expect(
      localReadCoverReason({
        localRead: {
          readSeq: 300,
          readAt: Date.parse("2026-06-02T04:00:00Z"),
        },
        lastMessageAt: "2026-06-02T03:56:14Z",
        lastMessageSeq: 302,
        serverUnreadCount: 2,
      }),
    ).toBe("none");
    expect(
      isLocalReadCoversLastMessage({
        localRead: {
          readSeq: 300,
          readAt: Date.parse("2026-06-02T04:00:00Z"),
        },
        lastMessageAt: "2026-06-02T03:56:14Z",
        lastMessageSeq: 302,
        selfLastMessage: true,
        serverUnreadCount: 2,
      }),
    ).toBe(true);
  });

  it("applies read seq to a conversation snapshot without decreasing read state", () => {
    expect(
      applyImReadSeqToConversationSnapshot(
        { lastReadSeq: 5, lastMessageSeq: 7, unreadCount: 2 },
        6,
      ),
    ).toEqual({ lastReadSeq: 6, unreadCount: 2 });
    expect(
      applyImReadSeqToConversationSnapshot(
        { lastReadSeq: 5, lastMessageSeq: 7, unreadCount: 2 },
        9,
      ),
    ).toEqual({ lastReadSeq: 9, unreadCount: 0 });
  });
});
