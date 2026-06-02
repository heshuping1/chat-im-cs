import { describe, expect, it } from "vitest";

import {
  createMessageCenterViewModel,
  getImConversationType,
} from "../../src/renderer/messages/hooks/useMessageCenterViewModel";
import type { ConversationListItem, FriendDto } from "../../src/renderer/data/api/types";

describe("message center view model", () => {
  it("selects active conversation with visible fallback and derives stable keys", () => {
    const conversations = [
      conversation({ conversationId: "hidden", title: "Hidden", conversationType: "group" }),
      conversation({ conversationId: "visible", title: "Visible", conversationType: "direct" }),
    ];

    expect(
      createMessageCenterViewModel({
        activeConversationId: "missing",
        conversations,
        draftsByConversation: { visible: "draft" },
        friends: [],
        groupMembers: [],
        imReadStateByConversation: {
          "direct:visible": {
            conversationId: "visible",
            conversationKey: "direct:visible",
            conversationType: "direct",
            lastMessageSeq: 2,
            myReadSeq: 1,
            peerReadSeq: 0,
            unreadCount: 1,
            updatedAt: 1,
          },
        },
        unreadIdentity: null,
        visibleConversations: [conversations[1]],
      }),
    ).toMatchObject({
      activeConversation: {
        conversationId: "visible",
      },
      activeConversationDraft: "draft",
      activeConversationHeaderTitle: "Visible",
      activeConversationIsGroup: false,
      activeConversationKey: "direct:visible",
      activeConversationReadState: {
        unreadCount: 1,
      },
      activeConversationType: "direct",
    });
  });

  it("normalizes conversation type aliases and builds direct contact fallback", () => {
    const direct = conversation({
      conversationId: "c1",
      conversationType: "im-direct",
      peerUserId: "u2",
      title: "Alice",
    });
    const friend: FriendDto = {
      avatarUrl: "https://avatar.example/a.png",
      displayName: "Alice Friend",
      friendUserId: "u2",
      groupName: "VIP",
      userType: 1,
    };

    const viewModel = createMessageCenterViewModel({
      activeConversationId: "c1",
      conversations: [direct],
      draftsByConversation: {},
      friends: [friend],
      groupMembers: [],
      imReadStateByConversation: {},
      unreadIdentity: null,
      visibleConversations: [direct],
    });

    expect(getImConversationType(direct)).toBe("direct");
    expect(viewModel.activeConversationContact).toMatchObject({
      id: "friend-u2",
      kind: "customer",
      name: "Alice Friend",
    });
    expect(viewModel.activeConversationContact).not.toHaveProperty("source");
  });

  it("does not inject fake source channel for direct conversation fallback contacts", () => {
    const direct = conversation({
      conversationId: "c1",
      conversationType: "direct",
      peerUserId: "u2",
      peerUserType: 1,
      title: "Alice",
    });

    const viewModel = createMessageCenterViewModel({
      activeConversationId: "c1",
      conversations: [direct],
      draftsByConversation: {},
      friends: [],
      groupMembers: [],
      imReadStateByConversation: {},
      unreadIdentity: null,
      visibleConversations: [direct],
    });

    expect(viewModel.activeConversationContact).toMatchObject({
      kind: "customer",
      name: "Alice",
    });
    expect(viewModel.activeConversationContact).not.toHaveProperty("source");
  });

  it("suppresses unread count for the currently visible conversation pane only", () => {
    const current = conversation({
      conversationId: "current",
      lastMessageSeq: 11,
      lastReadSeq: 10,
      unreadCount: 1,
    });
    const other = conversation({
      conversationId: "other",
      lastMessageSeq: 4,
      lastReadSeq: 3,
      unreadCount: 1,
    });

    expect(
      createMessageCenterViewModel({
        activeConversationId: "current",
        activeConversationMessagesLoaded: true,
        activeConversationVisibility: "paneVisible",
        conversations: [current, other],
        draftsByConversation: {},
        friends: [],
        groupMembers: [],
        imReadStateByConversation: {},
        unreadIdentity: {},
        visibleConversations: [current, other],
      }).counts.unread,
    ).toBe(1);

    expect(
      createMessageCenterViewModel({
        activeConversationId: "current",
        activeConversationMessagesLoaded: false,
        activeConversationVisibility: "paneVisible",
        conversations: [current, other],
        draftsByConversation: {},
        friends: [],
        groupMembers: [],
        imReadStateByConversation: {},
        unreadIdentity: {},
        visibleConversations: [current, other],
      }).counts.unread,
    ).toBe(2);

    expect(
      createMessageCenterViewModel({
        activeConversationId: "current",
        activeConversationVisibility: "listOnly",
        conversations: [current, other],
        draftsByConversation: {},
        friends: [],
        groupMembers: [],
        imReadStateByConversation: {},
        unreadIdentity: {},
        visibleConversations: [current, other],
      }).counts.unread,
    ).toBe(2);
  });

  it("counts IM unread through effective view instead of raw unread", () => {
    const staleSelfUnread = conversation({
      conversationId: "stale-self",
      lastMessageSeq: 9,
      lastReadSeq: 9,
      unreadCount: 4,
    });
    const peerUnread = conversation({
      conversationId: "peer-unread",
      lastMessageSeq: 8,
      lastReadSeq: 7,
      peerReadSeq: 8,
      unreadCount: 1,
    });

    expect(
      createMessageCenterViewModel({
        activeConversationId: "missing",
        conversations: [staleSelfUnread, peerUnread],
        draftsByConversation: {},
        friends: [],
        groupMembers: [],
        imReadStateByConversation: {},
        unreadIdentity: { userId: "current-user" },
        visibleConversations: [staleSelfUnread, peerUnread],
      }).counts.unread,
    ).toBe(1);
  });

  it("derives loading, error and empty state text for the page shell", () => {
    expect(
      createMessageCenterViewModel({
        activeConversationId: null,
        conversationListError: new Error("boom"),
        conversationListLoading: false,
        conversations: [],
        draftsByConversation: {},
        friends: [],
        groupMembers: [],
        imReadStateByConversation: {},
        keyword: "alice",
        messageSearchKeyword: "hello",
        messagesLoading: false,
        unreadIdentity: null,
        visibleConversations: [],
        visibleMessagesLength: 0,
      }),
    ).toMatchObject({
      errorText: "Conversation list failed: boom",
      conversationList: {
        emptyText: "没有匹配的会话",
        loading: false,
      },
      messageList: {
        emptyText: "没有匹配的消息",
        loading: false,
      },
      selectedConversation: false,
      selectedConversationEmptyText: "请选择一个会话",
    });
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
