import { ApiError } from "./base";
import type {
  AiSuggestionDto,
  AiSuggestionSourceDto,
  CustomerServiceThreadType,
} from "./types";

export type AiSuggestionStatusKind = "generated" | "adopted" | "dismissed" | "unknown";

const suggestionListKeys = ["items", "suggestions", "records", "list", "results", "data"];

export function normalizeAiSuggestionsResponse(payload: unknown): AiSuggestionDto[] {
  return extractArray(payload)
    .map((item) => normalizeAiSuggestion(item))
    .filter((item): item is AiSuggestionDto => Boolean(item?.suggestionId || item?.text));
}

export function normalizeAiSuggestion(payload: unknown): AiSuggestionDto | null {
  const item = asRecord(payload);
  if (!item) return null;
  return {
    ...(item as Partial<AiSuggestionDto>),
    suggestionId: readString(item, ["suggestionId", "id", "aiSuggestionId"]),
    threadType: readOptionalString(item, ["threadType", "thread_type"]) as
      | CustomerServiceThreadType
      | string
      | undefined,
    threadId: readOptionalString(item, ["threadId", "thread_id"]),
    customerMessageId: readNullableString(item, ["customerMessageId", "customer_message_id"]),
    text: readNullableString(item, ["text", "content", "draft", "replyText"]),
    confidence: readOptionalNumber(item, ["confidence", "score"]),
    source: readNullableString(item, ["source", "sourceType", "provider"]),
    sources: normalizeAiSuggestionSources(item.sources ?? item.knowledgeSources),
    model: readNullableString(item, ["model", "modelName"]),
    status: item.status as AiSuggestionDto["status"],
    createdAt: readNullableString(item, ["createdAt", "created_at"]),
    adoptedAt: readNullableString(item, ["adoptedAt", "adopted_at"]),
  };
}

export function normalizeAiSuggestionStatus(value: AiSuggestionDto["status"]): AiSuggestionStatusKind {
  const normalized = String(value ?? "").trim().toLowerCase().replace(/-/g, "_");
  if (["0", "generated", "created", "ready", "pending"].includes(normalized)) {
    return "generated";
  }
  if (["1", "adopted", "accepted", "used"].includes(normalized)) return "adopted";
  if (["2", "dismissed", "discarded", "abandoned", "deprecated", "ignored"].includes(normalized)) {
    return "dismissed";
  }
  return "unknown";
}

export function aiSuggestionStatusLabel(value: AiSuggestionDto["status"]) {
  switch (normalizeAiSuggestionStatus(value)) {
    case "generated":
      return "已生成";
    case "adopted":
      return "已采纳";
    case "dismissed":
      return "已弃用";
    default:
      return "状态未知";
  }
}

export function aiSuggestionSourceLabel(value?: string | null) {
  const source = String(value ?? "").trim().toLowerCase().replace(/-/g, "_");
  if (!source) return "AI 建议";
  if (source === "external_rag" || source.includes("rag")) return "知识库增强";
  if (source.includes("knowledge")) return "知识库兜底";
  if (source.startsWith("builtin")) return "内置规则";
  if (source.includes("external")) return "外部模型";
  if (source.includes("fallback")) return "兜底建议";
  return String(value);
}

export function formatAiSuggestionError(error: unknown) {
  if (error instanceof ApiError) {
    const code = String(error.code ?? "").trim().toLowerCase();
    const message = String(error.message ?? "").trim().toLowerCase();
    if (
      code === "customer_service_thread_not_found" ||
      code === "customerservicethreadnotfound" ||
      message.includes("customerservicethreadnotfound") ||
      message.includes("customer service thread not found")
    ) {
      return "当前会话尚未形成客服接待线程，无法生成客服 AI 草稿";
    }
    if (error.code === "CS_SUGGESTION_NO_CUSTOMER_MESSAGE") {
      return "暂无客户消息可用于生成草稿";
    }
    if (error.status === 403 || error.code === "CUSTOMER_SERVICE_STAFF_REQUIRED") {
      return "当前账号无客服 AI 权限";
    }
    if (error.code === "CS_THREAD_TYPE_INVALID") return "当前会话类型暂不支持 AI 起草";
  }
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === "string" && error.trim()) return error;
  return "AI 回复建议请求失败";
}

function normalizeAiSuggestionSources(value: unknown): AiSuggestionSourceDto[] {
  if (!Array.isArray(value)) return [];
  return value
    .map<AiSuggestionSourceDto | null>((item) => {
      const record = asRecord(item);
      if (!record) return null;
      return {
        ...(record as Partial<AiSuggestionSourceDto>),
        knowledgeBaseName: readNullableString(record, ["knowledgeBaseName", "baseName", "kbName"]),
        documentTitle: readNullableString(record, ["documentTitle", "title", "name"]),
        headingPath: readHeadingPath(record.headingPath ?? record.heading_path ?? record.path),
        snippet: readNullableString(record, ["snippet", "contentPreview", "preview", "content"]),
        score: readOptionalNumber(record, ["score", "similarity", "rankScore"]),
      };
    })
    .filter((item): item is AiSuggestionSourceDto =>
      Boolean(item?.knowledgeBaseName || item?.documentTitle || item?.snippet),
    );
}

function extractArray(payload: unknown): unknown[] {
  if (Array.isArray(payload)) return payload;
  const record = asRecord(payload);
  if (!record) return [];
  for (const key of suggestionListKeys) {
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
  const value = readOptionalString(record, keys);
  return value ?? null;
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

function readHeadingPath(value: unknown) {
  if (typeof value === "string") return value;
  if (!Array.isArray(value)) return undefined;
  return value
    .map((item) => (typeof item === "string" ? item.trim() : ""))
    .filter(Boolean);
}
