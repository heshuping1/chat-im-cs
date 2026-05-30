import { describe, expect, it } from "vitest";

import {
  filterMessageConversations,
  sortMessageConversations,
} from "../../src/renderer/messages/models/messageConversationListModel";
import type { ConversationListItem } from "../../src/renderer/data/api/types";

describe("message conversation list model", () => {
  it("sorts pinned conversations first, then unread, then recent activity", () => {
    const oldUnread = conversation({
      conversationId: "old-unread",
      lastMessageSeq: 2,
      lastReadSeq: 1,
      lastMessage: { preview: "old", sentAt: "2026-05-29T10:00:00.000Z" },
      unreadCount: 1,
    });
    const pinned = conversation({
      conversationId: "pinned",
      isPinned: true,
      lastMessage: { preview: "pinned", sentAt: "2026-05-29T09:00:00.000Z" },
    });
    const recentRead = conversation({
      conversationId: "recent-read",
      lastMessage: { preview: "recent", sentAt: "2026-05-29T12:00:00.000Z" },
    });

    expect(
      sortMessageConversations([recentRead, oldUnread, pinned], null).map(
        (item) => item.conversationId,
      ),
    ).toEqual(["pinned", "old-unread", "recent-read"]);
  });

  it("filters by tab and keyword using normalized conversation domain fields", () => {
    const direct = conversation({
      conversationId: "direct",
      conversationType: "direct",
      lastMessage: { preview: "refund request", sentAt: "2026-05-29T12:00:00.000Z" },
      title: "Alice",
    });
    const group = conversation({
      conversationId: "group",
      conversationType: "group",
      lastMessage: { preview: "weekly sync", sentAt: "2026-05-29T12:00:00.000Z" },
      title: "Support Team",
    });

    expect(filterMessageConversations([direct, group], "friends", "", null)).toEqual([direct]);
    expect(filterMessageConversations([direct, group], "groups", "", null)).toEqual([group]);
    expect(filterMessageConversations([direct, group], "all", "refund", null)).toEqual([direct]);
  });
});

function conversation(
  overrides: Partial<ConversationListItem>,
): ConversationListItem {
  return {
    conversationId: "c1",
    conversationType: "direct",
    lastMessage: {
      preview: "hello",
      sentAt: "2026-05-29T12:00:00.000Z",
    },
    title: "Conversation",
    unreadCount: 0,
    ...overrides,
  } as ConversationListItem;
}
