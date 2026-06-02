import {
  normalizeCustomerServiceThreadType,
  type CustomerServiceThread,
} from "../api/types";
import { isQueuedCustomerServiceThread } from "../customer-service-display";

export interface CustomerServiceBadgeViewInput {
  activeItems?: CustomerServiceThread[];
  queueItems?: CustomerServiceThread[];
  summaryQueuedCount?: number | null;
  threadDataLoaded: boolean;
}

export interface CustomerServiceBadgeView {
  activeServiceUnreadCount: number;
  activeTempSessions: CustomerServiceThread[];
  queuedServiceCount: number;
  queuedTempSessions: CustomerServiceThread[];
  serviceAlertCount: number;
  taskbarServiceUnreadCount: number;
}

export function resolveCustomerServiceBadgeView(
  input: CustomerServiceBadgeViewInput,
): CustomerServiceBadgeView {
  const activeItems = input.activeItems ?? [];
  const queueItems = input.queueItems ?? [];
  const queuedTempSessions = [...queueItems, ...activeItems].filter(
    (item) =>
      normalizeCustomerServiceThreadType(item.threadType) === "temp_session" &&
      isQueuedCustomerServiceThread(item),
  );
  const activeTempSessions = activeItems.filter(
    (item) => normalizeCustomerServiceThreadType(item.threadType) === "temp_session",
  );
  const queuedServiceCount = input.threadDataLoaded
    ? Math.max(input.summaryQueuedCount ?? 0, queuedTempSessions.length)
    : 0;
  const activeServiceUnreadCount = input.threadDataLoaded
    ? activeTempSessions.reduce(
        (sum, item) => sum + Math.max(0, Number(item.unreadCount ?? 0)),
        0,
      )
    : 0;
  return {
    activeServiceUnreadCount,
    activeTempSessions,
    queuedServiceCount,
    queuedTempSessions,
    serviceAlertCount: queuedServiceCount + activeServiceUnreadCount,
    taskbarServiceUnreadCount: activeServiceUnreadCount,
  };
}
