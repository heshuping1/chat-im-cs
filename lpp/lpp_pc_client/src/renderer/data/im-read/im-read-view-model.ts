import type { ConversationReadState } from "../im-read-model";
import type { LocalImConversationRead } from "./im-read-storage";

export function mergeUnifiedReadStateForIdentity(
  storedConversationReads: Record<string, LocalImConversationRead> | undefined,
  readStateByConversation: Record<string, ConversationReadState>,
) {
  const merged = { ...(storedConversationReads ?? {}) };
  Object.values(readStateByConversation).forEach((readState) => {
    const readSeq = Math.max(0, Math.floor(readState.myReadSeq));
    if (readSeq <= 0) return;
    const read = { readSeq, readAt: readState.updatedAt };
    const currentByKey = merged[readState.conversationKey];
    if (!currentByKey || currentByKey.readSeq < readSeq) {
      merged[readState.conversationKey] = read;
    }
    const currentById = merged[readState.conversationId];
    if (!currentById || currentById.readSeq < readSeq) {
      merged[readState.conversationId] = read;
    }
  });
  return merged;
}

export function readStateMeaningfullyChanged(
  previous: ConversationReadState | undefined,
  next: ConversationReadState,
) {
  return (
    !previous ||
    previous.myReadSeq !== next.myReadSeq ||
    previous.peerReadSeq !== next.peerReadSeq ||
    previous.lastMessageSeq !== next.lastMessageSeq ||
    previous.unreadCount !== next.unreadCount ||
    previous.pendingReadSeq !== next.pendingReadSeq
  );
}
