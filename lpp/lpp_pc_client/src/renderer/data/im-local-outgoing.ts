import type { MessageItemDto } from "./api/types";

export function mergeLocalOutgoingMessages(
  serverMessages: MessageItemDto[],
  localMessages: MessageItemDto[],
) {
  if (localMessages.length === 0) return serverMessages;
  const serverIds = new Set(serverMessages.map((message) => message.messageId).filter(Boolean));
  const localOnly = localMessages.filter((message) => !serverIds.has(message.messageId));
  if (localOnly.length === 0) return serverMessages;
  return [...serverMessages, ...localOnly].sort(sortMessages);
}

function sortMessages(left: MessageItemDto, right: MessageItemDto) {
  const leftSeq = Number(left.conversationSeq ?? Number.MAX_SAFE_INTEGER);
  const rightSeq = Number(right.conversationSeq ?? Number.MAX_SAFE_INTEGER);
  return (
    leftSeq - rightSeq ||
    new Date(left.sentAt ?? 0).getTime() - new Date(right.sentAt ?? 0).getTime()
  );
}
