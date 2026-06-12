import type { QueryClient } from "@tanstack/react-query";

import type {
  CustomerServiceThread,
  MessageItemDto,
  StaffServiceHistoryItem,
} from "../api/types";
import type { CurrentUserIdentity } from "../message-display";
import {
  clearCustomerServiceConversationUnread,
  customerServiceIndexScopeKey,
  getCustomerServiceConversationIndex,
  getCustomerServiceThreadIndex,
  rememberCustomerServiceConversationIndex,
  rememberCustomerServiceConversationMessageOverlay,
  rememberCustomerServiceStaffSentMessage,
} from "./cs-conversation-index";
import { recordMessageReminderDiagnostic } from "../diagnostics/message-reminder-diagnostics";
import { isQueryInWorkspaceScope, workspaceScopeKeyFromSession } from "../workspace-scope";
import {
  customerServiceMessageFromSendResult,
  latestCustomerServiceMessage,
  previewFromCustomerServiceMessage,
  type CustomerServiceCacheMessageKind,
} from "./cs-cache-message-model";
import {
  auditCustomerServiceMessage,
  customerServiceMessagePreviewKind,
  type CustomerServiceMessageAuditSource,
  type CustomerServiceMessageAuditStage,
  type CustomerServiceMessageMatchedBy,
  type CustomerServiceMessageMergeDecision,
} from "./cs-message-audit-diagnostics";
import {
  reduceCustomerServiceMessageEvent,
  type CustomerServiceMessageEvent,
} from "./message-domain";
import { logCustomerServiceCacheDiagnostic } from "./cs-cache-diagnostics";
import {
  isSilentCustomerServiceRecalledMessage,
  rememberSilentCustomerServiceRecall,
} from "./cs-silent-recall";

export {
  customerServiceMessageFromSendResult,
  customerServiceMessageIdentity,
  latestCustomerServiceMessage,
  previewFromCustomerServiceMessage,
  type CustomerServiceCacheMessageKind,
} from "./cs-cache-message-model";
export {
  logCustomerServiceCacheDiagnostic,
  type CustomerServiceCacheDiagnosticRecord,
} from "./cs-cache-diagnostics";

type CustomerServiceThreadsCache = {
  queueItems: CustomerServiceThread[];
  activeItems: CustomerServiceThread[];
  summary?: Record<string, number>;
};

export async function invalidateCustomerServiceQueries(queryClient: QueryClient) {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: ["pc-cs-thread-detail"] }),
    queryClient.invalidateQueries({ queryKey: ["pc-cs-workbench-threads"] }),
    queryClient.invalidateQueries({ queryKey: ["pc-cs-staff-service-history"] }),
    queryClient.invalidateQueries({ queryKey: ["pc-cs-temp-session-notes"] }),
  ]);
  logCustomerServiceCacheDiagnostic({
    event: "cache.invalidate",
    result: "ok",
    context: {
      keys: [
        "pc-cs-thread-detail",
        "pc-cs-workbench-threads",
        "pc-cs-staff-service-history",
        "pc-cs-temp-session-notes",
      ],
    },
  });
}

export function mergeSentCustomerServiceMessage(
  queryClient: QueryClient,
  params: {
    thread: CustomerServiceThread;
    result: {
      messageId?: string;
      conversationSeq?: number;
      sentAt?: string;
      serverTime?: string;
      message?: MessageItemDto;
    };
    messageType: CustomerServiceCacheMessageKind;
    body: Record<string, unknown>;
    clientMsgId?: string;
    localMessageId?: string;
    identity?: CurrentUserIdentity | null;
    scopeKey?: string;
  },
) {
  const normalizedAckMessage = customerServiceMessageFromSendResult(params);
  auditCustomerServiceMessage({
    source: "send",
    stage: "send.server_ack.normalized",
    traceId: params.clientMsgId,
    clientMsgId: params.clientMsgId,
    messageId: normalizedAckMessage.messageId,
    threadId: params.thread.threadId,
    threadType: params.thread.threadType,
    conversationId: normalizedAckMessage.conversationId || params.thread.conversationId,
    conversationSeq: normalizedAckMessage.conversationSeq,
    message: normalizedAckMessage,
    body: params.body,
    messageType: params.messageType,
    context: {
      ackHasCanonicalMessage: Boolean(params.result.message),
      ackMessageId: params.result.messageId,
      ackPreviewKind: customerServiceMessagePreviewKind(params.result.message?.preview),
    },
  });
  const mergedMessage =
    reduceCustomerServiceMessageEventToDetail(
      queryClient,
      params.thread,
      {
        type: "cs.message.send_ack_received",
        ack: {
          clientMsgId: params.clientMsgId,
          localMessageId: params.localMessageId,
          serverFields: {
            conversationId:
              params.result.message?.conversationId ||
              params.thread.conversationId ||
              params.thread.threadId,
            conversationSeq:
              params.result.conversationSeq ?? params.result.message?.conversationSeq,
            messageId: params.result.messageId || params.result.message?.messageId,
            sentAt: params.result.sentAt || params.result.serverTime || params.result.message?.sentAt,
            status: "sent",
          },
          serverMessage: normalizedAckMessage,
        },
      },
      {
        source: "cache",
        stage: "cache.merge.sent",
        traceId: params.clientMsgId,
      },
    ) || normalizedAckMessage;
  const message = mergedMessage;
  const imCacheScopeKey = customerServiceCacheScopeKey(params.scopeKey, params.identity);
  const indexScopeKey =
    imCacheScopeKey || customerServiceIndexScopeKey(params.identity as never);
  rememberCustomerServiceConversationMessageOverlay({
    conversationId: params.thread.conversationId,
    message,
    read: true,
    scopeKey: indexScopeKey,
    source: "send",
    threadId: params.thread.threadId,
    threadType: params.thread.threadType,
  });
  rememberCustomerServiceStaffSentMessage({
    conversationId: params.thread.conversationId,
    message,
    scopeKey: indexScopeKey,
    threadId: params.thread.threadId,
    threadType: params.thread.threadType,
  });
  removeCustomerServiceConversationFromImCache(
    queryClient,
    params.thread.conversationId,
    imCacheScopeKey,
  );
  updateCustomerServiceThreadPreviewInList(queryClient, {
    conversationId: message.conversationId || params.thread.conversationId,
    message,
    read: false,
    incrementUnread: false,
    threadId: params.thread.threadId,
  });
  recordMessageReminderDiagnostic({
    event: "cs.self-message.suppress",
    source: "cs-cache-adapter",
    phase: "send",
    route: "send",
    classification: {
      conversationId: params.thread.conversationId,
      messageId: message.messageId,
      messageType: message.messageType,
      threadId: params.thread.threadId,
      threadType: params.thread.threadType,
    },
    summary: {
      message,
      thread: params.thread,
    },
  });
  logCustomerServiceCacheDiagnostic({
    event: "cache.message.merge",
    result: "ok",
    context: {
      messageId: message.messageId,
      messageType: message.messageType,
      source: "send",
      threadId: params.thread.threadId,
      threadType: params.thread.threadType,
    },
  });
}

function customerServiceCacheScopeKey(
  explicitScopeKey: string | undefined,
  identity?: CurrentUserIdentity | null,
) {
  if (explicitScopeKey) return explicitScopeKey;
  const record = identity as unknown as Record<string, unknown> | undefined;
  if (typeof record?.scopeKey === "string" && record.scopeKey.trim()) {
    return record.scopeKey.trim();
  }
  if (
    typeof record?.apiBaseUrl === "string" &&
    typeof record?.spaceType === "number" &&
    typeof record?.tenantId === "string" &&
    typeof record?.userId === "string" &&
    typeof record?.platformUserId === "string"
  ) {
    return workspaceScopeKeyFromSession(record as never);
  }
  return undefined;
}

export function appendCustomerServiceLocalMessage(
  queryClient: QueryClient,
  thread: CustomerServiceThread,
  message: MessageItemDto,
) {
  auditCustomerServiceMessage({
    source: "send",
    stage: "send.local_echo.written",
    traceId: customerServiceClientMessageId(message),
    clientMsgId: customerServiceClientMessageId(message),
    localMessageId: message.messageId,
    messageId: message.messageId,
    threadId: thread.threadId,
    threadType: thread.threadType,
    conversationId: message.conversationId || thread.conversationId,
    conversationSeq: message.conversationSeq,
    message,
  });
  reduceCustomerServiceMessageEventToDetail(queryClient, thread, {
    type: "cs.message.local_created",
    message,
  });
  logCustomerServiceCacheDiagnostic({
    event: "cache.local_message.append",
    result: "ok",
    context: {
      localTaskId: (message as unknown as Record<string, unknown>).localTaskId,
      messageId: message.messageId,
      messageType: message.messageType,
      threadId: thread.threadId, threadType: thread.threadType,
    },
  });
}

export function patchCustomerServiceLocalMessage(
  queryClient: QueryClient,
  thread: CustomerServiceThread,
  localMessageId: string,
  patch: {
    body?: Record<string, unknown>;
    status?: string; uploadPhase?: string;
    uploadProgress?: number;
    localError?: string;
    localFailedAt?: number;
  },
) {
  updateCustomerServiceDetailMessages(queryClient, thread.threadId, (messages) =>
    messages.map((message) =>
      message.messageId === localMessageId
        ? ({
            ...message,
            ...(patch.body ? { body: patch.body } : {}),
            ...(patch.status ? { status: patch.status } : {}),
            ...(patch.uploadPhase ? { uploadPhase: patch.uploadPhase } : {}),
            ...(typeof patch.uploadProgress === "number" ? { uploadProgress: patch.uploadProgress } : {}),
            ...(patch.localError === undefined
              ? { localError: undefined }
              : { localError: patch.localError }),
            ...(typeof patch.localFailedAt === "number" ? { localFailedAt: patch.localFailedAt } : {}),
          } as MessageItemDto)
        : message,
    ),
  );
  logCustomerServiceCacheDiagnostic({
    event: "cache.local_message.patch",
    result: "ok",
    context: {
      localMessageId,
      status: patch.status,
      threadId: thread.threadId,
      threadType: thread.threadType,
      uploadPhase: patch.uploadPhase, uploadProgress: patch.uploadProgress,
    },
  });
}

export function removeCustomerServiceLocalMessage(
  queryClient: QueryClient,
  thread: CustomerServiceThread,
  localMessageId: string,
) {
  updateCustomerServiceDetailMessages(queryClient, thread.threadId, (messages) =>
    messages.filter((message) => message.messageId !== localMessageId),
  );
  logCustomerServiceCacheDiagnostic({
    event: "cache.local_message.remove",
    result: "ok",
    context: {
      localMessageId,
      threadId: thread.threadId,
      threadType: thread.threadType,
    },
  });
}

export function removeCustomerServiceMessage(
  queryClient: QueryClient,
  thread: CustomerServiceThread,
  messageId: string,
) {
  rememberSilentCustomerServiceRecall(thread, messageId);
  removeCustomerServiceMessageByThreadId(queryClient, thread.threadId, messageId);
  logCustomerServiceCacheDiagnostic({
    event: "cache.message.remove",
    result: "ok",
    context: {
      messageId,
      threadId: thread.threadId,
      threadType: thread.threadType,
    },
  });
}

export function removeCustomerServiceMessageByThreadId(
  queryClient: QueryClient,
  threadId: string,
  messageId: string,
) {
  rememberSilentCustomerServiceRecall(threadId, messageId);
  updateCustomerServiceDetailMessages(queryClient, threadId, (messages) =>
    messages.filter((message) => message.messageId !== messageId),
  );
}

export function mergeLoadedCustomerServiceThreadDetail(
  queryClient: QueryClient,
  thread: CustomerServiceThread,
  detail: {
    title?: string;
    avatarUrl?: string | null;
    source?: string;
    from?: string;
    channel?: string;
    sourceChannel?: string;
    entryChannel?: string;
    platform?: string;
    provider?: string;
    lastMessagePreview?: string;
    lastMessageAt?: string | null;
    messages?: MessageItemDto[];
  },
) {
  const visibleMessages = (detail.messages ?? []).filter((message) =>
    isVisibleCustomerServiceMessage(message, thread),
  );
  auditCustomerServiceMessage({
    source: "detail",
    stage: "detail.received",
    threadId: thread.threadId,
    threadType: thread.threadType,
    conversationId: thread.conversationId,
    context: {
      genericPreviewCount: visibleMessages.filter(
        (message) => previewFromCustomerServiceMessage(message) === "[Message]",
      ).length,
      messageCount: visibleMessages.length,
    },
    result: visibleMessages.length ? "ok" : "ignored",
  });
  visibleMessages.forEach((message) => {
    auditCustomerServiceMessage({
      source: "detail",
      stage: "detail.message.normalized",
      traceId: customerServiceClientMessageId(message) || message.messageId,
      clientMsgId: customerServiceClientMessageId(message),
      messageId: message.messageId,
      threadId: thread.threadId,
      threadType: thread.threadType,
      conversationId: message.conversationId || thread.conversationId,
      conversationSeq: message.conversationSeq,
      message,
    });
  });
  const latest = latestCustomerServiceMessage(visibleMessages);
  auditCustomerServiceMessage({
    source: "detail",
    stage: "detail.merge",
    traceId: latest ? customerServiceClientMessageId(latest) || latest.messageId : undefined,
    clientMsgId: latest ? customerServiceClientMessageId(latest) : undefined,
    messageId: latest?.messageId,
    threadId: thread.threadId,
    threadType: thread.threadType,
    conversationId: latest?.conversationId || thread.conversationId,
    conversationSeq: latest?.conversationSeq,
    message: latest,
    result: latest ? "ok" : "ignored",
    context: {
      messageCount: visibleMessages.length,
    },
  });
  const lastMessagePreview =
    detail.lastMessagePreview ||
    previewFromCustomerServiceMessage(latest) ||
    thread.lastMessagePreview;
  const lastMessageAt = detail.lastMessageAt || latest?.sentAt || thread.lastMessageAt;
  const indexedThread =
    getCustomerServiceThreadIndex(thread.threadId) ||
    getCustomerServiceConversationIndex(thread.conversationId ?? "");
  rememberCustomerServiceConversationIndex({
    conversationId: thread.conversationId || thread.threadId,
    lastMessageAt,
    lastMessageId: latest?.messageId || readNonEmptyString((thread as unknown as Record<string, unknown>).lastMessageId),
    lastMessagePreview,
    overlayUnreadCount: Math.max(0, Number(indexedThread?.overlayUnreadCount ?? thread.unreadCount ?? 0)),
    source: indexedThread?.source,
    threadId: thread.threadId,
    threadType: thread.threadType,
  });

  queryClient.setQueriesData<CustomerServiceThreadsCache>(
    { queryKey: ["pc-cs-workbench-threads"] },
    (old) =>
      old
        ? {
            ...old,
            queueItems: old.queueItems.map((item) =>
              mergeThreadDetailIntoListItem(
                item,
                thread.threadId,
                detail,
                lastMessagePreview,
                lastMessageAt,
              ),
            ),
            activeItems: old.activeItems.map((item) =>
              mergeThreadDetailIntoListItem(
                item,
                thread.threadId,
                detail,
                lastMessagePreview,
                lastMessageAt,
              ),
            ),
          }
        : old,
  );
  logCustomerServiceCacheDiagnostic({
    event: "cache.thread.merge_detail",
    result: "ok",
    context: {
      lastMessageAt,
      lastMessagePreview,
      threadId: thread.threadId,
      threadType: thread.threadType,
    },
  });
}

function isVisibleCustomerServiceMessage(
  message: MessageItemDto,
  thread?: Pick<CustomerServiceThread, "conversationId" | "threadId">,
) {
  const status = String((message as { status?: unknown }).status ?? "")
    .trim()
    .toLowerCase();
  return (
    !message.isRecalled &&
    status !== "recalled" &&
    !isSilentCustomerServiceRecalledMessage(thread, message)
  );
}

export function markCustomerServiceThreadReadInCache(
  queryClient: QueryClient,
  threadId: string,
  conversationId?: string | null,
) {
  clearCustomerServiceConversationUnread(threadId);
  if (conversationId && conversationId !== threadId) {
    clearCustomerServiceConversationUnread(conversationId);
  }
  queryClient.setQueriesData<CustomerServiceThreadsCache>(
    { queryKey: ["pc-cs-workbench-threads"] },
    (old) => {
      if (!old) return old;
      let changed = false;
      const markRead = (item: CustomerServiceThread) => {
        if (
          !isCustomerServiceThreadMatch(item, threadId) &&
          (!conversationId || !isCustomerServiceThreadMatch(item, conversationId))
        ) {
          return item;
        }
        if (!item.unreadCount) return item;
        changed = true;
        return { ...item, unreadCount: 0 };
      };
      const queueItems = old.queueItems.map(markRead);
      const activeItems = old.activeItems.map(markRead);
      return changed ? { ...old, queueItems, activeItems } : old;
    },
  );
  queryClient.setQueriesData<{ items?: StaffServiceHistoryItem[] }>(
    { queryKey: ["pc-cs-staff-service-history"] },
    (old) => {
      if (!old?.items) return old;
      let changed = false;
      const items = old.items.map((item) => {
        if (
          item.threadId !== threadId &&
          (!conversationId || item.conversationId !== conversationId)
        ) {
          return item;
        }
        if (!item.unreadCount) return item;
        changed = true;
        return { ...item, unreadCount: 0 };
      });
      return changed ? { ...old, items } : old;
    },
  );
  logCustomerServiceCacheDiagnostic({
    event: "cache.thread.read",
    result: "ok",
    context: { conversationId, threadId },
  });
}

export function reconcileCustomerServiceThreadDetailMessages(
  existingMessages: MessageItemDto[] | undefined,
  incomingMessages: MessageItemDto[] | undefined,
) {
  return reduceCustomerServiceMessageEvent(
    { messages: existingMessages ?? [] },
    {
      type: "cs.message.detail_synced",
      messages: incomingMessages ?? [],
    },
  ).messages;
}

export function markCustomerServiceThreadClaimed(
  queryClient: QueryClient,
  thread: CustomerServiceThread,
  result: { status?: string },
) {
  const status = result.status || "serving";
  queryClient.setQueriesData<CustomerServiceThreadsCache>(
    { queryKey: ["pc-cs-workbench-threads"] },
    (old) => {
      if (!old) return old;
      let claimedThread: CustomerServiceThread | null = null;
      const updateThread = (item: CustomerServiceThread) => {
        if (!isCustomerServiceThreadMatch(item, thread.threadId)) return item;
        claimedThread = {
          ...item,
          status,
          updatedAt: new Date().toISOString(),
        };
        return claimedThread;
      };
      const queueItems = old.queueItems.filter((item) => {
        const updated = updateThread(item);
        return updated === item;
      });
      const activeItems = old.activeItems.some((item) =>
        isCustomerServiceThreadMatch(item, thread.threadId),
      )
        ? old.activeItems.map(updateThread)
        : claimedThread
          ? [claimedThread, ...old.activeItems]
          : old.activeItems;
      return claimedThread ? { ...old, queueItems, activeItems } : old;
    },
  );
  queryClient.setQueriesData<{ status?: string; messages?: MessageItemDto[] }>(
    {
      predicate: (query) =>
        query.queryKey[0] === "pc-cs-thread-detail" &&
        query.queryKey.includes(thread.threadId),
    },
    (old) => (old ? { ...old, status } : old),
  );
  logCustomerServiceCacheDiagnostic({
    event: "cache.thread.claimed",
    result: "ok",
    context: {
      status,
      threadId: thread.threadId,
      threadType: thread.threadType,
    },
  });
}

export function markCustomerServiceThreadClosed(
  queryClient: QueryClient,
  thread: CustomerServiceThread,
  result: { status?: string; closed?: boolean },
) {
  const status = result.status || (result.closed ? "closed_by_staff" : "closed_by_staff");
  const indexedThread =
    getCustomerServiceThreadIndex(thread.threadId) ||
    getCustomerServiceConversationIndex(thread.conversationId ?? "");
  let closedUnreadCount = Math.max(
    0,
    Number(thread.unreadCount ?? 0),
    Number(indexedThread?.overlayUnreadCount ?? 0),
  );
  queryClient.setQueriesData<CustomerServiceThreadsCache>(
    { queryKey: ["pc-cs-workbench-threads"] },
    (old) => {
      if (!old) return old;
      let changed = false;
      const closeListItem = (item: CustomerServiceThread) => {
        if (!isCustomerServiceThreadMatch(item, thread.threadId)) return item;
        changed = true;
        const unreadCount = Math.max(
          closedUnreadCount,
          Math.max(0, Number(item.unreadCount ?? 0)),
        );
        closedUnreadCount = Math.max(closedUnreadCount, unreadCount);
        return {
          ...item,
          status,
          unreadCount,
        };
      };
      const queueItems = old.queueItems.map(closeListItem);
      const activeItems = old.activeItems.map(closeListItem);
      return changed ? { ...old, queueItems, activeItems } : old;
    },
  );
  queryClient.setQueriesData<{ status?: string; messages?: MessageItemDto[] }>(
    {
      predicate: (query) =>
        query.queryKey[0] === "pc-cs-thread-detail" &&
        query.queryKey.includes(thread.threadId),
    },
    (old) => (old ? { ...old, status } : old),
  );
  rememberCustomerServiceConversationIndex({
    conversationId: thread.conversationId || thread.threadId,
    lastMessageAt: thread.lastMessageAt ?? thread.updatedAt,
    lastMessageId: readNonEmptyString(
      (thread as unknown as Record<string, unknown>).lastMessageId,
    ),
    lastMessagePreview: thread.lastMessagePreview,
    overlayUnreadCount: closedUnreadCount,
    threadId: thread.threadId,
    threadType: thread.threadType,
  });
  logCustomerServiceCacheDiagnostic({
    event: "cache.thread.closed",
    result: "ok",
    context: {
      status,
      threadId: thread.threadId,
      threadType: thread.threadType,
    },
  });
}

export function markCustomerServiceThreadReopened(
  queryClient: QueryClient,
  input: {
    conversationId?: string | null;
    reopenedAt?: string | null;
    status?: string | null;
    thread?: Partial<CustomerServiceThread> | null;
    threadId: string;
    threadType?: CustomerServiceThread["threadType"];
    unreadCount?: number | null;
  },
) {
  const status = reopenedWorkbenchStatus(input.status);
  const updatedAt = input.reopenedAt || new Date().toISOString();
  let reopenedThread: CustomerServiceThread | null = null;
  queryClient.setQueriesData<CustomerServiceThreadsCache>(
    { queryKey: ["pc-cs-workbench-threads"] },
    (old) => {
      if (!old) return old;
      const queueItems: CustomerServiceThread[] = [];
      const activeItems: CustomerServiceThread[] = [];
      const updateExistingThread = (item: CustomerServiceThread) => {
        if (!isCustomerServiceThreadMatch(item, input.threadId)) return item;
        const nextUnread =
          input.unreadCount === undefined || input.unreadCount === null
            ? Math.max(0, Number(item.unreadCount ?? 0))
            : Math.max(0, Number(input.unreadCount));
        reopenedThread = {
          ...item,
          ...input.thread,
          accessMode: "workbench",
          conversationId: input.conversationId || input.thread?.conversationId || item.conversationId,
          status,
          threadId: input.threadId || item.threadId,
          threadType: input.threadType || input.thread?.threadType || item.threadType,
          unreadCount: nextUnread,
          updatedAt,
        };
        return reopenedThread;
      };
      [...old.queueItems, ...old.activeItems].forEach((item) => {
        const updated = updateExistingThread(item);
        if (isCustomerServiceThreadMatch(updated, input.threadId)) return;
        (isQueueLikeCustomerServiceStatus(updated.status) ? queueItems : activeItems).push(updated);
      });
      if (!reopenedThread) {
        reopenedThread = {
          conversationId: input.conversationId || input.thread?.conversationId || input.threadId,
          status,
          threadId: input.threadId,
          threadType: input.threadType || input.thread?.threadType || "temp_session",
          title: input.thread?.title || "",
          unreadCount: Math.max(0, Number(input.unreadCount ?? 0)),
          updatedAt,
          ...input.thread,
          accessMode: "workbench",
        } as CustomerServiceThread;
      }
      if (isQueueLikeCustomerServiceStatus(status)) {
        queueItems.unshift(reopenedThread);
      } else {
        activeItems.unshift(reopenedThread);
      }
      return { ...old, queueItems, activeItems };
    },
  );
  queryClient.setQueriesData<{ accessMode?: string; status?: string; messages?: MessageItemDto[] }>(
    {
      predicate: (query) =>
        query.queryKey[0] === "pc-cs-thread-detail" &&
        query.queryKey.includes(input.threadId),
    },
    (old) =>
      old
        ? {
            ...old,
            accessMode: "workbench",
            status,
          }
        : old,
  );
  removeCustomerServiceThreadFromHistoryCache(queryClient, input.threadId, input.conversationId);
  const reopenedIndexThread = reopenedThread as CustomerServiceThread | null;
  rememberCustomerServiceConversationIndex({
    conversationId: input.conversationId || reopenedIndexThread?.conversationId || input.threadId,
    lastMessageAt: reopenedIndexThread?.lastMessageAt ?? reopenedIndexThread?.updatedAt ?? updatedAt,
    lastMessageId: readNonEmptyString(
      (reopenedIndexThread as unknown as Record<string, unknown> | null)?.lastMessageId,
    ),
    lastMessagePreview: reopenedIndexThread?.lastMessagePreview,
    overlayUnreadCount: Math.max(0, Number(reopenedIndexThread?.unreadCount ?? input.unreadCount ?? 0)),
    threadId: input.threadId,
    threadType: reopenedIndexThread?.threadType || input.threadType || "temp_session",
  });
  logCustomerServiceCacheDiagnostic({
    event: "cache.thread.reopened",
    result: "ok",
    context: {
      conversationId: input.conversationId,
      status,
      threadId: input.threadId,
      threadType: reopenedIndexThread?.threadType || input.threadType,
    },
  });
}

export function markCustomerServiceThreadTransferred(
  queryClient: QueryClient,
  thread: CustomerServiceThread,
  result: { status?: string; transferred?: boolean; transferredAt?: string },
) {
  const status = transferredAwayStatus(result.status);
  const transferredAt = result.transferredAt || new Date().toISOString();
  queryClient.setQueriesData<CustomerServiceThreadsCache>(
    { queryKey: ["pc-cs-workbench-threads"] },
    (old) => {
      if (!old) return old;
      let changed = false;
      const transferListItem = (item: CustomerServiceThread) => {
        if (!isCustomerServiceThreadMatch(item, thread.threadId)) return item;
        changed = true;
        return {
          ...item,
          accessMode: "management_readonly" as const,
          status,
          unreadCount: 0,
          updatedAt: transferredAt,
        };
      };
      const queueItems = old.queueItems.map(transferListItem);
      const activeItems = old.activeItems.map(transferListItem);
      return changed ? { ...old, queueItems, activeItems } : old;
    },
  );
  queryClient.setQueriesData<{ status?: string; messages?: MessageItemDto[] }>(
    {
      predicate: (query) =>
        query.queryKey[0] === "pc-cs-thread-detail" &&
        query.queryKey.includes(thread.threadId),
    },
    (old) => (old ? { ...old, status } : old),
  );
  clearCustomerServiceConversationUnread(thread.threadId);
  if (thread.conversationId && thread.conversationId !== thread.threadId) {
    clearCustomerServiceConversationUnread(thread.conversationId);
  }
  rememberCustomerServiceConversationIndex({
    conversationId: thread.conversationId || thread.threadId,
    lastMessageAt: transferredAt,
    lastMessageId: readNonEmptyString(
      (thread as unknown as Record<string, unknown>).lastMessageId,
    ),
    lastMessagePreview: thread.lastMessagePreview,
    overlayUnreadCount: 0,
    threadId: thread.threadId,
    threadType: thread.threadType,
  });
  logCustomerServiceCacheDiagnostic({
    event: "cache.thread.transferred",
    result: "ok",
    context: {
      status,
      threadId: thread.threadId,
      threadType: thread.threadType,
      transferredAt,
    },
  });
}

function transferredAwayStatus(status?: string) {
  const normalized = String(status ?? "").trim().toLowerCase().replace(/-/g, "_");
  if (
    normalized === "transferred" ||
    normalized === "transferred_out" ||
    normalized === "assigned_away" ||
    normalized === "handoff"
  ) {
    return normalized;
  }
  return "transferred";
}

function reopenedWorkbenchStatus(status?: string | null) {
  const normalized = String(status ?? "").trim().toLowerCase().replace(/-/g, "_");
  if (isQueueLikeCustomerServiceStatus(normalized)) return normalized;
  if (
    normalized === "active" ||
    normalized === "serving" ||
    normalized === "assigned" ||
    normalized === "claimed" ||
    normalized === "manual" ||
    normalized.includes("reopen") ||
    normalized.includes("resume")
  ) {
    return normalized || "serving";
  }
  return "serving";
}

function isQueueLikeCustomerServiceStatus(status?: string | null) {
  const normalized = String(status ?? "").trim().toLowerCase().replace(/-/g, "_");
  return (
    normalized === "queued" ||
    normalized === "queue" ||
    normalized === "pending" ||
    normalized.includes("queue") ||
    normalized.includes("waiting")
  );
}

function removeCustomerServiceThreadFromHistoryCache(
  queryClient: QueryClient,
  threadId: string,
  conversationId?: string | null,
) {
  const removeHistoryItems = <T extends { items?: StaffServiceHistoryItem[] }>(old: T | undefined) => {
    if (!old?.items) return old;
    const items = old.items.filter((item) => !isHistoryThreadMatch(item, threadId, conversationId));
    return items.length === old.items.length ? old : { ...old, items };
  };
  queryClient.setQueriesData<{ items?: StaffServiceHistoryItem[] }>(
    { queryKey: ["pc-cs-staff-service-history"] },
    removeHistoryItems,
  );
  queryClient.setQueriesData<{ pages?: Array<{ items?: StaffServiceHistoryItem[] }> }>(
    { queryKey: ["pc-cs-staff-service-history"] },
    (old) => {
      if (!old?.pages) return old;
      let changed = false;
      const pages = old.pages.map((page) => {
        if (!page.items) return page;
        const items = page.items.filter((item) => !isHistoryThreadMatch(item, threadId, conversationId));
        if (items.length === page.items.length) return page;
        changed = true;
        return { ...page, items };
      });
      return changed ? { ...old, pages } : old;
    },
  );
}

function isHistoryThreadMatch(
  item: StaffServiceHistoryItem,
  threadId: string,
  conversationId?: string | null,
) {
  return (
    item.threadId === threadId ||
    item.conversationId === threadId ||
    Boolean(conversationId && (item.threadId === conversationId || item.conversationId === conversationId))
  );
}

function readNonEmptyString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

export function applyCustomerServiceGatewayMessageCache(
  queryClient: QueryClient,
  params: {
    conversationId?: string;
    scopeKey?: string;
    message: MessageItemDto;
    read: boolean;
    selfMessage?: boolean;
    threadId: string;
    threadType: CustomerServiceThread["threadType"];
  },
) {
  const thread = {
    conversationId: params.conversationId || params.message.conversationId || params.threadId,
    status: "",
    threadId: params.threadId,
    threadType: params.threadType,
    title: "",
  };
  if (isSilentCustomerServiceRecalledMessage(thread, params.message)) return;
  auditCustomerServiceMessage({
    source: "gateway",
    stage: "gateway.normalized",
    traceId: customerServiceClientMessageId(params.message) || params.message.messageId,
    clientMsgId: customerServiceClientMessageId(params.message),
    messageId: params.message.messageId,
    threadId: params.threadId,
    threadType: params.threadType,
    conversationId: params.conversationId || params.message.conversationId,
    conversationSeq: params.message.conversationSeq,
    message: params.message,
    context: {
      read: params.read,
      selfMessage: params.selfMessage === true,
    },
  });

  const mergedMessage =
    reduceCustomerServiceMessageEventToDetail(
      queryClient,
      thread,
      {
        type: "cs.message.gateway_received",
        message: params.message,
      },
      {
        source: "cache",
        stage: "cache.merge.gateway",
        traceId: customerServiceClientMessageId(params.message) || params.message.messageId,
      },
    ) || params.message;

  const overlayDecision = rememberCustomerServiceConversationMessageOverlay({
    conversationId: params.conversationId || params.message.conversationId,
    message: mergedMessage,
    read: params.selfMessage ? false : params.read,
    scopeKey: params.scopeKey,
    source: params.selfMessage ? "send" : "gateway",
    threadId: params.threadId,
    threadType: params.threadType,
  });
  removeCustomerServiceConversationFromImCache(
    queryClient,
    params.conversationId || params.message.conversationId || params.threadId,
    params.scopeKey,
  );
  updateCustomerServiceThreadPreviewInList(queryClient, {
    conversationId: params.conversationId || params.message.conversationId,
    incrementUnread: !params.selfMessage && !overlayDecision.sameMessage,
    message: mergedMessage,
    read: params.selfMessage ? false : params.read,
    threadId: params.threadId,
  });
  recordMessageReminderDiagnostic({
    event: "cs.gateway.received",
    source: "cs-cache-adapter",
    phase: "cache",
    route: "onlineService",
    classification: {
      conversationId: params.conversationId || params.message.conversationId,
      incrementUnread: !params.selfMessage && !overlayDecision.sameMessage,
      messageId: params.message.messageId,
      nextOverlayUnread: overlayDecision.nextUnread,
      previousOverlayUnread: overlayDecision.previousUnread,
      read: params.read,
      sameMessage: overlayDecision.sameMessage,
      selfMessage: params.selfMessage === true,
      scopeKey: params.scopeKey,
      threadId: params.threadId,
      threadType: params.threadType,
    },
    summary: {
      message: mergedMessage,
    },
  });
  logCustomerServiceCacheDiagnostic({
    event: "cache.message.merge",
    result: "ok",
    context: {
      messageId: mergedMessage.messageId,
      messageType: mergedMessage.messageType,
      read: params.read,
      source: "gateway",
      threadId: params.threadId,
      threadType: params.threadType,
    },
  });
}

function removeCustomerServiceConversationFromImCache(
  queryClient: QueryClient,
  conversationId?: string,
  scopeKey?: string,
) {
  if (!conversationId) return;
  queryClient.setQueriesData<{ items: Array<{ conversationId?: string }> }>(
    {
      predicate: (query) =>
        query.queryKey[0] === "pc-im-conversations" &&
        isQueryInWorkspaceScope(query, scopeKey),
    },
    (old) =>
      old
        ? {
            ...old,
            items: old.items.filter((item) => item.conversationId !== conversationId),
          }
        : old,
  );
}

function reduceCustomerServiceMessageEventToDetail(
  queryClient: QueryClient,
  thread: Pick<CustomerServiceThread, "threadId" | "threadType">,
  event: CustomerServiceMessageEvent,
  audit?: {
    source: CustomerServiceMessageAuditSource;
    stage: CustomerServiceMessageAuditStage;
    traceId?: string;
  },
) {
  let mergeAudit: MessageMergeAudit | undefined;
  let changedMessage: MessageItemDto | undefined;
  queryClient.setQueriesData<{ messages?: MessageItemDto[] }>(
    {
      predicate: (query) =>
        query.queryKey[0] === "pc-cs-thread-detail" &&
        query.queryKey.includes(thread.threadId),
    },
    (old) => {
      if (!old) return old;
      const beforeMessages = old.messages ?? [];
      const reduced = reduceCustomerServiceMessageEvent(
        { messages: beforeMessages },
        event,
      );
      changedMessage = reduced.changedMessage;
      if (changedMessage) {
        mergeAudit = messageMergeAudit(
          reduced.messages,
          changedMessage,
          beforeMessages.length,
          reduced.decision === "ignored" ? "ignored" : reduced.decision,
          reduced.matchedBy,
        );
      }
      return {
        ...old,
        threadType: thread.threadType,
        threadId: thread.threadId,
        messages: reduced.messages,
      };
    },
  );
  if (audit && mergeAudit && changedMessage) {
    auditCustomerServiceMessage({
      source: audit.source,
      stage: audit.stage,
      traceId:
        audit.traceId ||
        customerServiceClientMessageId(changedMessage) ||
        changedMessage.messageId,
      clientMsgId: customerServiceClientMessageId(changedMessage),
      messageId: changedMessage.messageId,
      threadId: thread.threadId,
      threadType: thread.threadType,
      conversationId: changedMessage.conversationId,
      conversationSeq: changedMessage.conversationSeq,
      message: changedMessage,
      ...mergeAudit,
    });
  }
  return changedMessage;
}

function updateCustomerServiceDetailMessages(
  queryClient: QueryClient,
  threadId: string,
  update: (messages: MessageItemDto[]) => MessageItemDto[],
) {
  queryClient.setQueriesData<{ messages?: MessageItemDto[] }>(
    {
      predicate: (query) =>
        query.queryKey[0] === "pc-cs-thread-detail" && query.queryKey.includes(threadId),
    },
    (old) => (old ? { ...old, messages: update(old.messages ?? []) } : old),
  );
}

function updateCustomerServiceThreadPreviewInList(
  queryClient: QueryClient,
  params: {
    conversationId?: string;
    incrementUnread?: boolean;
    message: MessageItemDto;
    read: boolean;
    threadId: string;
  },
) {
  queryClient.setQueriesData<CustomerServiceThreadsCache>(
    { queryKey: ["pc-cs-workbench-threads"] },
    (old) =>
      old
        ? {
            ...old,
            queueItems: old.queueItems.map((thread) =>
              updateThreadPreview(
                thread,
                params.threadId,
                params.conversationId,
                params.message,
                params.read,
                params.incrementUnread ?? true,
              ),
            ),
            activeItems: old.activeItems.map((thread) =>
              updateThreadPreview(
                thread,
                params.threadId,
                params.conversationId,
                params.message,
                params.read,
                params.incrementUnread ?? true,
              ),
            ),
          }
        : old,
  );
}

type MessageMergeAudit = {
  afterCount: number;
  beforeCount: number;
  duplicateClientMsgIdCount: number;
  duplicateMessageIdCount: number;
  matchedBy: CustomerServiceMessageMatchedBy;
  mergeDecision: CustomerServiceMessageMergeDecision;
};

function messageMergeAudit(
  items: MessageItemDto[],
  message: MessageItemDto,
  beforeCount: number,
  mergeDecision: CustomerServiceMessageMergeDecision,
  matchedBy: CustomerServiceMessageMatchedBy,
): MessageMergeAudit {
  const clientMsgId = customerServiceClientMessageId(message);
  return {
    afterCount: items.length,
    beforeCount,
    duplicateClientMsgIdCount: clientMsgId
      ? items.filter((item) => customerServiceClientMessageId(item) === clientMsgId).length
      : 0,
    duplicateMessageIdCount: message.messageId
      ? items.filter((item) => item.messageId === message.messageId).length
      : 0,
    matchedBy,
    mergeDecision,
  };
}

function customerServiceClientMessageId(message: MessageItemDto) {
  return readNonEmptyString(message.clientMsgId) || readNonEmptyString(message.clientMessageId);
}

function updateThreadPreview(
  thread: CustomerServiceThread,
  threadId: string,
  conversationId: string | undefined,
  message: MessageItemDto,
  read: boolean,
  incrementUnread: boolean,
) {
  if (!isCustomerServiceThreadMatchAny(thread, threadId, conversationId)) return thread;
  return {
    ...thread,
    lastMessagePreview: message.preview || thread.lastMessagePreview,
    lastMessageAt: message.sentAt || thread.lastMessageAt,
    unreadCount: read
      ? 0
      : incrementUnread
        ? Math.max(0, Number(thread.unreadCount ?? 0) + 1)
        : Math.max(0, Number(thread.unreadCount ?? 0)),
  };
}

function isCustomerServiceThreadMatchAny(
  thread: CustomerServiceThread,
  ...ids: Array<string | undefined>
) {
  return ids.some((id) => id && isCustomerServiceThreadMatch(thread, id));
}

function mergeThreadDetailIntoListItem(
  item: CustomerServiceThread,
  threadId: string,
  detail: {
    status?: string;
    title?: string;
    avatarUrl?: string | null;
    source?: string;
    from?: string;
    channel?: string;
    sourceChannel?: string;
    entryChannel?: string;
    platform?: string;
    provider?: string;
  },
  lastMessagePreview?: string,
  lastMessageAt?: string | null,
) {
  if (!isCustomerServiceThreadMatch(item, threadId)) return item;
  return {
    ...item,
    title: detail.title || item.title,
    avatarUrl: detail.avatarUrl || item.avatarUrl,
    customerAvatarUrl: detail.avatarUrl || item.customerAvatarUrl,
    source: detail.source || item.source,
    from: detail.from || item.from,
    channel: detail.channel || item.channel,
    sourceChannel: detail.sourceChannel || item.sourceChannel,
    entryChannel: detail.entryChannel || item.entryChannel,
    platform: detail.platform || item.platform,
    provider: detail.provider || item.provider,
    lastMessagePreview: lastMessagePreview || item.lastMessagePreview,
    lastMessageAt: lastMessageAt || item.lastMessageAt,
  };
}

function isCustomerServiceThreadMatch(thread: CustomerServiceThread, threadId: string) {
  return thread.threadId === threadId || thread.conversationId === threadId;
}
