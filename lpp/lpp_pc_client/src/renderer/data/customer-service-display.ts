import { customerServiceStatuses } from "./static-config";
import type { CustomerServiceThread } from "./api-client";

export interface CustomerServiceTextDescriptor {
  key: string;
  params?: Record<string, string | number>;
}

export function isQueuedCustomerServiceThread(thread: CustomerServiceThread) {
  const status = normalizeStatus(thread.status);
  return status === "queued" || status.includes("queue") || status.includes("waiting");
}

export function createCustomerServiceThreadStatusDescriptor(
  thread: CustomerServiceThread,
): CustomerServiceTextDescriptor {
  if (isQueuedCustomerServiceThread(thread)) {
    return { key: "customerService.status.queueing" };
  }
  const status = normalizeStatus(thread.status);
  if (status.includes("ai")) return { key: "customerService.status.aiTransfer" };
  return { key: "customerService.status.serving" };
}

export function customerServiceHistoryStatusKey(status: string | number) {
  const normalized = normalizeStatus(status);
  if (normalized === "5" || normalized === "closed_by_visitor") {
    return "customerService.threadList.historyStatus.closedByVisitor";
  }
  if (normalized === "6" || normalized === "closed_by_staff") {
    return "customerService.threadList.historyStatus.closedByStaff";
  }
  if (normalized === "7" || normalized === "closed_timeout") {
    return "customerService.threadList.historyStatus.closedTimeout";
  }
  if (normalized === "8" || normalized === "closed_system") {
    return "customerService.threadList.historyStatus.closedSystem";
  }
  if (normalized === "9" || normalized === "archived") {
    return "customerService.threadList.historyStatus.archived";
  }
  return "customerService.threadList.historyStatus.ended";
}

export function createCustomerServiceHistoryStatusDescriptor(
  status: string | number,
): CustomerServiceTextDescriptor {
  return { key: customerServiceHistoryStatusKey(status) };
}

export function customerServiceReceptionStatusLabelKey(value?: string | null) {
  return (
    customerServiceStatuses.find((item) => item.value === value)?.labelKey ??
    "sidebar.service.statusUnsynced"
  );
}

function normalizeStatus(value?: string | number | null) {
  return String(value ?? "").toLowerCase().replace(/-/g, "_");
}
