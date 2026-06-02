import {
  customerServiceMessageEntityToDto,
  normalizeCustomerServiceMessageDto,
} from "../customer-service/cs-message-contract";
import { createGatewayTraceId } from "./gateway-diagnostics";
import {
  getCustomerServiceConversationIndex,
} from "../customer-service/cs-conversation-index";
import {
  customerServiceConversationRecord,
  customerServiceMessageRecord,
  isCustomerServiceGatewayPayload,
  normalizeThreadType,
} from "./gateway-cs-payload-utils";
import type {
  CustomerServiceGatewayChangeKind,
  GatewayIgnoredEvent,
  GatewayInvalidEvent,
  GatewayRawEventInput,
  GatewayTypedEvent,
} from "./gateway-event-types";
import {
  customerServiceThreadEventKinds,
  isCustomerServiceMessageEventName,
} from "./gateway-event-registry";

type GatewayEnvelope = Pick<GatewayTypedEvent, "eventName" | "receivedAt" | "traceId" | "rawPayload">;

export function adaptCustomerServiceGatewayEvent(input: GatewayRawEventInput): GatewayTypedEvent {
  const payload = eventPayload(input.args);
  const receivedAt = input.receivedAt ?? Date.now();
  const envelope = {
    eventName: input.eventName,
    receivedAt,
    traceId: input.traceId ?? createGatewayTraceId(input.eventName, receivedAt),
    rawPayload: payload,
  };

  if (
    isCustomerServiceMessageEventName(input.eventName) ||
    isCustomerServiceGatewayPayload(payload, input.scopeKey)
  ) {
    return adaptCustomerServiceMessageEvent(envelope, input.scopeKey);
  }

  const changeKind = customerServiceThreadEventKinds.get(input.eventName);
  if (changeKind) return adaptCustomerServiceThreadChangedEvent(envelope, changeKind, input.scopeKey);

  return ignored(envelope, "non_cs_event");
}

function adaptCustomerServiceMessageEvent(
  envelope: GatewayEnvelope,
  scopeKey?: string,
): GatewayTypedEvent {
  const payload = envelope.rawPayload;
  const threadId = customerServiceStandardThreadId(payload, scopeKey);
  if (!threadId) {
    return invalid(envelope, "missing_thread_id", ["gateway.cs.missing_thread_id"]);
  }
  const threadType = customerServiceThreadType(payload);
  const rawMessage = customerServiceStandardMessageInput(payload);
  const normalized = normalizeCustomerServiceMessageDto(rawMessage, {
    threadId,
    threadType,
    fallbackConversationId: threadId,
    fallbackMessageId: `${threadId}:${envelope.receivedAt}`,
  });
  if (!normalized.data || normalized.status === "failed" || normalized.status === "invalid") {
    return invalid(
      envelope,
      "blocking_contract",
      normalized.issues.map((issue) => issue.code),
    );
  }

  return {
    ...envelope,
    kind: "cs.message.received",
    threadId,
    threadType,
    message: customerServiceMessageEntityToDto(normalized.data),
    contractStatus: normalized.status === "degraded" ? "degraded" : "ok",
    diagnostics: normalized.issues.length ? normalized.issues.map((issue) => issue.code) : undefined,
  };
}

function adaptCustomerServiceThreadChangedEvent(
  envelope: GatewayEnvelope,
  changeKind: CustomerServiceGatewayChangeKind,
  scopeKey?: string,
): GatewayTypedEvent {
  const payload = envelope.rawPayload;
  return {
    ...envelope,
    kind: "cs.thread.changed",
    changeKind,
    threadId: customerServiceStandardThreadId(payload, scopeKey),
    serviceStatus: stringField(payload, "serviceStatus", "staffStatus", "status"),
    threadStatus: stringField(payload, "threadStatus", "status"),
    shouldNotifyQueue:
      changeKind === "queue_created" ||
      changeKind === "thread_created" ||
      changeKind === "thread_queued",
  };
}

function ignored(
  envelope: GatewayEnvelope,
  reason: GatewayIgnoredEvent["reason"],
): GatewayIgnoredEvent {
  return { ...envelope, kind: "ignored", reason };
}

function invalid(
  envelope: GatewayEnvelope,
  reason: GatewayInvalidEvent["reason"],
  diagnostics: string[],
): GatewayInvalidEvent {
  return { ...envelope, kind: "invalid", reason, diagnostics };
}

function customerServiceThreadType(payload: Record<string, unknown>) {
  const message = customerServiceMessageRecord(payload);
  const conversation = customerServiceConversationRecord(payload);
  return normalizeThreadType(
    stringField(payload, "threadType", "conversationType") ||
      stringField(message, "threadType", "conversationType", "type") ||
      stringField(conversation, "threadType", "conversationType", "type") ||
      stringField(asRecord(payload.thread), "threadType", "conversationType"),
  );
}

function customerServiceStandardThreadId(payload: Record<string, unknown>, scopeKey?: string) {
  const message = customerServiceMessageRecord(payload);
  const conversation = customerServiceConversationRecord(payload);
  const thread = asRecord(payload.thread);
  const tempSession = asRecord(payload.tempSession);
  return (
    stringField(payload, "threadId") ||
    stringField(message, "threadId") ||
    stringField(thread, "threadId") ||
    stringField(conversation, "threadId") ||
    stringField(tempSession, "sessionId") ||
    indexedThreadId(payload, scopeKey)
  );
}

function indexedThreadId(payload: Record<string, unknown>, scopeKey?: string) {
  if (!scopeKey) return "";
  const conversationId =
    stringField(payload, "conversationId") ||
    stringField(customerServiceMessageRecord(payload), "conversationId");
  if (!conversationId || !isCustomerServiceGatewayPayload(payload, scopeKey)) return "";
  return getCustomerServiceConversationIndex(conversationId, scopeKey)?.threadId ?? "";
}

function customerServiceStandardMessageInput(payload: Record<string, unknown>) {
  const message = messageRecord(payload);
  return {
    conversationId:
      stringField(message, "conversationId") ||
      stringField(payload, "conversationId"),
    conversationSeq:
      numberField(message, "conversationSeq", "seq") ??
      numberField(payload, "conversationSeq", "seq"),
    messageId:
      stringField(message, "messageId") ||
      stringField(payload, "messageId"),
    senderUserId:
      stringField(message, "senderUserId", "userId") ||
      stringField(payload, "senderUserId", "userId"),
    senderId:
      stringField(message, "senderId") ||
      stringField(payload, "senderId"),
    senderPlatformUserId:
      stringField(message, "senderPlatformUserId", "platformUserId") ||
      stringField(payload, "senderPlatformUserId", "platformUserId"),
    senderLppId:
      stringField(message, "senderLppId", "lppId") ||
      stringField(payload, "senderLppId", "lppId"),
    senderRole:
      stringField(message, "senderRole") ||
      stringField(payload, "senderRole"),
    direction:
      stringField(message, "direction") ||
      stringField(payload, "direction"),
    isSelf:
      booleanField(message, "isSelf", "isMine") ??
      booleanField(payload, "isSelf", "isMine"),
    isMine:
      booleanField(message, "isMine") ??
      booleanField(payload, "isMine"),
    messageType:
      stringField(message, "messageType", "type") ||
      stringField(payload, "messageType", "type"),
    body:
      asNullableRecord(message.body) ||
      asNullableRecord(payload.body) ||
      {},
    sentAt:
      stringField(message, "sentAt", "serverTime") ||
      stringField(payload, "sentAt", "serverTime"),
    threadType:
      stringField(message, "threadType") ||
      stringField(payload, "threadType"),
  };
}

function eventPayload(args: unknown[]) {
  const first = asRecord(args[0]);
  const nested = asRecord(first.data ?? first.Data ?? first.payload ?? first.Payload);
  return Object.keys(nested).length ? nested : first;
}

function messageRecord(payload: Record<string, unknown>) {
  return customerServiceMessageRecord(payload);
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function stringField(record: Record<string, unknown>, ...keys: string[]) {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) return value.trim();
    if (typeof value === "number") return String(value);
  }
  return "";
}

function numberField(record: Record<string, unknown>, ...keys: string[]) {
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

function booleanField(record: Record<string, unknown>, ...keys: string[]) {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "boolean") return value;
    if (typeof value === "string") {
      const normalized = value.trim().toLowerCase();
      if (normalized === "true") return true;
      if (normalized === "false") return false;
    }
  }
  return undefined;
}

function asNullableRecord(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;
}
