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
import {
  getImMessageStore,
  imMessageScopeKey,
} from "../../data/message-store/im-message-store";
import { pcQueryKeys } from "../../data/query-keys";
import { syncGroupReadReceiptSnapshot } from "../../data/read-receipts";
import { isQueryInWorkspaceScope, workspaceScopeKeyFromSession } from "../../data/workspace-scope";
import { currentIsoTimestamp, timestampFromDateValue } from "../../lib/format";
import { getImConversationType } from "./messageConversationTypeModel";
import { messageActionPreview } from "./messageListModel";
import { createChatSendRuntime } from "../../data/send/chat-send-runtime";
import {
  sendOutboxTargetKey,
  type SendOutboxStorage,
} from "../../data/send/send-outbox";

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

export async function invalidateMessages(
  queryClient: QueryClient,
  session?: AuthSession | null,
) {
  const scopeKey = session ? workspaceScopeKeyFromSession(session) : undefined;
  await Promise.all([
    scopeKey
      ? queryClient.invalidateQueries({
          predicate: (query) =>
            query.queryKey[0] === "pc-im-messages" &&
            isQueryInWorkspaceScope(query, scopeKey),
        })
      : queryClient.invalidateQueries({ queryKey: ["pc-im-messages"] }),
    scopeKey
      ? queryClient.invalidateQueries({
          predicate: (query) =>
            query.queryKey[0] === "pc-im-conversations" &&
            isQueryInWorkspaceScope(query, scopeKey),
        })
      : queryClient.invalidateQueries({ queryKey: ["pc-im-conversations"] }),
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
    clientMsgId?: string;
    clientMessageId?: string;
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
    ...(options.clientMsgId ? { clientMsgId: options.clientMsgId } : {}),
    ...(options.clientMessageId ? { clientMessageId: options.clientMessageId } : {}),
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
  let confirmedMessage = normalizeMessageItem({
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
    const localMessage = old.find((message) => message.messageId === localMessageId);
    const localIdentity = stableLocalMessageIdentity(localMessage);
    const next = normalizeMessageItem({
      ...confirmedMessage,
      ...localIdentity,
    });
    confirmedMessage = next;
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
                      message: confirmedMessage,
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
  writeSuccessfulMessageToLocalStore(session, conversation, confirmedMessage);
  return confirmedMessage;
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
  const queryKey = pcQueryKeys.imMessagesForSession(
    session,
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
  const queryKey = pcQueryKeys.imMessagesForSession(
    session,
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
  const queryKey = pcQueryKeys.imMessagesForSession(
    session,
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

export function removeLocalOutgoingMessage(
  current: Record<string, MessageItemDto[]>,
  conversationType: ImConversationType,
  conversationId: string,
  localMessageId: string,
) {
  const key = imConversationKey(conversationType, conversationId);
  const existing = current[key] ?? [];
  const next = existing.filter((item) => item.messageId !== localMessageId);
  return { ...current, [key]: next };
}

export type LocalFailedOutgoingDiscardResult =
  | { discarded: false }
  | { discarded: true; localMessageId: string };

export interface LocalFailedOutgoingTaskRegistry {
  deleteTask(localTaskId: string): void;
  getTask?(localTaskId: string): { controller?: AbortController } | undefined;
}

export async function discardLocalFailedOutgoingMessage({
  conversationId,
  conversationType,
  mediaUploadTasks,
  message,
  queryClient,
  session,
  setLocalOutgoingMessagesByConversation,
  storage,
}: {
  conversationId: string;
  conversationType: ImConversationType;
  mediaUploadTasks?: LocalFailedOutgoingTaskRegistry;
  message: MessageItemDto;
  queryClient: QueryClient;
  session: AuthSession | null;
  setLocalOutgoingMessagesByConversation: Dispatch<
    SetStateAction<Record<string, MessageItemDto[]>>
  >;
  storage?: SendOutboxStorage;
}): Promise<LocalFailedOutgoingDiscardResult> {
  if (!isFailedLocalOutgoingStatus(message.status)) return { discarded: false };

  const runtime = createChatSendRuntime({
    channel: "im",
    session,
    ...(storage ? { storage } : {}),
  });
  const targetKey = sendOutboxTargetKey("im", conversationType, conversationId);
  const outboxRecord = await findOutboxRecordForMessage(
    runtime.storage,
    runtime.scopeKey,
    targetKey,
    message,
  );
  const localMessageId = outboxRecord?.localMessageId || localMessageIdFromMessage(message);
  if (!localMessageId) return { discarded: false };
  if (!outboxRecord && !hasLocalOutgoingIdentity(message)) return { discarded: false };

  const localTaskId = localTaskIdFromMessage(message) || outboxRecord?.localTaskId;
  const scopeKey = imMessageScopeKey(session);
  await Promise.all([
    runtime.deleteOutboxRecord(localMessageId),
    getImMessageStore().deleteMessage(scopeKey, conversationType, conversationId, localMessageId),
  ]);

  if (localTaskId) {
    mediaUploadTasks?.getTask?.(localTaskId)?.controller?.abort();
    mediaUploadTasks?.deleteTask(localTaskId);
  }

  removeMessageFromCacheOnly(queryClient, localMessageId, session);
  if (localMessageId !== message.messageId) {
    removeMessageFromCacheOnly(queryClient, message.messageId, session);
  }
  setLocalOutgoingMessagesByConversation((current) => {
    const withoutLocalId = removeLocalOutgoingMessage(
      current,
      conversationType,
      conversationId,
      localMessageId,
    );
    return localMessageId === message.messageId
      ? withoutLocalId
      : removeLocalOutgoingMessage(withoutLocalId, conversationType, conversationId, message.messageId);
  });

  return { discarded: true, localMessageId };
}

export function appendForwardedMessagesToCache(
  queryClient: QueryClient,
  session: AuthSession | null,
  conversation: ConversationListItem,
  messages: MessageItemDto[],
) {
  const conversationType = getImConversationType(conversation);
  const queryKey = pcQueryKeys.imMessagesForSession(
    session,
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

export function syncGroupReadReceiptSnapshotToCache(
  queryClient: QueryClient,
  {
    conversation,
    messageId,
    messageSeq,
    readCount,
    session,
  }: {
    conversation: ConversationListItem;
    messageId: string;
    messageSeq: number;
    readCount: number;
    session?: AuthSession | null;
  },
) {
  const conversationType = getImConversationType(conversation);
  if (conversationType !== "group") return;
  const queryKey = pcQueryKeys.imMessagesForSession(
    session,
    conversationType,
    conversation.conversationId,
  );
  queryClient.setQueryData<MessageItemDto[]>(queryKey, (old) =>
    old
      ? syncGroupReadReceiptSnapshot({
          conversationType,
          identity: session ?? null,
          messageId,
          messageSeq,
          messages: old,
          readCount,
        })
      : old,
  );
}

export function markMessageRecalledInCache(
  queryClient: QueryClient,
  messageId: string,
  session?: AuthSession | null,
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
  writeMessageMutationToLocalStore(session, affected, {
    type: "message.recalled",
    messageId,
  });
}

export function removeMessageFromCache(
  queryClient: QueryClient,
  messageId: string,
  session?: AuthSession | null,
) {
  const affected = removeMessageFromCacheOnly(queryClient, messageId, session);
  writeMessageMutationToLocalStore(session, affected, {
    type: "message.deleted",
    messageId,
  });
}

export function removeMessageFromCacheOnly(
  queryClient: QueryClient,
  messageId: string,
  session?: AuthSession | null,
) {
  const affected = messageSnapshotsForMutation(queryClient, messageId, session);
  queryClient.setQueriesData<MessageItemDto[]>(
    {
      predicate: (query) =>
        query.queryKey[0] === "pc-im-messages" &&
        (!session || isQueryInWorkspaceScope(query, workspaceScopeKeyFromSession(session))),
    },
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
  }, session);
  return affected;
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
  session?: AuthSession | null,
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
  const affected = conversationSnapshotForRead(queryClient, conversationId);
  if (affected) {
    void getImMessageStore().applyReadMetadata(
      imMessageScopeKey(session),
      affected.conversationType,
      conversationId,
      {
        identity: null,
        readSeq,
      },
    );
  }
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

async function findOutboxRecordForMessage(
  storage: SendOutboxStorage,
  scopeKey: string,
  targetKey: string,
  message: MessageItemDto,
) {
  const records = await storage.listRecords({ scopeKey, targetKey });
  const messageId = message.messageId.trim();
  const clientMsgId = clientMessageIdFromMessage(message);
  const localTaskId = localTaskIdFromMessage(message);
  return records.find((record) =>
    record.localMessageId === messageId ||
    record.clientMsgId === messageId ||
    (clientMsgId ? record.clientMsgId === clientMsgId || record.localMessageId === clientMsgId : false) ||
    (localTaskId ? record.localTaskId === localTaskId : false),
  );
}

function isFailedLocalOutgoingStatus(status: unknown) {
  const normalized = String(status ?? "").trim().toLowerCase();
  return normalized === "failed" || normalized === "canceled";
}

function hasLocalOutgoingIdentity(message: MessageItemDto) {
  return Boolean(
    localMessageIdFromMessage(message) ||
      clientMessageIdFromMessage(message) ||
      localTaskIdFromMessage(message),
  );
}

function stableLocalMessageIdentity(message?: MessageItemDto) {
  if (!message) return {};
  const record = message as unknown as Record<string, unknown>;
  const clientMsgId = stringRecordValue(record.clientMsgId);
  const clientMessageId = stringRecordValue(record.clientMessageId);
  const localTaskId = stringRecordValue(record.localTaskId);
  return {
    ...(clientMsgId ? { clientMsgId } : {}),
    ...(clientMessageId ? { clientMessageId } : {}),
    ...(localTaskId ? { localTaskId } : {}),
  };
}

function localMessageIdFromMessage(message: MessageItemDto) {
  const id = message.messageId.trim();
  return id.startsWith("pc-local-") ? id : "";
}

function clientMessageIdFromMessage(message: MessageItemDto) {
  const record = message as unknown as Record<string, unknown>;
  return stringRecordValue(record.clientMsgId) || stringRecordValue(record.clientMessageId);
}

function localTaskIdFromMessage(message: MessageItemDto) {
  const record = message as unknown as Record<string, unknown>;
  return stringRecordValue(record.localTaskId);
}

function stringRecordValue(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : "";
}

function messageSnapshotsForMutation(
  queryClient: QueryClient,
  messageId: string,
  session?: AuthSession | null,
) {
  const snapshots = queryClient.getQueriesData<MessageItemDto[]>({
    predicate: (query) =>
      query.queryKey[0] === "pc-im-messages" &&
      (!session || isQueryInWorkspaceScope(query, workspaceScopeKeyFromSession(session))),
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
  session?: AuthSession | null,
) {
  if (!affected.conversationId) return;
  queryClient.setQueriesData<{ items: ConversationListItem[] }>(
    {
      predicate: (query) =>
        query.queryKey[0] === "pc-im-conversations" &&
        (!session || isQueryInWorkspaceScope(query, workspaceScopeKeyFromSession(session))),
    },
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

function writeMessageMutationToLocalStore(
  session: AuthSession | null | undefined,
  affected: {
    conversationId: string;
    conversationType: "direct" | "group";
  },
  mutation: { type: "message.recalled" | "message.deleted"; messageId: string },
) {
  if (!session || !affected.conversationId) return;
  const scopeKey = imMessageScopeKey(session);
  const store = getImMessageStore();
  if (mutation.type === "message.recalled") {
    void store.markMessageRecalled(
      scopeKey,
      affected.conversationType,
      affected.conversationId,
      mutation.messageId,
    );
    return;
  }
  void store.deleteMessage(
    scopeKey,
    affected.conversationType,
    affected.conversationId,
    mutation.messageId,
  );
}

function conversationSnapshotForRead(queryClient: QueryClient, conversationId: string) {
  const snapshots = queryClient.getQueriesData<{ items: ConversationListItem[] }>({
    queryKey: ["pc-im-conversations"],
  });
  for (const [, response] of snapshots) {
    const conversation = response?.items.find((item) => item.conversationId === conversationId);
    if (!conversation) continue;
    return {
      conversationType: getImConversationType(conversation) === "group"
        ? ("group" as const)
        : ("direct" as const),
    };
  }
  return null;
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

function writeSuccessfulMessageToLocalStore(
  session: AuthSession | null,
  conversation: ConversationListItem,
  message: MessageItemDto,
) {
  const status = String(message.status ?? "sent").trim().toLowerCase();
  if (status && !["sent", "read", "delivered"].includes(status)) return;
  const scopeKey = imMessageScopeKey(session);
  const conversationType = getImConversationType(conversation);
  if (!conversationType) return;
  void getImMessageStore().upsertMessages(
    scopeKey,
    conversationType,
    conversation.conversationId,
    [message],
  );
}
