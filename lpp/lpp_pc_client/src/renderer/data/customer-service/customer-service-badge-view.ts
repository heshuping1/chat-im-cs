import {
  normalizeCustomerServiceThreadType,
  type CustomerServiceThread,
} from "../api/types";
import { isTerminalCustomerServiceThreadStatus } from "./cs-thread-state";
import { createCustomerServiceLiveCounters } from "./customer-service-live-counters";

export interface CustomerServiceBadgeViewInput {
  activeItems?: CustomerServiceThread[];
  queueItems?: CustomerServiceThread[];
  summaryQueuedCount?: number | null;
  threadDataLoaded: boolean;
}

export interface CustomerServiceBadgeView {
  activeServiceUnreadCount: number;
  activeTempSessions: CustomerServiceThread[];
  closedHistoryUnreadCount: number;
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
  const liveCounters = createCustomerServiceLiveCounters({ activeItems, queueItems });
  const closedHistoryUnreadCount = input.threadDataLoaded
    ? [...queueItems, ...activeItems]
        .filter(
          (item) =>
            normalizeCustomerServiceThreadType(item.threadType) === "temp_session" &&
            isTerminalCustomerServiceThreadStatus(item.status),
        )
        .reduce((sum, item) => sum + Math.max(0, Number(item.unreadCount ?? 0)), 0)
    : 0;
  const queuedServiceCount = input.threadDataLoaded ? liveCounters.queuedServiceCount : 0;
  const activeServiceUnreadCount = input.threadDataLoaded
    ? liveCounters.activeServiceUnreadCount
    : 0;
  return {
    activeServiceUnreadCount,
    activeTempSessions: input.threadDataLoaded ? liveCounters.activeTempSessions : [],
    closedHistoryUnreadCount,
    queuedServiceCount,
    queuedTempSessions: input.threadDataLoaded ? liveCounters.queuedTempSessions : [],
    serviceAlertCount: queuedServiceCount + activeServiceUnreadCount,
    taskbarServiceUnreadCount: activeServiceUnreadCount,
  };
}
