export interface MessageQueryHotSnapshot<TData> {
  data: TData;
  updatedAt: number;
}

export interface MessageQueryHotCache<TData> {
  read(queryKey: readonly unknown[]): MessageQueryHotSnapshot<TData> | undefined;
  remember(queryKey: readonly unknown[], data: TData, updatedAt?: number): void;
}

export function messageQueryHotCacheKey(queryKey: readonly unknown[]) {
  return JSON.stringify(queryKey);
}

export function createMessageQueryHotCache<TData>({
  maxEntries = 80,
}: {
  maxEntries?: number;
} = {}): MessageQueryHotCache<TData> {
  const snapshots = new Map<string, MessageQueryHotSnapshot<TData>>();
  return {
    read: (queryKey) => snapshots.get(messageQueryHotCacheKey(queryKey)),
    remember: (queryKey, data, updatedAt = Date.now()) => {
      const key = messageQueryHotCacheKey(queryKey);
      snapshots.delete(key);
      snapshots.set(key, { data, updatedAt });
      while (snapshots.size > maxEntries) {
        const oldestKey = snapshots.keys().next().value;
        if (!oldestKey) break;
        snapshots.delete(oldestKey);
      }
    },
  };
}
