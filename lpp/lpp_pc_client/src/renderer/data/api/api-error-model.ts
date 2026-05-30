export type ApiErrorKind =
  | "aborted"
  | "forbidden"
  | "network"
  | "not_found"
  | "rate_limited"
  | "server"
  | "unauthorized"
  | "validation"
  | "conflict"
  | "unknown";

export interface NormalizedApiError {
  kind: ApiErrorKind;
  message: string;
  userMessage: string;
  code?: string;
  requestId?: string;
  status?: number;
  name?: string;
}

export function normalizeApiError(error: unknown): NormalizedApiError {
  if (isAbortError(error)) {
    return {
      kind: "aborted",
      message: error.message || "Request aborted",
      userMessage: "操作已取消",
      name: error.name,
    };
  }

  const record = asRecord(error);
  const status = numberValue(record.status);
  const code = stringValue(record.code);
  const requestId = stringValue(record.requestId);
  const name = stringValue(record.name);
  const message =
    error instanceof Error && error.message
      ? error.message
      : stringValue(record.message) || stringValue(error) || "未知错误";
  const kind = inferApiErrorKind({ status, code, message, name });

  return {
    kind,
    message,
    userMessage: userMessageForApiError(kind, message),
    code,
    requestId,
    status,
    name,
  };
}

export function formatApiErrorForUser(error: unknown, fallback = "未知错误") {
  const normalized = normalizeApiError(error);
  if (normalized.kind === "unknown" && normalized.message === "未知错误") {
    return fallback;
  }
  return normalized.userMessage || fallback;
}

export function userMessageForApiError(kind: ApiErrorKind, message: string) {
  if (kind === "unauthorized") return "登录状态已失效，请重新登录";
  if (kind === "forbidden") return "当前账号没有权限执行此操作";
  if (kind === "not_found") return "目标内容不存在或已被删除";
  if (kind === "rate_limited") return "操作过于频繁，请稍后再试";
  if (kind === "server") return "服务暂时不可用，请稍后重试";
  if (kind === "network") return "网络连接异常，请检查网络后重试";
  if (kind === "aborted") return "操作已取消";
  if (kind === "validation") return sanitizeApiErrorMessage(message);
  if (kind === "conflict") return sanitizeApiErrorMessage(message);
  return sanitizeApiErrorMessage(message);
}

function inferApiErrorKind(input: {
  status?: number;
  code?: string;
  message: string;
  name?: string;
}): ApiErrorKind {
  const code = input.code?.toUpperCase() ?? "";
  const message = input.message.toLowerCase();
  if (input.name === "AbortError") return "aborted";
  if (input.status === 401 || code.includes("UNAUTHORIZED") || code.includes("TOKEN")) {
    return "unauthorized";
  }
  if (input.status === 403 || code.includes("FORBIDDEN")) return "forbidden";
  if (input.status === 404 || code.includes("NOT_FOUND")) return "not_found";
  if (input.status === 409 || code.includes("CONFLICT")) return "conflict";
  if (input.status === 422 || code.includes("VALIDATION") || code.includes("INVALID")) {
    return "validation";
  }
  if (input.status === 429 || code.includes("RATE_LIMIT")) return "rate_limited";
  if (input.status && input.status >= 500) return "server";
  if (message.includes("network") || message.includes("网络错误") || message.includes("failed to fetch")) {
    return "network";
  }
  return "unknown";
}

function sanitizeApiErrorMessage(message: string) {
  const trimmed = message.trim();
  if (!trimmed) return "未知错误";
  return trimmed
    .replace(/Bearer\s+[A-Za-z0-9._~+/=-]+/gi, "Bearer ***")
    .replace(/requestId=[^\s]+/gi, "")
    .replace(/https?:\/\/[^\s]+/gi, "[url]")
    .trim();
}

function isAbortError(error: unknown): error is DOMException {
  return error instanceof DOMException && error.name === "AbortError";
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
}

function stringValue(value: unknown) {
  if (typeof value === "string" && value.trim()) return value.trim();
  if (typeof value === "number") return String(value);
  return undefined;
}

function numberValue(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() && Number.isFinite(Number(value))) {
    return Number(value);
  }
  return undefined;
}
