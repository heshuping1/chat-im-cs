import {
  BellOff,
  Clock3,
  Headphones,
  LogIn,
  Search,
  ShieldAlert,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useInfiniteQuery, useMutation, useQueries, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  isTerminalCustomerServiceThreadStatus,
  normalizeCustomerServiceThreadType,
  type CustomerServiceThread,
} from "../data/api-client";
import { useAuthSession } from "../data/auth/auth-store";
import {
  createCustomerServiceThreadStatusDescriptor,
  isQueuedCustomerServiceThread,
} from "../data/customer-service-display";
import { createCustomerServiceIdentityViewModel } from "../data/customer-service/cs-identity-view-model";
import { dedupeCustomerServiceThreads } from "../data/customer-service/customer-service-live-counters";
import {
  selectCustomerServiceThreadCardPreview,
  shouldHydrateCustomerServiceThreadPreview,
  threadPreviewFromCustomerServiceDetail,
} from "../data/customer-service/cs-thread-preview";
import {
  canReadCustomerServiceHistory,
  canUseCustomerServiceManagementReadonly,
  canUseCustomerServiceStaffEndpoints,
} from "../data/customer-service/cs-role-capabilities";
import { executeCustomerServiceThreadAction } from "../data/customer-service/cs-action-service";
import { chatConversationEntityFromCustomerServiceThread } from "../data/conversation/conversation-domain";
import { pcQueryKeys } from "../data/query-keys";
import { createApiClient } from "../data/runtime";
import {
  useActiveThreadId,
  useServiceThreadFilter,
  useOpenCustomerServiceThread,
  useSetServiceThreadFilter,
  type ServiceThreadFilter,
} from "../data/workspace-ui/workspace-ui-store";
import {
  createServiceHistoryThreadStatusDescriptor,
  createServiceHistoryTabBadge,
  createServiceThreadListViewModel,
  isRiskyCustomerServiceThread,
  type ServiceTextDescriptor,
  type ServiceThreadListMode,
} from "../customer-service/models/serviceWorkbenchModel";
import { applyClaimedCustomerServiceThread } from "../customer-service/models/customerServiceThreadClaimModel";
import { useI18n } from "../i18n/useI18n";
import {
  createThreadRenderWindow,
  threadRenderWindowExpandStep,
} from "../customer-service/models/threadListWindowing";
import { formatBadgeCount, formatChatTime } from "../lib/format";
import { ChannelBadge } from "./ChannelBadge";
import { PcAvatar } from "./PcAvatar";

type ThreadMode = ServiceThreadListMode;
type ThreadListEmptyAction = "clearSearch" | "viewAll" | "viewQueued";
const staffServiceHistoryPageSize = 50;
const threadPreviewHydrationLimit = 30;

interface ThreadListEmptyStateView {
  action?: ThreadListEmptyAction;
  actionLabel?: string;
  description: string;
  title: string;
}

export function ThreadList() {
  const { t } = useI18n();
  const [mode, setMode] = useState<ThreadMode>("current");
  const [query, setQuery] = useState("");
  const [expandedThreadCount, setExpandedThreadCount] = useState(0);
  const authSession = useAuthSession();
  const selectedThreadId = useActiveThreadId();
  const openCustomerServiceThread = useOpenCustomerServiceThread();
  const filter = useServiceThreadFilter();
  const setFilter = useSetServiceThreadFilter();
  const queryClient = useQueryClient();
  const client = useMemo(
    () => (authSession ? createApiClient(authSession) : null),
    [authSession],
  );
  const queryBaseKey = [authSession?.apiBaseUrl, authSession?.tenantToken];
  const canUseStaffEndpoints = canUseCustomerServiceStaffEndpoints(authSession);
  const canUseManagementActions = canUseCustomerServiceManagementReadonly(authSession);
  const canReadHistory = canReadCustomerServiceHistory(authSession);

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
  const claimThreadMutation = useMutation({
    mutationFn: async (thread: CustomerServiceThread) => {
      if (!client) throw new Error("Customer service API is not ready");
      if (!canUseStaffEndpoints && !canUseManagementActions) {
        throw new Error("Only customer service staff, administrators, or owners can claim conversations.");
      }
      return executeCustomerServiceThreadAction({
        action: "claim",
        client,
        mode: canUseStaffEndpoints ? "staff" : "management",
        thread,
      });
    },
    onSuccess: (result, thread) => {
      applyClaimedCustomerServiceThread(queryClient, thread, result);
      openCustomerServiceThread(thread.threadId, "claim");
      void queryClient.invalidateQueries({
        queryKey: pcQueryKeys.customerServiceThreads(...queryBaseKey),
      });
      void queryClient.invalidateQueries({
        queryKey: pcQueryKeys.customerServiceThreadDetail(
          ...queryBaseKey,
          thread.threadType,
          thread.threadId,
        ),
      });
      void queryClient.invalidateQueries({
        queryKey: pcQueryKeys.customerServiceReception(...queryBaseKey),
      });
    },
  });

  const historyThreads = useMemo(
    () => {
      const readonlyHistoryThreads = [
        ...(threadsQuery.data?.queueItems ?? []),
        ...(threadsQuery.data?.activeItems ?? []),
      ]
        .filter((thread) => normalizeCustomerServiceThreadType(thread.threadType) === "temp_session")
        .filter(isCustomerServiceHistoryThread);
      const staffHistoryThreads = historyItems
        .filter((thread) => thread.threadType === "temp_session")
        .filter((thread) => isTerminalCustomerServiceThreadStatus(thread.status));
      return dedupeCustomerServiceThreads([...readonlyHistoryThreads, ...staffHistoryThreads]);
    },
    [historyItems, threadsQuery.data],
  );
  const listViewModel = useMemo(
    () =>
      createServiceThreadListViewModel({
        historyThreads,
        isRiskyThread: isRiskyCustomerServiceThread,
        threads: threadsQuery.data,
      }),
    [historyThreads, threadsQuery.data],
  );
  const { counts: currentCounts, currentThreads } = listViewModel;
  const historyTabBadge = useMemo(
    () => createServiceHistoryTabBadge(listViewModel.historyThreads),
    [listViewModel.historyThreads],
  );
  const visibleThreads = useMemo(() => {
    const source = mode === "history" ? listViewModel.historyThreads : currentThreads;
    const normalizedQuery = query.trim().toLowerCase();
    return source
      .filter((thread) => {
        if (mode === "history") return true;
        if (filter === "queued") return listViewModel.queuedThreads.includes(thread);
        if (filter === "serving") return listViewModel.servingThreads.includes(thread);
        if (filter === "sla") return listViewModel.slaThreads.includes(thread);
        return true;
      })
      .filter((thread) => {
        if (!normalizedQuery) return true;
        const entity = chatConversationEntityFromCustomerServiceThread(thread);
        return [
          entity.title,
          entity.lastMessage?.preview,
          entity.customerService?.source,
          entity.customerService?.sourceChannel,
        ]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(normalizedQuery));
      });
  }, [currentThreads, filter, listViewModel, mode, query]);
  useEffect(() => {
    setExpandedThreadCount(0);
  }, [filter, mode, query]);
  const threadRenderWindow = useMemo(
    () =>
      createThreadRenderWindow({
        enabled: true,
        expandedCount: expandedThreadCount,
        threads: visibleThreads,
      }),
    [expandedThreadCount, visibleThreads],
  );
  const previewHydrationThreads = useMemo(
    () => {
      if (mode !== "current") return [];
      return threadRenderWindow.renderedThreads
        .filter((thread) => thread.threadId && shouldHydrateCustomerServiceThreadPreview(thread))
        .slice(0, threadPreviewHydrationLimit);
    },
    [mode, threadRenderWindow.renderedThreads],
  );
  const previewHydrationQueries = useQueries({
    queries: previewHydrationThreads.map((thread) => ({
      queryKey: pcQueryKeys.customerServiceThreadDetail(
        ...queryBaseKey,
        thread.threadType,
        thread.threadId,
      ),
      enabled: Boolean(client),
      queryFn: async () =>
        client!.getWorkbenchThreadDetail(thread.threadType, thread.threadId),
      staleTime: 30_000,
    })),
  });
  const hydratedPreviewsByThreadId = new Map<
    string,
    { preview?: string; sentAt?: string | null }
  >();
  previewHydrationThreads.forEach((thread, index) => {
    const preview = threadPreviewFromCustomerServiceDetail(previewHydrationQueries[index]?.data);
    if (preview.preview) hydratedPreviewsByThreadId.set(thread.threadId, preview);
  });

  const canLoadMoreHistory = mode === "history" && Boolean(historyQuery.hasNextPage);
  const listLoading = threadsQuery.isLoading || historyQuery.isLoading;
  const listError = threadsQuery.error || historyQuery.error;
  const emptyState = useMemo(
    () =>
      createThreadListEmptyStateView({
        currentCounts,
        filter,
        historyCount: listViewModel.historyThreads.length,
        mode,
        query,
        t,
      }),
    [currentCounts, filter, listViewModel.historyThreads.length, mode, query, t],
  );

  return (
    <section className="h-service-list">
      <header className="h-service-head">
        <div>
          <h1>{t("customerService.threadList.title")}</h1>
          <p>
            {t("customerService.threadList.summary", {
              current: currentCounts.all,
              queued: currentCounts.queued,
              history: listViewModel.historyThreads.length,
            })}
          </p>
        </div>
      </header>

      <label className="e-search">
        <Search size={17} />
        <input
          placeholder={t("customerService.threadList.searchPlaceholder")}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
      </label>

      <nav className="h-switch-tabs" aria-label={t("customerService.threadList.modeTabsAria")}>
        <button
          className={mode === "current" ? "selected" : ""}
          type="button"
          onClick={() => setMode("current")}
        >
          {t("customerService.threadList.current")} <em>{currentThreads.length}</em>
        </button>
        <button
          className={mode === "history" ? "selected" : ""}
          type="button"
          onClick={() => setMode("history")}
        >
          {t("customerService.threadList.history")}{" "}
          <em>
            {historyTabBadge.threadCount}
            {historyQuery.hasNextPage ? "+" : ""}
          </em>
          {historyTabBadge.unreadCount > 0 && (
            <span className="h-switch-tabs-unread">
              {formatBadgeCount(historyTabBadge.unreadCount)}
            </span>
          )}
        </button>
      </nav>

      {mode === "current" && (
        <nav className="e-filter-row compact" aria-label={t("customerService.threadList.filterAria")}>
          <FilterButton
            label={t("customerService.threadList.filterAll")}
            count={currentCounts.all}
            value="all"
            selected={filter === "all"}
            onSelect={setFilter}
          />
          <FilterButton
            label={t("customerService.threadList.filterQueued")}
            count={currentCounts.queued}
            value="queued"
            selected={filter === "queued"}
            onSelect={setFilter}
          />
          <FilterButton
            label={t("customerService.threadList.filterServing")}
            count={currentCounts.serving}
            value="serving"
            selected={filter === "serving"}
            onSelect={setFilter}
          />
          <FilterButton
            label="SLA"
            count={currentCounts.sla}
            value="sla"
            selected={filter === "sla"}
            onSelect={setFilter}
          />
        </nav>
      )}

      <div className="h-thread-list">
        {listLoading && <div className="e-empty-state">{t("customerService.threadList.loading")}</div>}
        {listError && <div className="e-empty-state">{t("customerService.threadList.loadFailed")}</div>}
        {!listLoading && !listError && visibleThreads.length === 0 && (
          <ThreadListEmptyState
            state={emptyState}
            onAction={() => {
              if (emptyState.action === "clearSearch") {
                setQuery("");
              } else if (emptyState.action === "viewQueued") {
                setFilter("queued");
              } else {
                setFilter("all");
              }
            }}
          />
        )}
        {!listLoading &&
          !listError &&
          threadRenderWindow.renderedThreads.map((thread) => {
            const entity = chatConversationEntityFromCustomerServiceThread(thread);
            const hydratedPreview = hydratedPreviewsByThreadId.get(thread.threadId);
            const lastMessagePreview = selectCustomerServiceThreadCardPreview(
              entity.lastMessage?.preview,
              hydratedPreview?.preview,
            );
            const identity = createCustomerServiceIdentityViewModel({
              fallbackName: entity.title || (mode === "history" ? t("customerService.visitor") : t("customerService.threadList.unknownCustomer")),
              history: mode === "history",
              thread,
            });
            const queued = mode === "current" && isQueuedCustomerServiceThread(thread);
            const canClaimQueuedThread =
              queued &&
              (canUseStaffEndpoints ||
                (canUseManagementActions && thread.threadType === "temp_session"));
            const risky = isRiskyCustomerServiceThread(thread);
            const claiming =
              claimThreadMutation.isPending &&
              claimThreadMutation.variables?.threadId === thread.threadId;
            return (
              <article
                aria-label={`${identity.ariaName}，${
                  mode === "history"
                    ? formatServiceText(createServiceHistoryThreadStatusDescriptor(thread), t)
                    : formatServiceText(createCustomerServiceThreadStatusDescriptor(thread), t)
                }`}
                aria-pressed={selectedThreadId === thread.threadId}
                className={`h-thread-card ${
                  selectedThreadId === thread.threadId ? "active" : ""
                } ${risky ? "sla-risk" : ""}`}
                key={`${thread.threadType}-${thread.threadId}`}
                onClick={() => openCustomerServiceThread(thread.threadId, "user")}
                onKeyDown={(event) => {
                  if (event.key !== "Enter" && event.key !== " ") return;
                  event.preventDefault();
                  openCustomerServiceThread(thread.threadId, "user");
                }}
                role="button"
                tabIndex={0}
              >
                <PcAvatar
                  avatarUrl={identity.avatarUrl}
                  className={`e-avatar e-avatar-badge-host ${identity.avatarTone}`}
                  name={identity.avatarName}
                >
                  {entity.unreadCount > 0 && (
                    <em className="e-avatar-unread">{formatBadgeCount(entity.unreadCount)}</em>
                  )}
                </PcAvatar>
                <span className="h-thread-copy">
                  <span>
                    <strong>{identity.displayName}</strong>
                    {risky && <em className="danger">SLA</em>}
                  </span>
                  <small>
                    <Headphones size={12} />
                    {mode === "history"
                      ? formatServiceText(createServiceHistoryThreadStatusDescriptor(thread), t)
                      : formatServiceText(createCustomerServiceThreadStatusDescriptor(thread), t)}
                    <ChannelBadge source={thread.source ?? thread.sourceChannel} compact />
                  </small>
                  <p>{lastMessagePreview || (mode === "history" ? t("customerService.threadList.historyThread") : t("customerService.threadList.noMessage"))}</p>
                </span>
                <span className="h-thread-sla">
                  {canClaimQueuedThread ? (
                    <button
                      className="h-thread-claim"
                      type="button"
                      disabled={!client || claiming}
                      onClick={(event) => {
                        event.stopPropagation();
                        claimThreadMutation.mutate(thread);
                      }}
                      onKeyDown={(event) => event.stopPropagation()}
                      title={t("customerService.threadList.claimTitle")}
                    >
                      <LogIn size={13} />
                      {claiming ? t("customerService.threadList.claiming") : t("customerService.threadList.claim")}
                    </button>
                  ) : (
                    <>
                      {risky && <ShieldAlert size={14} />}
                      {thread.priority === "muted" && (
                        <BellOff className="e-muted-icon" size={14} />
                      )}
                      <Clock3 size={14} />
                      {mode === "history"
                        ? t("customerService.threadList.readonly")
                        : formatChatTime(hydratedPreview?.sentAt ?? thread.lastMessageAt ?? thread.updatedAt ?? thread.assignedAt)}
                    </>
                  )}
                </span>
              </article>
            );
          })}
        {!listLoading && !listError && (threadRenderWindow.windowed || canLoadMoreHistory) && (
          <button
            className="h-thread-more"
            disabled={historyQuery.isFetchingNextPage}
            type="button"
            onClick={() => {
              if (threadRenderWindow.windowed) {
                setExpandedThreadCount((count) => count + threadRenderWindowExpandStep);
                return;
              }
              if (canLoadMoreHistory) {
                void historyQuery.fetchNextPage();
              }
            }}
          >
            {threadRenderWindow.windowed
              ? t("customerService.threadList.showMore", {
                  count: threadRenderWindow.hiddenAfterCount,
                })
              : historyQuery.isFetchingNextPage
                ? t("customerService.threadList.loadingMore")
                : t("customerService.threadList.loadMore")}
          </button>
        )}
      </div>
    </section>
  );
}

function isCustomerServiceHistoryThread(thread: CustomerServiceThread) {
  return isTerminalCustomerServiceThreadStatus(thread.status);
}

function FilterButton({
  label,
  count,
  value,
  selected,
  onSelect,
}: {
  label: string;
  count: number;
  value: ServiceThreadFilter;
  selected: boolean;
  onSelect: (value: ServiceThreadFilter) => void;
}) {
  return (
    <button className={selected ? "selected" : ""} type="button" onClick={() => onSelect(value)}>
      {label} <em>{count}</em>
    </button>
  );
}

function ThreadListEmptyState({
  onAction,
  state,
}: {
  onAction: () => void;
  state: ThreadListEmptyStateView;
}) {
  return (
    <div className="e-empty-state service-thread-empty-state">
      <strong>{state.title}</strong>
      <span>{state.description}</span>
      {state.actionLabel && (
        <button type="button" onClick={onAction}>
          {state.actionLabel}
        </button>
      )}
    </div>
  );
}

function createThreadListEmptyStateView({
  currentCounts,
  filter,
  historyCount,
  mode,
  query,
  t,
}: {
  currentCounts: { all: number };
  filter: ServiceThreadFilter;
  historyCount: number;
  mode: ThreadMode;
  query?: string;
  t: (key: string, params?: Record<string, string | number>) => string;
}): ThreadListEmptyStateView {
  const hasQuery = Boolean(query?.trim());
  if (hasQuery) {
    return {
      action: "clearSearch",
      actionLabel: t("customerService.threadList.empty.clearSearch"),
      description: t(
        mode === "history"
          ? "customerService.threadList.empty.searchHistoryDescription"
          : "customerService.threadList.empty.searchCurrentDescription",
      ),
      title: t("customerService.threadList.empty.searchTitle"),
    };
  }
  if (mode === "history") {
    return {
      description: t(
        historyCount > 0
          ? "customerService.threadList.empty.historyFilteredDescription"
          : "customerService.threadList.empty.noHistoryDescription",
      ),
      title: t(
        historyCount > 0
          ? "customerService.threadList.empty.historyFilteredTitle"
          : "customerService.threadList.empty.noHistoryTitle",
      ),
    };
  }
  if (currentCounts.all === 0) {
    return {
      description: t("customerService.threadList.empty.noCurrentDescription"),
      title: t("customerService.threadList.empty.noCurrentTitle"),
    };
  }
  if (filter === "serving") {
    return {
      action: "viewQueued",
      actionLabel: t("customerService.threadList.empty.viewQueued"),
      description: t("customerService.threadList.empty.servingDescription"),
      title: t("customerService.threadList.empty.filteredTitle"),
    };
  }
  if (filter === "sla") {
    return {
      action: "viewAll",
      actionLabel: t("customerService.threadList.empty.viewAll"),
      description: t("customerService.threadList.empty.slaDescription"),
      title: t("customerService.threadList.empty.noSlaTitle"),
    };
  }
  if (filter === "queued") {
    return {
      action: "viewAll",
      actionLabel: t("customerService.threadList.empty.viewAll"),
      description: t("customerService.threadList.empty.queuedDescription"),
      title: t("customerService.threadList.empty.filteredTitle"),
    };
  }
  return {
    description: t("customerService.threadList.empty.filteredDescription"),
    title: t("customerService.threadList.empty.filteredTitle"),
  };
}

export { isRiskyCustomerServiceThread as isRiskyThread };

function formatServiceText(
  descriptor: ServiceTextDescriptor,
  translate: (key: string, params?: Record<string, string | number>) => string,
) {
  return translate(descriptor.key, descriptor.params);
}
