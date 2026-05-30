import {
  createContractIssue,
  degradedContract,
  failedContract,
  invalidContract,
  okContract,
  type ContractIssue,
  type ContractResult,
} from "../api-contract/contract-result";
import type {
  CustomerProfileCard,
  CustomerServiceThread,
  CustomerServiceThreadType,
} from "../api/types";

export interface CustomerServiceThreadEntity {
  type: CustomerServiceThreadType;
  id: string;
  conversationId: string;
  status: string;
  normalizedStatus: string;
  isTerminal: boolean;
  title: string;
  source?: string;
  from?: string;
  channel?: string;
  sourceChannel?: string;
  entryChannel?: string;
  platform?: string;
  provider?: string;
  avatarUrl?: string | null;
  customerAvatarUrl?: string | null;
  isVip?: boolean;
  customerLevel?: string;
  priority?: string;
  tags: string[];
  lastMessagePreview?: string;
  lastMessageAt?: string | null;
  updatedAt?: string | null;
  assignedAt?: string | null;
  unreadCount: number;
}

export interface CustomerProfileEntity {
  customerUserId?: string;
  customerId?: string;
  userId?: string;
  platformUserId?: string;
  lppId?: string;
  lppNo?: string;
  lppNumber?: string;
  displayName: string;
  avatarUrl?: string | null;
  isVip?: boolean;
  customerLevel?: string;
  kycStatus?: string;
  complianceStatus?: string;
  riskLevel?: string;
  language?: string;
  source?: string;
  from?: string;
  channel?: string;
  sourceChannel?: string;
  entryChannel?: string;
  platform?: string;
  provider?: string;
  tags: string[];
  tabCounts?: Record<string, number>;
  tradingSummary?: Record<string, unknown>;
  temporaryOrders?: Array<Record<string, unknown>>;
  tickets?: Array<Record<string, unknown>>;
  externalSections?: CustomerProfileCard["externalSections"];
}

const terminalStatuses = new Set([
  "closed",
  "closed_by_visitor",
  "closed_by_staff",
  "closed_timeout",
  "closed_system",
  "archived",
  "ended",
  "finished",
  "resolved",
  "terminated",
  "cancelled",
  "canceled",
  "expired",
  "5",
  "6",
  "7",
  "8",
  "9",
]);

export function normalizeCustomerServiceThreadDto(
  input: unknown,
): ContractResult<CustomerServiceThreadEntity> {
  try {
    const record = asRecord(input);
    const issues: ContractIssue[] = [];
    const id = stringField(
      record,
      "threadId",
      "thread_id",
      "sessionId",
      "session_id",
      "visitorSessionId",
      "tempSessionId",
    );
    const conversationId =
      stringField(record, "conversationId", "conversation_id") || id;
    const type = normalizeThreadType(
      stringField(record, "threadType", "thread_type", "conversationType", "conversation_type"),
    );
    const status = stringField(record, "status", "threadStatus", "thread_status") || "";
    const title =
      stringField(
        record,
        "title",
        "customerDisplayName",
        "customerName",
        "customerNickname",
        "customer_nickname",
        "visitorDisplayName",
        "visitor_display_name",
        "visitorName",
        "visitor_name",
        "visitorNickname",
        "visitor_nickname",
        "peerDisplayName",
        "peer_display_name",
        "displayName",
        "display_name",
        "nickname",
        "name",
      ) || "访客";

    if (!id) {
      issues.push(
        createContractIssue("cs.thread.missing_id", "error", {
          field: "threadId",
        }),
      );
    }
    if (!status) {
      issues.push(
        createContractIssue("cs.thread.missing_status", "warning", {
          field: "status",
        }),
      );
    }
    if (title === "访客") {
      issues.push(
        createContractIssue("cs.thread.missing_title", "warning", {
          field: "title",
        }),
      );
    }
    if (!conversationId) {
      issues.push(
        createContractIssue("cs.thread.missing_conversation_id", "warning", {
          field: "conversationId",
        }),
      );
    }

    if (hasErrorIssue(issues)) return invalidContract(issues);

    const normalizedStatus = normalizeStatus(status);
    const entity: CustomerServiceThreadEntity = {
      type,
      id: id ?? "",
      conversationId: conversationId || id || "",
      status,
      normalizedStatus,
      isTerminal: isTerminalStatus(normalizedStatus),
      title,
      source: stringField(record, "source"),
      from: stringField(record, "from"),
      channel: stringField(record, "channel"),
      sourceChannel: stringField(record, "sourceChannel", "source_channel"),
      entryChannel: stringField(record, "entryChannel", "entry_channel"),
      platform: stringField(record, "platform"),
      provider: stringField(record, "provider"),
      avatarUrl: nullableStringField(record, "avatarUrl", "avatar_url", "customerAvatarUrl", "customer_avatar_url"),
      customerAvatarUrl: nullableStringField(record, "customerAvatarUrl", "customer_avatar_url"),
      isVip: booleanField(record, "isVip", "is_vip"),
      customerLevel: stringField(record, "customerLevel", "customer_level", "level", "grade", "rank"),
      priority: stringField(record, "priority"),
      tags: stringArrayField(record, "tags"),
      lastMessagePreview: stringField(record, "lastMessagePreview", "last_message_preview"),
      lastMessageAt: nullableStringField(record, "lastMessageAt", "last_message_at"),
      updatedAt: nullableStringField(record, "updatedAt", "updated_at"),
      assignedAt: nullableStringField(record, "assignedAt", "assigned_at"),
      unreadCount: Math.max(0, Math.floor(numberField(record, "unreadCount", "unread_count") ?? 0)),
    };

    return issues.length ? degradedContract(entity, issues) : okContract(entity);
  } catch (error) {
    return failedContract(error, [
      createContractIssue("cs.thread.normalize_failed", "error", {
        field: "thread",
      }),
    ]);
  }
}

export function customerServiceThreadEntityToDto(
  entity: CustomerServiceThreadEntity,
  source: Partial<CustomerServiceThread> = {},
): CustomerServiceThread {
  return {
    ...source,
    threadType: entity.type,
    threadId: entity.id,
    conversationId: entity.conversationId,
    status: entity.status,
    title: entity.title,
    source: entity.source,
    from: entity.from,
    channel: entity.channel,
    sourceChannel: entity.sourceChannel,
    entryChannel: entity.entryChannel,
    platform: entity.platform,
    provider: entity.provider,
    avatarUrl: entity.avatarUrl,
    customerAvatarUrl: entity.customerAvatarUrl,
    isVip: entity.isVip,
    customerLevel: entity.customerLevel,
    priority: entity.priority,
    tags: entity.tags,
    lastMessagePreview: entity.lastMessagePreview,
    lastMessageAt: entity.lastMessageAt,
    updatedAt: entity.updatedAt,
    assignedAt: entity.assignedAt,
    unreadCount: entity.unreadCount,
  };
}

export function normalizeCustomerProfileDto(
  input: unknown,
): ContractResult<CustomerProfileEntity> {
  try {
    const record = asRecord(input);
    const issues: ContractIssue[] = [];
    const displayName =
      stringField(
        record,
        "displayName",
        "display_name",
        "customerDisplayName",
        "customerName",
        "nickname",
        "name",
      ) || "访客";
    if (displayName === "访客") {
      issues.push(
        createContractIssue("cs.profile.missing_display_name", "warning", {
          field: "displayName",
        }),
      );
    }

    const entity: CustomerProfileEntity = {
      customerUserId: stringField(record, "customerUserId", "customer_user_id"),
      customerId: stringField(record, "customerId", "customer_id"),
      userId: stringField(record, "userId", "user_id"),
      platformUserId: stringField(record, "platformUserId", "platform_user_id"),
      lppId: stringField(record, "lppId", "lpp_id", "customerLppId", "customer_lpp_id"),
      lppNo: stringField(record, "lppNo", "lpp_no", "customerLppNo", "customer_lpp_no"),
      lppNumber: stringField(record, "lppNumber", "lpp_number"),
      displayName,
      avatarUrl: nullableStringField(record, "avatarUrl", "avatar_url"),
      isVip: booleanField(record, "isVip", "is_vip"),
      customerLevel: stringField(record, "customerLevel", "customer_level", "level", "grade", "rank"),
      kycStatus: stringField(record, "kycStatus", "kyc_status", "kyc", "kycLevel", "kyc_level"),
      complianceStatus: stringField(record, "complianceStatus", "compliance_status"),
      riskLevel: stringField(record, "riskLevel", "risk_level", "risk", "riskStatus", "risk_status"),
      language: stringField(record, "language"),
      source: stringField(record, "source"),
      from: stringField(record, "from"),
      channel: stringField(record, "channel"),
      sourceChannel: stringField(record, "sourceChannel", "source_channel"),
      entryChannel: stringField(record, "entryChannel", "entry_channel"),
      platform: stringField(record, "platform"),
      provider: stringField(record, "provider"),
      tags: stringArrayField(record, "tags"),
      tabCounts: asNumberRecord(record.tabCounts ?? record.tab_counts),
      tradingSummary: asRecordOrUndefined(record.tradingSummary ?? record.trading_summary),
      temporaryOrders: recordArray(record.temporaryOrders ?? record.temporary_orders),
      tickets: recordArray(record.tickets),
      externalSections: Array.isArray(record.externalSections)
        ? (record.externalSections as CustomerProfileCard["externalSections"])
        : undefined,
    };

    return issues.length ? degradedContract(entity, issues) : okContract(entity);
  } catch (error) {
    return failedContract(error, [
      createContractIssue("cs.profile.normalize_failed", "error", {
        field: "profile",
      }),
    ]);
  }
}

export function customerProfileEntityToDto(
  entity: CustomerProfileEntity,
  source: Partial<CustomerProfileCard> = {},
): CustomerProfileCard {
  return {
    ...source,
    customerUserId: entity.customerUserId,
    customerId: entity.customerId,
    userId: entity.userId,
    platformUserId: entity.platformUserId,
    lppId: entity.lppId,
    lppNo: entity.lppNo,
    lppNumber: entity.lppNumber,
    displayName: entity.displayName,
    avatarUrl: entity.avatarUrl ?? undefined,
    isVip: entity.isVip,
    customerLevel: entity.customerLevel,
    kycStatus: entity.kycStatus,
    complianceStatus: entity.complianceStatus,
    riskLevel: entity.riskLevel,
    language: entity.language,
    source: entity.source,
    from: entity.from,
    channel: entity.channel,
    sourceChannel: entity.sourceChannel,
    entryChannel: entity.entryChannel,
    platform: entity.platform,
    provider: entity.provider,
    tags: entity.tags,
    tabCounts: entity.tabCounts,
    tradingSummary: entity.tradingSummary,
    temporaryOrders: entity.temporaryOrders,
    tickets: entity.tickets,
    externalSections: entity.externalSections,
  };
}

export function normalizeCustomerServiceThreadStatusValue(value?: string | number | null) {
  return String(value ?? "").trim().toLowerCase().replace(/-/g, "_");
}

function normalizeStatus(value?: string | number | null) {
  return normalizeCustomerServiceThreadStatusValue(value);
}

function isTerminalStatus(status: string) {
  return terminalStatuses.has(status) || status.startsWith("closed");
}

function normalizeThreadType(value?: string): CustomerServiceThreadType {
  const normalized = String(value ?? "").trim().toLowerCase().replace(/-/g, "_");
  return normalized === "temp_session" ? "temp_session" : "im_direct";
}

function hasErrorIssue(issues: ContractIssue[]) {
  return issues.some((issue) => issue.level === "error");
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function asRecordOrUndefined(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;
}

function recordArray(value: unknown) {
  return Array.isArray(value)
    ? value.filter(
        (item): item is Record<string, unknown> =>
          Boolean(item && typeof item === "object" && !Array.isArray(item)),
      )
    : undefined;
}

function asNumberRecord(value: unknown): Record<string, number> | undefined {
  const record = asRecordOrUndefined(value);
  if (!record) return undefined;
  return Object.fromEntries(
    Object.entries(record).filter((entry): entry is [string, number] => {
      const [, item] = entry;
      return typeof item === "number" && Number.isFinite(item);
    }),
  );
}

function stringField(record: Record<string, unknown>, ...keys: string[]) {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) return value.trim();
    if (typeof value === "number") return String(value);
  }
  return undefined;
}

function nullableStringField(record: Record<string, unknown>, ...keys: string[]) {
  for (const key of keys) {
    const value = record[key];
    if (value === null) return null;
    if (typeof value === "string" && value.trim()) return value.trim();
    if (typeof value === "number") return String(value);
  }
  return undefined;
}

function numberField(record: Record<string, unknown>, ...keys: string[]) {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "string" && value.trim() && Number.isFinite(Number(value))) {
      return Number(value);
    }
  }
  return undefined;
}

function booleanField(record: Record<string, unknown>, ...keys: string[]) {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "boolean") return value;
  }
  return undefined;
}

function stringArrayField(record: Record<string, unknown>, ...keys: string[]) {
  for (const key of keys) {
    const value = record[key];
    if (Array.isArray(value)) {
      return value.filter((item): item is string => typeof item === "string" && item.length > 0);
    }
  }
  return [];
}
