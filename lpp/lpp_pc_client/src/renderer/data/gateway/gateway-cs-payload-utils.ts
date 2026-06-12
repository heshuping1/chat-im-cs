import type { CustomerServiceThreadType, MessageItemDto } from "../api-client";
import { isSelfSenderAny } from "../message-display";
import { getCustomerServiceConversationIndex } from "../customer-service/cs-conversation-index";
import {
  conversationRecord as ownershipConversationRecord,
  messageRecord as ownershipMessageRecord,
  resolveConversationOwnership,
} from "./conversation-ownership-resolver";
import {
  asRecord,
  booleanField,
  firstRecord,
  normalizeType,
  numberField,
  stringField,
} from "./gateway-record-utils";

type GatewayIdentity = {
  userId?: string | null;
  platformUserId?: string | null;
  lppId?: string | null;
  displayName?: string | null;
} | null;

export function isCustomerServiceStatus(
  value: string,
): value is "online" | "busy" | "break" | "offline" {
  return ["online", "busy", "break", "offline"].includes(value);
}

export function isCustomerServiceGatewayPayload(
  payload: Record<string, unknown>,
  scopeKey?: string,
) {
  return classifyCustomerServiceGatewayPayload(payload, scopeKey).isCustomerService;
}

export function classifyCustomerServiceGatewayPayload(
  payload: Record<string, unknown>,
  scopeKey?: string,
) {
  const ownership = resolveConversationOwnership({
    payload,
    scopeKey: scopeKey ?? "",
    source: "gateway",
  });
  return {
    isCustomerService: ownership.owner === "customerService",
    reason: ownership.reason,
    threadId:
      ownership.threadId ||
      (ownership.owner === "customerService" ? customerServiceThreadId(payload, scopeKey) : ""),
    threadType: ownership.threadType,
    owner: ownership.owner,
    confidence: ownership.confidence,
    conversationId: ownership.conversationId,
  };
}

export function customerServiceThreadId(payload: Record<string, unknown>, scopeKey?: string) {
  const message = customerServiceMessageRecord(payload);
  const ownership = resolveConversationOwnership({
    payload,
    scopeKey: scopeKey ?? "",
    source: "gateway",
  });
  return (
    ownership.threadId ||
    stringField(payload, "threadId", "thread_id", "sessionId", "session_id", "visitorSessionId", "tempSessionId") ||
    stringField(message, "threadId", "thread_id", "sessionId", "session_id", "visitorSessionId", "tempSessionId") ||
    stringField(asRecord(payload.thread), "threadId", "thread_id", "sessionId", "session_id") ||
    stringField(asRecord(payload.tempSession), "sessionId", "session_id", "threadId", "thread_id") ||
    stringField(asRecord(payload.temp_session), "sessionId", "session_id", "threadId", "thread_id") ||
    stringField(message, "conversationId", "conversation_id", "chatId", "chat_id") ||
    stringField(asRecord(payload.thread), "conversationId", "conversation_id", "chatId", "chat_id") ||
    ""
  );
}

export function normalizeThreadType(value: string): CustomerServiceThreadType {
  return ["im", "direct_customer", "customer_direct", "im_direct"].includes(normalizeType(value))
    ? "im_direct"
    : "temp_session";
}

export function isSelfCustomerServiceGatewayMessage(
  payload: Record<string, unknown>,
  message: MessageItemDto,
  identity: GatewayIdentity,
) {
  const messageRecord = customerServiceMessageRecord(payload);
  const raw = Object.keys(messageRecord).length ? messageRecord : payload;
  const roleText = [
    stringField(raw, "senderRole", "senderType", "authorType", "fromType", "role"),
    stringField(payload, "senderRole", "senderType", "authorType", "fromType", "role"),
    stringField(asRecord(payload.thread), "senderRole", "senderType", "authorType", "fromType"),
  ]
    .map(normalizeType)
    .join("|");
  if (
    [
      "visitor",
      "guest",
      "customer",
      "client",
      "user",
      "end_user",
      "widget",
    ].some((marker) => roleText.includes(marker))
  ) {
    return false;
  }
  if (
    ["staff", "agent", "operator", "customer_service", "service_staff", "kefu"].some(
      (marker) => roleText.includes(marker),
    )
  ) {
    return isSelfGatewayMessage(message, identity);
  }
  const direction = normalizeType(message.direction ?? "");
  if (["in", "incoming", "inbound", "received", "receive"].includes(direction)) {
    return false;
  }
  if (isSelfSenderAny(
    [
      message.senderUserId,
      message.senderId,
      message.fromUserId,
      message.senderPlatformUserId,
      message.platformUserId,
      message.senderLppId,
      message.lppId,
    ],
    message.senderDisplayName,
    identity,
  )) {
    return true;
  }
  return Boolean(message.isSelf || message.isMine);
}

export function customerServiceMessageRecord(payload: Record<string, unknown>) {
  return ownershipMessageRecord(payload);
}

export function customerServiceConversationRecord(payload: Record<string, unknown>) {
  return firstRecord(
    ownershipConversationRecord(payload),
    payload.conversation,
    payload.chat,
    payload.thread,
    payload.tempSession,
    payload.temp_session,
  );
}

export function customerServiceGatewayConversationId(payload: Record<string, unknown>) {
  return (
    stringField(payload, "conversationId", "conversation_id", "chatId", "chat_id") ||
    stringField(
      asRecord(payload.thread),
      "conversationId",
      "conversation_id",
      "chatId",
      "chat_id",
    )
  );
}

export function customerServiceGatewayTypingConversationId(
  payload: Record<string, unknown>,
  typing: Record<string, unknown>,
  message: Record<string, unknown>,
) {
  return (
    customerServiceGatewayConversationId(payload) ||
    stringField(typing, "conversationId", "conversation_id", "chatId", "chat_id") ||
    stringField(message, "conversationId", "conversation_id", "chatId", "chat_id")
  );
}

export function customerServiceGatewayThreadId(
  payload: Record<string, unknown>,
  scopeKey?: string,
) {
  const message = customerServiceMessageRecord(payload);
  const conversation = customerServiceConversationRecord(payload);
  const thread = asRecord(payload.thread);
  const tempSession = firstRecord(payload.tempSession, payload.temp_session);
  return (
    stringField(payload, "threadId", "thread_id", "sessionId", "session_id", "visitorSessionId", "tempSessionId") ||
    stringField(message, "threadId", "thread_id", "sessionId", "session_id", "visitorSessionId", "tempSessionId") ||
    stringField(thread, "threadId", "thread_id", "sessionId", "session_id") ||
    stringField(conversation, "threadId", "thread_id") ||
    stringField(tempSession, "sessionId", "session_id", "threadId", "thread_id") ||
    customerServiceThreadId(payload, scopeKey) ||
    indexedCustomerServiceThreadId(payload, scopeKey)
  );
}

export function customerServiceGatewayMessageInput(payload: Record<string, unknown>) {
  const message = customerServiceMessageRecord(payload);
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
      asOptionalRecord(message.body) ||
      asOptionalRecord(payload.body) ||
      customerServiceGatewayTextBody(message) ||
      customerServiceGatewayTextBody(payload) ||
      {},
    sentAt:
      stringField(message, "sentAt", "serverTime") ||
      stringField(payload, "sentAt", "serverTime"),
    threadType:
      stringField(message, "threadType") ||
      stringField(payload, "threadType") ||
      stringField(message, "sourceType", "source_type") ||
      stringField(payload, "sourceType", "source_type"),
  } as Record<string, unknown>;
}

function isSelfGatewayMessage(message: MessageItemDto, identity: GatewayIdentity) {
  const senderIds = [
    message.senderUserId,
    message.senderId,
    message.fromUserId,
    message.senderPlatformUserId,
    message.platformUserId,
    message.senderLppId,
    message.lppId,
  ];
  if (message.isSelf || message.isMine) return true;
  if (["out", "outgoing", "sent", "self"].includes(normalizeType(message.direction ?? ""))) {
    return true;
  }
  if (hasAnyIdentityValue(senderIds)) {
    return isSelfSenderAny(senderIds, undefined, identity);
  }
  return isSelfSenderAny([], message.senderDisplayName, identity);
}

function hasAnyIdentityValue(values: Array<string | null | undefined>) {
  return values.some((value) => typeof value === "string" && value.trim());
}

function indexedCustomerServiceThreadId(payload: Record<string, unknown>, scopeKey?: string) {
  if (!scopeKey) return "";
  const conversationId =
    stringField(payload, "conversationId") ||
    stringField(customerServiceMessageRecord(payload), "conversationId");
  if (!conversationId || !isCustomerServiceGatewayPayload(payload, scopeKey)) return "";
  return getCustomerServiceConversationIndex(conversationId, scopeKey)?.threadId ?? "";
}

function customerServiceGatewayTextBody(record: Record<string, unknown>) {
  const type = normalizeType(stringField(record, "messageType", "message_type", "type"));
  if (type && type !== "text") return undefined;
  const text = stringField(record, "text", "message", "content");
  return text ? { text } : undefined;
}

function asOptionalRecord(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;
}
