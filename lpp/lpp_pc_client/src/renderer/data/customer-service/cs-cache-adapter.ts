import type { QueryClient } from "@tanstack/react-query";

import type {
  CustomerServiceThread,
  MessageItemDto,
} from "../api/types";
import type { CurrentUserIdentity } from "../message-display";
import {
  customerServiceMessageFromSendResult,
  latestCustomerServiceMessage,
  previewFromCustomerServiceMessage,
  type CustomerServiceCacheMessageKind,
} from "./cs-cache-message-model";
import { logCustomerServiceCacheDiagnostic } from "./cs-cache-diagnostics";

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
  ]);
  logCustomerServiceCacheDiagnostic({
    event: "cache.invalidate",
    result: "ok",
    context: {
      keys: [
        "pc-cs-thread-detail",
        "pc-cs-workbench-threads",
        "pc-cs-staff-service-history",
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
    identity?: CurrentUserIdentity | null;
  },
) {
  const message = customerServiceMessageFromSendResult(params);
  appendCustomerServiceMessageToDetail(queryClient, params.thread, message);
  updateCustomerServiceThreadPreviewInList(queryClient, {
    message,
    read: true,
    threadId: params.thread.threadId,
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

export function appendCustomerServiceLocalMessage(
  queryClient: QueryClient,
  thread: CustomerServiceThread,
  message: MessageItemDto,
) {
  appendCustomerServiceMessageToDetail(queryClient, thread, message);
  logCustomerServiceCacheDiagnostic({
    event: "cache.local_message.append",
    result: "ok",
    context: {
      localTaskId: (message as unknown as Record<string, unknown>).localTaskId,
      messageId: message.messageId,
      messageType: message.messageType,
      threadId: thread.threadId,
      threadType: thread.threadType,
    },
  });
}

export function patchCustomerServiceLocalMessage(
  queryClient: QueryClient,
  thread: CustomerServiceThread,
  localMessageId: string,
  patch: {
    body?: Record<string, unknown>;
    status?: string;
    uploadProgress?: number;
    localError?: string;
  },
) {
  updateCustomerServiceDetailMessages(queryClient, thread.threadId, (messages) =>
    messages.map((message) =>
      message.messageId === localMessageId
        ? ({
            ...message,
            ...(patch.body ? { body: patch.body } : {}),
            ...(patch.status ? { status: patch.status } : {}),
            ...(typeof patch.uploadProgress === "number"
              ? { uploadProgress: patch.uploadProgress }
              : {}),
            ...(patch.localError === undefined
              ? { localError: undefined }
              : { localError: patch.localError }),
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
      uploadProgress: patch.uploadProgress,
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
  const latest = latestCustomerServiceMessage(detail.messages ?? []);
  const lastMessagePreview =
    detail.lastMessagePreview ||
    previewFromCustomerServiceMessage(latest) ||
    thread.lastMessagePreview;
  const lastMessageAt = detail.lastMessageAt || latest?.sentAt || thread.lastMessageAt;

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

export function markCustomerServiceThreadReadInCache(
  queryClient: QueryClient,
  threadId: string,
) {
  queryClient.setQueriesData<CustomerServiceThreadsCache>(
    { queryKey: ["pc-cs-workbench-threads"] },
    (old) => {
      if (!old) return old;
      let changed = false;
      const markRead = (item: CustomerServiceThread) => {
        if (!isCustomerServiceThreadMatch(item, threadId)) return item;
        if (!item.unreadCount) return item;
        changed = true;
        return { ...item, unreadCount: 0 };
      };
      const queueItems = old.queueItems.map(markRead);
      const activeItems = old.activeItems.map(markRead);
      return changed ? { ...old, queueItems, activeItems } : old;
    },
  );
  logCustomerServiceCacheDiagnostic({
    event: "cache.thread.read",
    result: "ok",
    context: { threadId },
  });
}

export function markCustomerServiceThreadClosed(
  queryClient: QueryClient,
  thread: CustomerServiceThread,
  result: { status?: string; closed?: boolean },
) {
  const status = result.status || (result.closed ? "closed_by_staff" : "closed_by_staff");
  queryClient.setQueriesData<{ status?: string; messages?: MessageItemDto[] }>(
    {
      predicate: (query) =>
        query.queryKey[0] === "pc-cs-thread-detail" &&
        query.queryKey.includes(thread.threadId),
    },
    (old) => (old ? { ...old, status } : old),
  );
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

export function applyCustomerServiceGatewayMessageCache(
  queryClient: QueryClient,
  params: {
    message: MessageItemDto;
    read: boolean;
    threadId: string;
    threadType: CustomerServiceThread["threadType"];
  },
) {
  const thread = {
    conversationId: params.threadId,
    status: "",
    threadId: params.threadId,
    threadType: params.threadType,
    title: "",
  };
  appendCustomerServiceMessageToDetail(queryClient, thread, params.message);
  updateCustomerServiceThreadPreviewInList(queryClient, {
    message: params.message,
    read: params.read,
    threadId: params.threadId,
  });
  logCustomerServiceCacheDiagnostic({
    event: "cache.message.merge",
    result: "ok",
    context: {
      messageId: params.message.messageId,
      messageType: params.message.messageType,
      read: params.read,
      source: "gateway",
      threadId: params.threadId,
      threadType: params.threadType,
    },
  });
}

function appendCustomerServiceMessageToDetail(
  queryClient: QueryClient,
  thread: Pick<CustomerServiceThread, "threadId" | "threadType">,
  message: MessageItemDto,
) {
  queryClient.setQueriesData<{ messages?: MessageItemDto[] }>(
    {
      predicate: (query) =>
        query.queryKey[0] === "pc-cs-thread-detail" &&
        query.queryKey.includes(thread.threadId),
    },
    (old) =>
      old
        ? {
            ...old,
            threadType: thread.threadType,
            threadId: thread.threadId,
            messages: appendMessage(old.messages, message),
          }
        : old,
  );
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
              updateThreadPreview(thread, params.threadId, params.message, params.read),
            ),
            activeItems: old.activeItems.map((thread) =>
              updateThreadPreview(thread, params.threadId, params.message, params.read),
            ),
          }
        : old,
  );
}

function appendMessage(old: MessageItemDto[] | undefined, message: MessageItemDto) {
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

function updateThreadPreview(
  thread: CustomerServiceThread,
  threadId: string,
  message: MessageItemDto,
  read: boolean,
) {
  if (!isCustomerServiceThreadMatch(thread, threadId)) return thread;
  return {
    ...thread,
    lastMessagePreview: message.preview || thread.lastMessagePreview,
    lastMessageAt: message.sentAt || thread.lastMessageAt,
    unreadCount: read ? 0 : Math.max(0, Number(thread.unreadCount ?? 0) + 1),
  };
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
