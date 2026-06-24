import type {
  CustomerServiceThread,
  CustomerServiceThreadType,
  StaffServiceHistoryItem,
} from "../api/types";

export function staffServiceHistoryItemToThread(
  item: StaffServiceHistoryItem,
): CustomerServiceThread {
  const threadType = normalizeHistoryThreadType(item.threadType);
  const record = item as StaffServiceHistoryItem & Record<string, unknown>;
  return {
    threadType,
    threadId: item.threadId,
    conversationId: item.conversationId || item.threadId,
    status: String(item.status ?? ""),
    title: historyThreadTitle(item),
    source: item.source,
    from: item.from,
    channel: item.channel,
    sourceChannel: item.sourceChannel,
    entryChannel: item.entryChannel,
    platform: item.platform,
    provider: item.provider,
    avatarUrl: item.avatarUrl || item.customerAvatarUrl,
    customerAvatarUrl: item.customerAvatarUrl,
    assignedStaffAvatarUrl: readHistoryStaffField(record, [
      "assignedStaffAvatarUrl",
      "assigned_staff_avatar_url",
      "staffAvatarUrl",
      "staff_avatar_url",
      "serviceStaffAvatarUrl",
      "service_staff_avatar_url",
    ], ["avatarUrl", "avatar", "profileAvatarUrl"]),
    assignedStaffDisplayName: readHistoryStaffField(record, [
      "assignedStaffDisplayName",
      "assigned_staff_display_name",
      "staffDisplayName",
      "staff_display_name",
      "displayName",
    ], ["displayName", "name", "nickname"]),
    assignedStaffName: readHistoryStaffField(record, [
      "assignedStaffName",
      "assigned_staff_name",
      "staffName",
      "staff_name",
    ], ["name", "displayName", "nickname"]),
    assignedStaffUserId: readHistoryStaffField(record, [
      "assignedStaffUserId",
      "assigned_staff_user_id",
      "staffUserId",
      "staff_user_id",
      "serviceStaffUserId",
      "service_staff_user_id",
    ], ["staffUserId", "userId", "id"]),
    serviceStaffAvatarUrl: readHistoryStaffField(record, [
      "serviceStaffAvatarUrl",
      "service_staff_avatar_url",
    ], ["avatarUrl", "avatar", "profileAvatarUrl"]),
    serviceStaffUserId: readHistoryStaffField(record, [
      "serviceStaffUserId",
      "service_staff_user_id",
    ], ["staffUserId", "userId", "id"]),
    staffAvatarUrl: readHistoryStaffField(record, [
      "staffAvatarUrl",
      "staff_avatar_url",
    ], ["avatarUrl", "avatar", "profileAvatarUrl"]),
    staffDisplayName: readHistoryStaffField(record, [
      "staffDisplayName",
      "staff_display_name",
    ], ["displayName", "name", "nickname"]),
    staffName: readHistoryStaffField(record, [
      "staffName",
      "staff_name",
    ], ["name", "displayName", "nickname"]),
    staffUserId: readHistoryStaffField(record, [
      "staffUserId",
      "staff_user_id",
    ], ["staffUserId", "userId", "id"]),
    lastMessagePreview: item.lastMessagePreview,
    lastMessageAt:
      readHistoryLastMessageAt(record) ??
      item.closedAt ??
      item.acceptedAt ??
      item.startedAt,
    unreadCount: item.unreadCount ?? 0,
    historyItem: item as StaffServiceHistoryItem & Record<string, unknown>,
  };
}

function normalizeHistoryThreadType(threadType?: string | null): CustomerServiceThreadType {
  const normalized = (threadType ?? "").trim().toLowerCase().replace(/-/g, "_");
  if (normalized === "temp_session") return "temp_session";
  return "im_direct";
}

function historyThreadTitle(item: StaffServiceHistoryItem) {
  const raw =
    item.title ||
    readStringField(item, "customerDisplayName") ||
    readStringField(item, "customerName") ||
    readStringField(item, "customerNickname") ||
    readStringField(item, "visitorDisplayName") ||
    readStringField(item, "visitorName") ||
    readStringField(item, "visitorNickname") ||
    readStringField(item, "peerDisplayName") ||
    readStringField(item, "displayName") ||
    readStringField(item, "nickname") ||
    readStringField(item, "name");
  const value = raw?.trim();
  if (!value || value.startsWith("History conversation")) return "访客";
  return value;
}

function readStringField(source: unknown, key: string) {
  if (!source || typeof source !== "object") return undefined;
  const value = (source as Record<string, unknown>)[key];
  return typeof value === "string" && value.trim() ? value : undefined;
}

function readHistoryLastMessageAt(source: Record<string, unknown>) {
  const nestedMessage =
    readRecordField(source, "lastMessage") ||
    readRecordField(source, "last_message") ||
    readRecordField(source, "latestMessage") ||
    readRecordField(source, "latest_message");
  return readFirstStringField(source, ["lastMessageAt", "last_message_at"]) ||
    readFirstStringField(nestedMessage ?? {}, [
      "sentAt",
      "sent_at",
      "createdAt",
      "created_at",
    ]);
}

function readRecordField(source: Record<string, unknown>, key: string) {
  const value = source[key];
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;
}

function readHistoryStaffField(
  source: Record<string, unknown>,
  directKeys: string[],
  nestedKeys: string[],
) {
  const direct = readFirstStringField(source, directKeys);
  if (direct) return direct;
  return readNestedStaffStringField(source, nestedKeys);
}

function readFirstStringField(source: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = readStringField(source, key);
    if (value) return value;
  }
  return null;
}

function readNestedStaffStringField(
  source: Record<string, unknown>,
  keys: string[],
) {
  const staffRecords = [
    source.assignedStaff,
    source.assigned_staff,
    source.staff,
    source.serviceStaff,
    source.service_staff,
  ].filter((value): value is Record<string, unknown> =>
    Boolean(value && typeof value === "object" && !Array.isArray(value)),
  );
  for (const staffRecord of staffRecords) {
    const value = readFirstStringField(staffRecord, keys);
    if (value) return value;
  }
  return null;
}

