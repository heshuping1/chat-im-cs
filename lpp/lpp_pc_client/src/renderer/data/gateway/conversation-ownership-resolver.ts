import { getCustomerServiceConversationIndex } from "../customer-service/cs-conversation-index";
import {
  asRecord,
  firstRecord,
  normalizeType,
  stringField,
} from "./gateway-record-utils";

export type ConversationOwner = "im" | "customerService" | "unknown";
export type ConversationOwnershipConfidence = "explicit" | "indexed" | "unknown";
export type ConversationOwnershipSource = "gateway" | "imList" | "csWorkbench" | "csDetail";

export interface ResolveConversationOwnershipInput {
  eventName?: string;
  payload: Record<string, unknown>;
  scopeKey: string;
  source: ConversationOwnershipSource;
}

export interface ConversationOwnershipResult {
  owner: ConversationOwner;
  confidence: ConversationOwnershipConfidence;
  conversationId?: string;
  threadId?: string;
  threadType?: "temp_session" | "im_direct";
  reason: string;
  scopeKey: string;
  source: ConversationOwnershipSource;
}

export function resolveConversationOwnership(
  input: ResolveConversationOwnershipInput,
): ConversationOwnershipResult {
  const { payload, scopeKey, source } = input;
  const message = messageRecord(payload);
  const conversation = conversationRecord(payload);
  const thread = asRecord(payload.thread);
  const tempSession = firstRecord(payload.tempSession, payload.temp_session);
  const conversationId = payloadConversationId(payload);

  if (hasExplicitTempSession(payload, message, conversation, thread, tempSession)) {
    const threadId =
      stringField(tempSession, "sessionId", "session_id", "threadId", "thread_id") ||
      stringField(thread, "threadId", "thread_id", "sessionId", "session_id") ||
      stringField(payload, "threadId", "thread_id", "sessionId", "session_id", "visitorSessionId", "tempSessionId") ||
      stringField(message, "threadId", "thread_id", "sessionId", "session_id", "visitorSessionId", "tempSessionId") ||
      conversationId;
    return {
      owner: "customerService",
      confidence: "explicit",
      conversationId,
      threadId,
      threadType: "temp_session",
      reason: "explicit-temp-session",
      scopeKey,
      source,
    };
  }

  if (hasExplicitImType(payload, message, conversation, thread)) {
    return {
      owner: "im",
      confidence: "explicit",
      conversationId,
      reason: "explicit-im",
      scopeKey,
      source,
    };
  }

  if (!scopeKey) {
    return {
      owner: "unknown",
      confidence: "unknown",
      conversationId,
      reason: "blocking-missing-scope",
      scopeKey,
      source,
    };
  }

  const indexed = getCustomerServiceConversationIndex(conversationId || "", scopeKey);
  if (indexed?.threadType === "temp_session") {
    return {
      owner: "customerService",
      confidence: "indexed",
      conversationId: indexed.conversationId || conversationId,
      threadId: indexed.threadId,
      threadType: "temp_session",
      reason: "indexed-temp-session",
      scopeKey,
      source,
    };
  }

  return {
    owner: "unknown",
    confidence: "unknown",
    conversationId,
    reason: "unknown-default-im",
    scopeKey,
    source,
  };
}

export function payloadConversationId(payload: Record<string, unknown>) {
  const message = messageRecord(payload);
  const conversation = conversationRecord(payload);
  return (
    stringField(message, "conversationId", "conversation_id", "chatId", "chat_id") ||
    stringField(payload, "conversationId", "conversation_id", "chatId", "chat_id") ||
    stringField(conversation, "conversationId", "conversation_id", "chatId", "chat_id")
  );
}

export function messageRecord(payload: Record<string, unknown>) {
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

export function conversationRecord(payload: Record<string, unknown>) {
  return firstRecord(
    payload.conversation,
    payload.chat,
    payload.thread,
    payload.tempSession,
    payload.temp_session,
    payload.directChat,
    payload.direct_chat,
    payload.groupChat,
    payload.group_chat,
  );
}

function hasExplicitTempSession(
  payload: Record<string, unknown>,
  message: Record<string, unknown>,
  conversation: Record<string, unknown>,
  thread: Record<string, unknown>,
  tempSession: Record<string, unknown>,
) {
  if (Object.keys(tempSession).length > 0) return true;
  return [
    stringField(payload, "threadType", "thread_type", "conversationType", "conversation_type", "chatType", "chat_type", "type"),
    stringField(message, "threadType", "thread_type", "conversationType", "conversation_type", "chatType", "chat_type", "type"),
    stringField(conversation, "threadType", "thread_type", "conversationType", "conversation_type", "chatType", "chat_type", "type"),
    stringField(thread, "threadType", "thread_type", "conversationType", "conversation_type", "chatType", "chat_type", "type"),
  ]
    .map(normalizeType)
    .includes("temp_session");
}

function hasExplicitImType(
  payload: Record<string, unknown>,
  message: Record<string, unknown>,
  conversation: Record<string, unknown>,
  thread: Record<string, unknown>,
) {
  return [
    stringField(payload, "threadType", "thread_type", "conversationType", "conversation_type", "chatType", "chat_type", "type"),
    stringField(message, "threadType", "thread_type", "conversationType", "conversation_type", "chatType", "chat_type", "type"),
    stringField(conversation, "threadType", "thread_type", "conversationType", "conversation_type", "chatType", "chat_type", "type"),
    stringField(thread, "threadType", "thread_type", "conversationType", "conversation_type", "chatType", "chat_type", "type"),
  ]
    .map(normalizeType)
    .some((value) =>
      [
        "direct",
        "im_direct",
        "direct_chat",
        "direct_customer",
        "customer_direct",
        "group",
        "im_group",
        "group_chat",
      ].includes(value),
    );
}
