import type { ConversationListItem } from "./api-client";
import { isStrictImConversationType } from "./im/im-conversation-boundary";
import {
  localReadCoverReason,
  type LocalReadCoverReason,
  resolveEffectiveImUnreadCount,
} from "./im-read/im-read-service";
import type { LocalImConversationRead } from "./im-read/im-read-storage";

export interface CurrentUserIdentity {
  userId?: string | null;
  platformUserId?: string | null;
  lppId?: string | null;
  displayName?: string | null;
  locallyReadConversationReads?: Record<string, LocalImConversationRead>;
}

export interface ConversationUnreadDiagnostic {
  conversationId: string;
  effectiveUnread: number;
  lastMessageSeq?: number | null;
  lastReadSeq?: number | null;
  lastMessageAt?: string | null;
  localReadCoversLastMessage: boolean;
  localReadAt?: number;
  localReadCoverReason: LocalReadCoverReason;
  localReadSeq?: number;
  selfLastMessage: boolean;
  serverUnread: number;
}

export function isImConversation(item: ConversationListItem) {
  return isStrictImConversationType(item.conversationType);
}

export function isSelfSender(
  senderUserId?: string | null,
  senderDisplayName?: string | null,
  currentUserId?: string | CurrentUserIdentity | null,
  currentDisplayName?: string | null,
) {
  const identity = normalizeIdentity(currentUserId, currentDisplayName);
  const currentIds = compactIdentityValues([
    identity.userId,
    identity.platformUserId,
    identity.lppId,
  ]);
  return Boolean(
    (senderUserId && currentIds.includes(senderUserId.trim().toLowerCase())) ||
      (identity.displayName &&
        senderDisplayName &&
        senderDisplayName.trim().toLowerCase() ===
          identity.displayName.trim().toLowerCase()),
  );
}

export function isSelfSenderAny(
  senderIds: Array<string | null | undefined>,
  senderDisplayName?: string | null,
  currentUserId?: string | CurrentUserIdentity | null,
  currentDisplayName?: string | null,
) {
  const identity = normalizeIdentity(currentUserId, currentDisplayName);
  const currentIds = compactIdentityValues([
    identity.userId,
    identity.platformUserId,
    identity.lppId,
  ]);
  const normalizedSenderIds = compactIdentityValues(senderIds);
  if (normalizedSenderIds.some((id) => currentIds.includes(id))) return true;
  if (normalizedSenderIds.length > 0) return false;
  return isSelfSender(null, senderDisplayName, identity);
}

export function isSelfLastMessage(
  item: ConversationListItem,
  currentUserId?: string | CurrentUserIdentity | null,
  currentDisplayName?: string | null,
) {
  const identity = normalizeIdentity(currentUserId, currentDisplayName);
  const itemRecord = item as unknown as Record<string, unknown>;
  const lastMessage = (item.lastMessage ?? {}) as Record<string, unknown>;
  const senderRecord = objectRecord(lastMessage.sender);
  const authorRecord = objectRecord(lastMessage.author);
  const fromRecord = objectRecord(lastMessage.from);
  const userRecord = objectRecord(lastMessage.user);
  const currentIds = compactIdentityValues([
    identity.userId,
    identity.platformUserId,
    identity.lppId,
  ]);
  const senderIds = compactIdentityValues([
    item.lastMessage?.senderUserId,
    stringValue(lastMessage.senderId),
    stringValue(lastMessage.sender_id),
    stringValue(lastMessage.userId),
    stringValue(lastMessage.user_id),
    stringValue(lastMessage.fromUserId),
    stringValue(lastMessage.from_user_id),
    stringValue(lastMessage.senderPlatformUserId),
    stringValue(lastMessage.sender_platform_user_id),
    stringValue(lastMessage.platformUserId),
    stringValue(lastMessage.platform_user_id),
    stringValue(lastMessage.senderLppId),
    stringValue(lastMessage.sender_lpp_id),
    stringValue(lastMessage.lppId),
    stringValue(lastMessage.lpp_id),
    stringValue(senderRecord.userId),
    stringValue(senderRecord.user_id),
    stringValue(senderRecord.id),
    stringValue(senderRecord.platformUserId),
    stringValue(senderRecord.platform_user_id),
    stringValue(senderRecord.lppId),
    stringValue(senderRecord.lpp_id),
    stringValue(authorRecord.userId),
    stringValue(authorRecord.user_id),
    stringValue(authorRecord.id),
    stringValue(authorRecord.platformUserId),
    stringValue(authorRecord.platform_user_id),
    stringValue(authorRecord.lppId),
    stringValue(authorRecord.lpp_id),
    stringValue(fromRecord.userId),
    stringValue(fromRecord.user_id),
    stringValue(fromRecord.id),
    stringValue(fromRecord.platformUserId),
    stringValue(fromRecord.platform_user_id),
    stringValue(fromRecord.lppId),
    stringValue(fromRecord.lpp_id),
    stringValue(userRecord.userId),
    stringValue(userRecord.user_id),
    stringValue(userRecord.id),
    stringValue(userRecord.platformUserId),
    stringValue(userRecord.platform_user_id),
    stringValue(userRecord.lppId),
    stringValue(userRecord.lpp_id),
    stringValue(itemRecord.lastMessageSenderUserId),
    stringValue(itemRecord.last_message_sender_user_id),
    stringValue(itemRecord.lastSenderUserId),
    stringValue(itemRecord.last_sender_user_id),
    stringValue(itemRecord.lastMessageFromUserId),
    stringValue(itemRecord.last_message_from_user_id),
    stringValue(itemRecord.lastMessageSenderPlatformUserId),
    stringValue(itemRecord.last_message_sender_platform_user_id),
    stringValue(itemRecord.lastSenderPlatformUserId),
    stringValue(itemRecord.last_sender_platform_user_id),
    stringValue(itemRecord.lastMessageSenderLppId),
    stringValue(itemRecord.last_message_sender_lpp_id),
    stringValue(itemRecord.lastSenderLppId),
    stringValue(itemRecord.last_sender_lpp_id),
  ]);
  if (
    booleanValue(lastMessage.isSelf) ||
    booleanValue(lastMessage.isMine) ||
    booleanValue(lastMessage.is_self) ||
    booleanValue(lastMessage.is_mine) ||
    booleanValue(itemRecord.lastMessageIsSelf) ||
    booleanValue(itemRecord.last_message_is_self) ||
    booleanValue(itemRecord.lastMessageIsMine) ||
    booleanValue(itemRecord.last_message_is_mine)
  ) {
    return true;
  }
  const direction =
    stringValue(lastMessage.direction) ||
    stringValue(lastMessage.messageDirection) ||
    stringValue(lastMessage.message_direction) ||
    stringValue(itemRecord.lastMessageDirection) ||
    stringValue(itemRecord.last_message_direction);
  if (["out", "outgoing", "sent", "self"].includes(direction)) {
    return true;
  }
  if (senderIds.length > 0) {
    return senderIds.some((id) => currentIds.includes(id));
  }
  return isSelfSender(
    item.lastMessage?.senderUserId,
    item.lastMessage?.senderDisplayName,
    identity,
  );
}

export function effectiveConversationUnreadCount(
  item: ConversationListItem,
  currentUserId?: string | CurrentUserIdentity | null,
  currentDisplayName?: string | null,
) {
  return conversationUnreadDiagnostic(
    item,
    currentUserId,
    currentDisplayName,
  ).effectiveUnread;
}

export function conversationUnreadDiagnostic(
  item: ConversationListItem,
  currentUserId?: string | CurrentUserIdentity | null,
  currentDisplayName?: string | null,
): ConversationUnreadDiagnostic {
  const identity = normalizeIdentity(currentUserId, currentDisplayName);
  const localRead =
    identity.locallyReadConversationReads?.[conversationReadStateKey(item)] ??
    identity.locallyReadConversationReads?.[item.conversationId];
  const selfLastMessage = isSelfLastMessage(item, identity);
  const serverUnread = Math.max(0, Math.floor(Number(item.unreadCount ?? 0) || 0));
  const localReadCoverReasonValue = localReadCoverReasonForConversation(
    item,
    identity,
    selfLastMessage,
    serverUnread,
  );
  const localReadCoversLastMessage = localReadCoverReasonValue !== "none";
  const effectiveUnread = resolveEffectiveImUnreadCount({
    serverUnreadCount: serverUnread,
    lastMessageSeq: item.lastMessageSeq,
    lastReadSeq: item.lastReadSeq,
    localReadSeq: localRead?.readSeq,
    localReadCoversLastMessage,
    selfLastMessage,
  });
  return {
    conversationId: item.conversationId,
    effectiveUnread,
    lastMessageAt: item.lastMessage?.sentAt,
    lastMessageSeq: item.lastMessageSeq,
    lastReadSeq: item.lastReadSeq,
    localReadAt: localRead?.readAt,
    localReadCoversLastMessage,
    localReadCoverReason: localReadCoverReasonValue,
    localReadSeq: localRead?.readSeq,
    selfLastMessage,
    serverUnread,
  };
}

export function conversationMetaText(
  item: ConversationListItem,
  currentUserId?: string | CurrentUserIdentity | null,
  currentDisplayName?: string | null,
) {
  const unread = effectiveConversationUnreadCount(
    item,
    currentUserId,
    currentDisplayName,
  );
  const parts = [
    item.conversationType === "group" ? "群聊" : "好友私聊",
    item.conversationType === "group" && item.memberCount
      ? `${item.memberCount} 人`
      : undefined,
    unread > 0 ? `${unread} 条未读` : "暂无未读",
  ].filter(Boolean);
  return parts.join(" · ");
}

export function conversationReadKey(item: ConversationListItem) {
  const lastMessage = item.lastMessage;
  return [
    lastMessage?.messageId ?? "",
    item.lastMessageSeq ?? "",
    lastMessage?.sentAt ?? "",
    lastMessage?.senderUserId ??
      lastMessage?.senderId ??
      lastMessage?.fromUserId ??
      "",
    lastMessage?.preview ?? "",
  ].join("|");
}

export function conversationReadStateKey(item: ConversationListItem) {
  const conversationType = item.conversationType.trim().toLowerCase().replace(/-/g, "_");
  const type = conversationType.includes("group") ? "group" : "direct";
  return `${type}:${item.conversationId}`;
}

export function currentUserIdentity(identity?: CurrentUserIdentity | null) {
  return identity ?? {};
}

function normalizeIdentity(
  currentUserId?: string | CurrentUserIdentity | null,
  currentDisplayName?: string | null,
): CurrentUserIdentity {
  return typeof currentUserId === "object" && currentUserId !== null
    ? currentUserId
    : { userId: currentUserId, displayName: currentDisplayName };
}

function localReadCoverReasonForConversation(
  item: ConversationListItem,
  identity: CurrentUserIdentity,
  selfLastMessage = isSelfLastMessage(item, identity),
  serverUnreadCount = Math.max(0, Math.floor(Number(item.unreadCount ?? 0) || 0)),
) {
  const localRead =
    identity.locallyReadConversationReads?.[conversationReadStateKey(item)] ??
    identity.locallyReadConversationReads?.[item.conversationId];
  return localReadCoverReason({
    localRead,
    lastMessageSeq: item.lastMessageSeq,
    lastMessageAt: item.lastMessage?.sentAt,
    messageKeyMatches: Boolean(
      localRead?.messageKey && localRead.messageKey === conversationReadKey(item),
    ),
    selfLastMessage,
    serverUnreadCount,
  });
}

function compactIdentityValues(values: Array<string | null | undefined>) {
  return values
    .map((value) => (typeof value === "string" ? value.trim() : ""))
    .map((value) => value.toLowerCase())
    .filter(Boolean);
}

function stringValue(value: unknown) {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

function booleanValue(value: unknown) {
  return value === true || value === "true" || value === 1 || value === "1";
}

function objectRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
}
