import type { CustomerServiceThread, MessageItemDto } from "../api/types";

const recalledMessagesByThread = new Map<string, Set<string>>();

export function rememberSilentCustomerServiceRecall(
  thread: Pick<CustomerServiceThread, "conversationId" | "threadId"> | string,
  messageId: string,
) {
  const ids =
    typeof thread === "string"
      ? [thread]
      : compactThreadIds(thread.threadId, thread.conversationId);
  ids.forEach((threadId) => {
    const messages = recalledMessagesByThread.get(threadId) ?? new Set<string>();
    messages.add(messageId);
    recalledMessagesByThread.set(threadId, messages);
  });
}

export function isSilentCustomerServiceRecalledMessage(
  thread: Pick<CustomerServiceThread, "conversationId" | "threadId"> | undefined,
  message: Pick<MessageItemDto, "conversationId" | "messageId">,
) {
  if (!message.messageId) return false;
  const ids = compactThreadIds(thread?.threadId, thread?.conversationId, message.conversationId);
  return ids.some((threadId) => recalledMessagesByThread.get(threadId)?.has(message.messageId));
}

export function resetSilentCustomerServiceRecallForTest() {
  recalledMessagesByThread.clear();
}

function compactThreadIds(...ids: Array<string | null | undefined>) {
  return Array.from(new Set(ids.map((id) => id?.trim()).filter((id): id is string => Boolean(id))));
}
