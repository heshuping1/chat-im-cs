import type { CustomerServiceThreadType, MessageItemDto } from "../api-client";
import { isSelfSenderAny } from "../message-display";
import { conversationRecord } from "./gateway-im-payload-utils";
import { asRecord, normalizeType, stringField } from "./gateway-record-utils";

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

export function isCustomerServiceGatewayPayload(payload: Record<string, unknown>) {
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

export function customerServiceThreadId(payload: Record<string, unknown>) {
  return (
    stringField(payload, "threadId", "sessionId", "visitorSessionId", "tempSessionId") ||
    stringField(asRecord(payload.thread), "threadId", "sessionId") ||
    stringField(asRecord(payload.tempSession), "sessionId", "threadId") ||
    stringField(asRecord(payload.temp_session), "sessionId", "threadId")
  );
}

export function normalizeThreadType(value: string): CustomerServiceThreadType {
  return normalizeType(value) === "im_direct" ? "im_direct" : "temp_session";
}

export function isSelfCustomerServiceGatewayMessage(
  payload: Record<string, unknown>,
  message: MessageItemDto,
  identity: GatewayIdentity,
) {
  const raw = asRecord(payload.message ?? payload.msg) ?? payload;
  const roleText = [
    stringField(raw, "senderRole", "senderType", "authorType", "fromType", "role", "sourceType"),
    stringField(payload, "senderRole", "senderType", "authorType", "fromType", "role", "sourceType"),
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
