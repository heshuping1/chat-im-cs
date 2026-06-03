import {
  validateGatewayMessageContract,
  type NormalizedImMessage,
} from "../im-api-contract";
import type { ImConversationType } from "../im-read-model";
import { isCustomerServiceGatewayPayload } from "./gateway-cs-payload-utils";
import { createGatewayTraceId } from "./gateway-diagnostics";
import type {
  GatewayIgnoredEvent,
  GatewayInvalidEvent,
  GatewayRawEventInput,
  GatewayTypedEvent,
} from "./gateway-event-types";
import {
  isCustomerServiceMessageEventName,
  isImMessageEventName,
  isImReadEventName,
} from "./gateway-event-registry";

type GatewayEnvelope = Pick<GatewayTypedEvent, "eventName" | "receivedAt" | "traceId" | "rawPayload">;

export function adaptGatewayEvent(input: GatewayRawEventInput): GatewayTypedEvent {
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
    return ignored(envelope, "customer_service_event");
  }

  if (isImMessageEventName(input.eventName)) {
    return adaptImMessageEvent(envelope);
  }

  if (isImReadEventName(input.eventName)) {
    return adaptImReadEvent(envelope);
  }

  return ignored(envelope, "unsupported_event");
}

function adaptImMessageEvent(
  envelope: GatewayEnvelope,
): GatewayTypedEvent {
  const payload = envelope.rawPayload;
  const conversationId =
    imConversationId(payload) ||
    stringField(messageRecord(payload), "conversationId");
  if (!conversationId) {
    return invalid(envelope, "missing_conversation_id", ["gateway.im.missing_conversation_id"]);
  }

  const conversationType = inferImConversationType(payload);
  if (!conversationType) {
    return invalid(envelope, "missing_conversation_type", ["gateway.im.missing_conversation_type"]);
  }

  const validation = validateGatewayMessageContract(gatewayMessageContractInput(payload));
  if (validation.level === "blocking") {
    return invalid(envelope, "blocking_contract", validation.diagnostics);
  }

  return {
    ...envelope,
    kind: "im.message.received",
    conversationId,
    conversationType,
    message: withConversationId(validation.normalized, conversationId),
    contractStatus: validation.level === "degraded" ? "degraded" : "ok",
    diagnostics: validation.diagnostics.length ? validation.diagnostics : undefined,
  };
}

function adaptImReadEvent(
  envelope: GatewayEnvelope,
): GatewayTypedEvent {
  const payload = envelope.rawPayload;
  const conversationId = stringField(payload, "conversationId");
  if (!conversationId) {
    return invalid(envelope, "missing_conversation_id", ["gateway.read.missing_conversation_id"]);
  }
  const readSeq =
    numberField(payload, "readSeq", "conversationSeq") ??
    0;
  if (readSeq <= 0) {
    return invalid(envelope, "missing_read_seq", ["gateway.read.missing_read_seq"]);
  }
  const conversationType = inferImConversationType(payload);
  if (!conversationType) {
    return invalid(envelope, "missing_conversation_type", ["gateway.read.missing_conversation_type"]);
  }
  return {
    ...envelope,
    kind: "im.read.received",
    conversationId,
    conversationType,
    readerIdentity: {
      userId:
        stringField(payload, "userId") ||
        undefined,
      platformUserId:
        stringField(payload, "platformUserId") ||
        undefined,
      lppId:
        stringField(payload, "lppId") ||
        undefined,
      displayName:
        stringField(payload, "displayName") ||
        undefined,
    },
    readSeq,
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

function eventPayload(args: unknown[]) {
  const first = asRecord(args[0]);
  const nested = asRecord(first.data ?? first.Data ?? first.payload ?? first.Payload);
  return Object.keys(nested).length ? nested : first;
}

function gatewayMessageContractInput(payload: Record<string, unknown>) {
  const raw = messageRecord(payload);
  return {
    messageId:
      stringField(raw, "messageId") ||
      stringField(payload, "messageId"),
    conversationId:
      stringField(raw, "conversationId") ||
      stringField(payload, "conversationId"),
    conversationSeq:
      numberField(raw, "conversationSeq", "seq") ??
      numberField(payload, "conversationSeq", "seq"),
    senderUserId:
      stringField(raw, "senderUserId", "userId") ||
      stringField(payload, "senderUserId", "userId"),
    senderId:
      stringField(raw, "senderId") ||
      stringField(payload, "senderId"),
    senderPlatformUserId:
      stringField(
        raw,
        "senderPlatformUserId",
        "platformUserId",
      ) ||
      stringField(
        payload,
        "senderPlatformUserId",
        "platformUserId",
      ),
    senderLppId:
      stringField(raw, "senderLppId", "lppId") ||
      stringField(payload, "senderLppId", "lppId"),
    direction: stringField(raw, "direction") || stringField(payload, "direction"),
    isSelf: booleanField(raw, "isSelf", "isMine"),
    isMine: booleanField(raw, "isMine"),
    messageType:
      stringField(raw, "messageType", "type") ||
      stringField(payload, "messageType", "type"),
    sentAt:
      stringField(raw, "sentAt", "serverTime") ||
      stringField(payload, "sentAt", "serverTime"),
  };
}

function withConversationId(message: NormalizedImMessage, conversationId: string) {
  return {
    ...message,
    conversationId: message.conversationId || conversationId,
  };
}

function messageRecord(payload: Record<string, unknown>) {
  return firstRecord(
    payload.message,
    payload.msg,
    payload.messageInfo,
    payload.message_info,
    payload.messageDto,
    payload.message_dto,
    payload.item,
  );
}

function conversationRecord(payload: Record<string, unknown>) {
  return firstRecord(
    payload.conversation,
    payload.chat,
    payload.directChat,
    payload.direct_chat,
    payload.groupChat,
    payload.group_chat,
  );
}

function firstRecord(...values: unknown[]) {
  return values.map(asRecord).find((record) => Object.keys(record).length > 0) ?? {};
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
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

function normalizeType(value: string) {
  return value.trim().toLowerCase().replace(/-/g, "_");
}

function normalizeImConversationType(value: string): ImConversationType | "" {
  const normalized = normalizeType(value);
  if (
    [
      "direct",
      "direct_chat",
      "private",
      "single",
      "single_chat",
      "one_to_one",
      "p2p",
      "friend",
      "friend_chat",
    ].includes(normalized)
  ) {
    return "direct";
  }
  if (["group", "im_group", "group_chat"].includes(normalized)) return "group";
  return "";
}

function imConversationId(payload: Record<string, unknown>, fallbackConversationId = "") {
  const raw = messageRecord(payload);
  const conversation = conversationRecord(payload);
  return (
    stringField(raw, "conversationId") ||
    stringField(payload, "conversationId") ||
    stringField(conversation, "conversationId") ||
    fallbackConversationId
  );
}

function inferImConversationType(payload: Record<string, unknown>): ImConversationType | "" {
  const raw = messageRecord(payload);
  const conversation = conversationRecord(payload);
  const explicit = normalizeImConversationType(
    stringField(raw, "conversationType", "type") ||
      stringField(payload, "conversationType", "type") ||
      stringField(conversation, "conversationType", "type"),
  );
  if (explicit) return explicit;

  const groupMarker =
    stringField(raw, "groupId") ||
    stringField(payload, "groupId") ||
    stringField(conversation, "groupId");
  if (groupMarker) return "group";

  const directMarker =
    stringField(raw, "peerUserId", "targetUserId", "receiverUserId", "toUserId") ||
    stringField(payload, "peerUserId", "targetUserId", "receiverUserId", "toUserId") ||
    stringField(conversation, "peerUserId", "targetUserId", "receiverUserId", "toUserId");
  if (directMarker) return "direct";

  return "";
}
