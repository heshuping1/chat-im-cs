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
      source: "客户通讯录",
    });
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
