import type { CustomerProfileCard, CustomerServiceThread } from "../api-client";
import type { AuthSession } from "../auth/auth-session";
import { imMessageScopeKey } from "../message-store/im-message-store-scope";

export async function listLocalCustomerServiceThreadSnapshots(
  session: AuthSession | null | undefined,
) {
  if (!session || !window.desktopApi?.localDataListCustomerServiceThreads) return [];
  return window.desktopApi.localDataListCustomerServiceThreads({
    limit: 200,
    scopeKey: imMessageScopeKey(session),
  });
}

export function upsertLocalCustomerServiceThreads(
  session: AuthSession | null | undefined,
  threads: CustomerServiceThread[],
) {
  if (!session || !window.desktopApi?.localDataUpsertCustomerServiceThread) return;
  const scopeKey = imMessageScopeKey(session);
  threads.forEach((thread) => {
    void window.desktopApi!.localDataUpsertCustomerServiceThread({
      thread: {
        customerSnapshotJson: { thread },
        lastEventJson: {
          lastMessageAt: thread.lastMessageAt,
          lastMessagePreview: thread.lastMessagePreview,
        },
        scopeKey,
        status: thread.status,
        threadId: thread.threadId,
        threadType: thread.threadType,
        unreadCount: thread.unreadCount ?? 0,
        updatedAt: Date.parse(thread.updatedAt || thread.lastMessageAt || "") || Date.now(),
      },
    }).catch(() => undefined);
  });
}

export function upsertLocalCustomerServiceProfileSnapshot({
  profile,
  session,
  thread,
}: {
  profile: CustomerProfileCard;
  session: AuthSession | null | undefined;
  thread: CustomerServiceThread | undefined;
}) {
  if (!session || !thread || !window.desktopApi?.localDataUpsertCustomerServiceThread) return;
  void window.desktopApi.localDataUpsertCustomerServiceThread({
    thread: {
      customerSnapshotJson: { profile, thread },
      lastEventJson: {
        lastMessageAt: thread.lastMessageAt,
        lastMessagePreview: thread.lastMessagePreview,
      },
      scopeKey: imMessageScopeKey(session),
      status: thread.status,
      threadId: thread.threadId,
      threadType: thread.threadType,
      unreadCount: thread.unreadCount ?? 0,
      updatedAt: Date.now(),
    },
  }).catch(() => undefined);
}

export function profileFromLocalCustomerSnapshot(snapshot?: Record<string, unknown>) {
  const profile = snapshot?.profile;
  return profile && typeof profile === "object" && !Array.isArray(profile)
    ? (profile as CustomerProfileCard)
    : undefined;
}
