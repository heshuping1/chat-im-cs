export const maxOpenServiceThreads = 5;

export function openServiceThread(
  openThreadIds: string[],
  threadId: string,
  limit = maxOpenServiceThreads,
) {
  const normalizedThreadId = threadId.trim();
  if (!normalizedThreadId) return openThreadIds;
  const uniqueOpenThreadIds = openThreadIds.filter(
    (id, index) => id && openThreadIds.indexOf(id) === index && id !== normalizedThreadId,
  );
  return [...uniqueOpenThreadIds, normalizedThreadId].slice(-Math.max(1, limit));
}

export function closeServiceThread(input: {
  activeThreadId: string;
  closingThreadId: string;
  openThreadIds: string[];
}) {
  const remainingThreadIds = input.openThreadIds.filter(
    (threadId) => threadId && threadId !== input.closingThreadId,
  );
  const activeThreadId =
    input.activeThreadId === input.closingThreadId
      ? remainingThreadIds[remainingThreadIds.length - 1] ?? ""
      : input.activeThreadId;
  return {
    activeThreadId,
    openThreadIds: remainingThreadIds,
  };
}
