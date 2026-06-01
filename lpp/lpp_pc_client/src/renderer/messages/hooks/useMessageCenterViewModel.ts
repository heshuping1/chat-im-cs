import { useMemo } from "react";

import type {
  ConversationListItem,
  FriendDto,
  GroupMemberDto,
} from "../../data/api/types";
import type { ContactItem } from "../../data/types";
import {
  conversationKey as imConversationKey,
  type ConversationReadState,
} from "../../data/im-read-model";
import {
  effectiveConversationUnreadCount,
  type CurrentUserIdentity,
} from "../../data/message-display";
import { chatConversationEntityFromImConversation } from "../../data/conversation/conversation-domain";
import { formatChatTime, formatError } from "../../lib/format";
import {
  getImConversationType,
  type MessageCenterConversationType,
} from "../models/messageConversationTypeModel";

export { getImConversationType };

export interface MessageCenterViewModel {
  activeConversation?: ConversationListItem;
  activeConversationContact: ContactItem | null;
  activeConversationDraft: string;
  activeConversationHeaderTitle: string;
  activeConversationIsGroup: boolean;
  activeConversationKey?: string;
  activeConversationReadState?: ConversationReadState;
  activeConversationType?: MessageCenterConversationType;
  counts: {
    unread: number;
  };
  conversationList: {
    emptyText: string;
    loading: boolean;
  };
  errorText: string | null;
  messageList: {
    emptyText: string;
    loading: boolean;
  };
  selectedConversation: boolean;
  selectedConversationEmptyText: string;
}

export interface CreateMessageCenterViewModelInput {
  activeConversationId?: string | null;
  conversations: ConversationListItem[];
  visibleConversations: ConversationListItem[];
  draftsByConversation: Record<string, string>;
  friends: FriendDto[];
  groupMembers: GroupMemberDto[];
  imReadStateByConversation: Record<string, ConversationReadState>;
  unreadIdentity?: CurrentUserIdentity | null;
  conversationListError?: unknown;
  conversationListLoading?: boolean;
  keyword?: string;
  messagesError?: unknown;
  messagesLoading?: boolean;
  messageSearchKeyword?: string;
  visibleMessagesLength?: number;
}

export function useMessageCenterViewModel(input: CreateMessageCenterViewModelInput) {
  return useMemo(
    () => createMessageCenterViewModel(input),
    [
      input.activeConversationId,
      input.conversationListError,
      input.conversationListLoading,
      input.conversations,
      input.draftsByConversation,
      input.friends,
      input.groupMembers,
      input.imReadStateByConversation,
      input.keyword,
      input.messageSearchKeyword,
      input.messagesError,
      input.messagesLoading,
      input.unreadIdentity,
      input.visibleConversations,
      input.visibleMessagesLength,
    ],
  );
}

export function createMessageCenterViewModel(
  input: CreateMessageCenterViewModelInput,
): MessageCenterViewModel {
  const activeConversation =
    input.visibleConversations.find(
      (item) => item.conversationId === input.activeConversationId,
    ) ??
    input.conversations.find((item) => item.conversationId === input.activeConversationId) ??
    input.visibleConversations[0] ??
    input.conversations[0];
  const activeConversationType = getImConversationType(activeConversation);
  const activeConversationKey =
    activeConversation && activeConversationType
      ? imConversationKey(activeConversationType, activeConversation.conversationId)
      : undefined;

  return {
    activeConversation,
    activeConversationContact: buildDirectConversationContact(
      activeConversation,
      input.friends,
    ),
    activeConversationDraft: activeConversation
      ? input.draftsByConversation[activeConversation.conversationId] ?? ""
      : "",
    activeConversationHeaderTitle: conversationHeaderTitle(
      activeConversation,
      activeConversationType,
      input.groupMembers,
    ),
    activeConversationIsGroup: activeConversationType === "group",
    activeConversationKey,
    activeConversationReadState: activeConversationKey
      ? input.imReadStateByConversation[activeConversationKey]
      : undefined,
    activeConversationType,
    conversationList: {
      emptyText: input.keyword?.trim() ? "没有匹配的会话" : "暂无会话",
      loading: Boolean(input.conversationListLoading),
    },
    counts: getConversationCounts(input.conversations, input.unreadIdentity),
    errorText: messageCenterErrorText(input),
    messageList: {
      emptyText: input.messageSearchKeyword?.trim()
        ? "没有匹配的消息"
        : "暂无消息，发送第一条消息开始聊天。",
      loading: Boolean(input.messagesLoading),
    },
    selectedConversation: Boolean(activeConversation),
    selectedConversationEmptyText: "请选择一个会话",
  };
}

function conversationHeaderTitle(
  activeConversation: ConversationListItem | undefined,
  activeConversationType: MessageCenterConversationType | undefined,
  groupMembers: GroupMemberDto[],
) {
  if (!activeConversation) return "";
  if (activeConversationType !== "group") return activeConversation.title;
  const memberCount =
    typeof activeConversation.memberCount === "number" && activeConversation.memberCount > 0
      ? activeConversation.memberCount
      : groupMembers.length;
  return memberCount && memberCount > 0
    ? `${activeConversation.title}(${memberCount})`
    : activeConversation.title;
}

function buildDirectConversationContact(
  conversation: ConversationListItem | undefined,
  friends: FriendDto[],
): ContactItem | null {
  if (!conversation || getImConversationType(conversation) !== "direct") return null;
  const entity = chatConversationEntityFromImConversation(conversation);
  const friend = friends.find((item) => item.friendUserId === conversation.peerUserId);
  if (!friend) {
    return {
      id: `conversation-${conversation.conversationId}`,
      kind: conversation.peerUserType === 1 ? "customer" : "friend",
      name: entity.title || "好友",
      subtitle: conversation.peerUserType === 1 ? "客户" : "好友",
      remark: entity.lastMessage?.preview || "普通 IM 会话",
      tags: [conversation.peerUserType === 1 ? "客户" : "好友"],
      userId: entity.im?.peerUserId ?? undefined,
      lppId: conversation.peerLppId ?? undefined,
      conversationId: entity.im?.conversationId ?? conversation.conversationId,
      avatarUrl: entity.avatar.avatarUrl,
      lastMessagePreview: entity.lastMessage?.preview,
      lastMessageAt: entity.lastActivityAt ?? undefined,
      muted: entity.im?.isMuted,
    };
  }
  const kind = friend.userType === 1 ? "customer" : "friend";
  return {
    id: `friend-${friend.friendUserId}`,
    kind,
    name: friend.remarkName || friend.displayName || entity.title || "好友",
    subtitle: `${kind === "customer" ? "客户" : "好友"}${friend.groupName ? ` · ${friend.groupName}` : ""}`,
    remark: friend.createdAt ? `添加于 ${formatChatTime(friend.createdAt)}` : "好友关系",
    tags: [kind === "customer" ? "客户" : "好友", friend.groupName ?? ""].filter(Boolean),
    userId: friend.friendUserId,
    lppId: friend.lppId || friend.lppNo || friend.lppNumber || conversation.peerLppId || undefined,
    conversationId: entity.im?.conversationId ?? conversation.conversationId,
    avatarUrl: friend.avatarUrl || entity.avatar.avatarUrl,
    groupName: friend.groupName,
    createdAt: friend.createdAt,
    lastMessagePreview: entity.lastMessage?.preview,
    lastMessageAt: entity.lastActivityAt ?? undefined,
    muted: entity.im?.isMuted,
  };
}

function getConversationCounts(
  conversations: ConversationListItem[],
  userIdentity?: CurrentUserIdentity | null,
) {
  return {
    unread: conversations.filter(
      (item) => effectiveConversationUnreadCount(item, userIdentity) > 0,
    ).length,
  };
}

function messageCenterErrorText(input: CreateMessageCenterViewModelInput) {
  if (input.conversationListError) {
    return `Conversation list failed: ${formatError(input.conversationListError)}`;
  }
  if (input.messagesError) {
    return `消息加载失败：${formatError(input.messagesError)}`;
  }
  return null;
}
