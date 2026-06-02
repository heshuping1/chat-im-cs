import {
  isCustomerServiceLifecycleEventName,
  isCustomerServiceMessageEventName,
  isCustomerServiceQueueEventName,
  isImMessageEventName,
} from "./gateway-event-registry";
import {
  asRecord,
  conversationRecord,
  customerServiceThreadId,
  eventPayload,
  imConversationId,
  messageRecord,
  numberField,
  stringField,
} from "./gateway-payload-utils";
import { resolveConversationOwnership } from "./conversation-ownership-resolver";
import { recordMessageReminderDiagnostic } from "../diagnostics/message-reminder-diagnostics";

export interface GatewayReminderDiagnosticInput {
  args?: unknown[];
  eventName: string;
  payload?: Record<string, unknown>;
  phase: string;
  route?: string;
  scopeKey?: string;
  source: string;
}

export function shouldRecordGatewayReminderEvent(eventName: string) {
  return (
    isImMessageEventName(eventName) ||
    eventName === "msg.read" ||
    isCustomerServiceMessageEventName(eventName) ||
    isCustomerServiceQueueEventName(eventName) ||
    isCustomerServiceLifecycleEventName(eventName)
  );
}

export function gatewayReminderDiagnosticClassification(
  input: Pick<GatewayReminderDiagnosticInput, "args" | "eventName" | "payload" | "route" | "scopeKey">,
) {
  const payload = input.payload ?? eventPayload(input.args ?? []);
  const rawMessage = messageRecord(payload);
  const conversation = conversationRecord(payload);
  const body = asRecord(rawMessage.body ?? rawMessage.messageBody ?? rawMessage.message_body ?? rawMessage.content);
  const ownership = resolveConversationOwnership({
    eventName: input.eventName,
    payload,
    scopeKey: input.scopeKey ?? "",
    source: "gateway",
  });
  const preview =
    stringField(rawMessage, "preview", "text", "content") ||
    stringField(body, "preview", "text", "content");
  const messageType =
    stringField(rawMessage, "messageType", "message_type", "type") ||
    stringField(body, "messageType", "message_type", "type");
  return {
    argCount: input.args?.length ?? 0,
    confidence: ownership.confidence,
    conversationId:
      ownership.conversationId ||
      imConversationId(payload) ||
      stringField(conversation, "conversationId", "conversation_id", "chatId", "chat_id"),
    eventName: input.eventName,
    hasBody: Object.keys(body).length > 0,
    hasMessage: Object.keys(rawMessage).length > 0,
    lastMessageSeq: numberField(payload, "lastMessageSeq", "last_message_seq"),
    lastReadSeq: numberField(payload, "lastReadSeq", "last_read_seq", "readSeq", "read_seq"),
    messageId: stringField(rawMessage, "messageId", "message_id", "id"),
    messageSeq:
      numberField(rawMessage, "conversationSeq", "conversation_seq", "seq", "messageSeq", "message_seq") ??
      numberField(payload, "conversationSeq", "conversation_seq", "seq", "messageSeq", "message_seq"),
    messageType,
    owner: ownership.owner,
    previewLength: preview.length,
    reason: ownership.reason,
    route: input.route,
    scopeKey: input.scopeKey,
    threadId: ownership.threadId || customerServiceThreadId(payload, input.scopeKey),
    threadType: ownership.threadType,
  };
}

export function gatewayReminderDiagnosticSummary(payload: Record<string, unknown>) {
  const rawMessage = messageRecord(payload);
  const conversation = conversationRecord(payload);
  return {
    conversationType:
      stringField(rawMessage, "conversationType", "conversation_type", "chatType", "chat_type", "type") ||
      stringField(payload, "conversationType", "conversation_type", "chatType", "chat_type", "type") ||
      stringField(conversation, "conversationType", "conversation_type", "chatType", "chat_type", "type"),
    messageKeys: Object.keys(rawMessage).sort(),
    payloadKeys: Object.keys(payload).sort(),
    rawPayload: payload,
  };
}

export function recordGatewayReminderDiagnostic(input: GatewayReminderDiagnosticInput) {
  if (!shouldRecordGatewayReminderEvent(input.eventName)) return;
  const payload = input.payload ?? eventPayload(input.args ?? []);
  recordMessageReminderDiagnostic({
    event: input.phase === "received" ? "gateway.event.received" : "gateway.event.routed",
    source: input.source,
    phase: input.phase,
    route: input.route,
    classification: gatewayReminderDiagnosticClassification({
      args: input.args,
      eventName: input.eventName,
      payload,
      route: input.route,
      scopeKey: input.scopeKey,
    }),
    summary: gatewayReminderDiagnosticSummary(payload),
  });
}
