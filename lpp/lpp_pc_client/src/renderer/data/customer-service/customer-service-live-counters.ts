import {
  normalizeCustomerServiceThreadType,
  type CustomerServiceThread,
} from "../api/types";
import { isQueuedCustomerServiceThread } from "../customer-service-display";
import { isTerminalCustomerServiceThreadStatus } from "./cs-thread-state";

export interface CustomerServiceLiveCountersInput {
  activeItems?: CustomerServiceThread[];
  isRiskyThread?: (thread: CustomerServiceThread) => boolean;
  queueItems?: CustomerServiceThread[];
}

export interface CustomerServiceLiveCounters {
  activeCount: number;
  activeServiceUnreadCount: number;
  activeTempSessions: CustomerServiceThread[];
  activeUnreadCount: number;
  currentTempSessions: CustomerServiceThread[];
  queuedCount: number;
  queuedServiceCount: number;
  queuedTempSessions: CustomerServiceThread[];
  serviceAlertCount: number;
  slaRiskCount: number;
  taskbarServiceUnreadCount: number;
  totalCount: number;
}

export function createCustomerServiceLiveCounters(
  input: CustomerServiceLiveCountersInput,
): CustomerServiceLiveCounters {
  const currentTempSessions = dedupeCustomerServiceThreads([
    ...(input.queueItems ?? []),
    ...(input.activeItems ?? []),
  ].filter(isDisplayableTempSession));
  const queuedTempSessions = currentTempSessions.filter(isQueuedCustomerServiceThread);
  const activeTempSessions = currentTempSessions.filter(
    (thread) => !isQueuedCustomerServiceThread(thread),
  );
  const activeUnreadCount = activeTempSessions.reduce(
    (sum, item) => sum + Math.max(0, Number(item.unreadCount ?? 0)),
    0,
  );
  const slaRiskCount = input.isRiskyThread
    ? currentTempSessions.filter(input.isRiskyThread).length
    : 0;
  const queuedCount = queuedTempSessions.length;
  const activeCount = activeTempSessions.length;

  return {
    activeCount,
    activeServiceUnreadCount: activeUnreadCount,
    activeTempSessions,
    activeUnreadCount,
    currentTempSessions,
    queuedCount,
    queuedServiceCount: queuedCount,
    queuedTempSessions,
    serviceAlertCount: queuedCount + activeUnreadCount,
    slaRiskCount,
    taskbarServiceUnreadCount: activeUnreadCount,
    totalCount: queuedCount + activeCount,
  };
}

export function dedupeCustomerServiceThreads(
  threads: CustomerServiceThread[],
): CustomerServiceThread[] {
  const merged: CustomerServiceThread[] = [];
  const keyToIndex = new Map<string, number>();

  for (const thread of threads) {
    const keys = customerServiceThreadIdentityKeys(thread);
    const index = keys.map((key) => keyToIndex.get(key)).find((value) => value !== undefined);
    if (index === undefined) {
      const nextIndex = merged.length;
      merged.push(thread);
      keys.forEach((key) => keyToIndex.set(key, nextIndex));
      continue;
    }

    const next = mergeCustomerServiceThreadSummary(merged[index], thread);
    merged[index] = next;
    customerServiceThreadIdentityKeys(next).forEach((key) => keyToIndex.set(key, index));
  }

  return merged;
}

function customerServiceThreadIdentityKeys(thread: CustomerServiceThread) {
  const type = normalizeCustomerServiceThreadType(thread.threadType);
  return uniqueStrings([
    thread.conversationId ? `${type}:conversation:${thread.conversationId}` : undefined,
    thread.threadId ? `${type}:thread:${thread.threadId}` : undefined,
    thread.conversationId ? `${type}:thread:${thread.conversationId}` : undefined,
    thread.threadId ? `${type}:conversation:${thread.threadId}` : undefined,
  ]);
}

function mergeCustomerServiceThreadSummary(
  current: CustomerServiceThread,
  incoming: CustomerServiceThread,
): CustomerServiceThread {
  const preferred = preferredThreadSummary(current, incoming);
  const fallback = preferred === current ? incoming : current;
  const latestPreviewThread = latestPreviewSummary(current, incoming);
  return {
    ...fallback,
    ...preferred,
    assignedAt: latestTimestamp(preferred.assignedAt, fallback.assignedAt),
    avatarUrl: preferred.avatarUrl || fallback.avatarUrl,
    channel: preferred.channel || fallback.channel,
    conversationId: preferred.conversationId || fallback.conversationId,
    customerAvatarUrl: preferred.customerAvatarUrl || fallback.customerAvatarUrl,
    customerLevel: preferred.customerLevel || fallback.customerLevel,
    entryChannel: preferred.entryChannel || fallback.entryChannel,
    from: preferred.from || fallback.from,
    lastMessageAt: latestTimestamp(current.lastMessageAt, incoming.lastMessageAt),
    lastMessagePreview:
      latestPreviewThread.lastMessagePreview ||
      preferred.lastMessagePreview ||
      fallback.lastMessagePreview,
    platform: preferred.platform || fallback.platform,
    provider: preferred.provider || fallback.provider,
    source: preferred.source || fallback.source,
    sourceChannel: preferred.sourceChannel || fallback.sourceChannel,
    title: preferred.title || fallback.title,
    unreadCount: Math.max(
      0,
      Number(current.unreadCount ?? 0),
      Number(incoming.unreadCount ?? 0),
    ),
    updatedAt: latestTimestamp(current.updatedAt, incoming.updatedAt),
  };
}

function preferredThreadSummary(
  current: CustomerServiceThread,
  incoming: CustomerServiceThread,
) {
  const currentRank = threadStatusRank(current.status);
  const incomingRank = threadStatusRank(incoming.status);
  if (incomingRank !== currentRank) return incomingRank > currentRank ? incoming : current;
  return latestThreadTimestamp(incoming) >= latestThreadTimestamp(current) ? incoming : current;
}

function latestPreviewSummary(
  current: CustomerServiceThread,
  incoming: CustomerServiceThread,
) {
  const currentPreview = current.lastMessagePreview?.trim();
  const incomingPreview = incoming.lastMessagePreview?.trim();
  if (currentPreview && incomingPreview) {
    return timestampMs(incoming.lastMessageAt || incoming.updatedAt) >=
      timestampMs(current.lastMessageAt || current.updatedAt)
      ? incoming
      : current;
  }
  return incomingPreview ? incoming : current;
}

function threadStatusRank(status: string) {
  const normalized = status.trim().toLowerCase().replace(/-/g, "_");
  if (
    normalized === "serving" ||
    normalized === "active" ||
    normalized === "in_progress" ||
    normalized === "ongoing"
  ) {
    return 3;
  }
  if (normalized === "queued" || normalized === "queueing" || normalized === "pending") {
    return 2;
  }
  return 1;
}

function latestThreadTimestamp(thread: CustomerServiceThread) {
  return Math.max(timestampMs(thread.lastMessageAt), timestampMs(thread.updatedAt), timestampMs(thread.assignedAt));
}

function latestTimestamp(left?: string | null, right?: string | null) {
  return timestampMs(right) > timestampMs(left) ? right : left;
}

function timestampMs(value?: string | null) {
  const timestamp = Date.parse(value ?? "");
  return Number.isFinite(timestamp) ? timestamp : 0;
}

function uniqueStrings(values: Array<string | undefined>) {
  return Array.from(new Set(values.filter(Boolean) as string[]));
}

function isDisplayableTempSession(thread: CustomerServiceThread) {
  return (
    normalizeCustomerServiceThreadType(thread.threadType) === "temp_session" &&
    !isTerminalCustomerServiceThreadStatus(thread.status)
  );
}
