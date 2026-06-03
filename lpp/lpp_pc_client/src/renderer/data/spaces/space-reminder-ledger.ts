import type { PlatformSpaceUnreadSummaryDto } from "../api-client";

export type SpaceReminderNoticeInput = {
  noticeType?: string;
  requiresSwitch?: boolean;
  spaceType?: number;
  targetUnreadConversationCount?: number;
  targetUnreadMessageCount?: number;
  tenantId?: string;
  totalUnreadConversationCount?: number;
  totalUnreadMessageCount?: number;
  unreadSpaceCount?: number;
};

export type SpaceReminderItem = {
  baselineUnreadMessageCount: number | null;
  hasNewReminder: boolean;
  identityKey: string;
  latestUnreadMessageCount: number | null;
  newReminderCount: number;
};

export type SpaceReminderSnapshot = {
  items: Record<string, SpaceReminderItem>;
  scopeKey: string;
  totalNewReminderCount: number;
};

type LedgerScope = {
  initialized: boolean;
  items: Map<string, SpaceReminderItem>;
};

const ledger = new Map<string, LedgerScope>();
const subscribers = new Set<() => void>();

export function spaceReminderScopeKey(apiBaseUrl?: string | null, platformToken?: string | null) {
  return `${apiBaseUrl ?? ""}::${platformToken ?? ""}`;
}

export function getSpaceReminderSnapshot(scopeKey: string): SpaceReminderSnapshot {
  const scope = ledger.get(scopeKey);
  const items: Record<string, SpaceReminderItem> = {};
  let totalNewReminderCount = 0;
  scope?.items.forEach((item, identityKey) => {
    items[identityKey] = { ...item };
    totalNewReminderCount += item.newReminderCount;
  });
  return { items, scopeKey, totalNewReminderCount };
}

export function subscribeSpaceReminderLedger(listener: () => void) {
  subscribers.add(listener);
  return () => {
    subscribers.delete(listener);
  };
}

export function reconcileSpaceUnreadSummary(
  scopeKey: string,
  summary: PlatformSpaceUnreadSummaryDto,
) {
  const scope = getOrCreateScope(scopeKey);
  (summary.spaces ?? []).forEach((space) => {
    const identityKey = spaceReminderIdentityKey({
      spaceType: space.spaceType,
      tenantId: space.tenantId,
    });
    const latestUnreadMessageCount = finiteCount(space.unreadMessageCount);
    const existing = scope.items.get(identityKey);
    scope.items.set(
      identityKey,
      reconcileReminderItem(identityKey, existing, latestUnreadMessageCount, scope.initialized),
    );
  });
  scope.initialized = true;
  notifySubscribers();
}

export function applySpaceNoticeReminder(
  scopeKey: string,
  notice: SpaceReminderNoticeInput,
) {
  const identityKey = spaceReminderIdentityKey(notice);
  const scope = getOrCreateScope(scopeKey);
  const existing = scope.items.get(identityKey);
  const targetUnreadMessageCount = optionalFiniteCount(notice.targetUnreadMessageCount);
  const latestUnreadMessageCount =
    targetUnreadMessageCount ?? existing?.latestUnreadMessageCount ?? null;
  const baselineUnreadMessageCount = existing?.baselineUnreadMessageCount ?? null;
  let newReminderCount = Math.max(existing?.newReminderCount ?? 0, 1);

  if (baselineUnreadMessageCount !== null && targetUnreadMessageCount !== undefined) {
    const delta = targetUnreadMessageCount - baselineUnreadMessageCount;
    newReminderCount = Math.max(existing?.newReminderCount ?? 0, delta > 0 ? delta : 1);
  }

  scope.items.set(identityKey, {
    baselineUnreadMessageCount,
    hasNewReminder: newReminderCount > 0,
    identityKey,
    latestUnreadMessageCount,
    newReminderCount,
  });
  notifySubscribers();
}

export function clearSpaceReminder(scopeKey: string, identityKey: string) {
  const scope = ledger.get(scopeKey);
  const existing = scope?.items.get(identityKey);
  if (!scope || !existing) return;
  const baselineUnreadMessageCount =
    existing.latestUnreadMessageCount ?? existing.baselineUnreadMessageCount;
  scope.items.set(identityKey, {
    ...existing,
    baselineUnreadMessageCount,
    hasNewReminder: false,
    newReminderCount: 0,
  });
  notifySubscribers();
}

export function resetSpaceReminderLedgerForTest() {
  ledger.clear();
  notifySubscribers();
}

export function spaceReminderIdentityKey(input: {
  spaceType?: number | null;
  tenantId?: string | null;
}) {
  return Number(input.spaceType) === 1 ? "personal" : `tenant:${input.tenantId ?? "--"}`;
}

function getOrCreateScope(scopeKey: string) {
  let scope = ledger.get(scopeKey);
  if (!scope) {
    scope = { initialized: false, items: new Map() };
    ledger.set(scopeKey, scope);
  }
  return scope;
}

function reconcileReminderItem(
  identityKey: string,
  existing: SpaceReminderItem | undefined,
  latestUnreadMessageCount: number,
  scopeInitialized: boolean,
): SpaceReminderItem {
  if (!existing) {
    return {
      baselineUnreadMessageCount: latestUnreadMessageCount,
      hasNewReminder: false,
      identityKey,
      latestUnreadMessageCount,
      newReminderCount: 0,
    };
  }

  if (existing.baselineUnreadMessageCount === null) {
    const baselineUnreadMessageCount = scopeInitialized
      ? latestUnreadMessageCount
      : Math.max(0, latestUnreadMessageCount - existing.newReminderCount);
    return {
      baselineUnreadMessageCount,
      hasNewReminder: existing.newReminderCount > 0,
      identityKey,
      latestUnreadMessageCount,
      newReminderCount: existing.newReminderCount,
    };
  }

  if (latestUnreadMessageCount <= existing.baselineUnreadMessageCount) {
    return {
      baselineUnreadMessageCount: latestUnreadMessageCount,
      hasNewReminder: false,
      identityKey,
      latestUnreadMessageCount,
      newReminderCount: 0,
    };
  }

  const newReminderCount = Math.max(
    existing.newReminderCount,
    latestUnreadMessageCount - existing.baselineUnreadMessageCount,
  );
  return {
    baselineUnreadMessageCount: existing.baselineUnreadMessageCount,
    hasNewReminder: newReminderCount > 0,
    identityKey,
    latestUnreadMessageCount,
    newReminderCount,
  };
}

function notifySubscribers() {
  subscribers.forEach((listener) => listener());
}

function finiteCount(value: unknown) {
  const parsed = typeof value === "number" ? value : Number(value ?? 0);
  return Number.isFinite(parsed) ? Math.max(0, Math.floor(parsed)) : 0;
}

function optionalFiniteCount(value: unknown) {
  if (value === undefined || value === null || value === "") return undefined;
  return finiteCount(value);
}
