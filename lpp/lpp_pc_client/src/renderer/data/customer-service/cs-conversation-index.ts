import type { CustomerServiceThread, CustomerServiceThreadType, MessageItemDto } from "../api/types";
import { recordMessageReminderDiagnostic } from "../diagnostics/message-reminder-diagnostics";

export interface CustomerServiceConversationIndexEntry {
  compatLastMessageId?: string;
  compatLastMessageSeq?: number;
  compatLastReadSeq?: number;
  compatRawUnreadCount?: number;
  compatReadMessageId?: string;
  compatReadSeq?: number;
  compatUnreadCandidate?: number;
  compatUnreadReason?: string;
  conversationId: string;
  lastMessageAt?: string | null;
  lastMessageId?: string;
  lastMessagePreview?: string;
  localStaffSentMessageIds?: string[];
  localStaffSentSeqs?: number[];
  overlayUnreadCount?: number;
  scopeKey?: string;
  source?: string;
  threadId: string;
  threadType: CustomerServiceThreadType;
  updatedAt: number;
}

const customerServiceConversationIndex = new Map<string, CustomerServiceConversationIndexEntry>();
const customerServiceThreadIndex = new Map<string, CustomerServiceConversationIndexEntry>();
const defaultCustomerServiceIndexScope = "__default__";

export function customerServiceIndexScopeKey(input?: {
  apiBaseUrl?: string | null;
  tenantToken?: string | null;
  tenantId?: string | null;
  userId?: string | null;
}) {
  const parts = [
    input?.apiBaseUrl ?? "",
    input?.tenantToken ?? "",
    input?.tenantId ?? "",
  ];
  return parts.some((part) => part.trim()) ? parts.join("|") : defaultCustomerServiceIndexScope;
}

export function rememberCustomerServiceConversationIndex(
  entry: Omit<CustomerServiceConversationIndexEntry, "updatedAt">,
) {
  if (!entry.conversationId || !entry.threadId) return;
  const scopeKey = entry.scopeKey || defaultCustomerServiceIndexScope;
  const previous =
    getCustomerServiceConversationIndex(entry.conversationId, scopeKey) ||
    getCustomerServiceThreadIndex(entry.threadId, scopeKey);
  const next = {
    ...previous,
    ...entry,
    compatLastMessageId: entry.compatLastMessageId || previous?.compatLastMessageId,
    compatLastMessageSeq:
      typeof entry.compatLastMessageSeq === "number"
        ? entry.compatLastMessageSeq
        : previous?.compatLastMessageSeq,
    compatLastReadSeq:
      typeof entry.compatLastReadSeq === "number"
        ? entry.compatLastReadSeq
        : previous?.compatLastReadSeq,
    compatRawUnreadCount:
      typeof entry.compatRawUnreadCount === "number"
        ? entry.compatRawUnreadCount
        : previous?.compatRawUnreadCount,
    compatReadMessageId: entry.compatReadMessageId || previous?.compatReadMessageId,
    compatReadSeq:
      typeof entry.compatReadSeq === "number" ? entry.compatReadSeq : previous?.compatReadSeq,
    compatUnreadCandidate:
      typeof entry.compatUnreadCandidate === "number"
        ? entry.compatUnreadCandidate
        : previous?.compatUnreadCandidate,
    compatUnreadReason: entry.compatUnreadReason || previous?.compatUnreadReason,
    lastMessageAt: entry.lastMessageAt || previous?.lastMessageAt,
    lastMessageId: entry.lastMessageId || previous?.lastMessageId,
    lastMessagePreview: entry.lastMessagePreview || previous?.lastMessagePreview,
    localStaffSentMessageIds: mergeStringList(
      previous?.localStaffSentMessageIds,
      entry.localStaffSentMessageIds,
    ),
    localStaffSentSeqs: mergeNumberList(previous?.localStaffSentSeqs, entry.localStaffSentSeqs),
    overlayUnreadCount:
      typeof entry.overlayUnreadCount === "number"
        ? entry.overlayUnreadCount
        : previous?.overlayUnreadCount,
    scopeKey,
    updatedAt: Date.now(),
  };
  customerServiceConversationIndex.set(indexKey(next.conversationId, scopeKey), next);
  customerServiceThreadIndex.set(indexKey(next.threadId, scopeKey), next);
}

export function rememberCustomerServiceStaffSentMessage(params: {
  conversationId?: string;
  message: MessageItemDto;
  scopeKey?: string;
  threadId: string;
  threadType: CustomerServiceThreadType;
}) {
  if (!params.threadId) return;
  const scopeKey = params.scopeKey || defaultCustomerServiceIndexScope;
  const previous =
    getCustomerServiceConversationIndex(params.conversationId ?? "", scopeKey) ||
    getCustomerServiceThreadIndex(params.threadId, scopeKey);
  const seq = Math.max(0, Number(params.message.conversationSeq ?? 0));
  rememberCustomerServiceConversationIndex({
    conversationId: params.conversationId || previous?.conversationId || params.threadId,
    lastMessageAt: params.message.sentAt || previous?.lastMessageAt,
    lastMessageId: params.message.messageId || previous?.lastMessageId,
    lastMessagePreview: params.message.preview || previous?.lastMessagePreview,
    localStaffSentMessageIds: params.message.messageId ? [params.message.messageId] : [],
    localStaffSentSeqs: seq > 0 ? [seq] : [],
    scopeKey,
    source: previous?.source,
    threadId: params.threadId,
    threadType: params.threadType,
  });
  recordMessageReminderDiagnostic({
    event: "cs.self-message.suppress",
    source: "cs-conversation-index",
    phase: "staff-sent",
    route: "send",
    classification: {
      conversationId: params.conversationId || previous?.conversationId,
      messageId: params.message.messageId,
      messageSeq: params.message.conversationSeq,
      scopeKey,
      threadId: params.threadId,
      threadType: params.threadType,
    },
    summary: {
      message: params.message,
      previous,
    },
  });
}

export function rememberCustomerServiceConversationMessageOverlay(params: {
  conversationId?: string;
  message: MessageItemDto;
  read: boolean;
  scopeKey?: string;
  source?: "gateway" | "imListCompat" | "workbench" | "readClear" | "send";
  threadId: string;
  threadType: CustomerServiceThreadType;
}) {
  if (!params.threadId) return { nextUnread: 0, previousUnread: 0, sameMessage: false };
  const scopeKey = params.scopeKey || defaultCustomerServiceIndexScope;
  const previous =
    getCustomerServiceConversationIndex(params.conversationId ?? "", scopeKey) ||
    getCustomerServiceThreadIndex(params.threadId, scopeKey);
  const previousUnread = Math.max(0, previous?.overlayUnreadCount ?? 0);
  const sameMessage =
    Boolean(params.message.messageId) && params.message.messageId === previous?.lastMessageId;
  const nextUnread =
    params.source === "send"
      ? previousUnread
      : params.read
        ? 0
        : sameMessage
          ? Math.max(1, previousUnread)
          : Math.max(1, previousUnread + 1);
  rememberCustomerServiceConversationIndex({
    conversationId: params.conversationId || previous?.conversationId || params.threadId,
    lastMessageAt: params.message.sentAt || previous?.lastMessageAt,
    lastMessageId: params.message.messageId || previous?.lastMessageId,
    lastMessagePreview: params.message.preview || previous?.lastMessagePreview,
    overlayUnreadCount: nextUnread,
    scopeKey,
    source: previous?.source,
    threadId: params.threadId,
    threadType: params.threadType,
  });
  recordMessageReminderDiagnostic({
    event: "cs.overlay.write",
    source: "cs-conversation-index",
    phase: "write",
    route: params.source ?? "gateway",
    classification: {
      conversationId: params.conversationId,
      messageId: params.message.messageId,
      nextOverlayUnread: nextUnread,
      previousOverlayUnread: previousUnread,
      read: params.read,
      scopeKey,
      sameMessage,
      selfMessageSuppressed: params.source === "send",
      threadId: params.threadId,
      threadType: params.threadType,
    },
    summary: {
      message: params.message,
      previous,
    },
  });
  return { nextUnread, previousUnread, sameMessage };
}

export function clearCustomerServiceConversationUnread(threadIdOrConversationId: string) {
  const entries = matchingCustomerServiceIndexEntries(threadIdOrConversationId);
  entries.forEach((previous) => {
    rememberCustomerServiceConversationIndex({
      ...previous,
      compatReadMessageId: previous.lastMessageId || previous.compatLastMessageId,
      compatReadSeq: Math.max(0, Number(previous.compatLastMessageSeq ?? 0)),
      compatRawUnreadCount: previous.compatRawUnreadCount,
      compatUnreadCandidate: 0,
      compatUnreadReason: "read-clear",
      overlayUnreadCount: 0,
    });
    recordMessageReminderDiagnostic({
      event: "cs.thread.read.clear",
      source: "cs-conversation-index",
      phase: "clear",
      route: "readClear",
      classification: {
        compatUnreadCandidate: previous.compatUnreadCandidate,
        compatRawUnreadCount: previous.compatRawUnreadCount,
        conversationId: previous.conversationId,
        previousOverlayUnread: previous.overlayUnreadCount,
        scopeKey: previous.scopeKey,
        threadId: previous.threadId,
        threadType: previous.threadType,
      },
    });
  });
}

export function getCustomerServiceConversationIndex(conversationId: string, scopeKey?: string) {
  if (!conversationId) return undefined;
  const normalizedScopeKey = scopeKey || defaultCustomerServiceIndexScope;
  if (!scopeKey) {
    return (
      customerServiceConversationIndex.get(indexKey(conversationId, defaultCustomerServiceIndexScope)) ||
      [...customerServiceConversationIndex.values()].find(
        (entry) => entry.conversationId === conversationId,
      )
    );
  }
  return (
    customerServiceConversationIndex.get(indexKey(conversationId, normalizedScopeKey)) ||
    (normalizedScopeKey === defaultCustomerServiceIndexScope
      ? undefined
      : customerServiceConversationIndex.get(
          indexKey(conversationId, defaultCustomerServiceIndexScope),
        ))
  );
}

export function getCustomerServiceThreadIndex(threadId: string, scopeKey?: string) {
  if (!threadId) return undefined;
  const normalizedScopeKey = scopeKey || defaultCustomerServiceIndexScope;
  if (!scopeKey) {
    return (
      customerServiceThreadIndex.get(indexKey(threadId, defaultCustomerServiceIndexScope)) ||
      [...customerServiceThreadIndex.values()].find((entry) => entry.threadId === threadId)
    );
  }
  return (
    customerServiceThreadIndex.get(indexKey(threadId, normalizedScopeKey)) ||
    (normalizedScopeKey === defaultCustomerServiceIndexScope
      ? undefined
      : customerServiceThreadIndex.get(indexKey(threadId, defaultCustomerServiceIndexScope)))
  );
}

export function applyCustomerServiceThreadOverlay(thread: CustomerServiceThread, scopeKey?: string) {
  const overlay =
    getCustomerServiceThreadIndex(thread.threadId, scopeKey) ||
    getCustomerServiceConversationIndex(thread.conversationId, scopeKey);
  if (!overlay) return thread;
  const lastMessagePreview = thread.lastMessagePreview || overlay.lastMessagePreview;
  const lastMessageAt = thread.lastMessageAt || overlay.lastMessageAt;
  const serverUnread = Math.max(0, Number(thread.unreadCount ?? 0));
  const overlayUnread = Math.max(0, Number(overlay.overlayUnreadCount ?? 0));
  const compatUnreadCandidate = effectiveCompatUnreadCandidate(overlay);
  const overlayMergeReason =
    serverUnread > 0
      ? "server"
      : overlayUnread > 0
        ? "gatewayOverlay"
        : compatUnreadCandidate > 0
          ? "imListCompatCandidate"
          : "none";
  const unreadCount = Math.max(serverUnread, overlayUnread, compatUnreadCandidate);
  recordMessageReminderDiagnostic({
    event: "cs.thread.overlay.merge",
    source: "cs-conversation-index",
    phase: "merge",
    route: "workbench",
    classification: {
      compatLastMessageId: overlay.compatLastMessageId,
      compatLastMessageSeq: overlay.compatLastMessageSeq,
      compatLastReadSeq: overlay.compatLastReadSeq,
      compatRawUnreadCount: overlay.compatRawUnreadCount,
      localStaffSentSeqs: overlay.localStaffSentSeqs,
      compatUnreadCandidate,
      compatUnreadReason: overlay.compatUnreadReason,
      conversationId: thread.conversationId,
      finalThreadUnread: unreadCount,
      overlayMergeReason,
      overlayUnread,
      scopeKey,
      serverUnread,
      threadId: thread.threadId,
      threadType: thread.threadType,
    },
    summary: {
      overlay,
      thread,
    },
  });
  recordMessageReminderDiagnostic({
    event: "cs.thread.unread.resolve",
    source: "cs-conversation-index",
    phase: "resolve",
    route: "workbench",
    classification: {
      compatRawUnreadCount: overlay.compatRawUnreadCount,
      compatTrustedUnreadCandidate: compatUnreadCandidate,
      conversationId: thread.conversationId,
      finalThreadUnread: unreadCount,
      localStaffSentSeqs: overlay.localStaffSentSeqs,
      overlayUnread,
      reason: overlayMergeReason,
      scopeKey,
      serverUnread,
      threadId: thread.threadId,
      threadType: thread.threadType,
    },
    summary: {
      overlay,
      thread,
    },
  });
  if (
    lastMessagePreview === thread.lastMessagePreview &&
    lastMessageAt === thread.lastMessageAt &&
    unreadCount === Math.max(0, Number(thread.unreadCount ?? 0)) &&
    !overlay.lastMessageId &&
    !overlay.compatLastMessageId
  ) {
    return thread;
  }
  return {
    ...thread,
    lastMessageId: overlay.lastMessageId || overlay.compatLastMessageId,
    lastMessageAt,
    lastMessagePreview,
    unreadCount,
  };
}

export function resetCustomerServiceConversationIndexForTest() {
  customerServiceConversationIndex.clear();
  customerServiceThreadIndex.clear();
}

export function rememberCustomerServiceCompatUnreadCandidate(params: {
  conversationId: string;
  lastMessageAt?: string | null;
  lastMessageId?: string;
  lastMessagePreview?: string;
  lastMessageSeq?: number | null;
  lastReadSeq?: number | null;
  rawUnreadCount?: number | null;
  scopeKey?: string;
  source?: string;
  threadId: string;
  threadType: CustomerServiceThreadType;
  trustedUnread?: boolean;
  unreadReason?: string;
  unreadCount?: number | null;
}) {
  const previous =
    getCustomerServiceConversationIndex(params.conversationId, params.scopeKey) ||
    getCustomerServiceThreadIndex(params.threadId, params.scopeKey);
  const lastMessageSeq = Math.max(0, Number(params.lastMessageSeq ?? 0));
  const lastReadSeq = Math.max(0, Number(params.lastReadSeq ?? 0));
  const unreadCount = Math.max(0, Number(params.unreadCount ?? 0));
  const rawUnreadCount = Math.max(0, Number(params.rawUnreadCount ?? params.unreadCount ?? 0));
  const readClearedSeq = Math.max(0, Number(previous?.compatReadSeq ?? 0));
  const readClearedMessageId = previous?.compatReadMessageId;
  const baseReadSeq = Math.max(lastReadSeq, readClearedSeq);
  const staffSentAfterRead = (previous?.localStaffSentSeqs ?? []).filter(
    (seq) => seq > baseReadSeq && (!lastMessageSeq || seq <= lastMessageSeq),
  ).length;
  const unreadWindow =
    lastMessageSeq > baseReadSeq ? Math.max(0, lastMessageSeq - baseReadSeq) : 0;
  const boundedRawUnread =
    rawUnreadCount > 0 && unreadWindow > 0 ? Math.min(rawUnreadCount, unreadWindow) : 0;
  const allowUnknownBounded = params.unreadReason === "compat-unknown-suppressed";
  const candidate =
    unreadCount > 0 &&
    lastMessageSeq > baseReadSeq &&
    (!params.lastMessageId || params.lastMessageId !== readClearedMessageId)
      ? params.trustedUnread === true
        ? unreadCount
        : allowUnknownBounded
          ? Math.max(0, boundedRawUnread - staffSentAfterRead)
          : 0
      : 0;
  const unreadReason =
    candidate > 0
      ? params.trustedUnread === true
        ? params.unreadReason || "compat-inbound-trusted"
        : "compat-unknown-bounded"
      : params.unreadReason || "compat-untrusted";
  rememberCustomerServiceConversationIndex({
    compatLastMessageId: params.lastMessageId,
    compatLastMessageSeq: lastMessageSeq,
    compatLastReadSeq: lastReadSeq,
    compatRawUnreadCount: rawUnreadCount,
    compatUnreadCandidate: candidate,
    compatUnreadReason: unreadReason,
    conversationId: params.conversationId,
    lastMessageAt: params.lastMessageAt,
    lastMessageId: params.lastMessageId,
    lastMessagePreview: params.lastMessagePreview,
    scopeKey: params.scopeKey,
    source: params.source,
    threadId: params.threadId,
    threadType: params.threadType,
  });
  return {
    candidate,
    lastMessageSeq,
    lastReadSeq,
    previousReadClearedMessageId: readClearedMessageId,
    previousReadClearedSeq: readClearedSeq,
    rawUnreadCount,
    staffSentAfterRead,
    trustedUnread: params.trustedUnread === true,
    unreadWindow,
    unreadReason,
    unreadCount,
  };
}

function effectiveCompatUnreadCandidate(entry: CustomerServiceConversationIndexEntry) {
  const candidate = Math.max(0, Number(entry.compatUnreadCandidate ?? 0));
  const lastMessageSeq = Math.max(0, Number(entry.compatLastMessageSeq ?? 0));
  const lastReadSeq = Math.max(0, Number(entry.compatLastReadSeq ?? 0));
  const readClearedSeq = Math.max(0, Number(entry.compatReadSeq ?? 0));
  if (candidate <= 0) return 0;
  if (lastMessageSeq <= Math.max(lastReadSeq, readClearedSeq)) return 0;
  if (entry.compatLastMessageId && entry.compatLastMessageId === entry.compatReadMessageId) return 0;
  return candidate;
}

function matchingCustomerServiceIndexEntries(threadIdOrConversationId: string) {
  const entries = new Map<string, CustomerServiceConversationIndexEntry>();
  for (const entry of customerServiceConversationIndex.values()) {
    if (
      entry.conversationId === threadIdOrConversationId ||
      entry.threadId === threadIdOrConversationId
    ) {
      entries.set(`${entry.scopeKey}:${entry.threadId}:${entry.conversationId}`, entry);
    }
  }
  for (const entry of customerServiceThreadIndex.values()) {
    if (
      entry.conversationId === threadIdOrConversationId ||
      entry.threadId === threadIdOrConversationId
    ) {
      entries.set(`${entry.scopeKey}:${entry.threadId}:${entry.conversationId}`, entry);
    }
  }
  return [...entries.values()];
}

function indexKey(id: string, scopeKey: string) {
  return `${scopeKey}\u0000${id}`;
}

function mergeStringList(previous: string[] | undefined, next: string[] | undefined) {
  const values = [...(previous ?? []), ...(next ?? [])].filter(Boolean);
  return values.length > 0 ? [...new Set(values)].slice(-50) : undefined;
}

function mergeNumberList(previous: number[] | undefined, next: number[] | undefined) {
  const values = [...(previous ?? []), ...(next ?? [])]
    .map((value) => Math.max(0, Math.floor(Number(value))))
    .filter((value) => value > 0);
  return values.length > 0 ? [...new Set(values)].slice(-50) : undefined;
}
