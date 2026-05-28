import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import {
  isTerminalCustomerServiceThreadStatus,
  normalizeCustomerServiceThreadType,
  staffServiceHistoryItemToThread,
  type CustomerProfileCard,
} from "../data/api-client";
import { pcQueryKeys } from "../data/query-keys";
import { createApiClient } from "../data/runtime";
import { useWorkspaceStore } from "../data/store";
import { CustomerProfileWorkspace } from "./CustomerProfileWorkspace";

export function CustomerContextPanel() {
  const session = useWorkspaceStore((state) => state.authSession);
  const selectedThreadId = useWorkspaceStore((state) => state.activeThreadId);
  const client = useMemo(
    () => (session ? createApiClient(session) : null),
    [session],
  );
  const queryBaseKey = [session?.apiBaseUrl, session?.tenantToken];

  const threadsQuery = useQuery({
    queryKey: pcQueryKeys.customerServiceThreads(...queryBaseKey),
    enabled: Boolean(client),
    queryFn: async () => client!.getWorkbenchThreads(),
  });
  const historyQuery = useQuery({
    queryKey: pcQueryKeys.customerServiceHistory(...queryBaseKey),
    enabled: Boolean(client),
    queryFn: async () =>
      client!.getStaffServiceHistory({ threadType: "temp_session", limit: 50 }),
  });

  const selectedThread = useMemo(() => {
    const currentThreads = [
      ...(threadsQuery.data?.queueItems ?? []),
      ...(threadsQuery.data?.activeItems ?? []),
    ]
      .filter((thread) => normalizeCustomerServiceThreadType(thread.threadType) === "temp_session")
      .filter((thread) => !isTerminalCustomerServiceThreadStatus(thread.status));
    const historyThreads = (historyQuery.data?.items ?? [])
      .map(staffServiceHistoryItemToThread)
      .filter((thread) => thread.threadType === "temp_session");
    return (
      [...currentThreads, ...historyThreads].find(
        (thread) => thread.threadId === selectedThreadId,
      ) ??
      currentThreads[0] ??
      historyThreads[0]
    );
  }, [historyQuery.data, selectedThreadId, threadsQuery.data]);

  const profileQuery = useQuery({
    queryKey: pcQueryKeys.customerServiceThreadProfile(
      ...queryBaseKey,
      selectedThread?.threadType,
      selectedThread?.threadId,
    ),
    enabled: Boolean(client && selectedThread),
    queryFn: async () =>
      client!.getThreadProfileCard(selectedThread!.threadType, selectedThread!.threadId),
  });

  const profile = profileQuery.data;
  const threadRecord = selectedThread as unknown as Record<string, unknown>;
  const profileForPanel: CustomerProfileCard | undefined =
    profile ??
    (selectedThread
      ? {
          avatarUrl: selectedThread.customerAvatarUrl || selectedThread.avatarUrl || undefined,
          channel: String(threadRecord.channel ?? threadRecord.sourceChannel ?? ""),
          customerUserId: String(
            threadRecord.customerUserId ?? threadRecord.visitorUserId ?? selectedThread.threadId,
          ),
          displayName: selectedThread.title,
          source: String(threadRecord.source ?? threadRecord.sourceChannel ?? ""),
        }
      : undefined);

  if (!selectedThread) {
    return (
      <aside className="h-context-panel customer-info-panel">
        <header className="customer-info-head">
          <h2>客户信息</h2>
        </header>
        <div className="panel-state muted">请选择在线客服会话查看客户资料。</div>
      </aside>
    );
  }

  return (
    <CustomerProfileWorkspace
      avatarUrl={selectedThread.customerAvatarUrl || selectedThread.avatarUrl}
      className="h-context-panel"
      error={profileQuery.error}
      loading={profileQuery.isLoading}
      profile={profileForPanel}
      title="客户信息"
    />
  );
}
