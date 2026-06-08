export interface GroupReadReceiptMember {
  userId: string;
  displayName: string;
  avatarUrl?: string | null;
  lastReadSeq: number;
  hasRead: boolean;
}

export interface GroupReadReceipts {
  members: GroupReadReceiptMember[];
  readMembers: GroupReadReceiptMember[];
  unreadMembers: GroupReadReceiptMember[];
  readCount: number;
  totalMembers: number;
  unreadCount: number;
}

export function parseGroupReadReceiptsPayload(
  payload: unknown,
  { messageSeq }: { messageSeq: number },
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
    return receiptsFromMembers(members, members.length);
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
): GroupReadReceipts {
  const readMembers = members.filter((member) => member.hasRead);
  const unreadMembers = members.filter((member) => !member.hasRead);
  return {
    members,
    readMembers,
    unreadMembers,
    readCount: members.length > 0 ? readMembers.length : fallbackReadCount,
    totalMembers,
    unreadCount: members.length > 0 ? unreadMembers.length : fallbackUnreadCount,
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
  return {
    avatarUrl: stringValue(record.avatarUrl) ?? stringValue(record.avatar),
    displayName:
      stringValue(record.displayName) ??
      stringValue(record.name) ??
      stringValue(record.nickname) ??
      stringValue(record.userName) ??
      "用户",
    hasRead,
    lastReadSeq,
    userId: stringValue(record.userId) ?? stringValue(record.id) ?? "",
  };
}

function firstArray(record: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = record[key];
    if (Array.isArray(value)) return value;
  }
  return [];
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
