import type {
  CustomerServiceThread,
  CustomerServiceThreadType,
  StaffServiceHistoryItem,
} from "../api/types";
import { formatMonthDayTime } from "../../lib/format";

export function staffServiceHistoryItemToThread(
  item: StaffServiceHistoryItem,
): CustomerServiceThread {
  const threadType = normalizeHistoryThreadType(item.threadType);
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
    lastMessagePreview:
      item.lastMessagePreview ??
      (item.closedAt
        ? `Closed at ${formatApiShortDateTime(item.closedAt)}`
        : item.lastMessageAt
          ? `Last active ${formatApiShortDateTime(item.lastMessageAt)}`
          : item.participation === "transferred"
            ? "Transferred history conversation"
            : "History conversation"),
    lastMessageAt: item.lastMessageAt ?? item.closedAt ?? item.acceptedAt ?? item.startedAt,
    unreadCount: item.unreadCount ?? 0,
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

function formatApiShortDateTime(value: string) {
  return formatMonthDayTime(value);
}
