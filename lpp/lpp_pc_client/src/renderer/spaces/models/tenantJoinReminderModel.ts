import type { TenantJoinRequestDto } from "../../data/api-client";
import type { PcRealtimeReminderInput } from "../../data/reminder/reminder-types";

export type TenantJoinRequestStatus =
  | "pending"
  | "approved"
  | "rejected"
  | "cancelled"
  | "unknown";

export interface TenantJoinReminderState {
  initialized: boolean;
  previous: TenantJoinRequestDto[];
  next: TenantJoinRequestDto[];
  notifiedIds: Set<string>;
}

export interface TenantJoinReminderReconcileInput {
  initialized: boolean;
  previous?: readonly TenantJoinRequestDto[];
  next: readonly TenantJoinRequestDto[];
  notifiedIds?: Set<string>;
}

export interface TenantJoinReminderReconcileResult extends TenantJoinReminderState {
  reminders: PcRealtimeReminderInput[];
}

const tenantJoinRequestPollIntervalMs = 5 * 60 * 1000;

const pendingStatusValues = new Set([
  "pending",
  "pending_approval",
  "submitted",
  "reviewing",
  "waiting",
  "awaiting_approval",
  "in_review",
]);

const approvedStatusValues = new Set(["approved", "accepted", "passed", "success"]);
const rejectedStatusValues = new Set(["rejected", "denied", "refused", "failed"]);
const cancelledStatusValues = new Set(["cancelled", "canceled", "revoked", "withdrawn"]);

export function tenantJoinRequestsPollIntervalMs(
  requests: readonly TenantJoinRequestDto[] | undefined,
) {
  return (requests ?? []).some((request) => tenantJoinRequestStatus(request) === "pending")
    ? tenantJoinRequestPollIntervalMs
    : false;
}

export function tenantJoinRequestStatus(
  request: Pick<TenantJoinRequestDto, "status"> | null | undefined,
): TenantJoinRequestStatus {
  if (typeof request?.status === "number") {
    if (request.status === 0) return "pending";
    if (request.status === 1) return "approved";
    if (request.status === 2) return "rejected";
    if (request.status === 3) return "cancelled";
  }
  const rawStatus = String(request?.status ?? "").trim().toLowerCase();
  if (!rawStatus) return "unknown";
  if (pendingStatusValues.has(rawStatus)) return "pending";
  if (approvedStatusValues.has(rawStatus)) return "approved";
  if (rejectedStatusValues.has(rawStatus)) return "rejected";
  if (cancelledStatusValues.has(rawStatus)) return "cancelled";
  return "unknown";
}

export function reconcileTenantJoinRequestReminders(
  input: TenantJoinReminderReconcileInput,
): TenantJoinReminderReconcileResult {
  const notifiedIds = new Set(input.notifiedIds);
  const previous = [...(input.previous ?? [])];
  const previousByIdentity = new Map(
    previous
      .map((request) => [tenantJoinRequestIdentity(request), request] as const)
      .filter(([identity]) => Boolean(identity)),
  );
  const reminders: PcRealtimeReminderInput[] = [];

  if (input.initialized) {
    input.next.forEach((request) => {
      const status = tenantJoinRequestStatus(request);
      if (status !== "approved" && status !== "rejected") return;
      const previousRequest = previousByIdentity.get(tenantJoinRequestIdentity(request));
      if (tenantJoinRequestStatus(previousRequest) !== "pending") return;

      const reminder = buildTenantJoinResultReminder(request);
      if (!reminder || notifiedIds.has(reminder.id)) return;
      reminders.push(reminder);
      notifiedIds.add(reminder.id);
    });
  }

  return {
    initialized: true,
    previous: [...input.next],
    next: [...input.next],
    notifiedIds,
    reminders,
  };
}

export function buildTenantJoinResultReminder(
  request: TenantJoinRequestDto,
): PcRealtimeReminderInput | null {
  const status = tenantJoinRequestStatus(request);
  if (status === "approved") {
    const tenantName = displayTenantName(request);
    return {
      id: tenantJoinRequestReminderId(request),
      title: "企业申请已通过",
      body: `你已加入「${tenantName}」，可切换进入企业空间。`,
      targetModule: "enterpriseSwitch",
      targetId: request.tenantId,
      severity: "info",
      icon: "enterprise",
    };
  }
  if (status === "rejected") {
    return {
      id: tenantJoinRequestReminderId(request),
      title: "企业申请未通过",
      body: rejectReason(request),
      targetModule: "enterpriseSwitch",
      targetId: request.tenantId,
      severity: "warning",
      icon: "enterprise",
    };
  }
  return null;
}

export function tenantJoinRequestIdentity(request: TenantJoinRequestDto) {
  return firstNonEmpty(request.requestId, request.tenantId);
}

export function tenantJoinRequestReminderId(request: TenantJoinRequestDto) {
  const requestId = request.requestId?.trim();
  if (requestId) return `tenant-join-request-${requestId}`;
  const tenantId = request.tenantId?.trim();
  return tenantId ? `tenant-join-${tenantId}` : "tenant-join-request-unknown";
}

function displayTenantName(request: TenantJoinRequestDto) {
  return firstNonEmpty(request.tenantName, request.name) || "该企业";
}

function rejectReason(request: TenantJoinRequestDto) {
  return (
    firstNonEmpty(
      request.rejectReason,
      request.reviewReason,
      request.reason,
      request.message,
    ) || "管理员未通过本次加入申请。"
  );
}

function firstNonEmpty(...values: Array<string | null | undefined>) {
  return values.map((value) => value?.trim()).find((value): value is string => Boolean(value));
}
