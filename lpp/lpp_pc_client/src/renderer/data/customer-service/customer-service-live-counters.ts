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
  const currentTempSessions = [
    ...(input.activeItems ?? []),
    ...(input.queueItems ?? []),
  ].filter(isDisplayableTempSession);
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

function isDisplayableTempSession(thread: CustomerServiceThread) {
  return (
    normalizeCustomerServiceThreadType(thread.threadType) === "temp_session" &&
    !isTerminalCustomerServiceThreadStatus(thread.status)
  );
}
