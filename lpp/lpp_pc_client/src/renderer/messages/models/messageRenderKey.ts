import type { MessageItemDto } from "../../data/api-client";

export function chatMessageRenderKey(message: MessageItemDto) {
  const clientKey = firstString(
    message.clientMsgId,
    message.clientMessageId,
    message.localTaskId,
  );
  if (clientKey) return `client:${clientKey}`;

  const messageId = firstString(message.messageId);
  return messageId ? `message:${messageId}` : `message:${fallbackMessageKey(message)}`;
}

function firstString(...values: unknown[]) {
  return values
    .find((value): value is string => typeof value === "string" && Boolean(value.trim()))
    ?.trim();
}

function fallbackMessageKey(message: MessageItemDto) {
  return [
    message.conversationId,
    message.conversationSeq,
    message.sentAt,
    message.messageType,
    message.preview,
  ].map((value) => String(value ?? "")).join(":");
}
