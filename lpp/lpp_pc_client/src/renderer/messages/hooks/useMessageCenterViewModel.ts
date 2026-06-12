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
import { isVisibleImConversationInScope } from "../../data/im/im-conversation-boundary";
import { imConversationEffectiveUnreadCount } from "../../data/im-read/im-conversation-read-view";
import type { CurrentUserIdentity } from "../../data/message-display";
import { chatConversationEntityFromImConversation } from "../../data/conversation/conversation-domain";
import { formatChatTime, formatError } from "../../lib/format";
import { useI18n } from "../../i18n/useI18n";
import {
  getImConversationType,
  type MessageCenterConversationType,
} from "../models/messageConversationTypeModel";
import type { ActiveImConversationVisibility } from "./useImReadCommandExecutor";

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
  activeConversationMessagesLoaded?: boolean;
  activeConversationVisibility?: ActiveImConversationVisibility;
  conversations: ConversationListItem[];
  conversationOwnershipScopeKey?: string;
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
  const { t } = useI18n();
  const copy = useMemo<MessageCenterViewModelCopy>(
    () => ({
      contactCustomer: t("contacts.page.kind.customer"),
      contactFriend: t("contacts.page.kind.friend"),
      conversationListEmpty: t("messages.center.conversationListEmpty"),
      conversationListNoMatch: t("messages.center.conversationListNoMatch"),
      directConversationFallback: t("messages.center.directConversationFallback"),
      friendRelationship: t("contacts.detail.friendRelationship"),
      messageListEmpty: t("messages.center.messageListEmpty"),
      messageListFailed: t("messages.center.messageListFailed"),
      messageListNoMatch: t("messages.center.messageListNoMatch"),
      selectedConversationEmpty: t("messages.center.selectedConversationEmpty"),
    }),
    [t],
  );
  return useMemo(
    () => createMessageCenterViewModel(input, copy),
    [
      input.activeConversationId,
      input.activeConversationMessagesLoaded,
      input.activeConversationVisibility,
      input.conversationListError,
      input.conversationListLoading,
      input.conversationOwnershipScopeKey,
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
      copy,
    ],
  );
}

export function createMessageCenterViewModel(
  input: CreateMessageCenterViewModelInput,
  copy: MessageCenterViewModelCopy = defaultMessageCenterViewModelCopy,
): MessageCenterViewModel {
  const activeConversation = input.activeConversationId
    ? scopedVisibleConversations(input).find(
        (item) => item.conversationId === input.activeConversationId,
      ) ??
      scopedConversations(input).find((item) => item.conversationId === input.activeConversationId)
    : undefined;
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
      copy,
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
      emptyText: input.keyword?.trim()
        ? copy.conversationListNoMatch
        : copy.conversationListEmpty,
      loading: Boolean(input.conversationListLoading),
    },
    counts: getConversationCounts(
      scopedConversations(input),
      input.unreadIdentity,
      input.activeConversationId,
      input.activeConversationMessagesLoaded,
      input.activeConversationVisibility,
    ),
    errorText: messageCenterErrorText(input, copy),
    messageList: {
      emptyText: input.messageSearchKeyword?.trim()
        ? copy.messageListNoMatch
        : copy.messageListEmpty,
      loading: Boolean(input.messagesLoading),
    },
    selectedConversation: Boolean(activeConversation),
    selectedConversationEmptyText: copy.selectedConversationEmpty,
  };
}

interface MessageCenterViewModelCopy {
  contactCustomer: string;
  contactFriend: string;
  conversationListEmpty: string;
  conversationListNoMatch: string;
  directConversationFallback: string;
  friendRelationship: string;
  messageListEmpty: string;
  messageListFailed: string;
  messageListNoMatch: string;
  selectedConversationEmpty: string;
}

const defaultMessageCenterViewModelCopy: MessageCenterViewModelCopy = {
  contactCustomer: "客户",
  contactFriend: "好友",
  conversationListEmpty: "暂无会话",
  conversationListNoMatch: "没有匹配的会话",
  directConversationFallback: "私聊会话",
  friendRelationship: "好友关系",
  messageListEmpty: "暂无消息，发送第一条消息开始聊天。",
  messageListFailed: "消息加载失败",
  messageListNoMatch: "没有匹配的消息",
  selectedConversationEmpty: "请选择一个会话",
};

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
  copy: MessageCenterViewModelCopy,
): ContactItem | null {
  if (!conversation || getImConversationType(conversation) !== "direct") return null;
  const entity = chatConversationEntityFromImConversation(conversation);
  const friend = friends.find((item) => item.friendUserId === conversation.peerUserId);
  if (!friend) {
    return {
      id: `conversation-${conversation.conversationId}`,
      kind: conversation.peerUserType === 1 ? "customer" : "friend",
      name: entity.title || copy.contactFriend,
      subtitle: conversation.peerUserType === 1 ? copy.contactCustomer : copy.contactFriend,
      remark: entity.lastMessage?.preview || copy.directConversationFallback,
      tags: [conversation.peerUserType === 1 ? copy.contactCustomer : copy.contactFriend],
      userId: entity.im?.peerUserId ?? undefined,
      greenBubbleNo: conversation.peerLppId ?? undefined,
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
    name: friend.remarkName || friend.displayName || entity.title || copy.contactFriend,
    subtitle: `${kind === "customer" ? copy.contactCustomer : copy.contactFriend}${friend.groupName ? ` · ${friend.groupName}` : ""}`,
    remark: friend.createdAt
      ? formatChatTime(friend.createdAt)
      : copy.friendRelationship,
    tags: [
      kind === "customer" ? copy.contactCustomer : copy.contactFriend,
      friend.groupName ?? "",
    ].filter(Boolean),
    userId: friend.friendUserId,
    greenBubbleNo: friend.greenBubbleNo || conversation.peerLppId || undefined,
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
  activeConversationId?: string | null,
  activeConversationMessagesLoaded?: boolean,
  activeConversationVisibility?: ActiveImConversationVisibility,
) {
  return {
    unread: conversations.filter(
      (item) =>
        imConversationEffectiveUnreadCount(item, userIdentity, {
          activeConversationId,
          messagesLoaded: activeConversationMessagesLoaded,
          visibility: activeConversationVisibility,
        }) > 0,
    ).length,
  };
}

function messageCenterErrorText(
  input: CreateMessageCenterViewModelInput,
  copy: MessageCenterViewModelCopy,
) {
  if (input.conversationListError) {
    return `Conversation list failed: ${formatError(input.conversationListError)}`;
  }
  if (input.messagesError) {
    return `${copy.messageListFailed}: ${formatError(input.messagesError)}`;
  }
  return null;
}

function scopedConversations(input: CreateMessageCenterViewModelInput) {
  if (!input.conversationOwnershipScopeKey) return input.conversations;
  return input.conversations.filter((item) =>
    isVisibleImConversationInScope(item, input.conversationOwnershipScopeKey),
  );
}

function scopedVisibleConversations(input: CreateMessageCenterViewModelInput) {
  if (!input.conversationOwnershipScopeKey) return input.visibleConversations;
  return input.visibleConversations.filter((item) =>
    isVisibleImConversationInScope(item, input.conversationOwnershipScopeKey),
  );
}
