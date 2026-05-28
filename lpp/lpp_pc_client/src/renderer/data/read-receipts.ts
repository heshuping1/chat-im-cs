import type { MessageItemDto } from "./api-client";
import { nextReadSeqFromVisibleMessages } from "./im-read-model";
import { isSelfSenderAny, type CurrentUserIdentity } from "./message-display";

export function applyDirectReadReceiptToMessages(
  messages: MessageItemDto[],
  readSeq: number,
  identity: CurrentUserIdentity | null,
) {
  return messages.map((message) => {
    const messageSeq = message.conversationSeq ?? 0;
    if (
      messageSeq <= 0 ||
      messageSeq > readSeq ||
      !isSelfMessage(message, identity) ||
      message.isRead
    ) {
      return message;
    }
    return {
      ...message,
      isRead: true,
      status: "read",
    };
  });
}

export function readReceiptReaderIsCurrentUser(
  readerIds: Array<string | null | undefined>,
  identity: CurrentUserIdentity | null,
) {
  return isSelfSenderAny(readerIds, undefined, identity);
}

export function mergePeerReadSeq(
  current: number | undefined,
  next: number | undefined,
) {
  return Math.max(0, Number(current ?? 0), Number(next ?? 0));
}

export function viewedConversationReadSeq(
  messages: MessageItemDto[],
  currentReadSeq: number,
  identity: CurrentUserIdentity | null,
  fallbackLastMessageSeq = 0,
) {
  const next = nextReadSeqFromVisibleMessages(
    messages,
    currentReadSeq,
    identity,
    fallbackLastMessageSeq,
  );
  return next !== undefined && next > Math.max(0, Math.floor(currentReadSeq))
    ? next
    : undefined;
}

function isSelfMessage(
  message: MessageItemDto,
  identity: CurrentUserIdentity | null,
) {
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
  if (senderIds.some((value) => typeof value === "string" && value.trim())) {
    return isSelfSenderAny(senderIds, undefined, identity);
  }
  return isSelfSenderAny([], message.senderDisplayName, identity);
}

function normalizeType(value: string) {
  return value.trim().toLowerCase().replace(/-/g, "_");
}
