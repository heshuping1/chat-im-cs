import {
  createContractIssue,
  type ContractIssue,
} from "../api-contract/contract-result";
import type {
  CustomerServiceThreadType,
  CustomerServiceTransferRecordDto,
} from "../api/types";

export interface CustomerServiceTransferRecordContext {
  conversationId?: string | null;
  threadId?: string;
  threadType?: CustomerServiceThreadType;
}

export interface CustomerServiceTransferRecordViewModel {
  recordId: string;
  fromStaffDisplayName?: string;
  fromStaffUserId?: string;
  reason?: string;
  toStaffDisplayName?: string;
  toStaffUserId?: string;
  transferredAt?: string | null;
  transferredAtText?: string;
  contractIssues: ContractIssue[];
}

export interface CustomerServiceTransferRecordViewModelInput {
  formatTransferredAt?: (value?: string | null) => string;
  records: CustomerServiceTransferRecordDto[];
}

type TransferSourceKind = "event" | "transferHistory" | "gateway";

export function normalizeCustomerServiceTransferRecordsFromDetail(
  payload: unknown,
  context: CustomerServiceTransferRecordContext = {},
): CustomerServiceTransferRecordDto[] {
  const record = asRecord(payload);
  if (!record) return [];

  const nestedCandidates = [
    record,
    asRecord(record.tempSession),
    asRecord(record.temp_session),
    asRecord(record.directChat),
    asRecord(record.direct_chat),
  ].filter((item): item is Record<string, unknown> => Boolean(item));

  const transferRecords = new Map<string, CustomerServiceTransferRecordDto>();
  for (const candidate of nestedCandidates) {
    appendTransferRecords(
      transferRecords,
      readArray(candidate.transferHistory) ?? readArray(candidate.transfer_history),
      "transferHistory",
      context,
    );
    appendTransferRecords(
      transferRecords,
      readArray(candidate.events),
      "event",
      context,
    );
    appendTransferRecords(
      transferRecords,
      readArray(candidate.timeline),
      "event",
      context,
    );
  }
  return [...transferRecords.values()].sort(compareTransferRecordsAscending);
}

export function normalizeCustomerServiceTransferRecordFromGateway(
  payload: unknown,
  context: CustomerServiceTransferRecordContext = {},
): CustomerServiceTransferRecordDto | null {
  return normalizeTransferRecord(payload, "gateway", context);
}

export function createCustomerServiceTransferRecordViewModels(
  input: CustomerServiceTransferRecordViewModelInput,
): CustomerServiceTransferRecordViewModel[] {
  return [...input.records]
    .sort(compareTransferRecordsDescending)
    .map((record) => createCustomerServiceTransferRecordViewModel(record, input));
}

export function createCustomerServiceTransferRecordViewModel(
  record: CustomerServiceTransferRecordDto,
  input: Pick<CustomerServiceTransferRecordViewModelInput, "formatTransferredAt"> = {},
): CustomerServiceTransferRecordViewModel {
  const contractIssues: ContractIssue[] = [];
  const reason = record.reason?.trim();
  const transferredAt = record.transferredAt?.trim() || null;
  const fromStaffUserId = record.fromStaffUserId?.trim();
  const toStaffUserId = record.toStaffUserId?.trim();

  if (!fromStaffUserId) {
    contractIssues.push(
      createContractIssue("cs.transfer_record.from_staff_user_id_missing", "warning", {
        field: "fromStaffUserId",
        message: "Customer service transfer record is missing fromStaffUserId.",
      }),
    );
  }
  if (!toStaffUserId) {
    contractIssues.push(
      createContractIssue("cs.transfer_record.to_staff_user_id_missing", "warning", {
        field: "toStaffUserId",
        message: "Customer service transfer record is missing toStaffUserId.",
      }),
    );
  }
  if (!transferredAt) {
    contractIssues.push(
      createContractIssue("cs.transfer_record.transferred_at_missing", "warning", {
        field: "transferredAt",
        message: "Customer service transfer record is missing transferredAt.",
      }),
    );
  }

  return {
    recordId: record.recordId,
    fromStaffDisplayName: record.fromStaffDisplayName?.trim() || undefined,
    fromStaffUserId: fromStaffUserId || undefined,
    reason: reason || undefined,
    toStaffDisplayName: record.toStaffDisplayName?.trim() || undefined,
    toStaffUserId: toStaffUserId || undefined,
    transferredAt,
    transferredAtText: transferredAt
      ? input.formatTransferredAt?.(transferredAt) ?? transferredAt
      : undefined,
    contractIssues,
  };
}

function appendTransferRecords(
  records: Map<string, CustomerServiceTransferRecordDto>,
  items: unknown[] | undefined,
  sourceKind: TransferSourceKind,
  context: CustomerServiceTransferRecordContext,
) {
  if (!items) return;
  for (const item of items) {
    const normalized = normalizeTransferRecord(item, sourceKind, context);
    if (normalized) records.set(normalized.recordId, normalized);
  }
}

function normalizeTransferRecord(
  payload: unknown,
  sourceKind: TransferSourceKind,
  context: CustomerServiceTransferRecordContext,
): CustomerServiceTransferRecordDto | null {
  const record = asRecord(payload);
  if (!record) return null;
  const detail = asRecord(record.detail) ?? asRecord(record.payload) ?? {};
  if (sourceKind === "event" && !isTransferEvent(record)) return null;

  const reason = readStringField(record, ["reason", "transferReason", "transfer_reason"]) ??
    readStringField(detail, ["reason", "transferReason", "transfer_reason"]) ??
    null;
  const transferredAt =
    readStringField(record, ["transferredAt", "transferred_at", "createdAt", "created_at"]) ??
    readStringField(detail, ["transferredAt", "transferred_at", "createdAt", "created_at"]) ??
    null;
  const fromStaffUserId =
    readStringField(record, ["fromStaffUserId", "from_staff_user_id"]) ??
    readStringField(detail, ["fromStaffUserId", "from_staff_user_id"]) ??
    null;
  const toStaffUserId =
    readStringField(record, [
      "toStaffUserId",
      "to_staff_user_id",
      "assignedStaffUserId",
      "assigned_staff_user_id",
    ]) ??
    readStringField(detail, [
      "toStaffUserId",
      "to_staff_user_id",
      "assignedStaffUserId",
      "assigned_staff_user_id",
    ]) ??
    null;

  if (!reason && !fromStaffUserId && !toStaffUserId && !transferredAt) return null;

  const threadId =
    readStringField(record, ["threadId", "thread_id", "sessionId", "session_id"]) ??
    context.threadId;
  const conversationId =
    readStringField(record, ["conversationId", "conversation_id"]) ??
    context.conversationId ??
    null;
  const threadType = normalizeThreadType(
    readStringField(record, ["threadType", "thread_type", "sourceType", "source_type"]),
    context.threadType,
  );
  const recordId =
    readStringField(record, ["transferId", "transfer_id", "eventId", "event_id", "id"]) ??
    stableTransferRecordId({
      conversationId,
      fromStaffUserId,
      reason,
      threadId,
      toStaffUserId,
      transferredAt,
    });

  return {
    recordId,
    conversationId,
    fromStaffDisplayName:
      readStringField(record, ["fromStaffDisplayName", "from_staff_display_name"]) ??
      readStringField(detail, ["fromStaffDisplayName", "from_staff_display_name"]) ??
      null,
    fromStaffUserId,
    reason,
    threadId,
    threadType,
    toStaffDisplayName:
      readStringField(record, ["toStaffDisplayName", "to_staff_display_name", "assignedStaffDisplayName"]) ??
      readStringField(detail, ["toStaffDisplayName", "to_staff_display_name", "assignedStaffDisplayName"]) ??
      null,
    toStaffUserId,
    transferredAt,
  };
}

function isTransferEvent(record: Record<string, unknown>) {
  const eventType = readStringField(record, [
    "eventType",
    "event_type",
    "type",
    "kind",
    "name",
  ]);
  if (!eventType) return false;
  const normalized = eventType.trim().toLowerCase().replace(/[-.]/g, "_");
  return [
    "transfer",
    "transferred",
    "thread_transfer",
    "thread_transferred",
    "temp_session_transferred",
    "customer_service_thread_transferred",
  ].includes(normalized);
}

function stableTransferRecordId(input: {
  conversationId?: string | null;
  fromStaffUserId?: string | null;
  reason?: string | null;
  threadId?: string;
  toStaffUserId?: string | null;
  transferredAt?: string | null;
}) {
  return [
    "transfer",
    input.threadId ?? "",
    input.conversationId ?? "",
    input.fromStaffUserId ?? "",
    input.toStaffUserId ?? "",
    input.transferredAt ?? "",
    input.reason ?? "",
  ].join(":");
}

function compareTransferRecordsAscending(
  left: CustomerServiceTransferRecordDto,
  right: CustomerServiceTransferRecordDto,
) {
  return transferTime(left) - transferTime(right) ||
    left.recordId.localeCompare(right.recordId);
}

function compareTransferRecordsDescending(
  left: CustomerServiceTransferRecordDto,
  right: CustomerServiceTransferRecordDto,
) {
  return transferTime(right) - transferTime(left) ||
    right.recordId.localeCompare(left.recordId);
}

function transferTime(record: CustomerServiceTransferRecordDto) {
  const parsed = Date.parse(record.transferredAt ?? "");
  return Number.isFinite(parsed) ? parsed : 0;
}

function normalizeThreadType(
  value: string | undefined,
  fallback?: CustomerServiceThreadType,
): CustomerServiceThreadType | undefined {
  if (!value) return fallback;
  return value.trim().toLowerCase().replace(/-/g, "_") === "temp_session"
    ? "temp_session"
    : "im_direct";
}

function readArray(value: unknown) {
  return Array.isArray(value) ? value : undefined;
}

function readStringField(record: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return undefined;
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;
}
