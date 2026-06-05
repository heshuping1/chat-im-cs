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
  userMessageKey: string;
  userMessageParams?: Record<string, string | number>;
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
      userMessage: userMessageFallbackForApiError("aborted", error.message),
      userMessageKey: userMessageKeyForApiError("aborted", error.message),
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
      : stringValue(record.message) || stringValue(error) || "Unknown error";
  const kind = inferApiErrorKind({ status, code, message, name });
  const userMessageKey = userMessageKeyForApiError(kind, message, code);

  return {
    kind,
    message,
    userMessage: userMessageFallbackForApiError(kind, message, code),
    userMessageKey,
    userMessageParams: userMessageKey === "apiError.raw"
      ? { message: sanitizeApiErrorMessage(message) }
      : undefined,
    code,
    requestId,
    status,
    name,
  };
}

export function formatApiErrorForUser(error: unknown, fallback = "Unknown error") {
  const normalized = normalizeApiError(error);
  if (normalized.kind === "unknown" && normalized.message === "Unknown error") {
    return fallback;
  }
  return normalized.userMessage || fallback;
}

export function userMessageForApiError(
  kind: ApiErrorKind,
  message: string,
  errorCode?: string,
) {
  return userMessageFallbackForApiError(kind, message, errorCode);
}

export function userMessageKeyForApiError(
  kind: ApiErrorKind,
  message: string,
  errorCode?: string,
) {
  const code = (errorCode || message).toUpperCase();
  if (
    code.includes("TENANT_JOIN_REQUEST_PENDING") ||
    message.toLowerCase().includes("join request is already pending")
  ) {
    return "apiError.tenantJoinPending";
  }
  if (code.includes("TENANT_ALREADY_MEMBER")) return "error.tenantAlreadyMember";
  if (code.includes("TENANT_NOT_FOUND")) return "apiError.tenantNotFound";
  if (code.includes("JOIN_DISABLED_IN_BINDING_MODE")) {
    return "apiError.tenantJoinDisabled";
  }
  if (code.includes("MSG_MEMBER_FORBIDDEN")) return "apiError.messageMemberForbidden";
  if (code.includes("MSG_CONVERSATION_FROZEN")) return "apiError.messageConversationFrozen";
  if (code.includes("MSG_GROUP_MUTED")) return "apiError.messageGroupMuted";
  if (code.includes("MSG_MEMBER_MUTED")) return "apiError.messageMemberMuted";
  if (code.includes("MSG_USER_MUTED")) return "apiError.messageUserMuted";
  if (kind === "unauthorized") return "error.unauthorized";
  if (kind === "forbidden") return "error.forbidden";
  if (kind === "not_found") return "apiError.notFound";
  if (kind === "rate_limited") return "apiError.rateLimited";
  if (kind === "server") return "apiError.server";
  if (kind === "network") return "error.network";
  if (kind === "aborted") return "apiError.aborted";
  if (kind === "validation") return "apiError.raw";
  if (kind === "conflict") return "apiError.raw";
  return "apiError.raw";
}

function userMessageFallbackForApiError(
  kind: ApiErrorKind,
  message: string,
  errorCode?: string,
) {
  const key = userMessageKeyForApiError(kind, message, errorCode);
  switch (key) {
    case "apiError.tenantJoinPending":
      return "已提交加入申请，正在等待管理员审核";
    case "error.tenantAlreadyMember":
      return "你已在该企业中，可以直接切换进入";
    case "apiError.tenantNotFound":
      return "未找到企业，请检查企业码是否正确";
    case "apiError.tenantJoinDisabled":
      return "该企业不支持自主加入，请联系管理员邀请";
    case "apiError.messageMemberForbidden":
      return "你不在该会话中，无法发送消息";
    case "apiError.messageConversationFrozen":
      return "该会话已被冻结，暂时无法发送消息";
    case "apiError.messageGroupMuted":
      return "群已开启全员禁言，当前账号无发言权限";
    case "apiError.messageMemberMuted":
      return "你已被禁言，暂时无法发言";
    case "apiError.messageUserMuted":
      return "当前账号已被禁言，暂时无法发送消息";
    case "error.unauthorized":
      return "登录状态已失效，请重新登录";
    case "error.forbidden":
      return "当前账号没有权限执行此操作";
    case "apiError.notFound":
      return "目标内容不存在或已被删除";
    case "apiError.rateLimited":
      return "操作过于频繁，请稍后再试";
    case "apiError.server":
      return "服务暂时不可用，请稍后重试";
    case "error.network":
      return "网络连接异常，请检查网络后重试";
    case "apiError.aborted":
      return "操作已取消";
    default:
      return sanitizeApiErrorMessage(message);
  }
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
  if (
    message.includes("network") ||
    message.includes("\u7f51\u7edc\u9519\u8bef") ||
    message.includes("failed to fetch")
  ) {
    return "network";
  }
  return "unknown";
}

function sanitizeApiErrorMessage(message: string) {
  const trimmed = message.trim();
  if (!trimmed) return "Unknown error";
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
