import type { CustomerServiceThreadType, MessageItemDto } from "../api-client";
import { isSelfSenderAny } from "../message-display";
import {
  conversationRecord as ownershipConversationRecord,
  messageRecord as ownershipMessageRecord,
  resolveConversationOwnership,
} from "./conversation-ownership-resolver";
import { asRecord, firstRecord, normalizeType, stringField } from "./gateway-record-utils";

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
