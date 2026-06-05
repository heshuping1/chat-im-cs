import type {
  CustomerServiceQuickReplyDto,
  CustomerServiceQuickReplyScope,
  CustomerServiceThreadType,
} from "./types";

const quickReplyListKeys = ["items", "quickReplies", "replies", "records", "list", "results", "data"];

export type QuickReplyFilterScope = "all" | "temp_session" | "direct_customer";

export function normalizeQuickRepliesResponse(payload: unknown): CustomerServiceQuickReplyDto[] {
  return extractArray(payload)
    .map((item) => normalizeQuickReply(item))
    .filter((item): item is CustomerServiceQuickReplyDto =>
      Boolean(item?.quickReplyId && item.title && item.content),
    )
    .filter((item) => item.enabled !== false && !item.deletedAt)
    .sort(compareQuickReplies);
}

export function filterQuickRepliesForScope(
  replies: CustomerServiceQuickReplyDto[],
  scope?: QuickReplyFilterScope | null,
) {
  if (!scope) return replies.filter((reply) => normalizeQuickReplyScope(reply.scope) === "all");
  return replies.filter((reply) => {
    const normalized = normalizeQuickReplyScope(reply.scope);
    return normalized === "all" || normalized === scope;
  });
}

export function quickReplyScopeForThreadType(
  threadType?: CustomerServiceThreadType | string | null,
): QuickReplyFilterScope | null {
  const normalized = String(threadType ?? "").trim().toLowerCase().replace(/-/g, "_");
  if (normalized === "temp_session") return "temp_session";
  if (normalized === "im_direct" || normalized === "direct_customer" || normalized === "direct") {
    return "direct_customer";
  }
  return null;
}

export function quickReplyMatchesKeyword(
  reply: CustomerServiceQuickReplyDto,
  keyword: string,
) {
  const normalized = keyword.trim().toLowerCase();
  if (!normalized) return true;
  return [
    reply.title,
    reply.content,
    reply.category,
    reply.locale,
    ...(reply.tags ?? []),
  ]
    .filter((value): value is string => typeof value === "string")
    .some((value) => value.toLowerCase().includes(normalized));
}

export function compareQuickReplies(
  left: CustomerServiceQuickReplyDto,
  right: CustomerServiceQuickReplyDto,
) {
  const categoryCompare = quickReplyCategory(left).localeCompare(quickReplyCategory(right));
  if (categoryCompare !== 0) return categoryCompare;
  const orderCompare = (left.sortOrder ?? 0) - (right.sortOrder ?? 0);
  if (orderCompare !== 0) return orderCompare;
  const leftTime = Date.parse(left.updatedAt ?? left.createdAt ?? "");
  const rightTime = Date.parse(right.updatedAt ?? right.createdAt ?? "");
  if (Number.isFinite(leftTime) && Number.isFinite(rightTime) && leftTime !== rightTime) {
    return rightTime - leftTime;
  }
  return left.title.localeCompare(right.title);
}

export function quickReplyCategory(reply: CustomerServiceQuickReplyDto) {
  return reply.category?.trim() || "Ungrouped";
}

function normalizeQuickReply(payload: unknown): CustomerServiceQuickReplyDto | null {
  const item = asRecord(payload);
  if (!item) return null;
  return {
    ...(item as Partial<CustomerServiceQuickReplyDto>),
    quickReplyId: readString(item, ["quickReplyId", "id", "replyId"]),
    scope: normalizeQuickReplyScope(readOptionalString(item, ["scope", "scene", "threadType"])),
    locale: readNullableString(item, ["locale", "language"]),
    category: readNullableString(item, ["category", "group", "groupName"]),
    title: readString(item, ["title", "name"]),
    content: readString(item, ["content", "text", "replyText"]),
    tags: readStringArray(item.tags),
    sortOrder: readOptionalNumber(item, ["sortOrder", "sort_order", "order"]),
    enabled: readOptionalBoolean(item, ["enabled", "isEnabled"]),
    createdAt: readNullableString(item, ["createdAt", "created_at"]),
    updatedAt: readNullableString(item, ["updatedAt", "updated_at"]),
    deletedAt: readNullableString(item, ["deletedAt", "deleted_at"]),
  };
}

function normalizeQuickReplyScope(value?: string | null): CustomerServiceQuickReplyScope {
  const normalized = String(value ?? "").trim().toLowerCase().replace(/-/g, "_");
  if (normalized === "temp_session") return "temp_session";
  if (normalized === "direct_customer" || normalized === "im_direct") return "direct_customer";
  return "all";
}

function extractArray(payload: unknown): unknown[] {
  if (Array.isArray(payload)) return payload;
  const record = asRecord(payload);
  if (!record) return [];
  for (const key of quickReplyListKeys) {
    const value = record[key];
    if (Array.isArray(value)) return value;
    if (key === "data") {
      const nested = extractArray(value);
      if (nested.length > 0) return nested;
    }
  }
  return [];
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : null;
}

function readString(record: Record<string, unknown>, keys: string[]) {
  return readOptionalString(record, keys) ?? "";
}

function readOptionalString(record: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) return value.trim();
    if (typeof value === "number" && Number.isFinite(value)) return String(value);
  }
  return undefined;
}

function readNullableString(record: Record<string, unknown>, keys: string[]) {
  return readOptionalString(record, keys) ?? null;
}

function readOptionalNumber(record: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "string" && value.trim()) {
      const parsed = Number(value);
      if (Number.isFinite(parsed)) return parsed;
    }
  }
  return undefined;
}

function readOptionalBoolean(record: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "boolean") return value;
    if (typeof value === "string") {
      const normalized = value.trim().toLowerCase();
      if (["true", "1", "yes", "enabled"].includes(normalized)) return true;
      if (["false", "0", "no", "disabled"].includes(normalized)) return false;
    }
  }
  return undefined;
}

function readStringArray(value: unknown) {
  if (Array.isArray(value)) {
    return value
      .map((item) => (typeof item === "string" ? item.trim() : ""))
      .filter(Boolean);
  }
  if (typeof value !== "string") return [];
  return value
    .split(/[,\s]+/)
    .map((item) => item.trim())
    .filter(Boolean);
}
