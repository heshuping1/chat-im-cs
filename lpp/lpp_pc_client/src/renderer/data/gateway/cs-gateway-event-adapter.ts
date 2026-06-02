import {
  customerServiceMessageEntityToDto,
  normalizeCustomerServiceMessageDto,
} from "../customer-service/cs-message-contract";
import { createGatewayTraceId } from "./gateway-diagnostics";
import {
  customerServiceConversationRecord,
  customerServiceMessageRecord,
  customerServiceThreadId,
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
  const threadId = customerServiceThreadId(payload, scopeKey);
  if (!threadId) {
    return invalid(envelope, "missing_thread_id", ["gateway.cs.missing_thread_id"]);
  }
  const threadType = customerServiceThreadType(payload);
  const rawMessage = {
    ...payload,
    ...messageRecord(payload),
  };
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
    threadId: customerServiceThreadId(payload, scopeKey),
    serviceStatus: stringField(payload, "serviceStatus", "service_status", "staffStatus", "staff_status", "status"),
    threadStatus: stringField(payload, "threadStatus", "thread_status", "status"),
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
    stringField(payload, "threadType", "thread_type", "conversationType", "conversation_type") ||
      stringField(message, "threadType", "thread_type", "conversationType", "conversation_type", "chatType", "chat_type", "type") ||
      stringField(conversation, "threadType", "thread_type", "conversationType", "conversation_type", "chatType", "chat_type", "type") ||
      stringField(asRecord(payload.thread), "threadType", "thread_type", "conversationType", "conversation_type"),
  );
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
