import { customerServiceStatuses } from "./static-config";
import type { CustomerServiceThread } from "./api-client";

export function isQueuedCustomerServiceThread(thread: CustomerServiceThread) {
  const status = normalizeStatus(thread.status);
  return status === "queued" || status.includes("queue") || status.includes("waiting");
}

export function customerServiceThreadStatusLabel(thread: CustomerServiceThread) {
  if (isQueuedCustomerServiceThread(thread)) return "客户排队中";
  const status = normalizeStatus(thread.status);
  if (status.includes("ai")) return "AI 转人工";
  return "人工服务中";
}

export function customerServiceHistoryStatusLabel(status: string | number) {
  const normalized = normalizeStatus(status);
  if (normalized === "5" || normalized === "closed_by_visitor") return "访客关闭";
  if (normalized === "6" || normalized === "closed_by_staff") return "客服关闭";
  if (normalized === "7" || normalized === "closed_timeout") return "超时关闭";
  if (normalized === "8" || normalized === "closed_system") return "系统关闭";
  if (normalized === "9" || normalized === "archived") return "已归档";
  if (normalized.startsWith("closed")) return "已结束";
  return "已结束";
}

export function customerServiceReceptionStatusLabel(value?: string | null) {
  return (
    customerServiceStatuses.find((item) => item.value === value)?.label ??
    "--"
  );
}

function normalizeStatus(value?: string | number | null) {
  return String(value ?? "").toLowerCase().replace(/-/g, "_");
}
