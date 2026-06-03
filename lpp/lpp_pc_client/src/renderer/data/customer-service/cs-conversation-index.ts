import type { CustomerServiceThread, CustomerServiceThreadType, MessageItemDto } from "../api/types";
import { recordMessageReminderDiagnostic } from "../diagnostics/message-reminder-diagnostics";
import { reconcileSnapshot } from "../gateway/snapshot-reconcile-service";
import { workspaceScopeKeyFromSession } from "../workspace-scope";
import {
  resolveCustomerServiceCompatUnreadCandidate,
  resolveCustomerServiceEffectiveCompatUnread,
  resolveCustomerServiceOverlayUnread,
  resolveCustomerServiceThreadUnread,
} from "./customer-service-unread-ledger";

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
  lastMessageSeq?: number;
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
  platformUserId?: string | null;
  spaceType?: number | null;
  userId?: string | null;
}) {
  if (
    input?.apiBaseUrl &&
    input.tenantId &&
    input.userId &&
    input.platformUserId &&
    typeof input.spaceType === "number"
  ) {
    return workspaceScopeKeyFromSession(input as never);
  }
  const parts = [
    input?.apiBaseUrl ?? "",
    input?.tenantToken ?? "",
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
    lastMessageSeq:
      typeof entry.lastMessageSeq === "number" ? entry.lastMessageSeq : previous?.lastMessageSeq,
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
  const nextUnread = resolveCustomerServiceOverlayUnread({
    previousUnread,
    read: params.read,
    sameMessage,
    source: params.source,
  });
  rememberCustomerServiceConversationIndex({
    conversationId: params.conversationId || previous?.conversationId || params.threadId,
    lastMessageAt: params.message.sentAt || previous?.lastMessageAt,
    lastMessageId: params.message.messageId || previous?.lastMessageId,
    lastMessagePreview: params.message.preview || previous?.lastMessagePreview,
    lastMessageSeq:
      typeof params.message.conversationSeq === "number"
        ? params.message.conversationSeq
        : previous?.lastMessageSeq,
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
  return customerServiceConversationIndex.get(indexKey(conversationId, normalizedScopeKey));
}

export function getCustomerServiceThreadIndex(threadId: string, scopeKey?: string) {
  if (!threadId) return undefined;
  const normalizedScopeKey = scopeKey || defaultCustomerServiceIndexScope;
  return customerServiceThreadIndex.get(indexKey(threadId, normalizedScopeKey));
}

export function applyCustomerServiceThreadOverlay(thread: CustomerServiceThread, scopeKey?: string) {
  const overlay = resolveCustomerServiceThreadOverlay(thread, scopeKey);
  if (!overlay) return thread;
  rememberCustomerServiceThreadOverlayAlias(thread, overlay, scopeKey);
  const serverUnread = Math.max(0, Number(thread.unreadCount ?? 0));
  const overlayUnread = Math.max(0, Number(overlay.overlayUnreadCount ?? 0));
  const reconcile = reconcileSnapshot({
    incomingSeq: snapshotSeq(thread),
    localSeq: overlay.lastMessageSeq ?? overlay.compatLastMessageSeq,
    owner: "customerService",
    scopeKey: scopeKey ?? overlay.scopeKey ?? "",
    source: "workbench-snapshot",
    targetId: thread.threadId,
  });
  const canUseSnapshotStrongFields =
    reconcile.canUpdateStrongFields ||
    (!overlay.lastMessageId && !overlay.lastMessagePreview && !overlay.lastMessageAt);
  const threadLastMessageId = stringField(thread as unknown as Record<string, unknown>, "lastMessageId");
  const lastMessagePreview = canUseSnapshotStrongFields
    ? thread.lastMessagePreview || overlay.lastMessagePreview
    : overlay.lastMessagePreview || thread.lastMessagePreview;
  const lastMessageAt = latestTimestamp(thread.lastMessageAt, overlay.lastMessageAt);
  const lastMessageId = canUseSnapshotStrongFields
    ? threadLastMessageId || overlay.lastMessageId || overlay.compatLastMessageId
    : overlay.lastMessageId || overlay.compatLastMessageId || threadLastMessageId;
  const compatUnreadCandidate = effectiveCompatUnreadCandidate(overlay);
  const threadUnread = resolveCustomerServiceThreadUnread({
    compatUnreadCandidate,
    overlayUnread,
    serverUnread: reconcile.canUpdateStrongFields ? serverUnread : 0,
  });
  const overlayMergeReason = threadUnread.reason;
  const unreadCount = threadUnread.unreadCount;
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
      reconcileDecision: reconcile.decision,
      reconcileReason: reconcile.reason,
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
      reconcileDecision: reconcile.decision,
      reconcileReason: reconcile.reason,
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
    lastMessageId,
    lastMessageAt,
    lastMessagePreview,
    unreadCount,
  };
}

function resolveCustomerServiceThreadOverlay(
  thread: CustomerServiceThread,
  scopeKey?: string,
) {
  const threadOverlay = getCustomerServiceThreadIndex(thread.threadId, scopeKey);
  const conversationOverlay = getCustomerServiceConversationIndex(thread.conversationId, scopeKey);
  return fresherCustomerServiceOverlay(threadOverlay, conversationOverlay);
}

function fresherCustomerServiceOverlay(
  first?: CustomerServiceConversationIndexEntry,
  second?: CustomerServiceConversationIndexEntry,
) {
  if (!first) return second;
  if (!second) return first;
  const firstSeq = overlayMessageSeq(first);
  const secondSeq = overlayMessageSeq(second);
  if (firstSeq !== secondSeq) return secondSeq > firstSeq ? second : first;
  const firstTime = timestampMs(first.lastMessageAt);
  const secondTime = timestampMs(second.lastMessageAt);
  if (firstTime !== secondTime) return secondTime > firstTime ? second : first;
  return second.updatedAt > first.updatedAt ? second : first;
}

function rememberCustomerServiceThreadOverlayAlias(
  thread: CustomerServiceThread,
  overlay: CustomerServiceConversationIndexEntry,
  scopeKey?: string,
) {
  if (!thread.threadId || overlay.threadId === thread.threadId) return;
  rememberCustomerServiceConversationIndex({
    ...overlay,
    conversationId: thread.conversationId || overlay.conversationId || thread.threadId,
    scopeKey: scopeKey || overlay.scopeKey,
    threadId: thread.threadId,
    threadType: thread.threadType,
  });
}

function snapshotSeq(thread: CustomerServiceThread) {
  const record = thread as unknown as Record<string, unknown>;
  return numberField(record, "lastMessageSeq", "statusVersion");
}

function overlayMessageSeq(entry: CustomerServiceConversationIndexEntry) {
  return Math.max(0, Number(entry.lastMessageSeq ?? entry.compatLastMessageSeq ?? 0));
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
  const compatDecision = resolveCustomerServiceCompatUnreadCandidate({
    compatReadMessageId: previous?.compatReadMessageId,
    compatReadSeq: previous?.compatReadSeq,
    lastMessageId: params.lastMessageId,
    lastMessageSeq: params.lastMessageSeq,
    lastReadSeq: params.lastReadSeq,
    localStaffSentSeqs: previous?.localStaffSentSeqs,
    rawUnreadCount: params.rawUnreadCount,
    trustedUnread: params.trustedUnread,
    unreadCount: params.unreadCount,
    unreadReason: params.unreadReason,
  });
  rememberCustomerServiceConversationIndex({
    compatLastMessageId: params.lastMessageId,
    compatLastMessageSeq: compatDecision.lastMessageSeq,
    compatLastReadSeq: compatDecision.lastReadSeq,
    compatRawUnreadCount: compatDecision.rawUnreadCount,
    compatUnreadCandidate: compatDecision.candidate,
    compatUnreadReason: compatDecision.unreadReason,
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
    ...compatDecision,
  };
}

function effectiveCompatUnreadCandidate(entry: CustomerServiceConversationIndexEntry) {
  return resolveCustomerServiceEffectiveCompatUnread({
    candidate: entry.compatUnreadCandidate,
    lastMessageId: entry.compatLastMessageId,
    lastMessageSeq: entry.compatLastMessageSeq,
    lastReadSeq: entry.compatLastReadSeq,
    readMessageId: entry.compatReadMessageId,
    readSeq: entry.compatReadSeq,
  });
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

function numberField(record: Record<string, unknown>, ...keys: string[]) {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "string" && value.trim()) {
      const parsed = Number(value);
      if (Number.isFinite(parsed)) return parsed;
    }
  }
  return undefined;
}

function stringField(record: Record<string, unknown>, ...keys: string[]) {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return undefined;
}

function latestTimestamp(
  first?: string | null,
  second?: string | null,
) {
  if (!first) return second;
  if (!second) return first;
  const firstTime = Date.parse(first);
  const secondTime = Date.parse(second);
  if (!Number.isFinite(firstTime)) return second;
  if (!Number.isFinite(secondTime)) return first;
  return secondTime > firstTime ? second : first;
}

function timestampMs(value?: string | null) {
  if (!value) return 0;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : 0;
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
