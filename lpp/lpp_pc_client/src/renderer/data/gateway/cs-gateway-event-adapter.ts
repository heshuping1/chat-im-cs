import {
  customerServiceMessageEntityToDto,
  normalizeCustomerServiceMessageDto,
} from "../customer-service/cs-message-contract";
import { createGatewayTraceId } from "./gateway-diagnostics";
import { auditCustomerServiceMessage } from "../customer-service/cs-message-audit-diagnostics";
import type { MessageItemDto } from "../api/types";
import {
  customerServiceGatewayConversationId,
  customerServiceGatewayMessageInput,
  customerServiceGatewayThreadId,
  customerServiceGatewayTypingConversationId,
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
  isImMessageEventName,
  isCustomerServiceMessageEventName,
  isCustomerServiceTypingEventName,
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
    isCustomerServiceTypingEventName(input.eventName) ||
    (input.eventName === "msg.typing" && isCustomerServiceGatewayPayload(payload, input.scopeKey))
  ) {
    return adaptCustomerServiceTypingPreviewEvent(envelope, input.scopeKey);
  }

  const changeKind = customerServiceThreadEventKinds.get(input.eventName);
  if (changeKind) return adaptCustomerServiceThreadChangedEvent(envelope, changeKind, input.scopeKey);

  if (
    isCustomerServiceMessageEventName(input.eventName) ||
    (isImMessageEventName(input.eventName) &&
      isCustomerServiceGatewayPayload(payload, input.scopeKey))
  ) {
    return adaptCustomerServiceMessageEvent(envelope, input.scopeKey);
  }

  return ignored(envelope, "non_cs_event");
}

function adaptCustomerServiceMessageEvent(
  envelope: GatewayEnvelope,
  scopeKey?: string,
): GatewayTypedEvent {
  const payload = envelope.rawPayload;
  const threadId = customerServiceGatewayThreadId(payload, scopeKey);
  if (!threadId) {
    return invalid(envelope, "missing_thread_id", ["gateway.cs.missing_thread_id"]);
  }
  const threadType = customerServiceThreadType(payload);
  const rawMessage = customerServiceGatewayMessageInput(payload);
  auditCustomerServiceMessage({
    source: "gateway",
    stage: "gateway.raw.received",
    traceId: envelope.traceId,
    threadId,
    threadType,
    message: rawMessage as Partial<MessageItemDto>,
    context: {
      eventName: envelope.eventName,
    },
  });
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
    conversationId: customerServiceGatewayConversationId(payload),
    threadId: customerServiceGatewayThreadId(payload, scopeKey),
    threadType: customerServiceThreadType(payload),
    serviceStatus: stringField(payload, "serviceStatus", "staffStatus", "status"),
    threadStatus: stringField(payload, "threadStatus", "status"),
    shouldNotifyQueue:
      changeKind === "queue_created" ||
      changeKind === "thread_created" ||
      changeKind === "thread_queued" ||
      (changeKind === "thread_reopened" &&
        isQueueLikeStatus(stringField(payload, "threadStatus", "status"))),
  };
}

function adaptCustomerServiceTypingPreviewEvent(
  envelope: GatewayEnvelope,
  scopeKey?: string,
): GatewayTypedEvent {
  const payload = envelope.rawPayload;
  const threadId = customerServiceGatewayThreadId(payload, scopeKey);
  if (!threadId) {
    return invalid(envelope, "missing_thread_id", ["gateway.cs.typing.missing_thread_id"]);
  }
  const typing = asRecord(payload.typing);
  const message = customerServiceMessageRecord(payload);
  const conversationId = customerServiceGatewayTypingConversationId(payload, typing, message);
  const previewTextKeys = [
    "content",
    "text",
    "preview",
    "draft",
    "inputText",
    "typingText",
  ];
  return {
    ...envelope,
    kind: "cs.typing.preview",
    threadId,
    threadType: customerServiceThreadType(payload),
    aliasThreadIds: uniqueNonEmptyStrings([conversationId]),
    conversationId,
    isTyping:
      booleanField(payload, "isTyping", "typing") ??
      booleanField(typing, "isTyping", "typing") ??
      true,
    hasPreviewText:
      hasPresentField(payload, ...previewTextKeys) ||
      hasPresentField(typing, ...previewTextKeys) ||
      hasPresentField(message, ...previewTextKeys),
    previewText:
      stringField(payload, ...previewTextKeys) ||
      stringField(typing, ...previewTextKeys) ||
      stringField(message, ...previewTextKeys),
    senderRole:
      stringField(payload, "senderRole", "senderType", "authorType", "fromType", "role") ||
      stringField(typing, "senderRole", "senderType", "authorType", "fromType", "role") ||
      stringField(message, "senderRole", "senderType", "authorType", "fromType", "role"),
    senderUserId:
      stringField(payload, "senderUserId", "userId", "senderId") ||
      stringField(typing, "senderUserId", "userId", "senderId") ||
      stringField(message, "senderUserId", "userId", "senderId"),
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
    stringField(payload, "sourceType", "source_type") ||
      stringField(message, "sourceType", "source_type") ||
      stringField(conversation, "sourceType", "source_type") ||
      stringField(asRecord(payload.thread), "sourceType", "source_type") ||
      stringField(payload, "threadType", "conversationType") ||
      stringField(message, "threadType", "conversationType", "type") ||
      stringField(conversation, "threadType", "conversationType", "type") ||
      stringField(asRecord(payload.thread), "threadType", "conversationType"),
  );
}

function uniqueNonEmptyStrings(values: string[]) {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

function eventPayload(args: unknown[]) {
  const first = asRecord(args[0]);
  const nested = asRecord(first.data ?? first.Data ?? first.payload ?? first.Payload);
  return Object.keys(nested).length ? nested : first;
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

function hasPresentField(record: Record<string, unknown>, ...keys: string[]) {
  return keys.some((key) => Object.prototype.hasOwnProperty.call(record, key));
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

function isQueueLikeStatus(status: string) {
  const normalized = status.trim().toLowerCase().replace(/-/g, "_");
  return (
    normalized === "queued" ||
    normalized === "queue" ||
    normalized === "pending" ||
    normalized.includes("queue") ||
    normalized.includes("waiting")
  );
}
