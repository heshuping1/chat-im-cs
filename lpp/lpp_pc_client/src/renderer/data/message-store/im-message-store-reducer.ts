import type { MessageItemDto } from "../api/types";
import { timestampFromDateValue } from "../../lib/format";

export function mergeMessagesForLocalStore(messages: MessageItemDto[]) {
  const byMessageId = new Map<string, MessageItemDto>();
  for (const message of messages) {
    const messageId = stableMessageId(message);
    if (!messageId) continue;
    const previous = byMessageId.get(messageId);
    byMessageId.set(messageId, previous ? chooseNewerMessage(previous, message) : message);
  }
  return Array.from(byMessageId.values()).sort(compareMessagesForLocalStore);
}

export function compareMessagesForLocalStore(left: MessageItemDto, right: MessageItemDto) {
  return (
    comparableSeq(left) - comparableSeq(right) ||
    comparableTime(left) - comparableTime(right) ||
    stableMessageId(left).localeCompare(stableMessageId(right))
  );
}

function chooseNewerMessage(left: MessageItemDto, right: MessageItemDto) {
  const leftSeq = comparableSeq(left);
  const rightSeq = comparableSeq(right);
  if (rightSeq !== leftSeq) return rightSeq > leftSeq ? right : left;
  const leftTime = comparableTime(left);
  const rightTime = comparableTime(right);
  if (rightTime !== leftTime) return rightTime > leftTime ? right : left;
  return { ...left, ...right };
}

function comparableSeq(message: MessageItemDto) {
  return typeof message.conversationSeq === "number"
    ? message.conversationSeq
    : Number.MAX_SAFE_INTEGER;
}

function comparableTime(message: MessageItemDto) {
  const record = message as unknown as Record<string, unknown>;
  return timestampFromDateValue(message.sentAt ?? dateValue(record.serverTime));
}

function stableMessageId(message: MessageItemDto) {
  return typeof message.messageId === "string" ? message.messageId.trim() : "";
}

function dateValue(value: unknown) {
  return typeof value === "string" || typeof value === "number" || value instanceof Date
    ? value
    : undefined;
}
