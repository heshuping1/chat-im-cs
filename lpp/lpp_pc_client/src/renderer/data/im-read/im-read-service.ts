import type { LocalImConversationRead } from "./im-read-storage";

export interface ResolveEffectiveImUnreadInput {
  serverUnreadCount?: number | null;
  lastMessageSeq?: number | null;
  lastReadSeq?: number | null;
  localReadSeq?: number | null;
  localReadCoversLastMessage?: boolean;
  selfConversation?: boolean;
  selfLastMessage?: boolean;
}

export interface ApplyImReadSeqInput {
  lastReadSeq?: number | null;
  lastMessageSeq?: number | null;
  unreadCount?: number | null;
}

export function resolveEffectiveImUnreadCount(input: ResolveEffectiveImUnreadInput) {
  const lastMessageSeq = normalizedSeq(input.lastMessageSeq);
  const readSeq = Math.max(
    normalizedSeq(input.lastReadSeq),
    normalizedSeq(input.localReadSeq),
  );

  if (lastMessageSeq > 0 && readSeq >= lastMessageSeq) return 0;
  if (input.localReadCoversLastMessage) return 0;
  if (input.selfConversation) return 0;
  if (input.selfLastMessage) return 0;

  const serverUnread = normalizedSeq(input.serverUnreadCount);
  if (lastMessageSeq > 0 && readSeq > 0 && lastMessageSeq > readSeq) {
    return Math.min(serverUnread, lastMessageSeq - readSeq);
  }
  return serverUnread;
}

export function isLocalReadCoversLastMessage(input: {
  localRead?: LocalImConversationRead;
  lastMessageSeq?: number | null;
  lastMessageAt?: string | null;
  messageKeyMatches?: boolean;
  selfLastMessage?: boolean;
}) {
  const localRead = input.localRead;
  if (!localRead) return false;
  if (input.messageKeyMatches) return true;
  if (localRead.messageKey && input.selfLastMessage) return true;

  const localReadAt = Number(localRead.readAt ?? 0);
  const lastMessageAt = input.lastMessageAt ? Date.parse(input.lastMessageAt) : 0;
  if (
    localReadAt > 0 &&
    Number.isFinite(lastMessageAt) &&
    lastMessageAt > 0 &&
    lastMessageAt <= localReadAt
  ) {
    return true;
  }

  const localReadSeq = normalizedSeq(localRead.readSeq);
  const lastMessageSeq = normalizedSeq(input.lastMessageSeq);
  return lastMessageSeq > 0 && localReadSeq >= lastMessageSeq;
}

export function applyImReadSeqToConversationSnapshot(
  input: ApplyImReadSeqInput,
  readSeq: number,
) {
  const nextReadSeq = Math.max(normalizedSeq(input.lastReadSeq), normalizedSeq(readSeq));
  const lastMessageSeq = normalizedSeq(input.lastMessageSeq);
  return {
    lastReadSeq: nextReadSeq,
    unreadCount: lastMessageSeq > nextReadSeq ? normalizedSeq(input.unreadCount) : 0,
  };
}

export function normalizedSeq(value: unknown) {
  return Number.isFinite(Number(value)) ? Math.max(0, Math.floor(Number(value))) : 0;
}
