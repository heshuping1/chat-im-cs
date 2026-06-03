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
  const tempSession = firstRecord(payload.tempSession);
  const conversationId = payloadConversationId(payload);
  const sourceTypeThreadType = tempSessionThreadTypeFromSourceType(
    payload,
    message,
    conversation,
    thread,
    tempSession,
  );
  if (sourceTypeThreadType) {
    const indexed = scopeKey
      ? getCustomerServiceConversationIndex(conversationId || "", scopeKey)
      : undefined;
    return {
      owner: "customerService",
      confidence: "explicit",
      conversationId: indexed?.conversationId || conversationId,
      threadId: tempSessionThreadId(
        payload,
        message,
        thread,
        tempSession,
        indexed?.threadId,
        conversationId,
      ),
      threadType: sourceTypeThreadType,
      reason: "explicit-source-widget",
      scopeKey,
      source,
    };
  }

  if (hasExplicitTempSession(payload, message, conversation, thread, tempSession)) {
    const threadId =
      stringField(tempSession, "sessionId", "threadId") ||
      stringField(thread, "threadId") ||
      stringField(payload, "threadId") ||
      stringField(message, "threadId") ||
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

  if (hasExplicitCustomerServiceDirectType(payload, message, conversation, thread)) {
    const threadId =
      stringField(thread, "threadId") ||
      stringField(payload, "threadId") ||
      stringField(message, "threadId") ||
      stringField(conversation, "threadId") ||
      conversationId;
    return {
      owner: "customerService",
      confidence: "explicit",
      conversationId,
      threadId,
      threadType: "im_direct",
      reason: "explicit-customer-service-direct",
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
      reason: "missing-ownership-evidence",
      scopeKey,
      source,
    };
  }

  const indexed = getCustomerServiceConversationIndex(conversationId || "", scopeKey);
  if (indexed?.threadType === "temp_session" || indexed?.threadType === "im_direct") {
    return {
      owner: "customerService",
      confidence: "indexed",
      conversationId: indexed.conversationId || conversationId,
      threadId: indexed.threadId,
      threadType: indexed.threadType,
      reason: indexed.threadType === "temp_session" ? "indexed-temp-session" : "indexed-im-direct",
      scopeKey,
      source,
    };
  }

  return {
    owner: "unknown",
    confidence: "unknown",
    conversationId,
    reason: "missing-ownership-evidence",
    scopeKey,
    source,
  };
}

export function payloadConversationId(payload: Record<string, unknown>) {
  const message = messageRecord(payload);
  const conversation = conversationRecord(payload);
  return (
    stringField(message, "conversationId") ||
    stringField(payload, "conversationId") ||
    stringField(conversation, "conversationId")
  );
}

export function messageRecord(payload: Record<string, unknown>) {
  return firstRecord(
    payload.message,
  );
}

export function conversationRecord(payload: Record<string, unknown>) {
  return firstRecord(
    payload.conversation,
    payload.thread,
    payload.tempSession,
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
    stringField(payload, "threadType", "conversationType", "type"),
    stringField(message, "threadType", "conversationType", "type"),
    stringField(conversation, "threadType", "conversationType", "type"),
    stringField(thread, "threadType", "conversationType", "type"),
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
    stringField(payload, "threadType", "conversationType", "type"),
    stringField(message, "threadType", "conversationType", "type"),
    stringField(conversation, "threadType", "conversationType", "type"),
    stringField(thread, "threadType", "conversationType", "type"),
  ]
    .map(normalizeType)
    .some((value) => ["direct", "group"].includes(value));
}

function hasExplicitCustomerServiceDirectType(
  payload: Record<string, unknown>,
  message: Record<string, unknown>,
  conversation: Record<string, unknown>,
  thread: Record<string, unknown>,
) {
  return [
    stringField(payload, "threadType", "conversationType", "type"),
    stringField(message, "threadType", "conversationType", "type"),
    stringField(conversation, "threadType", "conversationType", "type"),
    stringField(thread, "threadType", "conversationType", "type"),
  ]
    .map(normalizeType)
    .some((value) =>
      ["direct_customer", "customer_direct", "im_direct"].includes(value),
    );
}

function tempSessionThreadTypeFromSourceType(
  payload: Record<string, unknown>,
  message: Record<string, unknown>,
  conversation: Record<string, unknown>,
  thread: Record<string, unknown>,
  tempSession: Record<string, unknown>,
): "temp_session" | undefined {
  const sourceType = [
    stringField(payload, "sourceType", "source_type"),
    stringField(message, "sourceType", "source_type"),
    stringField(conversation, "sourceType", "source_type"),
    stringField(thread, "sourceType", "source_type"),
    stringField(tempSession, "sourceType", "source_type"),
  ]
    .map(normalizeType)
    .find(Boolean);
  if (sourceType === "widget") return "temp_session";
  return undefined;
}

function tempSessionThreadId(
  payload: Record<string, unknown>,
  message: Record<string, unknown>,
  thread: Record<string, unknown>,
  tempSession: Record<string, unknown>,
  indexedThreadId?: string,
  conversationId?: string,
) {
  return (
    stringField(tempSession, "sessionId", "threadId") ||
    stringField(thread, "threadId") ||
    stringField(payload, "threadId") ||
    stringField(message, "threadId") ||
    indexedThreadId ||
    conversationId
  );
}
