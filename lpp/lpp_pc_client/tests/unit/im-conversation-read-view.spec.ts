import { describe, expect, it } from "vitest";

import type { ConversationListItem } from "../../src/renderer/data/api/types";
import {
  imConversationEffectiveUnreadCount,
  resolveImConversationReadView,
} from "../../src/renderer/data/im-read/im-conversation-read-view";

const incomingConversation: ConversationListItem = {
  conversationId: "direct-1",
  conversationType: "direct",
  lastMessage: {
    messageId: "m-2",
    messageType: "text",
    preview: "hello",
    senderUserId: "peer-1",
  },
  lastMessageSeq: 2,
  lastReadSeq: 1,
  title: "Peer",
  unreadCount: 1,
};

describe("im conversation read view", () => {
  it("keeps unread for non-visible conversations", () => {
    const view = resolveImConversationReadView({
      activeConversationId: "other",
      conversation: incomingConversation,
      identity: { userId: "current-user" },
      visibility: "hidden",
    });

    expect(view).toMatchObject({
      effectiveUnread: 1,
      reason: "server-unread",
      shouldNotify: true,
      shouldShowBadge: true,
    });
  });

  it("suppresses visible active conversation unread in the view only", () => {
    const view = resolveImConversationReadView({
      activeConversationId: "direct-1",
      conversation: incomingConversation,
      identity: { userId: "current-user" },
      messagesLoaded: true,
      visibility: "paneVisible",
    });

    expect(view.effectiveUnread).toBe(0);
    expect(view.diagnostic.effectiveUnread).toBe(1);
    expect(view.reason).toBe("pane-visible");
    expect(view.shouldNotify).toBe(false);
    expect(view.shouldShowBadge).toBe(false);
  });

  it("does not suppress active conversation unread before messages are loaded", () => {
    const view = resolveImConversationReadView({
      activeConversationId: "direct-1",
      conversation: incomingConversation,
      identity: { userId: "current-user" },
      messagesLoaded: false,
      visibility: "paneVisible",
    });

    expect(view.effectiveUnread).toBe(1);
    expect(view.reason).toBe("server-unread");
    expect(view.shouldNotify).toBe(true);
    expect(view.shouldShowBadge).toBe(true);
  });

  it("preserves self last-message suppression", () => {
    expect(
      imConversationEffectiveUnreadCount(
        {
          ...incomingConversation,
          lastMessage: {
            ...incomingConversation.lastMessage,
            direction: "out",
            senderUserId: "current-user",
          },
          unreadCount: 3,
        },
        { userId: "current-user" },
      ),
    ).toBe(0);
  });
});
