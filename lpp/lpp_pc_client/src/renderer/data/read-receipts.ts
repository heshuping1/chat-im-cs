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

export function latestPendingDirectReadReceiptSeq({
  identity,
  messages,
  peerReadSeq,
}: {
  identity: CurrentUserIdentity | null;
  messages: MessageItemDto[];
  peerReadSeq?: number | null;
}) {
  const currentPeerReadSeq = normalizedSeq(peerReadSeq);
  return messages.reduce((latest, message) => {
    const messageSeq = normalizedSeq(message.conversationSeq);
    if (
      messageSeq <= currentPeerReadSeq ||
      !isSentLikeMessage(message) ||
      !isSelfMessage(message, identity) ||
      isDirectRead(message)
    ) {
      return latest;
    }
    return Math.max(latest, messageSeq);
  }, 0);
}

export function applyGroupReadReceiptToMessages({
  identity,
  messages,
  previousReaderReadSeq,
  readSeq,
}: {
  identity: CurrentUserIdentity | null;
  messages: MessageItemDto[];
  previousReaderReadSeq: number;
  readSeq: number;
}) {
  const nextReadSeq = Math.max(0, Math.floor(readSeq));
  const previousSeq = Math.max(0, Math.floor(previousReaderReadSeq));
  if (nextReadSeq <= previousSeq) return messages;

  return messages.map((message) => {
    const messageSeq = message.conversationSeq ?? 0;
    if (
      messageSeq <= 0 ||
      messageSeq > nextReadSeq ||
      messageSeq <= previousSeq ||
      !isSelfMessage(message, identity)
    ) {
      return message;
    }
    const readCount = normalizedReadCount(message.readCount);
    return {
      ...message,
      readCount: readCount + 1,
    };
  });
}

export function syncGroupReadReceiptSnapshot({
  conversationType,
  identity,
  messageId,
  messages,
  messageSeq,
  readCount,
}: {
  conversationType: string;
  identity: CurrentUserIdentity | null;
  messageId?: string;
  messages: MessageItemDto[];
  messageSeq?: number;
  readCount: number;
}) {
  if (normalizeType(conversationType) !== "group") return messages;
  const snapshotReadCount = normalizedReadCount(readCount);
  const targetMessageId = typeof messageId === "string" ? messageId.trim() : "";
  const targetSeq = normalizedSeq(messageSeq);
  if (!targetMessageId && targetSeq <= 0) return messages;
  const hasMessageIdCandidate = Boolean(
    targetMessageId &&
      messages.some((message) => String(message.messageId ?? "") === targetMessageId),
  );
  let changed = false;
  const nextMessages = messages.map((message) => {
    const messageSeqValue = normalizedSeq(message.conversationSeq);
    const matchesTarget = hasMessageIdCandidate
      ? String(message.messageId ?? "") === targetMessageId
      : targetSeq > 0 && messageSeqValue === targetSeq;
    if (
      !matchesTarget ||
      messageSeqValue <= 0 ||
      !isSentLikeMessage(message) ||
      !isSelfMessage(message, identity)
    ) {
      return message;
    }
    const currentReadCount = normalizedReadCount(message.readCount);
    const nextReadCount = Math.max(currentReadCount, snapshotReadCount);
    if (nextReadCount === currentReadCount) return message;
    changed = true;
    return {
      ...message,
      readCount: nextReadCount,
    };
  });
  return changed ? nextMessages : messages;
}

export function pendingGroupReadReceiptSnapshotTargets({
  identity,
  maxTargets = 4,
  messages,
  totalReadableMembers,
}: {
  identity: CurrentUserIdentity | null;
  maxTargets?: number;
  messages: MessageItemDto[];
  totalReadableMembers?: number;
}) {
  const readableTotal = normalizedReadCount(totalReadableMembers);
  return messages
    .filter((message) => {
      const messageSeq = normalizedSeq(message.conversationSeq);
      if (
        messageSeq <= 0 ||
        !isSentLikeMessage(message) ||
        !isSelfMessage(message, identity)
      ) {
        return false;
      }
      const readCount = normalizedReadCount(message.readCount);
      return readableTotal <= 0 || readCount < readableTotal;
    })
    .sort((left, right) => normalizedSeq(right.conversationSeq) - normalizedSeq(left.conversationSeq))
    .slice(0, Math.max(0, Math.floor(maxTargets)))
    .map((message) => ({
      messageId: String(message.messageId ?? ""),
      messageSeq: normalizedSeq(message.conversationSeq),
      readCount: normalizedReadCount(message.readCount),
    }))
    .filter((target) => target.messageId && target.messageSeq > 0);
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

function normalizedSeq(value: unknown) {
  const seq = typeof value === "number" ? value : Number(value);
  return Number.isFinite(seq) && seq > 0 ? Math.floor(seq) : 0;
}

function normalizedReadCount(value: unknown) {
  const count = typeof value === "number" ? value : Number(value);
  return Number.isFinite(count) && count > 0 ? Math.floor(count) : 0;
}

function isSentLikeMessage(message: MessageItemDto) {
  if (message.isRecalled) return false;
  const status = normalizeType(String(message.status ?? ""));
  return !["failed", "recalled", "sending", "pending"].includes(status);
}

function isDirectRead(message: MessageItemDto) {
  const status = normalizeType(String(message.status ?? ""));
  return Boolean(message.isRead || message.readAt || status === "read");
}
