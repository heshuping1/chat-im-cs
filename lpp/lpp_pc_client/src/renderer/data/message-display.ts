import type { ConversationListItem } from "./api-client";
import type { LocalImConversationRead } from "./store";

export interface CurrentUserIdentity {
  userId?: string | null;
  platformUserId?: string | null;
  lppId?: string | null;
  displayName?: string | null;
  locallyReadConversationReads?: Record<string, LocalImConversationRead>;
}

export function isImConversation(item: ConversationListItem) {
  const conversationType = item.conversationType.trim().toLowerCase().replace(/-/g, "_");
  return (
    conversationType === "direct" ||
    conversationType === "im_direct" ||
    conversationType === "direct_chat" ||
    conversationType === "direct_customer" ||
    conversationType === "customer_direct" ||
    conversationType === "group" ||
    conversationType === "im_group" ||
    conversationType === "group_chat"
  );
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
  if (isSelfDirectConversation(item, identity)) return true;
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
  const identity = normalizeIdentity(currentUserId, currentDisplayName);
  if (
    typeof item.lastReadSeq === "number" &&
    typeof item.lastMessageSeq === "number" &&
    item.lastReadSeq >= item.lastMessageSeq
  ) {
    return 0;
  }
  if (isLocallyReadConversation(item, identity)) return 0;
  if (isSelfDirectConversation(item, identity)) return 0;
  if (isSelfLastMessage(item, identity)) return 0;
  const serverUnread = Math.max(0, Number(item.unreadCount ?? 0));
  const lastMessageSeq = Math.max(0, Number(item.lastMessageSeq ?? 0));
  const readSeq = Math.max(
    0,
    Number(item.lastReadSeq ?? 0),
    Number(identity.locallyReadConversationReads?.[conversationReadStateKey(item)]?.readSeq ?? 0),
    Number(identity.locallyReadConversationReads?.[item.conversationId]?.readSeq ?? 0),
  );
  if (lastMessageSeq > 0 && readSeq >= lastMessageSeq) return 0;
  if (lastMessageSeq > 0 && readSeq > 0 && lastMessageSeq > readSeq) {
    return Math.min(serverUnread, lastMessageSeq - readSeq);
  }
  return serverUnread;
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

function isLocallyReadConversation(
  item: ConversationListItem,
  identity: CurrentUserIdentity,
) {
  const localRead =
    identity.locallyReadConversationReads?.[conversationReadStateKey(item)] ??
    identity.locallyReadConversationReads?.[item.conversationId];
  if (!localRead) return false;
  if (localRead.messageKey && localRead.messageKey === conversationReadKey(item)) {
    return true;
  }
  if (localRead.messageKey && isSelfLastMessage(item, identity)) {
    return true;
  }
  const localReadAt = Number(localRead.readAt ?? 0);
  const lastMessageAt = item.lastMessage?.sentAt
    ? Date.parse(item.lastMessage.sentAt)
    : 0;
  if (
    localReadAt > 0 &&
    lastMessageAt > 0 &&
    Number.isFinite(lastMessageAt) &&
    lastMessageAt <= localReadAt
  ) {
    return true;
  }
  const localReadSeq = localRead.readSeq;
  const lastMessageSeq = item.lastMessageSeq ?? 0;
  return lastMessageSeq > 0 && localReadSeq >= lastMessageSeq;
}

function isSelfDirectConversation(
  item: ConversationListItem,
  identity: CurrentUserIdentity,
) {
  const conversationType = item.conversationType.trim().toLowerCase().replace(/-/g, "_");
  if (
    conversationType !== "direct" &&
    conversationType !== "im_direct" &&
    conversationType !== "direct_chat" &&
    conversationType !== "direct_customer" &&
    conversationType !== "customer_direct"
  ) {
    return false;
  }
  const currentIds = compactIdentityValues([
    identity.userId,
    identity.platformUserId,
    identity.lppId,
  ]);
  if (currentIds.length === 0) return false;
  const itemRecord = item as unknown as Record<string, unknown>;
  const peerIds = compactIdentityValues([
    item.peerUserId,
    item.peerLppId,
    stringValue(itemRecord.peerId),
    stringValue(itemRecord.peer_id),
    stringValue(itemRecord.peerUserId),
    stringValue(itemRecord.peer_user_id),
    stringValue(itemRecord.peerPlatformUserId),
    stringValue(itemRecord.peer_platform_user_id),
    stringValue(itemRecord.peerLppId),
    stringValue(itemRecord.peer_lpp_id),
    stringValue(itemRecord.targetUserId),
    stringValue(itemRecord.target_user_id),
    stringValue(itemRecord.toUserId),
    stringValue(itemRecord.to_user_id),
  ]);
  return peerIds.some((id) => currentIds.includes(id));
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
