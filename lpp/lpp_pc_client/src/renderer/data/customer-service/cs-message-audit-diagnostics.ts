import type { CustomerServiceThreadType, MessageItemDto } from "../api/types";

export type CustomerServiceMessageAuditSource =
  | "send"
  | "http"
  | "cache"
  | "gateway"
  | "detail"
  | "ui";

export type CustomerServiceMessageAuditStage =
  | "send.compose.submit"
  | "send.local_echo.written"
  | "send.http.start"
  | "send.http.done"
  | "send.server_ack.normalized"
  | "cache.merge.sent"
  | "gateway.raw.received"
  | "gateway.normalized"
  | "cache.merge.gateway"
  | "detail.received"
  | "detail.message.normalized"
  | "detail.merge"
  | "ui.render.observed";

export type CustomerServiceMessagePreviewKind =
  | "empty"
  | "generic_message"
  | "real";

export type CustomerServiceMessageMergeDecision = "append" | "replace" | "ignored";
export type CustomerServiceMessageMatchedBy =
  | "clientMsgId"
  | "conversationSeq"
  | "localMessageId"
  | "messageId"
  | "none";

export interface CustomerServiceMessageAuditSummary {
  bodyHash?: string;
  bodyKeys: string[];
  hasBodyText: boolean;
  messageType?: string;
  previewKind: CustomerServiceMessagePreviewKind;
  textLength: number;
}

export interface CustomerServiceMessageAuditRecord
  extends CustomerServiceMessageAuditSummary {
  taskId: "P6-CS-MSG-AUDIT";
  module: "cs-message-audit";
  event: "cs.message.audit";
  timestamp: number;
  traceId: string;
  source: CustomerServiceMessageAuditSource;
  stage: CustomerServiceMessageAuditStage;
  result: "ignored" | "ok" | "warning";
  clientMsgId?: string;
  localMessageId?: string;
  messageId?: string;
  threadId?: string;
  threadType?: CustomerServiceThreadType;
  conversationId?: string;
  conversationSeq?: number;
  mergeDecision?: CustomerServiceMessageMergeDecision;
  matchedBy?: CustomerServiceMessageMatchedBy;
  beforeCount?: number;
  afterCount?: number;
  duplicateClientMsgIdCount?: number;
  duplicateMessageIdCount?: number;
  reason?: string;
  context?: Record<string, unknown>;
}

export interface CustomerServiceMessageAuditInput {
  source: CustomerServiceMessageAuditSource;
  stage: CustomerServiceMessageAuditStage;
  result?: "ignored" | "ok" | "warning";
  traceId?: string;
  clientMsgId?: string;
  localMessageId?: string;
  messageId?: string;
  threadId?: string;
  threadType?: CustomerServiceThreadType;
  conversationId?: string;
  conversationSeq?: number;
  message?: Partial<MessageItemDto> | null;
  body?: Record<string, unknown> | null;
  preview?: unknown;
  messageType?: unknown;
  mergeDecision?: CustomerServiceMessageMergeDecision;
  matchedBy?: CustomerServiceMessageMatchedBy;
  beforeCount?: number;
  afterCount?: number;
  duplicateClientMsgIdCount?: number;
  duplicateMessageIdCount?: number;
  reason?: string;
  context?: Record<string, unknown>;
}

const diagnosticsFlag = "lpp.customerServiceMessageAuditDiagnostics";
const maxAuditRecords = 240;
const moduleName = "cs-message-audit";

export function auditCustomerServiceMessage(
  input: CustomerServiceMessageAuditInput,
): CustomerServiceMessageAuditRecord {
  const summary = customerServiceMessageAuditSummary(
    input.message,
    input.body,
    input.preview,
    input.messageType,
  );
  const identity = customerServiceMessageAuditIdentity(input.message);
  const traceId =
    input.traceId ||
    input.clientMsgId ||
    identity.clientMsgId ||
    input.messageId ||
    identity.messageId ||
    `${moduleName}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const record = compactRecord({
    taskId: "P6-CS-MSG-AUDIT",
    module: moduleName,
    event: "cs.message.audit",
    timestamp: Date.now(),
    traceId,
    source: input.source,
    stage: input.stage,
    result: input.result ?? "ok",
    clientMsgId: input.clientMsgId || identity.clientMsgId,
    localMessageId: input.localMessageId || identity.localMessageId,
    messageId: input.messageId || identity.messageId,
    threadId: input.threadId || identity.threadId,
    threadType: input.threadType,
    conversationId: input.conversationId || identity.conversationId,
    conversationSeq: input.conversationSeq ?? identity.conversationSeq,
    ...summary,
    mergeDecision: input.mergeDecision,
    matchedBy: input.matchedBy,
    beforeCount: input.beforeCount,
    afterCount: input.afterCount,
    duplicateClientMsgIdCount: input.duplicateClientMsgIdCount,
    duplicateMessageIdCount: input.duplicateMessageIdCount,
    reason: input.reason,
    context: sanitizeAuditContext(input.context),
  }) as CustomerServiceMessageAuditRecord;
  rememberCustomerServiceMessageAudit(record);
  if (shouldPrintCustomerServiceMessageAudit()) {
    console.debug("[cs-message-audit]", record);
  }
  return record;
}

export function customerServiceMessageAuditSummary(
  message?: Partial<MessageItemDto> | null,
  fallbackBody?: Record<string, unknown> | null,
  fallbackPreview?: unknown,
  fallbackMessageType?: unknown,
): CustomerServiceMessageAuditSummary {
  const messageBody = asRecord(message?.body);
  const body =
    messageBody && Object.keys(messageBody).length > 0
      ? messageBody
      : fallbackBody || {};
  const bodyText = typeof body.text === "string" ? body.text.trim() : "";
  return {
    bodyHash: Object.keys(body).length ? stableHash(sanitizedBodyShape(body)) : undefined,
    bodyKeys: Object.keys(body).sort().slice(0, 16),
    hasBodyText: bodyText.length > 0,
    messageType: stringValue(message?.messageType) || stringValue(fallbackMessageType),
    previewKind: customerServiceMessagePreviewKind(
      message?.preview ?? fallbackPreview,
    ),
    textLength: bodyText.length,
  };
}

export function customerServiceMessageAuditIdentity(
  message?: Partial<MessageItemDto> | null,
) {
  return {
    clientMsgId: stringValue(message?.clientMsgId) || stringValue(message?.clientMessageId),
    conversationId: stringValue(message?.conversationId),
    conversationSeq:
      typeof message?.conversationSeq === "number" ? message.conversationSeq : undefined,
    localMessageId: stringValue((message as Record<string, unknown> | undefined)?.localMessageId),
    messageId: stringValue(message?.messageId),
    threadId: stringValue((message as Record<string, unknown> | undefined)?.threadId),
  };
}

export function customerServiceMessagePreviewKind(
  value: unknown,
): CustomerServiceMessagePreviewKind {
  const preview = String(value ?? "").trim();
  if (!preview) return "empty";
  const normalized = preview.toLowerCase();
  return normalized === "[message]" || preview === "[消息]"
    ? "generic_message"
    : "real";
}

function rememberCustomerServiceMessageAudit(record: CustomerServiceMessageAuditRecord) {
  if (typeof globalThis.window === "undefined") return;
  const target = globalThis.window as Window & {
    __lppCustomerServiceMessageAuditDiagnostics?: CustomerServiceMessageAuditRecord[];
  };
  const diagnostics = target.__lppCustomerServiceMessageAuditDiagnostics ?? [];
  diagnostics.push(record);
  if (diagnostics.length > maxAuditRecords) {
    diagnostics.splice(0, diagnostics.length - maxAuditRecords);
  }
  target.__lppCustomerServiceMessageAuditDiagnostics = diagnostics;
}

function shouldPrintCustomerServiceMessageAudit() {
  if (import.meta.env.DEV) return true;
  try {
    return globalThis.localStorage?.getItem(diagnosticsFlag) === "1";
  } catch {
    return false;
  }
}

function compactRecord<T extends Record<string, unknown>>(record: T): T {
  return Object.fromEntries(
    Object.entries(record).filter(([, value]) => value !== undefined),
  ) as T;
}

function sanitizeAuditContext(context: Record<string, unknown> | undefined) {
  if (!context) return undefined;
  return compactRecord(
    Object.fromEntries(
      Object.entries(context)
        .slice(0, 24)
        .map(([key, value]) => [key, sanitizeContextValue(value)]),
    ),
  );
}

function sanitizeContextValue(value: unknown): unknown {
  if (value === null || value === undefined) return value;
  if (typeof value === "string") return value.length > 120 ? `${value.slice(0, 120)}...` : value;
  if (typeof value === "number" || typeof value === "boolean") return value;
  if (Array.isArray(value)) return value.slice(0, 12).map(sanitizeContextValue);
  if (typeof value === "object") return "[object]";
  return String(value);
}

function sanitizedBodyShape(value: unknown): unknown {
  if (value === null || value === undefined) return value;
  if (typeof value === "string") {
    const previewKind = customerServiceMessagePreviewKind(value);
    return { kind: "string", length: value.trim().length, previewKind };
  }
  if (typeof value === "number") return Number.isFinite(value) ? "number" : "number.invalid";
  if (typeof value === "boolean") return "boolean";
  if (Array.isArray(value)) {
    return value.slice(0, 8).map((item) => sanitizedBodyShape(item));
  }
  if (typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([left], [right]) => left.localeCompare(right))
        .slice(0, 16)
        .map(([key, entry]) => [key, sanitizedBodyShape(entry)]),
    );
  }
  return typeof value;
}

function stableHash(value: unknown) {
  const text = JSON.stringify(value);
  let hash = 2166136261;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;
}

function stringValue(value: unknown) {
  if (typeof value === "string" && value.trim()) return value.trim();
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return undefined;
}
