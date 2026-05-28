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
import {
  customerServiceHistoryStatusLabel,
  customerServiceThreadStatusLabel,
  isQueuedCustomerServiceThread,
} from "../data/customer-service-display";
import { pcQueryKeys } from "../data/query-keys";
import { createApiClient } from "../data/runtime";
import { customerServiceStatuses } from "../data/static-config";
import { useWorkspaceStore } from "../data/store";
import { formatChatTime } from "../lib/format";
import { ChannelBadge } from "./ChannelBadge";
import { PcAvatar } from "./PcAvatar";

type ThreadMode = "current" | "history";
type ThreadFilter = "all" | "queued" | "serving" | "vip";

export function ThreadList() {
  const [mode, setMode] = useState<ThreadMode>("current");
  const [query, setQuery] = useState("");
  const authSession = useWorkspaceStore((state) => state.authSession);
  const selectedThreadId = useWorkspaceStore((state) => state.activeThreadId);
  const setSelectedThread = useWorkspaceStore((state) => state.setActiveThread);
  const filter = useWorkspaceStore((state) => state.filter);
  const setFilter = useWorkspaceStore((state) => state.setFilter);
  const customerServiceStatus = useWorkspaceStore(
    (state) => state.customerServiceStatus,
  );
  const setCustomerServiceStatus = useWorkspaceStore(
    (state) => state.setCustomerServiceStatus,
  );
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
  const receptionStatusQuery = useQuery({
    queryKey: pcQueryKeys.customerServiceReception(...queryBaseKey),
    enabled: Boolean(client),
    queryFn: async () => client!.getReceptionStatus(),
  });
  const receptionStatusMutation = useMutation({
    mutationFn: async (serviceStatus: (typeof customerServiceStatuses)[number]["value"]) => {
      setCustomerServiceStatus(serviceStatus);
      return client!.updateReceptionStatus({
        serviceStatus,
        queueAcceptEnabled:
          serviceStatus === "online"
            ? (receptionStatusQuery.data?.queueAcceptEnabled ?? false)
            : false,
      });
    },
    onSuccess: (status) => {
      setCustomerServiceStatus(
        status.serviceStatus as (typeof customerServiceStatuses)[number]["value"],
      );
      void queryClient.invalidateQueries({
        queryKey: pcQueryKeys.customerServiceReception(...queryBaseKey),
      });
    },
  });
  const queueAcceptMutation = useMutation({
    mutationFn: async (queueAcceptEnabled: boolean) =>
      client!.updateReceptionStatus({
        serviceStatus: receptionStatusQuery.data?.serviceStatus ?? customerServiceStatus,
        queueAcceptEnabled:
          (receptionStatusQuery.data?.serviceStatus ?? customerServiceStatus) === "online"
            ? queueAcceptEnabled
            : false,
      }),
    onSuccess: (status) => {
      setCustomerServiceStatus(
        status.serviceStatus as (typeof customerServiceStatuses)[number]["value"],
      );
      void queryClient.invalidateQueries({
        queryKey: pcQueryKeys.customerServiceReception(...queryBaseKey),
      });
      void queryClient.invalidateQueries({
        queryKey: pcQueryKeys.customerServiceThreads(...queryBaseKey),
      });
    },
  });
  const claimThreadMutation = useMutation({
    mutationFn: async (thread: CustomerServiceThread) => {
      if (!client) throw new Error("在线客服接口未就绪");
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

  useEffect(() => {
    const serverStatus = receptionStatusQuery.data?.serviceStatus;
    if (!serverStatus) return;
    if (customerServiceStatuses.some((item) => item.value === serverStatus)) {
      setCustomerServiceStatus(serverStatus as (typeof customerServiceStatuses)[number]["value"]);
    }
  }, [receptionStatusQuery.data?.serviceStatus, setCustomerServiceStatus]);

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
  const currentCounts = useMemo(() => {
    const queued = currentThreads.filter(isQueuedCustomerServiceThread).length;
    const vip = currentThreads.filter((thread) => thread.isVip).length;
    return {
      all: currentThreads.length,
      queued,
      serving: Math.max(0, currentThreads.length - queued),
      vip,
    };
  }, [currentThreads]);
  const visibleThreads = useMemo(() => {
    const source = mode === "history" ? historyThreads : currentThreads;
    const normalizedQuery = query.trim().toLowerCase();
    return source
      .filter((thread) => {
        if (mode === "history") return true;
        if (filter === "queued") return isQueuedCustomerServiceThread(thread);
        if (filter === "serving") return !isQueuedCustomerServiceThread(thread);
        if (filter === "vip") return Boolean(thread.isVip);
        return true;
      })
      .filter((thread) => {
        if (!normalizedQuery) return true;
        return [thread.title, thread.lastMessagePreview, thread.source, thread.sourceChannel]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(normalizedQuery));
      });
  }, [currentThreads, filter, historyThreads, mode, query]);

  useEffect(() => {
    if (selectedThreadId || visibleThreads.length === 0) return;
    setSelectedThread(visibleThreads[0].threadId);
  }, [selectedThreadId, setSelectedThread, visibleThreads]);

  const listLoading = threadsQuery.isLoading || historyQuery.isLoading;
  const listError = threadsQuery.error || historyQuery.error;

  return (
    <section className="h-service-list">
      <header className="h-service-head">
        <div>
          <h1>会话池</h1>
          <p>自有 App / WhatsApp / Telegram / 网页</p>
        </div>
      </header>

      <section className="h-status-card">
        <div>
          <strong>接待状态</strong>
        </div>
        <div className="h-status-actions">
          {customerServiceStatuses.map((item) => (
            <button
              className={customerServiceStatus === item.value ? "selected" : ""}
              type="button"
              key={item.value}
              title={item.hint}
              disabled={!client || receptionStatusMutation.isPending}
              onClick={() => receptionStatusMutation.mutate(item.value)}
            >
              {item.label}
            </button>
          ))}
        </div>
        <div className="h-reception-mode">
          <strong>接入模式</strong>
          <div className="h-status-actions h-mode-actions">
            <button
              className={!receptionStatusQuery.data?.queueAcceptEnabled ? "selected" : ""}
              type="button"
              title="排队会话保留在会话池，客服点击接入后才开始沟通"
              disabled={!client || queueAcceptMutation.isPending}
              onClick={() => queueAcceptMutation.mutate(false)}
            >
              手动接入
            </button>
            <button
              className={receptionStatusQuery.data?.queueAcceptEnabled ? "selected" : ""}
              type="button"
              title="服务端按规则把排队会话自动分配给在线客服"
              disabled={
                !client ||
                queueAcceptMutation.isPending ||
                (receptionStatusQuery.data?.serviceStatus ?? customerServiceStatus) !== "online"
              }
              onClick={() => queueAcceptMutation.mutate(true)}
            >
              自动分配
            </button>
          </div>
        </div>
      </section>

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
            label="VIP"
            count={currentCounts.vip}
            value="vip"
            selected={filter === "vip"}
            onSelect={setFilter}
          />
        </nav>
      )}

      <div className="h-thread-list">
        {listLoading && <div className="e-empty-state">正在加载会话...</div>}
        {listError && <div className="e-empty-state">会话加载失败，请稍后重试</div>}
        {!listLoading && !listError && visibleThreads.length === 0 && (
          <div className="e-empty-state">
            {mode === "history" ? "暂无历史会话" : "暂无当前会话"}
          </div>
        )}
        {!listLoading &&
          !listError &&
          visibleThreads.map((thread) => {
            const queued = mode === "current" && isQueuedCustomerServiceThread(thread);
            const claiming =
              claimThreadMutation.isPending &&
              claimThreadMutation.variables?.threadId === thread.threadId;
            return (
            <article
              aria-label={`${thread.title || "访客"}，${
                mode === "history"
                  ? customerServiceHistoryStatusLabel(thread.status)
                  : customerServiceThreadStatusLabel(thread)
              }`}
              aria-pressed={selectedThreadId === thread.threadId}
              className={`h-thread-card ${
                selectedThreadId === thread.threadId ? "active" : ""
              }`}
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
                avatarUrl={thread.customerAvatarUrl || thread.avatarUrl}
                className={`e-avatar e-avatar-badge-host ${
                  thread.isVip ? "gold" : "indigo"
                }`}
                name={thread.title || "客户"}
              >
                {(thread.unreadCount ?? 0) > 0 && (
                  <em className="e-avatar-unread">{thread.unreadCount}</em>
                )}
              </PcAvatar>
              <span className="h-thread-copy">
                <span>
                  <strong>{thread.title || (mode === "history" ? "访客" : "未知客户")}</strong>
                </span>
                <small>
                  <Headphones size={12} />
                  {mode === "history"
                    ? customerServiceHistoryStatusLabel(thread.status)
                    : customerServiceThreadStatusLabel(thread)}
                  <ChannelBadge source={thread.source ?? thread.sourceChannel} compact />
                </small>
                <p>{thread.lastMessagePreview || (mode === "history" ? "历史会话" : "暂无消息")}</p>
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
                    {isRiskyThread(thread) && <ShieldAlert size={14} />}
                    {thread.priority === "muted" && (
                      <BellOff className="e-muted-icon" size={14} />
                    )}
                    <Clock3 size={14} />
                    {mode === "history"
                      ? "只读"
                      : formatThreadTime(thread.lastMessageAt ?? thread.updatedAt ?? thread.assignedAt)}
                  </>
                )}
              </span>
            </article>
          );
          })}
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
  value: ThreadFilter;
  selected: boolean;
  onSelect: (value: ThreadFilter) => void;
}) {
  return (
    <button className={selected ? "selected" : ""} type="button" onClick={() => onSelect(value)}>
      {label} <em>{count}</em>
    </button>
  );
}

function isRiskyThread(thread: CustomerServiceThread) {
  return ["high", "urgent", "risk", "投诉"].some((token) =>
    [thread.priority, thread.lastMessagePreview, thread.customerLevel]
      .filter(Boolean)
      .some((value) => String(value).toLowerCase().includes(token.toLowerCase())),
  );
}

function formatThreadTime(value?: string | null) {
  const formatted = formatChatTime(value);
  return formatted === "--" ? "--" : formatted;
}
