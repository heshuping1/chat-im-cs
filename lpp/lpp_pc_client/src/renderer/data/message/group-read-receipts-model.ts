export interface GroupReadReceiptMember {
  userId: string;
  displayName: string;
  avatarUrl?: string | null;
  lppId?: string | null;
  lastReadSeq: number;
  hasRead: boolean;
  platformUserId?: string | null;
}

export interface GroupReadReceipts {
  members: GroupReadReceiptMember[];
  readMembers: GroupReadReceiptMember[];
  unreadMembers: GroupReadReceiptMember[];
  readCount: number;
  totalMembers: number;
  unreadCount: number;
}

export interface GroupReadReceiptIdentity {
  displayName?: string | null;
  lppId?: string | null;
  platformUserId?: string | null;
  userId?: string | null;
}

export function activeGroupReadReceiptAutoSyncIntervalMs() {
  return 5_000;
}

export function activeGroupReadReceiptAutoSyncMaxTargets() {
  return 4;
}

export function activeGroupReadReceiptAutoSyncDelayMs() {
  return 500;
}

export function activeGroupReadReceiptAutoSyncStaleMs() {
  return 10_000;
}

export function parseGroupReadReceiptsPayload(
  payload: unknown,
  {
    currentUser,
    messageSeq,
  }: {
    currentUser?: GroupReadReceiptIdentity | null;
    messageSeq: number;
  },
): GroupReadReceipts {
  if (Array.isArray(payload)) {
    const members = payload
      .filter(isRecord)
      .map((item) =>
        memberFromRecord(item, {
          messageSeq,
          preferHasRead: true,
        }),
      );
    return receiptsFromMembers(members, members.length, 0, 0, currentUser);
  }

  if (isRecord(payload)) {
    const rawMembers = firstArray(payload, [
      "members",
      "items",
      "users",
      "receipts",
      "data",
    ]);
    const members = rawMembers
      .filter(isRecord)
      .map((item) =>
        memberFromRecord(item, {
          messageSeq,
          preferHasRead: false,
        }),
      );
    return receiptsFromMembers(
      members,
      numberValue(payload.totalMembers) ?? members.length,
      numberValue(payload.readCount),
      numberValue(payload.unreadCount),
      currentUser,
    );
  }

  return emptyReceipts();
}

export function groupReadReceiptQueryKey({
  apiBaseUrl,
  groupId,
  messageId,
  messageSeq,
  tenantToken,
}: {
  apiBaseUrl?: string;
  groupId: string;
  messageId: string;
  messageSeq: number;
  tenantToken?: string;
}) {
  return [
    "pc-group-read-receipts",
    apiBaseUrl ?? "",
    tenantToken ?? "",
    groupId,
    messageId,
    messageSeq,
  ] as const;
}

function receiptsFromMembers(
  members: GroupReadReceiptMember[],
  totalMembers: number,
  fallbackReadCount = 0,
  fallbackUnreadCount = 0,
  currentUser?: GroupReadReceiptIdentity | null,
): GroupReadReceipts {
  const selfMember = members.find((member) => isCurrentReceiptMember(member, currentUser));
  const receiptMembers = selfMember
    ? members.filter((member) => !isCurrentReceiptMember(member, currentUser))
    : members;
  const readMembers = receiptMembers.filter((member) => member.hasRead);
  const unreadMembers = receiptMembers.filter((member) => !member.hasRead);
  const readableTotal = selfMember ? Math.max(0, totalMembers - 1) : totalMembers;
  const readableFallbackReadCount = selfMember?.hasRead
    ? Math.max(0, fallbackReadCount - 1)
    : fallbackReadCount;
  const readableFallbackUnreadCount =
    selfMember && !selfMember.hasRead ? Math.max(0, fallbackUnreadCount - 1) : fallbackUnreadCount;
  return {
    members: receiptMembers,
    readMembers,
    unreadMembers,
    readCount: receiptMembers.length > 0 ? readMembers.length : readableFallbackReadCount,
    totalMembers: readableTotal,
    unreadCount: receiptMembers.length > 0 ? unreadMembers.length : readableFallbackUnreadCount,
  };
}

function emptyReceipts(): GroupReadReceipts {
  return {
    members: [],
    readMembers: [],
    readCount: 0,
    totalMembers: 0,
    unreadCount: 0,
    unreadMembers: [],
  };
}

function memberFromRecord(
  record: Record<string, unknown>,
  {
    messageSeq,
    preferHasRead,
  }: {
    messageSeq: number;
    preferHasRead: boolean;
  },
): GroupReadReceiptMember {
  const lastReadSeq = numberValue(record.lastReadSeq) ?? 0;
  const hasRead =
    preferHasRead && typeof record.hasRead === "boolean"
      ? record.hasRead
      : messageSeq > 0 && lastReadSeq >= messageSeq;
  const user = firstRecord(record, ["user", "member", "profile", "reader"]);
  return {
    avatarUrl:
      stringValue(record.avatarUrl) ??
      stringValue(record.avatar_url) ??
      stringValue(record.avatar) ??
      stringValue(user?.avatarUrl) ??
      stringValue(user?.avatar_url) ??
      stringValue(user?.avatar),
    displayName:
      stringValue(record.displayName) ??
      stringValue(record.display_name) ??
      stringValue(record.name) ??
      stringValue(record.nickname) ??
      stringValue(record.userName) ??
      stringValue(record.user_name) ??
      stringValue(user?.displayName) ??
      stringValue(user?.display_name) ??
      stringValue(user?.name) ??
      stringValue(user?.nickname) ??
      stringValue(user?.userName) ??
      stringValue(user?.user_name) ??
      "用户",
    hasRead,
    lastReadSeq,
    lppId:
      stringValue(record.lppId) ??
      stringValue(record.lpp_id) ??
      stringValue(record.lppNo) ??
      stringValue(record.lpp_no) ??
      stringValue(user?.lppId) ??
      stringValue(user?.lpp_id) ??
      stringValue(user?.lppNo) ??
      stringValue(user?.lpp_no),
    platformUserId:
      stringValue(record.platformUserId) ??
      stringValue(record.platform_user_id) ??
      stringValue(record.platformId) ??
      stringValue(record.readerPlatformUserId) ??
      stringValue(record.reader_platform_user_id) ??
      stringValue(user?.platformUserId) ??
      stringValue(user?.platform_user_id) ??
      stringValue(user?.platformId),
    userId:
      stringValue(record.userId) ??
      stringValue(record.user_id) ??
      stringValue(record.memberUserId) ??
      stringValue(record.member_user_id) ??
      stringValue(record.targetUserId) ??
      stringValue(record.target_user_id) ??
      stringValue(record.readerUserId) ??
      stringValue(record.reader_user_id) ??
      stringValue(user?.userId) ??
      stringValue(user?.user_id) ??
      stringValue(user?.memberUserId) ??
      stringValue(user?.member_user_id) ??
      stringValue(user?.targetUserId) ??
      stringValue(user?.target_user_id) ??
      stringValue(user?.readerUserId) ??
      stringValue(user?.reader_user_id) ??
      stringValue(record.id) ??
      "",
  };
}

function isCurrentReceiptMember(
  member: GroupReadReceiptMember,
  currentUser?: GroupReadReceiptIdentity | null,
) {
  const currentIds = compactIdentityValues([
    currentUser?.userId,
    currentUser?.platformUserId,
    currentUser?.lppId,
  ]);
  const memberIds = compactIdentityValues([member.userId, member.platformUserId, member.lppId]);
  if (currentIds.length > 0 && memberIds.some((id) => currentIds.includes(id))) return true;
  return Boolean(
    currentUser?.displayName &&
      member.displayName &&
      normalizeText(currentUser.displayName) === normalizeText(member.displayName),
  );
}

function firstArray(record: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = record[key];
    if (Array.isArray(value)) return value;
  }
  return [];
}

function firstRecord(record: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = record[key];
    if (isRecord(value)) return value;
  }
  return undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function numberValue(value: unknown) {
  const number = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(number)) return undefined;
  return Math.max(0, Math.floor(number));
}

function stringValue(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function compactIdentityValues(values: Array<string | null | undefined>) {
  return values.map(normalizeText).filter(Boolean);
}

function normalizeText(value: string | null | undefined) {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}
