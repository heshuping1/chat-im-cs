import type { Dispatch, SetStateAction } from "react";
import type { QueryClient } from "@tanstack/react-query";
import type {
  ConversationListItem,
  MediaResourceDto,
  MessageItemDto,
} from "../../data/api-client";
import type { AuthSession } from "../../data/auth/auth-session";
import {
  firstMessageMedia,
  mediaFileName,
  messagePreviewFromBody,
  normalizeMessageItem,
  normalizeMessageType,
} from "../../data/im-message-normalize";
import { applyImReadSeqToConversationSnapshot } from "../../data/im-read/im-read-service";
import { conversationKey as imConversationKey } from "../../data/im-read-model";
import { applySendSucceededToImRead } from "../../data/im-read/im-send-succeeded-service";
import { pcQueryKeys } from "../../data/query-keys";
import { currentIsoTimestamp, timestampFromDateValue } from "../../lib/format";
import { getImConversationType } from "./messageConversationTypeModel";
import { messageActionPreview } from "./messageListModel";

export type ImConversationType = "direct" | "group";
export type LocalUploadStatus = "queued" | "uploading" | "paused" | "failed" | "sent" | "canceled";

export async function invalidateMessages(queryClient: QueryClient) {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: ["pc-im-messages"] }),
    queryClient.invalidateQueries({ queryKey: ["pc-im-conversations"] }),
  ]);
}

export function appendLocalMessage(
  queryClient: QueryClient,
  session: AuthSession | null,
  conversation: ConversationListItem,
  messageType: "text" | "image" | "video" | "file",
  body: Record<string, unknown>,
  result: { messageId?: string; conversationId?: string; conversationSeq?: number; serverTime?: string },
  options: {
    status?: string;
    localError?: string;
    uploadProgress?: number;
    localTaskId?: string;
  } = {},
) {
  const queryKey = pcQueryKeys.imMessages(
    session?.apiBaseUrl,
    session?.tenantToken,
    getImConversationType(conversation),
    conversation.conversationId,
  );
  const messageId = result.messageId || `pc-local-${Date.now()}`;
  const sentAt = result.serverTime || currentIsoTimestamp();
  const conversationSeq = result.conversationSeq;
  const next = normalizeMessageItem({
    messageId,
    body,
    conversationId: result.conversationId || conversation.conversationId,
    conversationSeq,
    direction: "out",
    isMine: true,
    isSelf: true,
    messageType,
    preview: previewFromOutgoingBody(messageType, body),
    readAt: null,
    senderAvatarUrl: session?.avatarUrl,
    senderDisplayName: session?.displayName || "Me",
    senderLppId: session?.lppId,
    senderUserId: session?.userId || session?.platformUserId,
    sentAt,
    status: options.status ?? "sent",
    ...(options.localError ? { localError: options.localError } : {}),
    ...(typeof options.uploadProgress === "number"
      ? { uploadProgress: options.uploadProgress }
      : {}),
    ...(options.localTaskId ? { localTaskId: options.localTaskId } : {}),
  });
  queryClient.setQueryData<MessageItemDto[]>(queryKey, (old = []) => {
    if (old.some((item) => item.messageId === messageId)) return old;
    return [...old, next].sort(sortMessagesForCache);
  });
  queryClient.setQueriesData<{ items: ConversationListItem[] }>(
    { queryKey: ["pc-im-conversations"] },
    (old) =>
      old
        ? {
            ...old,
            items: old.items.map((item) =>
              item.conversationId === conversation.conversationId
                ? {
                    ...item,
                    lastMessage: {
                      messageId,
                      messageType,
                      preview: previewFromOutgoingBody(messageType, body),
                      sentAt,
                      senderUserId: session?.userId || session?.platformUserId,
                      senderId: session?.userId,
                      senderPlatformUserId: session?.platformUserId,
                      senderLppId: session?.lppId,
                      senderDisplayName: session?.displayName || "Me",
                      isSelf: true,
                      isMine: true,
                      direction: "out",
                    },
                    lastMessageSeq: Math.max(
                      item.lastMessageSeq ?? 0,
                      conversationSeq ?? 0,
                    ),
                    lastReadSeq: Math.max(
                      item.lastReadSeq ?? 0,
                      conversationSeq ?? 0,
                    ),
                    unreadCount: 0,
                  }
                : item,
            ),
          }
        : old,
  );
  applySendSucceededToImRead({
    conversation,
    conversationType: getImConversationType(conversation),
    session,
    message: {
      messageId,
      conversationId: result.conversationId || conversation.conversationId,
      conversationSeq,
      direction: "out",
      isMine: true,
      isSelf: true,
      senderDisplayName: session?.displayName || "Me",
      senderLppId: session?.lppId,
      senderUserId: session?.userId || session?.platformUserId,
    },
  });
  return next;
}

export function replaceLocalMessageInCache(
  queryClient: QueryClient,
  session: AuthSession | null,
  conversation: ConversationListItem,
  localMessageId: string,
  messageType: "text" | "image" | "video" | "file",
  body: Record<string, unknown>,
  result: { messageId?: string; conversationId?: string; conversationSeq?: number; serverTime?: string },
) {
  const queryKey = pcQueryKeys.imMessages(
    session?.apiBaseUrl,
    session?.tenantToken,
    getImConversationType(conversation),
    conversation.conversationId,
  );
  const messageId = result.messageId || localMessageId;
  const sentAt = result.serverTime || currentIsoTimestamp();
  const next = normalizeMessageItem({
    messageId,
    body,
    conversationId: result.conversationId || conversation.conversationId,
    conversationSeq: result.conversationSeq,
    direction: "out",
    isMine: true,
    isSelf: true,
    messageType,
    preview: previewFromOutgoingBody(messageType, body),
    readAt: null,
    senderAvatarUrl: session?.avatarUrl,
    senderDisplayName: session?.displayName || "Me",
    senderLppId: session?.lppId,
    senderUserId: session?.userId || session?.platformUserId,
    sentAt,
    status: "sent",
  });
  queryClient.setQueryData<MessageItemDto[]>(queryKey, (old = []) => {
    const withoutServerDuplicate = old.filter(
      (item) => item.messageId === localMessageId || item.messageId !== messageId,
    );
    if (!withoutServerDuplicate.some((item) => item.messageId === localMessageId)) {
      return [...withoutServerDuplicate, next].sort(sortMessagesForCache);
    }
    return withoutServerDuplicate
      .map((item) => (item.messageId === localMessageId ? next : item))
      .sort(sortMessagesForCache);
  });
  queryClient.setQueriesData<{ items: ConversationListItem[] }>(
    { queryKey: ["pc-im-conversations"] },
    (old) =>
      old
        ? {
            ...old,
            items: old.items.map((item) =>
              item.conversationId === conversation.conversationId
                ? {
                    ...item,
                    lastMessage: {
                      ...(item.lastMessage ?? {}),
                      messageId,
                      messageType,
                      preview: previewFromOutgoingBody(messageType, body),
                      sentAt,
                      senderUserId: session?.userId || session?.platformUserId,
                      senderId: session?.userId,
                      senderPlatformUserId: session?.platformUserId,
                      senderLppId: session?.lppId,
                      senderDisplayName: session?.displayName || "Me",
                      isSelf: true,
                      isMine: true,
                      direction: "out",
                    },
                    lastMessageSeq: Math.max(
                      item.lastMessageSeq ?? 0,
                      result.conversationSeq ?? 0,
                    ),
                    lastReadSeq: Math.max(
                      item.lastReadSeq ?? 0,
                      result.conversationSeq ?? 0,
                    ),
                    unreadCount: 0,
                  }
                : item,
            ),
          }
        : old,
  );
  applySendSucceededToImRead({
    conversation,
    conversationType: getImConversationType(conversation),
    session,
    message: {
      messageId,
      conversationId: result.conversationId || conversation.conversationId,
      conversationSeq: result.conversationSeq,
      direction: "out",
      isMine: true,
      isSelf: true,
      senderDisplayName: session?.displayName || "Me",
      senderLppId: session?.lppId,
      senderUserId: session?.userId || session?.platformUserId,
    },
  });
  return next;
}

export function withLocalMediaPreviews(
  messages: MessageItemDto[],
  localPreviews: Map<string, string>,
): MessageItemDto[] {
  if (localPreviews.size === 0) return messages;
  return messages.map((message) => {
    const type = normalizeMessageType(message);
    const mediaKind =
      type.includes("video") || message.body?.video
        ? "video"
        : type.includes("image") || message.body?.image
          ? "image"
          : undefined;
    if (!mediaKind) return message;
    const media = firstMessageMedia(message);
    const localPreviewUrl = localMediaPreviewKeys(message.messageId, media)
      .map((key) => localPreviews.get(key))
      .find(Boolean);
    if (!localPreviewUrl) return message;
    return normalizeMessageItem({
      ...message,
      body: {
        ...(message.body ?? {}),
        [mediaKind]: withLocalPreviewOnMedia(message.body?.[mediaKind], localPreviewUrl),
      },
    });
  });
}

export function markLocalMessageFailed(
  queryClient: QueryClient,
  session: AuthSession | null,
  conversation: ConversationListItem,
  localMessageId: string,
  reason: string,
) {
  const queryKey = pcQueryKeys.imMessages(
    session?.apiBaseUrl,
    session?.tenantToken,
    getImConversationType(conversation),
    conversation.conversationId,
  );
  queryClient.setQueryData<MessageItemDto[]>(queryKey, (old = []) =>
    old.map((item) =>
      item.messageId === localMessageId
        ? normalizeMessageItem({
            ...item,
            status: "failed",
            localError: reason,
          } as MessageItemDto)
        : item,
    ),
  );
}

export function patchLocalMediaMessage(
  queryClient: QueryClient,
  session: AuthSession | null,
  conversation: ConversationListItem,
  conversationType: ImConversationType,
  localMessageId: string,
  patch: {
    body?: Record<string, unknown>;
    status?: LocalUploadStatus;
    uploadProgress?: number;
    localError?: string;
  },
  setLocalOutgoingMessagesByConversation: Dispatch<
    SetStateAction<Record<string, MessageItemDto[]>>
  >,
) {
  const applyPatch = (item: MessageItemDto) =>
    normalizeMessageItem({
      ...item,
      ...(patch.body ? { body: patch.body } : {}),
      ...(patch.status ? { status: patch.status } : {}),
      ...(typeof patch.uploadProgress === "number"
        ? { uploadProgress: patch.uploadProgress }
        : {}),
      ...(patch.localError === undefined
        ? { localError: undefined }
        : { localError: patch.localError }),
    } as MessageItemDto);
  const queryKey = pcQueryKeys.imMessages(
    session?.apiBaseUrl,
    session?.tenantToken,
    getImConversationType(conversation),
    conversation.conversationId,
  );
  queryClient.setQueryData<MessageItemDto[]>(queryKey, (old = []) =>
    old.map((item) => (item.messageId === localMessageId ? applyPatch(item) : item)),
  );
  setLocalOutgoingMessagesByConversation((current) => {
    const key = imConversationKey(conversationType, conversation.conversationId);
    const existing = current[key] ?? [];
    return {
      ...current,
      [key]: existing.map((item) =>
        item.messageId === localMessageId ? applyPatch(item) : item,
      ),
    };
  });
}

export function upsertLocalOutgoingMessage(
  current: Record<string, MessageItemDto[]>,
  conversationType: ImConversationType,
  conversationId: string,
  message: MessageItemDto,
) {
  const key = imConversationKey(conversationType, conversationId);
  const existing = current[key] ?? [];
  const next = existing.some((item) => item.messageId === message.messageId)
    ? existing.map((item) => (item.messageId === message.messageId ? message : item))
    : [...existing, message];
  return { ...current, [key]: next.sort(sortMessagesForCache) };
}

export function replaceLocalOutgoingMessage(
  current: Record<string, MessageItemDto[]>,
  conversationType: ImConversationType,
  conversationId: string,
  localMessageId: string,
  message: MessageItemDto,
) {
  const key = imConversationKey(conversationType, conversationId);
  const existing = current[key] ?? [];
  const withoutServerDuplicate = existing.filter(
    (item) => item.messageId === localMessageId || item.messageId !== message.messageId,
  );
  const next = withoutServerDuplicate.some((item) => item.messageId === localMessageId)
    ? withoutServerDuplicate.map((item) =>
        item.messageId === localMessageId ? message : item,
      )
    : [...withoutServerDuplicate, message];
  return { ...current, [key]: next.sort(sortMessagesForCache) };
}

export function markLocalOutgoingMessageFailed(
  current: Record<string, MessageItemDto[]>,
  conversationType: ImConversationType,
  conversationId: string,
  localMessageId: string,
  reason: string,
) {
  const key = imConversationKey(conversationType, conversationId);
  const existing = current[key] ?? [];
  const next = existing.map((item) =>
    item.messageId === localMessageId
      ? normalizeMessageItem({
          ...item,
          status: "failed",
          localError: reason,
        } as MessageItemDto)
      : item,
  );
  return { ...current, [key]: next };
}

export function appendForwardedMessagesToCache(
  queryClient: QueryClient,
  session: AuthSession | null,
  conversation: ConversationListItem,
  messages: MessageItemDto[],
) {
  const conversationType = getImConversationType(conversation);
  const queryKey = pcQueryKeys.imMessages(
    session?.apiBaseUrl,
    session?.tenantToken,
    conversationType,
    conversation.conversationId,
  );
  const now = Date.now();
  queryClient.setQueryData<MessageItemDto[]>(queryKey, (old = []) => {
    const forwarded = messages.map((message, index) =>
      normalizeMessageItem({
        ...message,
        messageId: `pc-forward-${now}-${index}`,
        conversationId: conversation.conversationId,
        conversationSeq: undefined,
        direction: "out",
        isMine: true,
        isSelf: true,
        preview: `Forward: ${messageActionPreview(message)}`,
        senderAvatarUrl: session?.avatarUrl,
        senderDisplayName: session?.displayName || "Me",
        senderLppId: session?.lppId,
        senderUserId: session?.userId || session?.platformUserId,
        sentAt: currentIsoTimestamp(now + index),
        status: "sent",
      }),
    );
    return [...old, ...forwarded];
  });
}

export function markMessageRecalledInCache(
  queryClient: QueryClient,
  messageId: string,
) {
  queryClient.setQueriesData<MessageItemDto[]>(
    { queryKey: ["pc-im-messages"] },
    (old) =>
      old?.map((message) =>
        message.messageId === messageId
          ? normalizeMessageItem({
              ...message,
              body: { eventText: "消息已撤回", messageType: "event" },
              isRecalled: true,
              messageType: "event",
              preview: "消息已撤回",
              status: "recalled",
            })
          : message,
      ),
  );
}

export function removeMessageFromCache(
  queryClient: QueryClient,
  messageId: string,
) {
  queryClient.setQueriesData<MessageItemDto[]>(
    { queryKey: ["pc-im-messages"] },
    (old) => old?.filter((message) => message.messageId !== messageId),
  );
}

export function markMessageFavoriteInCache(
  queryClient: QueryClient,
  messageId: string,
  favoriteId?: string,
) {
  queryClient.setQueriesData<MessageItemDto[]>(
    { queryKey: ["pc-im-messages"] },
    (old) =>
      old?.map((message) =>
        message.messageId === messageId
          ? ({
              ...message,
              favoriteId: favoriteId || true,
              isFavorite: true,
              favoritedAt: currentIsoTimestamp(),
            } as MessageItemDto)
          : message,
      ),
  );
}

export function applyConversationReadToCache(
  queryClient: QueryClient,
  conversationId: string,
  readSeq: number,
) {
  queryClient.setQueriesData<{ items: ConversationListItem[] }>(
    { queryKey: ["pc-im-conversations"] },
    (old) =>
      old
        ? {
            ...old,
            items: old.items.map((item) =>
              item.conversationId === conversationId
                ? applyReadSeqToConversationListItem(item, readSeq)
                : item,
            ),
          }
        : old,
  );
}

export function localMediaPreviewKeys(
  messageId?: string,
  media?: MediaResourceDto,
): string[] {
  const keys = new Set<string>();
  if (messageId) keys.add(`message:${messageId}`);
  const record = media as Record<string, unknown> | undefined;
  [
    record?.url,
    record?.thumbnailUrl,
    record?.downloadUrl,
    record?.signedUrl,
    record?.fileUrl,
    record?.uri,
    record?.path,
  ].forEach((value) => {
    if (typeof value === "string" && value.trim()) keys.add(`media:${value.trim()}`);
  });
  const fileName = mediaFileName(media);
  const sizeBytes = typeof record?.sizeBytes === "number" ? record.sizeBytes : undefined;
  if (fileName && sizeBytes !== undefined) keys.add(`file:${fileName}:${sizeBytes}`);
  return Array.from(keys);
}

function withLocalPreviewOnMedia(value: unknown, localPreviewUrl: string): unknown {
  if (Array.isArray(value)) {
    const [first, ...rest] = value;
    return [withLocalPreviewOnMedia(first, localPreviewUrl), ...rest];
  }
  if (value && typeof value === "object") {
    return {
      ...(value as Record<string, unknown>),
      localPreviewUrl,
    };
  }
  if (typeof value === "string" && value.trim()) {
    return { url: value, localPreviewUrl };
  }
  return { localPreviewUrl };
}

function sortMessagesForCache(left: MessageItemDto, right: MessageItemDto) {
  const leftSeq = Number(left.conversationSeq ?? Number.MAX_SAFE_INTEGER);
  const rightSeq = Number(right.conversationSeq ?? Number.MAX_SAFE_INTEGER);
  return (
    leftSeq - rightSeq ||
    timestampFromDateValue(left.sentAt) - timestampFromDateValue(right.sentAt)
  );
}

function previewFromOutgoingBody(
  messageType: "text" | "image" | "video" | "file",
  body: Record<string, unknown>,
) {
  return messagePreviewFromBody(body, messageType);
}

function applyReadSeqToConversationListItem(
  item: ConversationListItem,
  readSeq: number,
) {
  const next = applyImReadSeqToConversationSnapshot(item, readSeq);
  return {
    ...item,
    unreadCount: next.unreadCount,
    lastReadSeq: next.lastReadSeq,
  };
}
