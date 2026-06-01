import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import type { DragEvent } from "react";
import { GripVertical, LibraryBig, MessageSquareText, Pin, PinOff } from "lucide-react";
import {
  isTerminalCustomerServiceThreadStatus,
  normalizeCustomerServiceThreadType,
  staffServiceHistoryItemToThread,
  type CustomerProfileCard,
} from "../data/api-client";
import { useAuthSession } from "../data/auth/auth-store";
import { pcQueryKeys } from "../data/query-keys";
import { createApiClient } from "../data/runtime";
import { useActiveThreadId } from "../data/workspace-ui/workspace-ui-store";
import { CustomerProfileWorkspace } from "./CustomerProfileWorkspace";

export function useCustomerContextPanelModel() {
  const session = useAuthSession();
  const selectedThreadId = useActiveThreadId();
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

  return {
    profileError: profileQuery.error,
    profileForPanel,
    profileLoading: profileQuery.isLoading,
    selectedThread,
  };
}

export function CustomerContextPanel({
  onDragOverContextPane,
  onDragStartContextPane,
  onDropContextPane,
  onTogglePin,
  pinned = false,
}: {
  onDragOverContextPane?: (event: DragEvent<HTMLElement>) => void;
  onDragStartContextPane?: (
    event: DragEvent<HTMLElement>,
    pane: "assistant" | "customer",
  ) => void;
  onDropContextPane?: (
    event: DragEvent<HTMLElement>,
    pane: "assistant" | "customer",
  ) => void;
  onTogglePin?: () => void;
  pinned?: boolean;
}) {
  const {
    profileError,
    profileForPanel,
    profileLoading,
    selectedThread,
  } = useCustomerContextPanelModel();

  if (!selectedThread) {
    return (
      <aside className="h-context-panel customer-info-panel">
        <header className="customer-info-head">
          <h2>客户信息</h2>
          {onTogglePin && (
            <div className="customer-info-head-actions">
              {renderCustomerContextActions({
                onDragOverContextPane,
                onDragStartContextPane,
                onTogglePin,
                pinned,
              })}
            </div>
          )}
        </header>
        <div className="panel-state muted">请选择在线客服会话查看客户资料。</div>
      </aside>
    );
  }

  return (
    <CustomerProfileWorkspace
      avatarUrl={selectedThread.customerAvatarUrl || selectedThread.avatarUrl}
      className="h-context-panel"
      error={profileError}
      headerActions={
        onTogglePin
          ? renderCustomerContextActions({
              onDragOverContextPane,
              onDragStartContextPane,
              onTogglePin,
              pinned,
            })
          : undefined
      }
      loading={profileLoading}
      onDragOver={onDragOverContextPane}
      onDrop={(event) => onDropContextPane?.(event, "customer")}
      profile={profileForPanel}
      title="客户信息"
    />
  );
}

export function CustomerContextRail({
  activeAssistantPane,
  customerPaneCollapsed,
  onToggleCustomerPane,
  onToggleAssistantPane,
}: {
  activeAssistantPane: "aiDraft" | "knowledge" | "quickReply" | null;
  customerPaneCollapsed: boolean;
  onToggleCustomerPane: () => void;
  onToggleAssistantPane: (pane: "aiDraft" | "knowledge" | "quickReply") => void;
}) {
  const { selectedThread } = useCustomerContextPanelModel();
  const customerTooltip = customerPaneCollapsed ? "展开客户信息" : "收起客户信息";

  return (
    <aside className="service-customer-rail" aria-label="客户上下文快捷栏">
      <button
        className={`service-customer-rail-avatar ${!customerPaneCollapsed ? "active" : ""}`}
        type="button"
        title={customerTooltip}
        data-tooltip={customerTooltip}
        aria-label={customerTooltip}
        aria-pressed={!customerPaneCollapsed}
        onClick={onToggleCustomerPane}
      >
        <img
          className="service-customer-rail-avatar-image"
          src="/customer-info-entry.svg"
          alt=""
          aria-hidden="true"
        />
        {selectedThread && <span className="service-customer-status-dot" />}
      </button>
      <div className="service-customer-rail-actions" aria-label="客服工具">
        <button
          className={activeAssistantPane === "quickReply" ? "active" : ""}
          type="button"
          title="快捷话术"
          data-tooltip="快捷话术"
          aria-label="快捷话术"
          aria-pressed={activeAssistantPane === "quickReply"}
          onClick={() => onToggleAssistantPane("quickReply")}
        >
          <MessageSquareText size={18} />
        </button>
        <button
          className={activeAssistantPane === "aiDraft" ? "active" : ""}
          type="button"
          title="AI 起草"
          data-tooltip="AI 起草"
          aria-label="AI 起草"
          aria-pressed={activeAssistantPane === "aiDraft"}
          onClick={() => onToggleAssistantPane("aiDraft")}
        >
          <img
            className="context-rail-tool-image ai-draft"
            src="/ai-draft-entry.svg"
            alt=""
            aria-hidden="true"
          />
        </button>
        <button
          className={activeAssistantPane === "knowledge" ? "active" : ""}
          type="button"
          title="知识库"
          data-tooltip="知识库"
          aria-label="知识库"
          aria-pressed={activeAssistantPane === "knowledge"}
          onClick={() => onToggleAssistantPane("knowledge")}
        >
          <LibraryBig size={18} />
        </button>
      </div>
    </aside>
  );
}

function renderCustomerContextActions({
  onDragOverContextPane,
  onDragStartContextPane,
  onTogglePin,
  pinned,
}: {
  onDragOverContextPane?: (event: DragEvent<HTMLElement>) => void;
  onDragStartContextPane?: (
    event: DragEvent<HTMLElement>,
    pane: "assistant" | "customer",
  ) => void;
  onTogglePin: () => void;
  pinned: boolean;
}) {
  return (
    <>
      <button
        className="context-pane-drag"
        type="button"
        draggable
        title="拖拽排序"
        aria-label="拖拽排序"
        onDragOver={onDragOverContextPane}
        onDragStart={(event) => onDragStartContextPane?.(event, "customer")}
      >
        <GripVertical size={15} />
      </button>
      <button
        className={`context-pane-pin ${pinned ? "active" : ""}`}
        type="button"
        title={pinned ? "取消固定" : "固定客户信息"}
        aria-label={pinned ? "取消固定" : "固定客户信息"}
        aria-pressed={pinned}
        onClick={onTogglePin}
      >
        {pinned ? <PinOff size={15} /> : <Pin size={15} />}
      </button>
    </>
  );
}
