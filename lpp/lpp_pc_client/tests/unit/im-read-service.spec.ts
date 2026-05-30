import { describe, expect, it } from "vitest";
import {
  applyImReadSeqToConversationSnapshot,
  isLocalReadCoversLastMessage,
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

  it("clears unread for self conversation and self last message", () => {
    expect(resolveEffectiveImUnreadCount({ serverUnreadCount: 3, selfConversation: true })).toBe(0);
    expect(resolveEffectiveImUnreadCount({ serverUnreadCount: 3, selfLastMessage: true })).toBe(0);
  });

  it("detects local read coverage by message key, timestamp, and seq", () => {
    expect(
      isLocalReadCoversLastMessage({
        localRead: { readSeq: 1, messageKey: "m1" },
        messageKeyMatches: true,
      }),
    ).toBe(true);
    expect(
      isLocalReadCoversLastMessage({
        localRead: { readSeq: 1, readAt: Date.parse("2026-05-29T10:00:00Z") },
        lastMessageAt: "2026-05-29T09:59:00Z",
      }),
    ).toBe(true);
    expect(
      isLocalReadCoversLastMessage({
        localRead: { readSeq: 8 },
        lastMessageSeq: 8,
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
