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
import { conversationKey as imConversationKey } from "../../data/im-read-model";
import { applySendSucceededToImRead } from "../../data/im-read/im-send-succeeded-service";
import {
  reduceMessageCoreEvent,
  type MessageCoreEvent,
} from "../../data/message-core/message-core";
import { pcQueryKeys } from "../../data/query-keys";
import { isQueryInWorkspaceScope, workspaceScopeKeyFromSession } from "../../data/workspace-scope";
import { currentIsoTimestamp, timestampFromDateValue } from "../../lib/format";
import { getImConversationType } from "./messageConversationTypeModel";
import { messageActionPreview } from "./messageListModel";

export type ImConversationType = "direct" | "group";
export type LocalUploadStatus =
  | "queued"
  | "uploading"
  | "paused"
  | "sending"
  | "failed"
  | "sent"
  | "canceled";
export type LocalUploadPhase =
  | "preparing"
  | "uploading_media"
  | "uploading_poster"
  | "sending"
  | "failed"
  | "sent";
export type OutgoingMessageType = "text" | "image" | "video" | "file" | "contact_card";

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
  messageType: OutgoingMessageType,
  body: Record<string, unknown>,
  result: { messageId?: string; conversationId?: string; conversationSeq?: number; serverTime?: string },
  options: {
    status?: string;
    uploadPhase?: LocalUploadPhase;
    localError?: string;
    localSendStartedAt?: number;
    uploadProgress?: number;
    localTaskId?: string;
  } = {},
) {
  const scopeKey = workspaceScopeKeyFromSession(session);
  const queryKey = pcQueryKeys.imMessagesForSession(
    session,
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
    ...(typeof options.localSendStartedAt === "number"
      ? { localSendStartedAt: options.localSendStartedAt }
      : {}),
    ...(typeof options.uploadProgress === "number"
      ? { uploadProgress: options.uploadProgress }
      : {}),
    ...(options.uploadPhase ? { uploadPhase: options.uploadPhase } : {}),
    ...(options.localTaskId ? { localTaskId: options.localTaskId } : {}),
  });
  queryClient.setQueryData<MessageItemDto[]>(queryKey, (old = []) => {
    return reduceMessageCoreEvent(
      { messages: old },
      outgoingMessageCoreEvent({
        conversation,
        message: next,
      }),
    ).state.messages;
  });
  queryClient.setQueriesData<{ items: ConversationListItem[] }>(
    {
      predicate: (query) =>
        query.queryKey[0] === "pc-im-conversations" &&
        isQueryInWorkspaceScope(query, scopeKey),
    },
    (old) =>
      old
        ? {
            ...old,
            items: old.items.map((item) =>
              item.conversationId === conversation.conversationId
                ? reduceMessageCoreEvent(
                    { conversation: item, messages: [] },
                    outgoingMessageCoreEvent({
                      conversation,
                      message: next,
                    }),
                  ).state.conversation ?? item
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
  messageType: OutgoingMessageType,
  body: Record<string, unknown>,
  result: { messageId?: string; conversationId?: string; conversationSeq?: number; serverTime?: string },
) {
  const scopeKey = workspaceScopeKeyFromSession(session);
  const queryKey = pcQueryKeys.imMessagesForSession(
    session,
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
    return reduceMessageCoreEvent(
      { messages: old },
      {
        type: "message.send_confirmed",
        conversationId: conversation.conversationId,
        conversationType: getImConversationType(conversation) === "group" ? "group" : "direct",
        localMessageId,
        message: next,
      },
    ).state.messages;
  });
  queryClient.setQueriesData<{ items: ConversationListItem[] }>(
    {
      predicate: (query) =>
        query.queryKey[0] === "pc-im-conversations" &&
        isQueryInWorkspaceScope(query, scopeKey),
    },
    (old) =>
      old
        ? {
            ...old,
            items: old.items.map((item) =>
              item.conversationId === conversation.conversationId
                ? reduceMessageCoreEvent(
                    { conversation: item, messages: [] },
                    {
                      type: "message.send_confirmed",
                      conversationId: conversation.conversationId,
                      conversationType:
                        getImConversationType(conversation) === "group" ? "group" : "direct",
                      localMessageId,
                      message: next,
                    },
                  ).state.conversation ?? item
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
  failedAt = Date.now(),
) {
  const queryKey = pcQueryKeys.imMessages(
    session?.apiBaseUrl,
    session?.tenantToken,
    getImConversationType(conversation),
    conversation.conversationId,
  );
  queryClient.setQueryData<MessageItemDto[]>(queryKey, (old = []) =>
    reduceMessageCoreEvent(
      { messages: old },
      {
        type: "message.send_failed",
        conversationId: conversation.conversationId,
        conversationType: getImConversationType(conversation) === "group" ? "group" : "direct",
        messageId: localMessageId,
        reason,
      },
    ).state.messages.map((message) =>
      message.messageId === localMessageId
        ? normalizeMessageItem({
            ...message,
            localFailedAt: failedAt,
          } as MessageItemDto)
        : message,
    ),
  );
}

export function patchLocalMessageSendState(
  queryClient: QueryClient,
  session: AuthSession | null,
  conversation: ConversationListItem,
  conversationType: ImConversationType,
  localMessageId: string,
  patch: {
    status?: "sending" | "failed";
    localError?: string;
    localFailedAt?: number;
    localSendStartedAt?: number;
  },
  setLocalOutgoingMessagesByConversation: Dispatch<
    SetStateAction<Record<string, MessageItemDto[]>>
  >,
) {
  const applyPatch = (item: MessageItemDto) =>
    normalizeMessageItem({
      ...item,
      ...(patch.status ? { status: patch.status } : {}),
      ...(patch.localError === undefined
        ? { localError: undefined }
        : { localError: patch.localError }),
      ...(typeof patch.localFailedAt === "number"
        ? { localFailedAt: patch.localFailedAt }
        : {}),
      ...(typeof patch.localSendStartedAt === "number"
        ? { localSendStartedAt: patch.localSendStartedAt }
        : {}),
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

export function patchLocalMediaMessage(
  queryClient: QueryClient,
  session: AuthSession | null,
  conversation: ConversationListItem,
  conversationType: ImConversationType,
  localMessageId: string,
  patch: {
    body?: Record<string, unknown>;
    status?: LocalUploadStatus;
    uploadPhase?: LocalUploadPhase;
    uploadProgress?: number;
    localError?: string;
    localFailedAt?: number;
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
      ...(patch.uploadPhase ? { uploadPhase: patch.uploadPhase } : {}),
      ...(patch.localError === undefined
        ? { localError: undefined }
        : { localError: patch.localError }),
      ...(typeof patch.localFailedAt === "number"
        ? { localFailedAt: patch.localFailedAt }
        : {}),
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
  failedAt = Date.now(),
) {
  const key = imConversationKey(conversationType, conversationId);
  const existing = current[key] ?? [];
  const next = existing.map((item) =>
    item.messageId === localMessageId
      ? normalizeMessageItem({
          ...item,
          status: "failed",
          localError: reason,
          localFailedAt: failedAt,
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
  const affected = messageSnapshotsForMutation(queryClient, messageId);
  queryClient.setQueriesData<MessageItemDto[]>(
    { queryKey: ["pc-im-messages"] },
    (old) =>
      old
        ? reduceMessageCoreEvent(
            { messages: old },
            {
              type: "message.recalled",
              conversationId: affected.conversationId,
              conversationType: affected.conversationType,
              messageId,
            },
          ).state.messages
        : old,
  );
  patchConversationAfterMessageMutation(queryClient, affected, {
    type: "message.recalled",
    messageId,
  });
}

export function removeMessageFromCache(
  queryClient: QueryClient,
  messageId: string,
) {
  const affected = messageSnapshotsForMutation(queryClient, messageId);
  queryClient.setQueriesData<MessageItemDto[]>(
    { queryKey: ["pc-im-messages"] },
    (old) =>
      old
        ? reduceMessageCoreEvent(
            { messages: old },
            {
              type: "message.deleted",
              conversationId: affected.conversationId,
              conversationType: affected.conversationType,
              messageId,
            },
          ).state.messages
        : old,
  );
  patchConversationAfterMessageMutation(queryClient, affected, {
    type: "message.deleted",
    messageId,
  });
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

function outgoingMessageCoreEvent({
  conversation,
  localMessageId,
  message,
}: {
  conversation: ConversationListItem;
  localMessageId?: string;
  message: MessageItemDto;
}): Extract<MessageCoreEvent, { type: "message.local_created" | "message.send_confirmed" }> {
  const conversationType = getImConversationType(conversation) === "group" ? "group" as const : "direct" as const;
  const status = String(message.status ?? "").trim().toLowerCase();
  if (!status || status === "sent" || status === "read") {
    return {
      type: "message.send_confirmed" as const,
      conversationId: conversation.conversationId,
      conversationType,
      localMessageId,
      message,
    };
  }
  return {
    type: "message.local_created" as const,
    conversationId: conversation.conversationId,
    conversationType,
    message,
  };
}

function messageSnapshotsForMutation(queryClient: QueryClient, messageId: string) {
  const snapshots = queryClient.getQueriesData<MessageItemDto[]>({
    queryKey: ["pc-im-messages"],
  });
  for (const [, messages] of snapshots) {
    const target = messages?.find((message) => message.messageId === messageId);
    if (!target) continue;
    return {
      conversationId: target.conversationId ?? "",
      conversationType:
        target.conversationId?.startsWith("group") || target.messageType === "group"
          ? ("group" as const)
          : ("direct" as const),
      messages: messages ?? [],
    };
  }
  return {
    conversationId: "",
    conversationType: "direct" as const,
    messages: [] as MessageItemDto[],
  };
}

function patchConversationAfterMessageMutation(
  queryClient: QueryClient,
  affected: {
    conversationId: string;
    conversationType: "direct" | "group";
    messages: MessageItemDto[];
  },
  mutation: { type: "message.recalled" | "message.deleted"; messageId: string },
) {
  if (!affected.conversationId) return;
  queryClient.setQueriesData<{ items: ConversationListItem[] }>(
    { queryKey: ["pc-im-conversations"] },
    (old) =>
      old
        ? {
            ...old,
            items: old.items.map((item) => {
              if (item.conversationId !== affected.conversationId) return item;
              const result = reduceMessageCoreEvent(
                { conversation: item, messages: affected.messages },
                {
                  type: mutation.type,
                  conversationId: affected.conversationId,
                  conversationType:
                    getImConversationType(item) === "group"
                      ? "group"
                      : affected.conversationType,
                  messageId: mutation.messageId,
                },
              );
              return result.state.conversation ?? item;
            }),
          }
        : old,
  );
}

function previewFromOutgoingBody(
  messageType: OutgoingMessageType,
  body: Record<string, unknown>,
) {
  return messagePreviewFromBody(body, messageType);
}

function applyReadSeqToConversationListItem(
  item: ConversationListItem,
  readSeq: number,
) {
  const conversationType = getImConversationType(item) === "group" ? "group" : "direct";
  return (
    reduceMessageCoreEvent(
      { conversation: item, messages: [] },
      {
        type: "read.updated",
        conversationId: item.conversationId,
        conversationType,
        readSeq,
        identity: null,
      },
    ).state.conversation ?? item
  );
}
