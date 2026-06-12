import { findCustomerServiceMessageMatch } from "./cs-message-identity";
import {
  hasRenderableCustomerServiceMessageContent,
  mergeCustomerServiceMessage,
} from "./cs-message-merge-policy";
import type {
  CustomerServiceMessage,
  CustomerServiceMessageEvent,
  CustomerServiceMessageMatchedBy,
  CustomerServiceMessageReduceResult,
  CustomerServiceMessageState,
} from "./cs-message-types";

export function reduceCustomerServiceMessageEvent(
  state: CustomerServiceMessageState,
  event: CustomerServiceMessageEvent,
): CustomerServiceMessageReduceResult {
  if (event.type === "cs.message.detail_synced") {
    return event.messages.reduce(
      (result, message) =>
        reduceCustomerServiceMessageEvent(result.state, {
          type: "cs.message.gateway_received",
          message,
        }),
      unchangedResult(state),
    );
  }

  if (event.type === "cs.message.send_failed") {
    return patchMatchedMessage(
      state,
      {
        localMessageId: event.localMessageId,
      },
      (message) => ({
        ...message,
        localError: event.reason,
        localFailedAt: event.failedAt,
        status: "failed",
      }),
    );
  }

  if (event.type === "cs.message.recalled") {
    return patchMatchedMessage(
      state,
      {
        messageId: event.messageId,
      },
      (message) => ({
        ...message,
        isRecalled: true,
        status: "recalled",
      }),
    );
  }

  if (event.type === "cs.message.send_ack_received") {
    const incoming = messageFromSendAck(event.ack);
    return mergeMessageIntoState(state, incoming, {
      clientMsgId: event.ack.clientMsgId,
      localMessageId: event.ack.localMessageId,
      message: incoming,
      messageId: incoming.messageId,
    });
  }

  return mergeMessageIntoState(state, event.message, { message: event.message });
}

function mergeMessageIntoState(
  state: CustomerServiceMessageState,
  incoming: CustomerServiceMessage,
  matchInput: Parameters<typeof findCustomerServiceMessageMatch>[1],
): CustomerServiceMessageReduceResult {
  const match = findCustomerServiceMessageMatch(state.messages, matchInput);
  const messages = [...state.messages];
  const current = match.index >= 0 ? messages[match.index] : undefined;
  const changedMessage = mergeCustomerServiceMessage(current, incoming);
  if (match.index >= 0) {
    messages[match.index] = changedMessage;
    return result(messages, changedMessage, "replace", match.matchedBy);
  }
  if (!hasRenderableCustomerServiceMessageContent(changedMessage)) {
    return unchangedResult(state);
  }
  messages.push(changedMessage);
  return result(messages, changedMessage, "append", "none");
}

function patchMatchedMessage(
  state: CustomerServiceMessageState,
  matchInput: Parameters<typeof findCustomerServiceMessageMatch>[1],
  patch: (message: CustomerServiceMessage) => CustomerServiceMessage,
) {
  const match = findCustomerServiceMessageMatch(state.messages, matchInput);
  if (match.index < 0) return unchangedResult(state);
  const messages = [...state.messages];
  const changedMessage = patch(messages[match.index]);
  messages[match.index] = changedMessage;
  return result(messages, changedMessage, "replace", match.matchedBy);
}

function messageFromSendAck(
  ack: Extract<CustomerServiceMessageEvent, { type: "cs.message.send_ack_received" }>["ack"],
): CustomerServiceMessage {
  const serverFields = ack.serverFields ?? {};
  return {
    ...(ack.serverMessage ?? {}),
    ...(serverFields.messageId ? { messageId: serverFields.messageId } : {}),
    ...(ack.clientMsgId ? { clientMsgId: ack.clientMsgId } : {}),
    ...(serverFields.conversationId ? { conversationId: serverFields.conversationId } : {}),
    ...(serverFields.conversationSeq !== undefined
      ? { conversationSeq: serverFields.conversationSeq }
      : {}),
    ...(serverFields.sentAt || serverFields.serverTime
      ? { sentAt: serverFields.sentAt || serverFields.serverTime }
      : {}),
    ...(serverFields.status ? { status: serverFields.status } : {}),
    ...(serverFields.readAt !== undefined ? { readAt: serverFields.readAt } : {}),
    ...(serverFields.readCount !== undefined ? { readCount: serverFields.readCount } : {}),
    ...(serverFields.isRead !== undefined ? { isRead: serverFields.isRead } : {}),
    body: ack.serverMessage?.body ?? {},
    direction: ack.serverMessage?.direction || "out",
    isSelf: ack.serverMessage?.isSelf ?? true,
    messageId:
      serverFields.messageId ||
      ack.serverMessage?.messageId ||
      ack.localMessageId ||
      ack.clientMsgId ||
      "unknown-cs-message",
    messageType: ack.serverMessage?.messageType || "text",
    preview: ack.serverMessage?.preview ?? "",
  } as CustomerServiceMessage;
}

function result(
  messages: CustomerServiceMessage[],
  changedMessage: CustomerServiceMessage,
  decision: "append" | "replace",
  matchedBy: CustomerServiceMessageMatchedBy,
): CustomerServiceMessageReduceResult {
  const sorted = [...messages].sort(compareMessagesAscending);
  return {
    changedMessage,
    decision,
    matchedBy,
    messages: sorted,
    state: { messages: sorted },
  };
}

function unchangedResult(state: CustomerServiceMessageState): CustomerServiceMessageReduceResult {
  return {
    decision: "ignored",
    matchedBy: "none",
    messages: state.messages,
    state,
  };
}

function compareMessagesAscending(left: CustomerServiceMessage, right: CustomerServiceMessage) {
  const leftSeq = positiveSeq(left.conversationSeq);
  const rightSeq = positiveSeq(right.conversationSeq);
  if (leftSeq !== undefined && rightSeq !== undefined && leftSeq !== rightSeq) {
    return leftSeq - rightSeq;
  }
  const leftTime = timestamp(left.sentAt);
  const rightTime = timestamp(right.sentAt);
  if (leftTime !== undefined && rightTime !== undefined && leftTime !== rightTime) {
    return leftTime - rightTime;
  }
  if (leftSeq !== undefined && rightSeq === undefined) return -1;
  if (leftSeq === undefined && rightSeq !== undefined) return 1;
  return 0;
}

function positiveSeq(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) && value > 0
    ? Math.floor(value)
    : undefined;
}

function timestamp(value: unknown) {
  if (typeof value !== "string" || !value.trim()) return undefined;
  const time = Date.parse(value);
  return Number.isFinite(time) ? time : undefined;
}
