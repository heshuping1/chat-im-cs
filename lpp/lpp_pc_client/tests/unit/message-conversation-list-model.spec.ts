import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { beforeEach, describe, expect, it } from "vitest";

import {
  rememberCustomerServiceConversationIndex,
  resetCustomerServiceConversationIndexForTest,
} from "../../src/renderer/data/customer-service/cs-conversation-index";
import {
  isVisibleImConversationInScope,
} from "../../src/renderer/data/im/im-conversation-boundary";
import {
  filterMessageConversations,
  sortMessageConversations,
} from "../../src/renderer/messages/models/messageConversationListModel";
import { conversationListIdentityView } from "../../src/renderer/messages/models/conversationListIdentityModel";
import type {
  ConversationListItem,
  FriendDto,
  TenantMemberDto,
} from "../../src/renderer/data/api/types";

describe("message conversation list model", () => {
  beforeEach(() => {
    resetCustomerServiceConversationIndexForTest();
  });

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

  it("uses effective unread view for unread sorting and filtering", () => {
    const rawUnreadButRead = conversation({
      conversationId: "raw-unread-but-read",
      lastMessageSeq: 10,
      lastReadSeq: 10,
      lastMessage: { preview: "read", sentAt: "2026-05-29T12:00:00.000Z" },
      unreadCount: 5,
    });
    const effectiveUnread = conversation({
      conversationId: "effective-unread",
      lastMessageSeq: 11,
      lastReadSeq: 10,
      lastMessage: { preview: "unread", sentAt: "2026-05-29T11:00:00.000Z" },
      unreadCount: 1,
    });

    expect(
      filterMessageConversations(
        [rawUnreadButRead, effectiveUnread],
        "unread",
        "",
        { userId: "current-user" },
      ).map((item) => item.conversationId),
    ).toEqual(["effective-unread"]);
    expect(
      sortMessageConversations(
        [rawUnreadButRead, effectiveUnread],
        { userId: "current-user" },
      ).map((item) => item.conversationId),
    ).toEqual(["effective-unread", "raw-unread-but-read"]);
  });

  it("hides direct-shaped conversations once the customer-service index owns them", () => {
    const directShapedCustomerService = conversation({
      conversationId: "indexed-cs-conversation",
      conversationType: "direct",
      title: "新会话",
    });
    rememberCustomerServiceConversationIndex({
      conversationId: "indexed-cs-conversation",
      scopeKey: "scope-a",
      source: "send",
      threadId: "thread-1",
      threadType: "temp_session",
    });

    expect(isVisibleImConversationInScope(directShapedCustomerService, "scope-a")).toBe(false);
    expect(isVisibleImConversationInScope(directShapedCustomerService, "scope-b")).toBe(true);
  });

  it("keeps the IM read executor behind the same customer-service ownership boundary", () => {
    const source = readFileSync(
      resolve(process.cwd(), "src/renderer/messages/hooks/useImReadCommandExecutor.ts"),
      "utf8",
    );

    expect(source).toContain("customerServiceIndexScopeKey(session)");
    expect(source).toContain("isVisibleImConversationInScope(");
    expect(source).not.toContain("isImConversation(conversation)");
  });


  it("adds lightweight customer identity and real source to direct conversations", () => {
    const item = conversation({
      conversationId: "customer",
      peerUserId: "customer-1",
      peerUserType: 1,
      sourceChannel: "web",
    } as Partial<ConversationListItem>);

    expect(
      conversationListIdentityView({
        conversation: item,
        friends: [],
        isGroup: false,
        tenantMembers: [],
      }),
    ).toEqual({
      identityText: "客户",
      kind: "customer",
      sourceText: "@网页",
    });
  });

  it("marks tenant members as internal without exposing concrete employee roles", () => {
    const item = conversation({
      conversationId: "staff",
      peerUserId: "staff-1",
    });
    const tenantMembers: TenantMemberDto[] = [
      { displayName: "客服一", membershipRole: 2, userId: "staff-1" },
    ];

    expect(
      conversationListIdentityView({
        conversation: item,
        friends: [],
        isGroup: false,
        tenantMembers,
      }),
    ).toEqual({
      identityText: "内部",
      kind: "internal",
      sourceText: "",
    });
  });

  it("does not label ordinary friends as users and does not label groups", () => {
    const friend: FriendDto = {
      displayName: "Alice",
      friendUserId: "friend-1",
      userType: 2,
    };
    const direct = conversation({ peerUserId: "friend-1" });
    const group = conversation({ conversationType: "group" });

    expect(
      conversationListIdentityView({
        conversation: direct,
        friends: [friend],
        isGroup: false,
        tenantMembers: [],
      }),
    ).toEqual({ identityText: "", kind: "none", sourceText: "" });
    expect(
      conversationListIdentityView({
        conversation: group,
        friends: [],
        isGroup: true,
        tenantMembers: [{ displayName: "Member", userId: "friend-1" }],
      }),
    ).toEqual({ identityText: "", kind: "none", sourceText: "" });
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
