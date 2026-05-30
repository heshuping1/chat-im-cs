import {
  validateGatewayMessageContract,
  type NormalizedImMessage,
} from "../im-api-contract";
import type { ImConversationType } from "../im-read-model";
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

  if (isCustomerServiceMessageEventName(input.eventName) || isCustomerServiceGatewayPayload(payload)) {
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
    stringField(messageRecord(payload), "conversationId", "conversation_id", "chatId", "chat_id");
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
  const conversationId = stringField(payload, "conversationId", "conversation_id", "chatId", "chat_id");
  if (!conversationId) {
    return invalid(envelope, "missing_conversation_id", ["gateway.read.missing_conversation_id"]);
  }
  const readSeq =
    numberField(payload, "readSeq", "read_seq", "lastReadSeq", "last_read_seq", "conversationSeq", "conversation_seq") ??
    0;
  if (readSeq <= 0) {
    return invalid(envelope, "missing_read_seq", ["gateway.read.missing_read_seq"]);
  }
  return {
    ...envelope,
    kind: "im.read.received",
    conversationId,
    conversationType: inferImConversationType(payload) || "direct",
    readerIdentity: {
      userId:
        stringField(payload, "userId", "user_id", "readerUserId", "reader_user_id", "readUserId", "read_user_id") ||
        undefined,
      platformUserId:
        stringField(payload, "platformUserId", "platform_user_id", "readerPlatformUserId", "reader_platform_user_id") ||
        undefined,
      lppId:
        stringField(payload, "lppId", "lpp_id", "readerLppId", "reader_lpp_id") ||
        undefined,
      displayName:
        stringField(payload, "displayName", "display_name", "readerDisplayName", "reader_display_name") ||
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
    ...raw,
    conversationId:
      stringField(raw, "conversationId", "conversation_id", "chatId", "chat_id") ||
      stringField(payload, "conversationId", "conversation_id", "chatId", "chat_id"),
    conversationSeq:
      numberField(raw, "conversationSeq", "conversation_seq", "seq", "messageSeq", "message_seq") ??
      numberField(payload, "conversationSeq", "conversation_seq", "seq", "messageSeq", "message_seq"),
    senderUserId:
      stringField(raw, "senderUserId", "sender_user_id", "userId", "user_id") ||
      stringField(payload, "senderUserId", "sender_user_id", "userId", "user_id"),
    senderId:
      stringField(raw, "senderId", "sender_id") ||
      stringField(payload, "senderId", "sender_id"),
    fromUserId:
      stringField(raw, "fromUserId", "from_user_id") ||
      stringField(payload, "fromUserId", "from_user_id"),
    senderPlatformUserId:
      stringField(
        raw,
        "senderPlatformUserId",
        "sender_platform_user_id",
        "platformUserId",
        "platform_user_id",
      ) ||
      stringField(
        payload,
        "senderPlatformUserId",
        "sender_platform_user_id",
        "platformUserId",
        "platform_user_id",
      ),
    senderLppId:
      stringField(raw, "senderLppId", "sender_lpp_id", "lppId", "lpp_id") ||
      stringField(payload, "senderLppId", "sender_lpp_id", "lppId", "lpp_id"),
    direction: stringField(raw, "direction") || stringField(payload, "direction"),
    isSelf: booleanField(raw, "isSelf", "is_self", "isMine", "is_mine"),
    isMine: booleanField(raw, "isMine", "is_mine"),
    messageType:
      stringField(raw, "messageType", "message_type", "type") ||
      stringField(payload, "messageType", "message_type", "type"),
    sentAt:
      stringField(raw, "sentAt", "sent_at", "createdAt", "created_at") ||
      stringField(payload, "sentAt", "sent_at", "createdAt", "created_at"),
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
      "im_direct",
      "direct_chat",
      "direct_customer",
      "customer_direct",
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
    stringField(raw, "conversationId", "conversation_id", "chatId", "chat_id", "directChatId", "direct_chat_id", "directId", "direct_id", "groupChatId", "group_chat_id", "groupId", "group_id") ||
    stringField(payload, "conversationId", "conversation_id", "chatId", "chat_id", "directChatId", "direct_chat_id", "directId", "direct_id", "groupChatId", "group_chat_id", "groupId", "group_id") ||
    stringField(conversation, "conversationId", "conversation_id", "chatId", "chat_id", "directChatId", "direct_chat_id", "directId", "direct_id", "groupChatId", "group_chat_id", "groupId", "group_id") ||
    fallbackConversationId
  );
}

function inferImConversationType(payload: Record<string, unknown>): ImConversationType | "" {
  const raw = messageRecord(payload);
  const conversation = conversationRecord(payload);
  const explicit = normalizeImConversationType(
    stringField(raw, "conversationType", "conversation_type", "chatType", "chat_type", "type") ||
      stringField(payload, "conversationType", "conversation_type", "chatType", "chat_type", "type") ||
      stringField(conversation, "conversationType", "conversation_type", "chatType", "chat_type", "type"),
  );
  if (explicit) return explicit;

  const groupMarker =
    stringField(raw, "groupChatId", "group_chat_id", "groupId", "group_id") ||
    stringField(payload, "groupChatId", "group_chat_id", "groupId", "group_id") ||
    stringField(conversation, "groupChatId", "group_chat_id", "groupId", "group_id");
  if (groupMarker) return "group";

  const directMarker =
    stringField(raw, "directChatId", "direct_chat_id", "directId", "direct_id", "peerUserId", "peer_user_id", "targetUserId", "target_user_id", "receiverUserId", "receiver_user_id", "toUserId", "to_user_id") ||
    stringField(payload, "directChatId", "direct_chat_id", "directId", "direct_id", "peerUserId", "peer_user_id", "targetUserId", "target_user_id", "receiverUserId", "receiver_user_id", "toUserId", "to_user_id") ||
    stringField(conversation, "directChatId", "direct_chat_id", "directId", "direct_id", "peerUserId", "peer_user_id", "targetUserId", "target_user_id", "receiverUserId", "receiver_user_id", "toUserId", "to_user_id");
  if (directMarker) return "direct";

  return imConversationId(payload, fallbackConversationIdFromPeer(payload)) ? "direct" : "";
}

function fallbackConversationIdFromPeer(payload: Record<string, unknown>) {
  const raw = messageRecord(payload);
  const conversation = conversationRecord(payload);
  return (
    stringField(raw, "peerUserId", "peer_user_id", "targetUserId", "target_user_id", "receiverUserId", "receiver_user_id", "toUserId", "to_user_id", "fromUserId", "from_user_id", "senderUserId", "sender_user_id") ||
    stringField(payload, "peerUserId", "peer_user_id", "targetUserId", "target_user_id", "receiverUserId", "receiver_user_id", "toUserId", "to_user_id", "fromUserId", "from_user_id", "senderUserId", "sender_user_id") ||
    stringField(conversation, "peerUserId", "peer_user_id", "targetUserId", "target_user_id", "receiverUserId", "receiver_user_id", "toUserId", "to_user_id")
  );
}

function isCustomerServiceGatewayPayload(payload: Record<string, unknown>) {
  const conversation = conversationRecord(payload);
  const thread = asRecord(payload.thread);
  const markers = [
    stringField(payload, "threadType", "thread_type", "conversationType", "conversation_type"),
    stringField(conversation, "threadType", "thread_type", "conversationType", "conversation_type"),
    stringField(thread, "threadType", "thread_type", "conversationType", "conversation_type"),
  ].map(normalizeType);
  if (markers.some((value) => value === "temp_session")) {
    return true;
  }
  if (asRecord(payload.tempSession).sessionId || asRecord(payload.temp_session).sessionId) {
    return true;
  }
  const sessionId = stringField(payload, "sessionId", "visitorSessionId", "tempSessionId");
  return Boolean(sessionId && (stringField(payload, "visitorId", "visitorUserId") || stringField(thread, "threadId")));
}
