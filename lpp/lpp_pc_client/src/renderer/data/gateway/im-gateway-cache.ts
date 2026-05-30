import type { QueryClient } from "@tanstack/react-query";
import type {
  ConversationListItem,
  ConversationListResponse,
  MessageItemDto,
} from "../api-client";
import { normalizeMessageType } from "../im-message-normalize";
import { isImConversation, type CurrentUserIdentity } from "../message-display";
import { applyDirectReadReceiptToMessages } from "../read-receipts";
import type { ConversationReadView } from "../im-read-model";

export interface ApplyImGatewayMessageCacheInput {
  conversationId: string;
  conversationType: string;
  message: MessageItemDto;
  payload: Record<string, unknown>;
  unreadCount?: number;
  readSeq?: number;
}

export interface ApplyImGatewayReadCacheInput {
  conversationId: string;
  readerIsCurrentUser: boolean;
  myReadSeq: number;
  peerReadSeq: number;
  previousPeerReadSeq: number;
  identity: CurrentUserIdentity | null;
  view?: ConversationReadView;
}

export function applyImGatewayMessageCache(
  queryClient: QueryClient,
  input: ApplyImGatewayMessageCacheInput,
) {
  queryClient.setQueriesData<MessageItemDto[]>(
    {
      predicate: (query) =>
        query.queryKey[0] === "pc-im-messages" &&
        query.queryKey.includes(input.conversationId),
    },
    (old) => appendImMessage(old, input.message),
  );

  queryClient.setQueriesData<ConversationListResponse>(
    { queryKey: ["pc-im-conversations"] },
    (old) => updateImConversationList(old, input),
  );
}

export function applyImGatewayReadCache(
  queryClient: QueryClient,
  input: ApplyImGatewayReadCacheInput,
) {
  queryClient.setQueriesData<ConversationListResponse>(
    { queryKey: ["pc-im-conversations"] },
    (old) =>
      old
        ? {
            ...old,
            items: old.items.map((item) =>
              item.conversationId === input.conversationId
                ? updateImConversationReadReceiptItem(item, input)
                : item,
            ),
          }
        : old,
  );

  if (input.peerReadSeq > input.previousPeerReadSeq) {
    queryClient.setQueriesData<MessageItemDto[]>(
      {
        predicate: (query) =>
          query.queryKey[0] === "pc-im-messages" &&
          query.queryKey.includes(input.conversationId),
      },
      (old) =>
        old
          ? applyDirectReadReceiptToMessages(old, input.peerReadSeq, input.identity)
          : old,
    );
  }
}

export function isImEventMessage(message: MessageItemDto) {
  const type = normalizeMessageType(message);
  return type === "event" || type === "system" || type === "notice";
}

function appendImMessage(old: MessageItemDto[] | undefined, message: MessageItemDto) {
  const items = old ? [...old] : [];
  if (items.some((item) => item.messageId === message.messageId)) return old;
  items.push(message);
  items.sort((a, b) => {
    const seqA = a.conversationSeq ?? 0;
    const seqB = b.conversationSeq ?? 0;
    if (seqA !== seqB) return seqA - seqB;
    return Date.parse(a.sentAt ?? "") - Date.parse(b.sentAt ?? "");
  });
  return items;
}

function updateImConversationList(
  old: ConversationListResponse | undefined,
  input: ApplyImGatewayMessageCacheInput,
) {
  if (!old) return old;
  let found = false;
  const items = old.items.map((item) => {
    if (item.conversationId !== input.conversationId) return item;
    found = true;
    return updateImConversationItem(item, input);
  });
  if (!found) {
    const conversation = gatewayConversation(input.payload, input);
    if (conversation && isImConversation(conversation)) {
      items.unshift(conversation);
    }
  }
  return { ...old, items };
}

function updateImConversationItem(
  item: ConversationListItem,
  input: ApplyImGatewayMessageCacheInput,
): ConversationListItem {
  const lastSeq = input.message.conversationSeq ?? item.lastMessageSeq ?? 0;
  const alreadyMerged = isSameOrOlderConversationMessage(item, input.message);
  const nextReadSeq =
    input.readSeq !== undefined
      ? Math.max(item.lastReadSeq ?? 0, input.readSeq)
      : item.lastReadSeq;
  if (alreadyMerged) {
    return input.readSeq !== undefined || input.unreadCount !== undefined
      ? {
          ...item,
          unreadCount: input.unreadCount ?? 0,
          lastReadSeq: nextReadSeq,
        }
      : item;
  }
  return {
    ...item,
    lastMessage: {
      messageId: input.message.messageId,
      messageType: input.message.messageType,
      preview: input.message.preview,
      sentAt: input.message.sentAt,
      senderUserId: input.message.senderUserId,
      senderId: input.message.senderId,
      fromUserId: input.message.fromUserId,
      senderPlatformUserId: input.message.senderPlatformUserId,
      platformUserId: input.message.platformUserId,
      senderLppId: input.message.senderLppId,
      lppId: input.message.lppId,
      senderDisplayName: input.message.senderDisplayName,
      isSelf: input.message.isSelf,
      isMine: input.message.isMine,
      direction: input.message.direction,
    },
    lastMessageSeq: Math.max(item.lastMessageSeq ?? 0, lastSeq),
    lastReadSeq: nextReadSeq,
    unreadCount:
      input.unreadCount !== undefined
        ? input.unreadCount
        : input.readSeq !== undefined
          ? 0
          : item.unreadCount,
  };
}

function updateImConversationReadReceiptItem(
  item: ConversationListItem,
  input: ApplyImGatewayReadCacheInput,
): ConversationListItem {
  if (input.readerIsCurrentUser) {
    return {
      ...item,
      unreadCount: input.view?.unreadCount ?? 0,
      lastReadSeq: Math.max(item.lastReadSeq ?? 0, input.myReadSeq),
    };
  }
  return item;
}

function gatewayConversation(
  payload: Record<string, unknown>,
  input: ApplyImGatewayMessageCacheInput,
): ConversationListItem | null {
  const raw = asRecord(payload.conversation);
  const title =
    stringField(raw, "title", "name", "displayName") ||
    stringField(payload, "conversationTitle", "title") ||
    input.message.senderDisplayName ||
    "新会话";
  return {
    conversationId: input.conversationId,
    conversationType: input.conversationType,
    title,
    avatarUrl:
      stringField(raw, "avatarUrl") ||
      stringField(payload, "conversationAvatarUrl", "avatarUrl") ||
      input.message.senderAvatarUrl ||
      null,
    lastMessage: {
      messageId: input.message.messageId,
      messageType: input.message.messageType,
      preview: input.message.preview,
      sentAt: input.message.sentAt,
      senderUserId: input.message.senderUserId,
      senderId: input.message.senderId,
      fromUserId: input.message.fromUserId,
      senderPlatformUserId: input.message.senderPlatformUserId,
      platformUserId: input.message.platformUserId,
      senderLppId: input.message.senderLppId,
      lppId: input.message.lppId,
      senderDisplayName: input.message.senderDisplayName,
      isSelf: input.message.isSelf,
      isMine: input.message.isMine,
      direction: input.message.direction,
    },
    unreadCount: input.unreadCount ?? 0,
    lastReadSeq: input.readSeq,
    lastMessageSeq: input.message.conversationSeq,
  };
}

function isSameOrOlderConversationMessage(
  item: ConversationListItem,
  message: MessageItemDto,
) {
  const incomingId = message.messageId;
  const existingId = item.lastMessage?.messageId;
  if (incomingId && existingId && incomingId === existingId) return true;
  const incomingSeq = message.conversationSeq ?? 0;
  const existingSeq = item.lastMessageSeq ?? 0;
  return incomingSeq > 0 && existingSeq > 0 && incomingSeq <= existingSeq;
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
}

function stringField(record: Record<string, unknown>, ...keys: string[]) {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) return value.trim();
    if (typeof value === "number") return String(value);
  }
  return "";
}
