import {
  BellOff,
  Clock3,
  Headphones,
  LogIn,
  Search,
  ShieldAlert,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  isTerminalCustomerServiceThreadStatus,
  normalizeCustomerServiceThreadType,
  staffServiceHistoryItemToThread,
  type CustomerServiceThread,
} from "../data/api-client";
import { useAuthSession } from "../data/auth/auth-store";
import {
  customerServiceHistoryStatusLabel,
  customerServiceThreadStatusLabel,
  isQueuedCustomerServiceThread,
} from "../data/customer-service-display";
import { createCustomerServiceIdentityViewModel } from "../data/customer-service/cs-identity-view-model";
import { chatConversationEntityFromCustomerServiceThread } from "../data/conversation/conversation-domain";
import { pcQueryKeys } from "../data/query-keys";
import { createApiClient } from "../data/runtime";
import {
  useActiveThreadId,
  useServiceThreadFilter,
  useSetActiveThread,
  useSetServiceThreadFilter,
  type ServiceThreadFilter,
} from "../data/workspace-ui/workspace-ui-store";
import {
  createServiceThreadListCounts,
  createServiceThreadListEmptyState,
  isRiskyCustomerServiceThread,
  type ServiceThreadListEmptyState,
  type ServiceThreadListMode,
} from "../customer-service/models/serviceWorkbenchModel";
import {
  createThreadRenderWindow,
  threadRenderWindowExpandStep,
} from "../customer-service/models/threadListWindowing";
import { formatBadgeCount, formatChatTime } from "../lib/format";
import { ChannelBadge } from "./ChannelBadge";
import { PcAvatar } from "./PcAvatar";

type ThreadMode = ServiceThreadListMode;

export function ThreadList() {
  const [mode, setMode] = useState<ThreadMode>("current");
  const [query, setQuery] = useState("");
  const [expandedThreadCount, setExpandedThreadCount] = useState(0);
  const authSession = useAuthSession();
  const selectedThreadId = useActiveThreadId();
  const setSelectedThread = useSetActiveThread();
  const filter = useServiceThreadFilter();
  const setFilter = useSetServiceThreadFilter();
  const queryClient = useQueryClient();
  const client = useMemo(
    () => (authSession ? createApiClient(authSession) : null),
    [authSession],
  );
  const queryBaseKey = [authSession?.apiBaseUrl, authSession?.tenantToken];

  const threadsQuery = useQuery({
    queryKey: pcQueryKeys.customerServiceThreads(...queryBaseKey),
    enabled: Boolean(client),
    queryFn: async () => client!.getWorkbenchThreads(),
  });
  const historyQuery = useQuery({
    queryKey: pcQueryKeys.customerServiceHistory(...queryBaseKey),
    enabled: Boolean(client),
    queryFn: async () =>
      client!.getStaffServiceHistory({
        threadType: "temp_session",
        limit: 50,
      }),
  });
  const claimThreadMutation = useMutation({
    mutationFn: async (thread: CustomerServiceThread) => {
      if (!client) throw new Error("Customer service API is not ready");
      return client.claimCustomerServiceThread(thread.threadType, thread.threadId);
    },
    onSuccess: (_result, thread) => {
      setSelectedThread(thread.threadId);
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

  const currentThreads = useMemo(
    () =>
      [
        ...(threadsQuery.data?.queueItems ?? []),
        ...(threadsQuery.data?.activeItems ?? []),
      ]
        .filter((thread) => normalizeCustomerServiceThreadType(thread.threadType) === "temp_session")
        .filter((thread) => !isTerminalCustomerServiceThreadStatus(thread.status)),
    [threadsQuery.data],
  );
  const historyThreads = useMemo(
    () =>
      (historyQuery.data?.items ?? [])
        .map(staffServiceHistoryItemToThread)
        .filter((thread) => thread.threadType === "temp_session")
        .filter((thread) => isTerminalCustomerServiceThreadStatus(thread.status)),
    [historyQuery.data],
  );
  const currentCounts = useMemo(
    () => createServiceThreadListCounts(currentThreads, isRiskyCustomerServiceThread),
    [currentThreads],
  );
  const visibleThreads = useMemo(() => {
    const source = mode === "history" ? historyThreads : currentThreads;
    const normalizedQuery = query.trim().toLowerCase();
    return source
      .filter((thread) => {
        if (mode === "history") return true;
        if (filter === "queued") return isQueuedCustomerServiceThread(thread);
        if (filter === "serving") return !isQueuedCustomerServiceThread(thread);
        if (filter === "sla") return isRiskyCustomerServiceThread(thread);
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
  }, [currentThreads, filter, historyThreads, mode, query]);
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

  const listLoading = threadsQuery.isLoading || historyQuery.isLoading;
  const listError = threadsQuery.error || historyQuery.error;
  const emptyState = useMemo(
    () =>
      createServiceThreadListEmptyState({
        currentCounts,
        filter,
        historyCount: historyThreads.length,
        mode,
        query,
      }),
    [currentCounts, filter, historyThreads.length, mode, query],
  );

  return (
    <section className="h-service-list">
      <header className="h-service-head">
        <div>
          <h1>会话池</h1>
          <p>
            当前 {currentCounts.all} · 排队 {currentCounts.queued} · 历史 {historyThreads.length}
          </p>
        </div>
      </header>

      <label className="e-search">
        <Search size={17} />
        <input
          placeholder="搜索客户、渠道、会话内容"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
      </label>

      <nav className="h-switch-tabs" aria-label="当前和历史">
        <button
          className={mode === "current" ? "selected" : ""}
          type="button"
          onClick={() => setMode("current")}
        >
          当前 <em>{currentThreads.length}</em>
        </button>
        <button
          className={mode === "history" ? "selected" : ""}
          type="button"
          onClick={() => setMode("history")}
        >
          历史 <em>{historyThreads.length}</em>
        </button>
      </nav>

      {mode === "current" && (
        <nav className="e-filter-row compact" aria-label="在线客服筛选">
          <FilterButton
            label="全部"
            count={currentCounts.all}
            value="all"
            selected={filter === "all"}
            onSelect={setFilter}
          />
          <FilterButton
            label="排队"
            count={currentCounts.queued}
            value="queued"
            selected={filter === "queued"}
            onSelect={setFilter}
          />
          <FilterButton
            label="进行中"
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
        {listLoading && <div className="e-empty-state">正在加载会话...</div>}
        {listError && <div className="e-empty-state">会话加载失败，请稍后重试</div>}
        {!listLoading && !listError && visibleThreads.length === 0 && (
          <ThreadListEmptyState
            state={emptyState}
            onAction={() => {
              if (emptyState.actionLabel === "清空搜索") {
                setQuery("");
              } else if (emptyState.actionLabel === "查看排队") {
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
            const identity = createCustomerServiceIdentityViewModel({
              fallbackName: entity.title || (mode === "history" ? "访客" : "未知客户"),
              history: mode === "history",
              thread,
            });
            const queued = mode === "current" && isQueuedCustomerServiceThread(thread);
            const risky = isRiskyCustomerServiceThread(thread);
            const claiming =
              claimThreadMutation.isPending &&
              claimThreadMutation.variables?.threadId === thread.threadId;
            return (
              <article
                aria-label={`${identity.ariaName}，${
                  mode === "history"
                    ? customerServiceHistoryStatusLabel(thread.status)
                    : customerServiceThreadStatusLabel(thread)
                }`}
                aria-pressed={selectedThreadId === thread.threadId}
                className={`h-thread-card ${
                  selectedThreadId === thread.threadId ? "active" : ""
                } ${risky ? "sla-risk" : ""}`}
                key={`${thread.threadType}-${thread.threadId}`}
                onClick={() => setSelectedThread(thread.threadId)}
                onKeyDown={(event) => {
                  if (event.key !== "Enter" && event.key !== " ") return;
                  event.preventDefault();
                  setSelectedThread(thread.threadId);
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
                      ? customerServiceHistoryStatusLabel(thread.status)
                      : customerServiceThreadStatusLabel(thread)}
                    <ChannelBadge source={thread.source ?? thread.sourceChannel} compact />
                  </small>
                  <p>{entity.lastMessage?.preview || (mode === "history" ? "历史会话" : "暂无消息")}</p>
                </span>
                <span className="h-thread-sla">
                  {queued ? (
                    <button
                      className="h-thread-claim"
                      type="button"
                      disabled={!client || claiming}
                      onClick={(event) => {
                        event.stopPropagation();
                        claimThreadMutation.mutate(thread);
                      }}
                      onKeyDown={(event) => event.stopPropagation()}
                      title="手动接入该访客会话"
                    >
                      <LogIn size={13} />
                      {claiming ? "接入中" : "接入"}
                    </button>
                  ) : (
                    <>
                      {risky && <ShieldAlert size={14} />}
                      {thread.priority === "muted" && (
                        <BellOff className="e-muted-icon" size={14} />
                      )}
                      <Clock3 size={14} />
                      {mode === "history"
                        ? "只读"
                        : formatChatTime(thread.lastMessageAt ?? thread.updatedAt ?? thread.assignedAt)}
                    </>
                  )}
                </span>
              </article>
            );
          })}
        {!listLoading && !listError && threadRenderWindow.windowed && (
          <button
            className="h-thread-more"
            type="button"
            onClick={() =>
              setExpandedThreadCount((count) => count + threadRenderWindowExpandStep)
            }
          >
            显示更多 {threadRenderWindow.hiddenAfterCount} 个会话
          </button>
        )}
      </div>
    </section>
  );
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
  state: ServiceThreadListEmptyState;
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

export { isRiskyCustomerServiceThread as isRiskyThread };
