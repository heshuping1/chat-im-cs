import type {
  CustomerServiceMessage,
  CustomerServiceMessageMatchedBy,
} from "./cs-message-types";

export interface CustomerServiceMessageMatchInput {
  clientMsgId?: string;
  conversationId?: string;
  conversationSeq?: number;
  localMessageId?: string;
  message?: Partial<CustomerServiceMessage>;
  messageId?: string;
}

export interface CustomerServiceMessageMatchResult {
  index: number;
  matchedBy: CustomerServiceMessageMatchedBy;
}

export function customerServiceClientMessageId(message?: Partial<CustomerServiceMessage>) {
  return readNonEmptyString(message?.clientMsgId) || readNonEmptyString(message?.clientMessageId);
}

export function findCustomerServiceMessageMatch(
  messages: CustomerServiceMessage[],
  input: CustomerServiceMessageMatchInput,
): CustomerServiceMessageMatchResult {
  const message = input.message;
  const clientIds = uniqueStrings([
    input.clientMsgId,
    customerServiceClientMessageId(message),
  ]);
  if (clientIds.length) {
    const index = messages.findIndex((item) =>
      clientIds.includes(customerServiceClientMessageId(item) ?? ""),
    );
    if (index >= 0) return { index, matchedBy: "clientMsgId" };
  }

  const messageIds = uniqueStrings([input.messageId, message?.messageId]);
  if (messageIds.length) {
    const index = messages.findIndex((item) => messageIds.includes(item.messageId));
    if (index >= 0) return { index, matchedBy: "messageId" };
  }

  const conversationId = readNonEmptyString(input.conversationId) || message?.conversationId;
  const conversationSeq =
    positiveNumber(input.conversationSeq) ?? positiveNumber(message?.conversationSeq);
  if (conversationId && conversationSeq !== undefined) {
    const index = messages.findIndex(
      (item) =>
        item.conversationId === conversationId &&
        positiveNumber(item.conversationSeq) === conversationSeq,
    );
    if (index >= 0) return { index, matchedBy: "conversationSeq" };
  }

  const localMessageId = readNonEmptyString(input.localMessageId);
  if (localMessageId) {
    const index = messages.findIndex((item) => item.messageId === localMessageId);
    if (index >= 0) return { index, matchedBy: "localMessageId" };
  }

  return { index: -1, matchedBy: "none" };
}

export function readNonEmptyString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function positiveNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) && value > 0
    ? Math.floor(value)
    : undefined;
}

function uniqueStrings(values: Array<string | undefined>) {
  return Array.from(new Set(values.map(readNonEmptyString).filter(Boolean) as string[]));
}
