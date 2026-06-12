import type {
  PlatformSpaceUnreadSummaryDto,
  PlatformTenant,
  SpaceUnreadSummaryDto,
  TenantInfoDto,
} from "../../data/api-client";
import { authTenantRoleLabel } from "../../data/auth/auth-tenant-role";
import type { AuthSession } from "../../data/auth/auth-session";
import type { SpaceReminderSnapshot } from "../../data/spaces/space-reminder-ledger";

export type SpaceRadarSyncState = "loading" | "synced" | "error" | "idle";
export type SpaceRadarAttentionLevel = "none" | "backlog" | "new" | "urgent";

export type SpaceRadarItem = {
  attentionLevel: SpaceRadarAttentionLevel;
  attentionText: string;
  backlogUnreadConversationCount: number | null;
  backlogUnreadMessageCount: number | null;
  canSwitch: boolean;
  current: boolean;
  displayCode: string;
  displayName: string;
  hasNewReminder: boolean;
  identityKey: string;
  logoUrl?: string | null;
  newReminderCount: number;
  roleLabel: string;
  spaceType: number;
  syncState: SpaceRadarSyncState;
  tenantId?: string | null;
  tenant?: PlatformTenant | null;
  unreadConversationCount: number | null;
  unreadMessageCount: number | null;
};

export type SpaceRadarViewModel = {
  items: SpaceRadarItem[];
  syncState: SpaceRadarSyncState;
  totalNewReminderCount: number;
  totalUnreadConversationCount: number | null;
  totalUnreadMessageCount: number | null;
  unreadSpaceCount: number | null;
};

export type CurrentSpaceSidebarBadgeInput = {
  contactRequestCount?: number | null;
  imUnreadCount?: number | null;
  serviceAlertCount?: number | null;
};

export function currentSpaceSidebarBadgeCount({
  contactRequestCount,
  imUnreadCount,
  serviceAlertCount,
}: CurrentSpaceSidebarBadgeInput) {
  return (
    finiteCount(imUnreadCount) +
    finiteCount(serviceAlertCount) +
    finiteCount(contactRequestCount)
  );
}

export function spaceRadarNewReminderSummary(viewModel: SpaceRadarViewModel) {
  const alertItems = viewModel.items.filter((item) => !item.current && item.hasNewReminder);
  const totalNewReminderCount = alertItems.reduce(
    (sum, item) => sum + finiteCount(item.newReminderCount),
    0,
  );
  if (totalNewReminderCount <= 0) return null;
  return {
    reminderSpaceCount: alertItems.length,
    totalNewReminderCount,
  };
}

export function spaceRadarItemReminderPresentation(
  item: Pick<SpaceRadarItem, "attentionText" | "current" | "hasNewReminder" | "syncState">,
  {
    currentSpaceBadgeCount = 0,
  }: {
    currentSpaceBadgeCount?: number | null;
  } = {},
) {
  const normalizedCurrentBadgeCount = finiteCount(currentSpaceBadgeCount);
  if (item.current && normalizedCurrentBadgeCount > 0) {
    return {
      live: true,
      text: `${formatPlainBadgeCount(normalizedCurrentBadgeCount)} 条当前提醒`,
    };
  }
  if (item.hasNewReminder) {
    return {
      live: true,
      text: item.attentionText,
    };
  }
  if (item.syncState === "error") {
    return {
      live: false,
      text: "未同步",
    };
  }
  return {
    live: false,
    text: "无新提醒",
  };
}

export function buildSpaceRadarViewModel({
  authSession,
  currentTenant,
  spaces,
  unreadSummary,
  unreadSummaryError,
  unreadSummaryLoading = false,
  reminderSnapshot,
}: {
  authSession: AuthSession | null;
  currentTenant?: TenantInfoDto | null;
  reminderSnapshot?: SpaceReminderSnapshot;
  spaces?: PlatformTenant[];
  unreadSummary?: PlatformSpaceUnreadSummaryDto;
  unreadSummaryError?: unknown;
  unreadSummaryLoading?: boolean;
}): SpaceRadarViewModel {
  const syncState: SpaceRadarSyncState = unreadSummaryError
    ? "error"
    : unreadSummaryLoading
      ? "loading"
      : unreadSummary
        ? "synced"
        : "idle";
  const summaryByKey = new Map<string, SpaceUnreadSummaryDto>();
  (unreadSummary?.spaces ?? []).forEach((summary) => {
    summaryByKey.set(spaceRadarIdentityKey(summary), summary);
  });

  const records = new Map<string, SpaceRecord>();
  const upsert = (record: SpaceRecord) => {
    const existing = records.get(record.identityKey);
    records.set(record.identityKey, mergeRecord(existing, record));
  };

  (spaces ?? []).forEach((space) => {
    upsert({
      identityKey: tenantIdentityKey(space.tenantId),
      sourceRank: 2,
      space,
      spaceType: 2,
      tenantId: space.tenantId,
    });
  });

  if (authSession) {
    const sessionSpaceType = authSession.spaceType ?? (authSession.tenantId ? 2 : 1);
    upsert({
      identityKey:
        sessionSpaceType === 1
          ? "personal"
          : tenantIdentityKey(currentTenant?.tenantId || authSession.tenantId || ""),
      session: authSession,
      sourceRank: 3,
      spaceType: sessionSpaceType,
      tenantId: sessionSpaceType === 1 ? null : currentTenant?.tenantId || authSession.tenantId,
      tenantInfo: currentTenant ?? undefined,
    });
  }

  (unreadSummary?.spaces ?? []).forEach((summary) => {
    upsert({
      identityKey: spaceRadarIdentityKey(summary),
      sourceRank: 1,
      spaceType: summary.spaceType,
      summary,
      tenantId: summary.tenantId ?? null,
    });
  });

  const currentKey = currentSpaceIdentityKey(authSession, currentTenant);
  const canSwitch = Boolean(authSession?.platformToken);
  const items = Array.from(records.values())
    .map((record) =>
      recordToItem({
        canSwitch,
        currentKey,
        record,
        reminder: reminderSnapshot?.items[record.identityKey],
        summary: summaryByKey.get(record.identityKey),
        syncState,
      }),
    )
    .sort(compareSpaceRadarItems);

  const totalNewReminderCount = items
    .filter((item) => !item.current)
    .reduce((sum, item) => sum + finiteCount(item.newReminderCount), 0);

  return {
    items,
    syncState,
    totalNewReminderCount,
    totalUnreadConversationCount:
      syncState === "error" ? null : finiteCount(unreadSummary?.totalUnreadConversationCount),
    totalUnreadMessageCount:
      syncState === "error" ? null : finiteCount(unreadSummary?.totalUnreadMessageCount),
    unreadSpaceCount: syncState === "error" ? null : finiteCount(unreadSummary?.unreadSpaceCount),
  };
}

export function spaceRadarIdentityKey(input: {
  spaceType?: number | null;
  tenantId?: string | null;
}) {
  return Number(input.spaceType) === 1 ? "personal" : tenantIdentityKey(input.tenantId ?? "");
}

export function roleLabel(role?: number | null) {
  return authTenantRoleLabel(role);
}

function tenantIdentityKey(tenantId: string | null | undefined) {
  return `tenant:${tenantId || "--"}`;
}

function currentSpaceIdentityKey(
  authSession: AuthSession | null,
  currentTenant?: TenantInfoDto | null,
) {
  if (!authSession) return "";
  const spaceType = authSession.spaceType ?? (authSession.tenantId ? 2 : 1);
  if (spaceType === 1) return "personal";
  return tenantIdentityKey(currentTenant?.tenantId || authSession.tenantId || "");
}

type SpaceRecord = {
  identityKey: string;
  session?: AuthSession;
  sourceRank: number;
  space?: PlatformTenant;
  spaceType: number;
  summary?: SpaceUnreadSummaryDto;
  tenantId?: string | null;
  tenantInfo?: TenantInfoDto;
};

function mergeRecord(
  existing: SpaceRecord | undefined,
  next: SpaceRecord,
): SpaceRecord {
  if (!existing) return next;
  return {
    ...existing,
    ...next,
    session: next.session ?? existing.session,
    sourceRank: Math.max(existing.sourceRank, next.sourceRank),
    space: next.space ?? existing.space,
    summary: next.summary ?? existing.summary,
    tenantInfo: next.tenantInfo ?? existing.tenantInfo,
  };
}

function recordToItem({
  currentKey,
  canSwitch,
  record,
  reminder,
  summary,
  syncState,
}: {
  canSwitch: boolean;
  currentKey: string;
  record: SpaceRecord;
  reminder?: SpaceReminderSnapshot["items"][string];
  summary?: SpaceUnreadSummaryDto;
  syncState: SpaceRadarSyncState;
}): SpaceRadarItem {
  const current = record.identityKey === currentKey;
  const displayName =
    record.tenantInfo?.tenantName ||
    record.space?.tenantName ||
    summary?.spaceName ||
    record.session?.tenantName ||
    (record.spaceType === 1 ? "个人空间" : "企业空间");
  const displayCode =
    record.tenantInfo?.tenantCode ||
    record.space?.tenantCode ||
    summary?.tenantCode ||
    record.session?.tenantCode ||
    record.tenantId ||
    record.session?.lppId ||
    "--";
  const summaryAvailable = syncState === "synced" || syncState === "loading";
  const backlogUnreadConversationCount =
    summaryAvailable && summary
      ? finiteCount(summary.unreadConversationCount)
      : syncState === "error"
        ? null
        : 0;
  const backlogUnreadMessageCount =
    summaryAvailable && summary
      ? finiteCount(summary.unreadMessageCount)
      : syncState === "error"
        ? null
        : 0;
  const newReminderCount = current ? 0 : reminder?.newReminderCount ?? 0;
  const attentionLevel = spaceRadarAttentionLevel({
    backlogUnreadMessageCount,
    newReminderCount,
  });
  return {
    attentionLevel,
    attentionText: spaceRadarAttentionText({
      attentionLevel,
      backlogUnreadMessageCount,
      newReminderCount,
    }),
    backlogUnreadConversationCount,
    backlogUnreadMessageCount,
    canSwitch,
    current,
    displayCode,
    displayName,
    hasNewReminder: newReminderCount > 0,
    identityKey: record.identityKey,
    logoUrl:
      record.tenantInfo?.logoUrl ??
      record.space?.logoUrl ??
      summary?.logoUrl ??
      record.session?.tenantLogoUrl ??
      null,
    roleLabel: current
      ? record.session?.roleLabel || roleLabel(record.space?.membershipRole)
      : roleLabel(record.space?.membershipRole),
    newReminderCount,
    spaceType: record.spaceType,
    syncState,
    tenant: record.space ?? null,
    tenantId: record.spaceType === 1 ? null : record.tenantId,
    unreadConversationCount: backlogUnreadConversationCount,
    unreadMessageCount: backlogUnreadMessageCount,
  };
}

function spaceRadarAttentionLevel({
  newReminderCount,
}: {
  backlogUnreadMessageCount: number | null;
  newReminderCount: number;
}): SpaceRadarAttentionLevel {
  if (newReminderCount >= 10) return "urgent";
  if (newReminderCount > 0) return "new";
  return "none";
}

function spaceRadarAttentionText({
  attentionLevel,
  newReminderCount,
}: {
  attentionLevel: SpaceRadarAttentionLevel;
  backlogUnreadMessageCount: number | null;
  newReminderCount: number;
}) {
  if (attentionLevel === "urgent" || attentionLevel === "new") {
    return `${newReminderCount} 条新消息`;
  }
  return "无新提醒";
}

function finiteCount(value: unknown) {
  const parsed = typeof value === "number" ? value : Number(value ?? 0);
  return Number.isFinite(parsed) ? Math.max(0, Math.floor(parsed)) : 0;
}

function formatPlainBadgeCount(value: number) {
  return value > 99 ? "99+" : String(value);
}

function compareSpaceRadarItems(a: SpaceRadarItem, b: SpaceRadarItem) {
  if (a.current !== b.current) return a.current ? -1 : 1;
  if (a.hasNewReminder !== b.hasNewReminder) return a.hasNewReminder ? -1 : 1;
  if (a.newReminderCount !== b.newReminderCount) {
    return b.newReminderCount - a.newReminderCount;
  }
  const aUnread = a.backlogUnreadMessageCount ?? -1;
  const bUnread = b.backlogUnreadMessageCount ?? -1;
  if (aUnread !== bUnread) return bUnread - aUnread;
  return a.displayName.localeCompare(b.displayName, "zh-Hans-CN");
}
