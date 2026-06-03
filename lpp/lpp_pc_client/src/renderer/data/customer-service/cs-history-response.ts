import type {
  CustomerServiceThread,
  StaffServiceHistoryItem,
  StaffServiceHistoryResponse,
} from "../api/types";
import { applyCustomerServiceThreadOverlay } from "./cs-conversation-index";
import { staffServiceHistoryItemToThread } from "./cs-history-model";
import { recordCsRoutingDiagnostic } from "./cs-routing-diagnostics";
import { isTerminalCustomerServiceThreadStatus } from "./cs-thread-state";

export function normalizeStaffServiceHistoryResponse(
  response: StaffServiceHistoryResponse,
  scopeKey?: string,
): StaffServiceHistoryResponse {
  const rawItems = response.items ?? [];
  const historyItems = rawItems
    .filter(isCustomerServiceThreadSnapshot)
    .map((serverItem) => ({
      overlayItem: applyStaffServiceHistoryOverlay(serverItem, scopeKey),
      serverItem,
    }));
  const items = historyItems.map((item) => item.overlayItem);
  recordCsRoutingDiagnostic({
    event: "pc-cs-service-history",
    source: "customer-service-history",
    phase: "filter",
    route: "service-history",
    classification: {
      dropped: rawItems.length - items.length,
      kept: items.length,
      total: rawItems.length,
    },
    summary: {
      dropped: rawItems
        .filter((item) => !isCustomerServiceThreadSnapshot(item))
        .slice(0, 20),
    },
  });
  recordStaffServiceHistorySnapshotDiagnostic(historyItems);
  return {
    ...response,
    items,
  };
}

function isCustomerServiceThreadSnapshot(item: CustomerServiceThread | StaffServiceHistoryItem) {
  const record = item as unknown as Record<string, unknown>;
  const type = normalizeResponseWireType(
    readString(record.threadType) ||
      readString(record.thread_type) ||
      readString(record.conversationType) ||
      readString(record.conversation_type) ||
      readString(record.type),
  );
  if (type === "direct" || type === "group" || type === "im_group" || type === "group_chat") {
    return false;
  }
  if (type === "temp_session" || type === "im_direct") return true;
  if (asRecord(record.tempSession ?? record.temp_session)) return true;
  if (readString(record.sessionId) || readString(record.session_id)) return true;
  return Boolean(readString(record.threadId) || readString(record.thread_id));
}

function normalizeResponseWireType(value?: string | null) {
  return String(value ?? "").trim().toLowerCase().replace(/-/g, "_");
}

function recordStaffServiceHistorySnapshotDiagnostic(
  items: Array<{ overlayItem: StaffServiceHistoryItem; serverItem: StaffServiceHistoryItem }>,
) {
  const terminalItems = items.filter(({ overlayItem }) =>
    isTerminalCustomerServiceThreadStatus(String(overlayItem.status ?? "")),
  );
  const missingServerUnreadCount = items.filter(
    ({ serverItem }) => serverItem.unreadCount === undefined,
  ).length;
  const serverUnreadItems = items.filter(
    ({ serverItem }) => typeof serverItem.unreadCount === "number" && serverItem.unreadCount > 0,
  ).length;
  const overlayUnreadItems = items.filter(
    ({ overlayItem }) => typeof overlayItem.unreadCount === "number" && overlayItem.unreadCount > 0,
  ).length;
  recordCsRoutingDiagnostic({
    event: "pc-cs-service-history",
    source: "customer-service-history",
    phase: "history-snapshot",
    route: "service-history",
    classification: {
      missingServerUnreadCount,
      overlayUnreadItems,
      serverUnreadItems,
      terminalItems: terminalItems.length,
      total: items.length,
    },
    summary: {
      items: items.slice(0, 20).map(createStaffServiceHistoryDiagnosticItem),
      unreadOrMissingItems: items
        .filter(
          ({ overlayItem, serverItem }) =>
            serverItem.unreadCount === undefined ||
            (serverItem.unreadCount ?? 0) > 0 ||
            (overlayItem.unreadCount ?? 0) > 0,
        )
        .slice(0, 20)
        .map(createStaffServiceHistoryDiagnosticItem),
    },
  });
}

function createStaffServiceHistoryDiagnosticItem({
  overlayItem,
  serverItem,
}: {
  overlayItem: StaffServiceHistoryItem;
  serverItem: StaffServiceHistoryItem;
}) {
  return {
    closedAt: overlayItem.closedAt,
    conversationId: overlayItem.conversationId ?? serverItem.conversationId,
    lastMessageAt: overlayItem.lastMessageAt ?? serverItem.lastMessageAt,
    overlayLastMessagePreviewPresent: Boolean(overlayItem.lastMessagePreview),
    overlayUnreadCount: overlayItem.unreadCount,
    serverLastMessagePreviewPresent: Boolean(serverItem.lastMessagePreview),
    serverUnreadCount: serverItem.unreadCount,
    status: String(overlayItem.status ?? serverItem.status ?? ""),
    terminal: isTerminalCustomerServiceThreadStatus(String(overlayItem.status ?? "")),
    threadId: overlayItem.threadId || serverItem.threadId,
    threadType: overlayItem.threadType || serverItem.threadType,
  };
}

function applyStaffServiceHistoryOverlay(
  item: StaffServiceHistoryItem,
  scopeKey?: string,
): StaffServiceHistoryItem {
  const overlayed = applyCustomerServiceThreadOverlay(
    staffServiceHistoryItemToThread(item),
    scopeKey,
  );
  const hasServerUnreadCount = typeof item.unreadCount === "number";
  return {
    ...item,
    lastMessageAt: overlayed.lastMessageAt ?? item.lastMessageAt,
    lastMessagePreview: overlayed.lastMessagePreview ?? item.lastMessagePreview,
    unreadCount: hasServerUnreadCount ? item.unreadCount : overlayed.unreadCount,
  };
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;
}

function readString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}
