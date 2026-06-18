import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import type { DragEvent, ReactNode } from "react";
import {
  ClipboardList,
  GripVertical,
  LibraryBig,
  MessageSquareText,
  Pin,
  PinOff,
  Sparkles,
  UserRound,
} from "lucide-react";

import {
  isTerminalCustomerServiceThreadStatus,
  normalizeCustomerServiceThreadType,
  type CustomerProfileCard,
} from "../data/api-client";
import { useAuthSession } from "../data/auth/auth-store";
import { pcQueryKeys } from "../data/query-keys";
import { createApiClient } from "../data/runtime";
import { canReadCustomerServiceHistory } from "../data/customer-service/cs-role-capabilities";
import {
  useActiveThreadId,
  type ServiceAssistantPane,
} from "../data/workspace-ui/workspace-ui-store";
import { useI18n } from "../i18n/useI18n";
import { CustomerProfileWorkspace } from "./CustomerProfileWorkspace";
import { PcAvatar } from "./PcAvatar";

type Translate = ReturnType<typeof useI18n>["t"];
const staffServiceHistoryPageSize = 50;

export function useCustomerContextPanelModel() {
  const session = useAuthSession();
  const selectedThreadId = useActiveThreadId();
  const client = useMemo(() => (session ? createApiClient(session) : null), [session]);
  const queryBaseKey = [session?.apiBaseUrl, session?.tenantToken];
  const canReadHistory = canReadCustomerServiceHistory(session);

  const threadsQuery = useQuery({
    queryKey: pcQueryKeys.customerServiceThreads(...queryBaseKey),
    enabled: Boolean(client),
    queryFn: async () => client!.getWorkbenchThreads(),
  });
  const historyQuery = useInfiniteQuery({
    queryKey: pcQueryKeys.customerServiceHistory(...queryBaseKey),
    enabled: Boolean(client && canReadHistory),
    initialPageParam: null as string | null,
    queryFn: async ({ pageParam }) =>
      client!.getCustomerServiceHistoryThreads({
        cursor: pageParam,
        limit: staffServiceHistoryPageSize,
        threadType: "temp_session",
      }),
    getNextPageParam: (lastPage) => lastPage.nextCursor || undefined,
  });
  const historyItems = useMemo(
    () => historyQuery.data?.pages.flatMap((page) => page.items) ?? [],
    [historyQuery.data],
  );

  const selectedThread = useMemo(() => {
    if (!selectedThreadId) return undefined;
    const normalizedSelectedThreadId = selectedThreadId.trim();
    if (!normalizedSelectedThreadId) return undefined;

    const currentThreads = [
      ...(threadsQuery.data?.queueItems ?? []),
      ...(threadsQuery.data?.activeItems ?? []),
    ]
      .filter((thread) => normalizeCustomerServiceThreadType(thread.threadType) === "temp_session")
      .filter((thread) => !isTerminalCustomerServiceThreadStatus(thread.status));
    const historyThreads = historyItems
      .filter((thread) => thread.threadType === "temp_session");
    return [...currentThreads, ...historyThreads].find(
      (thread) => thread.threadId === normalizedSelectedThreadId,
    );
  }, [historyItems, selectedThreadId, threadsQuery.data]);

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
  const { t } = useI18n();
  const { profileError, profileForPanel, profileLoading, selectedThread } =
    useCustomerContextPanelModel();

  if (!selectedThread) {
    return (
      <aside className="h-context-panel customer-info-panel">
        <header className="customer-info-head">
          <h2>{t("customerService.contextPanel.title")}</h2>
          {onTogglePin && (
            <div className="customer-info-head-actions">
              {renderCustomerContextActions({
                onDragOverContextPane,
                onDragStartContextPane,
                onTogglePin,
                pinned,
                t,
              })}
            </div>
          )}
        </header>
        <div className="customer-context-empty-state panel-state muted">
          <strong>{t("customerService.contextPanel.emptyTitle")}</strong>
          <span>{t("customerService.contextPanel.emptyText")}</span>
        </div>
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
              t,
            })
          : undefined
      }
      loading={profileLoading}
      onDragOver={onDragOverContextPane}
      onDrop={(event) => onDropContextPane?.(event, "customer")}
      profile={profileForPanel}
      title={t("customerService.contextPanel.title")}
    />
  );
}

export function CustomerContextRail({
  activeAssistantPane,
  customerPaneCollapsed,
  onToggleCustomerPane,
  onToggleAssistantPane,
}: {
  activeAssistantPane: ServiceAssistantPane;
  customerPaneCollapsed: boolean;
  onToggleCustomerPane: () => void;
  onToggleAssistantPane: (pane: Exclude<ServiceAssistantPane, null>) => void;
}) {
  const { t } = useI18n();
  const { selectedThread } = useCustomerContextPanelModel();
  const customerAvatarName =
    selectedThread?.title || t("customerService.threadList.unknownCustomer");
  const customerAvatarUrl =
    selectedThread?.customerAvatarUrl || selectedThread?.avatarUrl || undefined;
  const customerTooltip = selectedThread
    ? customerPaneCollapsed
      ? t("customerService.contextPanel.expandCustomer")
      : t("customerService.contextPanel.collapseCustomer")
    : t("customerService.contextPanel.selectFirst");

  return (
    <aside className="service-customer-rail" aria-label={t("customerService.contextPanel.railAria")}>
      <button
        className={`service-customer-rail-avatar ${!customerPaneCollapsed ? "active" : ""}`}
        type="button"
        title={customerTooltip}
        data-tooltip={customerTooltip}
        aria-label={customerTooltip}
        aria-pressed={!customerPaneCollapsed}
        onClick={onToggleCustomerPane}
      >
        {selectedThread ? (
          <PcAvatar
            avatarUrl={customerAvatarUrl}
            className="e-avatar service-customer-rail-avatar-image"
            name={customerAvatarName}
          />
        ) : (
          <UserRound size={18} aria-hidden="true" />
        )}
        {selectedThread && <span className="service-customer-status-dot" />}
      </button>
      <div
        className="service-customer-rail-actions"
        aria-label={t("customerService.contextPanel.toolsAria")}
      >
        <CustomerContextRailButton
          active={activeAssistantPane === "sessionInfo"}
          label={t("customerService.contextPanel.sessionInfo")}
          onClick={() => onToggleAssistantPane("sessionInfo")}
        >
          <ClipboardList size={18} />
        </CustomerContextRailButton>
        <CustomerContextRailButton
          active={activeAssistantPane === "quickReply"}
          label={t("customerService.contextPanel.quickReply")}
          onClick={() => onToggleAssistantPane("quickReply")}
        >
          <MessageSquareText size={18} />
        </CustomerContextRailButton>
        <CustomerContextRailButton
          active={activeAssistantPane === "aiDraft"}
          label={t("customerService.contextPanel.aiDraft")}
          onClick={() => onToggleAssistantPane("aiDraft")}
        >
          <Sparkles size={18} aria-hidden="true" />
        </CustomerContextRailButton>
        <CustomerContextRailButton
          active={activeAssistantPane === "knowledge"}
          label={t("customerService.contextPanel.knowledge")}
          onClick={() => onToggleAssistantPane("knowledge")}
        >
          <LibraryBig size={18} />
        </CustomerContextRailButton>
      </div>
    </aside>
  );
}

function CustomerContextRailButton({
  active,
  children,
  label,
  onClick,
}: {
  active: boolean;
  children: ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      className={active ? "active" : ""}
      type="button"
      title={label}
      data-tooltip={label}
      aria-label={label}
      aria-pressed={active}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

function renderCustomerContextActions({
  onDragOverContextPane,
  onDragStartContextPane,
  onTogglePin,
  pinned,
  t,
}: {
  onDragOverContextPane?: (event: DragEvent<HTMLElement>) => void;
  onDragStartContextPane?: (
    event: DragEvent<HTMLElement>,
    pane: "assistant" | "customer",
  ) => void;
  onTogglePin: () => void;
  pinned: boolean;
  t: Translate;
}) {
  const pinLabel = pinned
    ? t("customerService.contextPanel.unpin")
    : t("customerService.contextPanel.pin");

  return (
    <>
      <button
        className="context-pane-drag"
        type="button"
        draggable
        title={t("customerService.contextPanel.dragSort")}
        aria-label={t("customerService.contextPanel.dragSort")}
        onDragOver={onDragOverContextPane}
        onDragStart={(event) => onDragStartContextPane?.(event, "customer")}
      >
        <GripVertical size={15} />
      </button>
      <button
        className={`context-pane-pin ${pinned ? "active" : ""}`}
        type="button"
        title={pinLabel}
        aria-label={pinLabel}
        aria-pressed={pinned}
        onClick={onTogglePin}
      >
        {pinned ? <PinOff size={15} /> : <Pin size={15} />}
      </button>
    </>
  );
}
