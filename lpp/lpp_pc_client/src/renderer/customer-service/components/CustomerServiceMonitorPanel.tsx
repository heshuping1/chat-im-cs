import { useEffect, useMemo, useRef, useState, type DragEvent, type MouseEvent } from "react";
import { useMutation, useQueries, useQuery } from "@tanstack/react-query";
import {
  Activity,
  ArrowRightLeft,
  ExternalLink,
  LayoutGrid,
  Lock,
  Maximize2,
  Minimize2,
  Power,
  Radio,
  RefreshCw,
  Search,
  ShieldAlert,
  TriangleAlert,
  Unlock,
  X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { PanelState } from "../../components/PanelState";
import { channelLabel } from "../../components/ChannelBadge";
import { PcAvatar } from "../../components/PcAvatar";
import { CustomerServiceMessageStage } from "./CustomerServiceMessageStage";
import { CustomerServiceTransferDialog } from "./CustomerServiceTransferDialog";
import type { CustomerServiceApiClient } from "../../data/api/customer-service-client";
import type {
  CustomerServiceMonitorDashboardDto,
  CustomerServiceSlaDashboardDto,
  CustomerServiceSlaRiskItemDto,
  CustomerServiceStaffStatusDto,
  CustomerServiceThread,
  MessageItemDto,
} from "../../data/api-client";
import type { CustomerServiceTransferTarget } from "../../data/customer-service/cs-transfer-targets";
import { customerServiceHistoryStatusKey } from "../../data/customer-service-display";
import { pcQueryKeys } from "../../data/query-keys";
import { applyCustomerServiceReadStatusToMessages } from "../../data/customer-service/cs-message-read-status";
import { createCustomerServiceIdentityViewModel } from "../../data/customer-service/cs-identity-view-model";
import {
  createCustomerServiceStaffProfileViewModel,
  type CustomerServiceStaffProfileViewModel,
} from "../../data/customer-service/cs-staff-profile-view-model";
import {
  useOpenCustomerServiceThread,
  useSetActiveModule,
} from "../../data/workspace-ui/workspace-ui-store";
import { formatError, formatMonthDayTime } from "../../lib/format";
import { useWechatBottomFollow } from "../../lib/useWechatBottomFollow";
import { requestMessageCustomConfirmation } from "../../messages/runtime/messageConfirm";
import {
  addOrReplaceWatchedThreadKey,
  addWatchedThreadKey,
  monitorThreadPriority,
  monitorLayoutCapacity,
  monitorLayoutModes,
  promoteWatchedThreadKey,
  pruneWatchedThreadKeys,
  removeWatchedThreadKey,
  replaceWatchedThreadKey,
  selectWatchedThreadKey,
  sortMonitorThreadsByPriority,
  trimWatchedThreadKeys,
  type MonitorLayoutMode,
} from "../models/monitorWallModel";

type Translate = (key: string, params?: Record<string, string | number>) => string;

type MonitorFilters = {
  assignedStaffUserIds: string[];
  keyword: string;
  slaRisk: string;
  status: string;
};

type MonitorThreadQueryParams = NonNullable<
  Parameters<CustomerServiceApiClient["getCustomerServiceMonitorThreads"]>[0]
>;
type MonitorHistoryQueryParams = NonNullable<
  Parameters<CustomerServiceApiClient["getCustomerServiceHistoryThreads"]>[0]
>;

type DetailQueryState = {
  data?: unknown;
  error?: unknown;
  isError?: boolean;
  isLoading?: boolean;
};

type MonitorManagementAction = "force-close" | "freeze" | "unfreeze";

type MonitorProfilePopoverState = {
  kind: "customer" | "staff";
  x: number;
  y: number;
};

type MonitorStaffProfile = CustomerServiceStaffProfileViewModel;

const defaultFilters: MonitorFilters = {
  assignedStaffUserIds: [],
  keyword: "",
  slaRisk: "",
  status: "active",
};
const emptyThreads: CustomerServiceThread[] = [];
const emptyStaffItems: CustomerServiceStaffStatusDto[] = [];
const emptyMessageAnnotations: Record<string, string> = {};
const monitorHistoryLimit = 100;
const monitorThreadDragMime = "application/x-lpp-cs-monitor-thread-key";
const monitorPollIntervalMs = 5_000;
const monitorBackoffMs = 60_000;
const monitorStaleMs = 2_500;

export function CustomerServiceMonitorPanel({
  apiBaseUrl,
  client,
  onOpenOnlineService,
  t,
  tenantToken,
}: {
  apiBaseUrl?: string;
  client: CustomerServiceApiClient | null;
  onOpenOnlineService: () => void;
  t: Translate;
  tenantToken?: string;
}) {
  const openCustomerServiceThread = useOpenCustomerServiceThread();
  const setActiveModule = useSetActiveModule();
  const [filters, setFilters] = useState<MonitorFilters>(defaultFilters);
  const [layoutMode, setLayoutMode] = useState<MonitorLayoutMode>("2x1");
  const [focusedThreadKey, setFocusedThreadKey] = useState("");
  const [watchedThreadKeys, setWatchedThreadKeys] = useState<string[]>([]);
  const [manualWallSelection, setManualWallSelection] = useState(false);
  const [replacementThreadKey, setReplacementThreadKey] = useState("");
  const [focusedEmptySlotIndex, setFocusedEmptySlotIndex] = useState<number | null>(null);
  const [recentlyReplacedThreadKey, setRecentlyReplacedThreadKey] = useState("");
  const [expandedThreadKey, setExpandedThreadKey] = useState("");
  const [transferThread, setTransferThread] = useState<CustomerServiceThread | null>(null);
  const [transferReason, setTransferReason] = useState("");
  const [selectedTransferTargetId, setSelectedTransferTargetId] = useState("");
  const [transferErrorText, setTransferErrorText] = useState<string | null>(null);
  const [backoffUntilMs, setBackoffUntilMs] = useState(0);
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [lastSyncedAt, setLastSyncedAt] = useState<number | null>(null);
  const replacementFeedbackTimerRef = useRef<number | null>(null);
  const queryFilters = useMemo(() => monitorQueryParams(filters), [filters]);
  const historyQueryFilters = useMemo(
    () => monitorHistoryQueryParams(filters),
    [filters],
  );
  const monitorRealtimeEnabled = filters.status !== "closed";
  const monitorHistoryEnabled = filters.status === "" || filters.status === "closed";
  const backoffRemainingMs = Math.max(0, backoffUntilMs - nowMs);
  const queryRefetchInterval = backoffRemainingMs > 0 ? false : monitorPollIntervalMs;

  const dashboardQuery = useQuery({
    enabled: Boolean(client),
    queryFn: () => client!.getCustomerServiceMonitorDashboard(),
    queryKey: pcQueryKeys.customerServiceMonitorDashboard(apiBaseUrl, tenantToken),
    refetchOnWindowFocus: false,
    refetchInterval: queryRefetchInterval,
    retry: false,
    staleTime: monitorStaleMs,
  });
  const staffQuery = useQuery({
    enabled: Boolean(client),
    queryFn: () => client!.getCustomerServiceMonitorStaffStatuses(),
    queryKey: pcQueryKeys.customerServiceMonitorStaffStatuses(apiBaseUrl, tenantToken),
    refetchOnWindowFocus: false,
    refetchInterval: queryRefetchInterval,
    retry: false,
    staleTime: monitorStaleMs,
  });
  const slaQuery = useQuery({
    enabled: Boolean(client),
    queryFn: () => client!.getCustomerServiceMonitorSlaDashboard(),
    queryKey: pcQueryKeys.customerServiceMonitorSlaDashboard(apiBaseUrl, tenantToken),
    refetchOnWindowFocus: false,
    refetchInterval: queryRefetchInterval,
    retry: false,
    staleTime: monitorStaleMs,
  });
  const threadsQuery = useQuery({
    enabled: Boolean(client && monitorRealtimeEnabled),
    queryFn: () => loadMonitorThreadItems(client!, queryFilters),
    queryKey: pcQueryKeys.customerServiceMonitorThreads(
      apiBaseUrl,
      tenantToken,
      queryFilters,
    ),
    refetchOnWindowFocus: false,
    refetchInterval: queryRefetchInterval,
    retry: false,
    staleTime: monitorStaleMs,
  });
  const historyThreadsQuery = useQuery({
    enabled: Boolean(client && monitorHistoryEnabled),
    queryFn: () => loadMonitorHistoryThreadItems(client!, historyQueryFilters),
    queryKey: [
      ...pcQueryKeys.customerServiceHistory(
        apiBaseUrl,
        tenantToken,
        monitorHistoryLimit,
      ),
      "monitor",
      historyQueryFilters,
    ],
    refetchOnWindowFocus: false,
    refetchInterval: queryRefetchInterval,
    retry: false,
    staleTime: monitorStaleMs,
  });

  const staffItems = staffQuery.data ?? emptyStaffItems;
  const realtimeMonitorThreads = monitorRealtimeEnabled
    ? (threadsQuery.data ?? emptyThreads)
    : emptyThreads;
  const historyMonitorThreads = monitorHistoryEnabled
    ? (historyThreadsQuery.data ?? emptyThreads)
    : emptyThreads;
  const realtimeServiceThreads = useMemo(
    () => realtimeMonitorThreads.filter(isOnlineServiceMonitorThread),
    [realtimeMonitorThreads],
  );
  const allMonitorThreads = useMemo(
    () =>
      monitorThreadsForFilter(
        realtimeMonitorThreads,
        historyMonitorThreads,
        filters.status,
      ),
    [filters.status, historyMonitorThreads, realtimeMonitorThreads],
  );
  const visiblePoolThreads = useMemo(
    () =>
      filterMonitorThreads(
        allMonitorThreads,
        filters,
        staffItems,
      ),
    [allMonitorThreads, filters, staffItems],
  );
  const riskItems = useMemo(
    () => flattenSlaRiskItems(slaQuery.data).filter(isOnlineServiceSlaRiskItem),
    [slaQuery.data],
  );
  const riskThreadKeys = useMemo(() => riskThreadKeySet(riskItems), [riskItems]);
  const prioritizedThreads = useMemo(
    () => sortMonitorThreadsByPriority(visiblePoolThreads, riskThreadKeys),
    [riskThreadKeys, visiblePoolThreads],
  );
  const threadKeys = useMemo(
    () => prioritizedThreads.map((thread) => threadKey(thread)),
    [prioritizedThreads],
  );
  const allThreadKeys = useMemo(
    () => allMonitorThreads.map((thread) => threadKey(thread)),
    [allMonitorThreads],
  );
  const loading =
    dashboardQuery.isLoading ||
    staffQuery.isLoading ||
    slaQuery.isLoading ||
    (monitorRealtimeEnabled && threadsQuery.isLoading) ||
    (monitorHistoryEnabled && historyThreadsQuery.isLoading);
  const error =
    dashboardQuery.error ||
    staffQuery.error ||
    slaQuery.error ||
    (monitorRealtimeEnabled ? threadsQuery.error : null) ||
    (monitorHistoryEnabled ? historyThreadsQuery.error : null);
  const rateLimited = isRateLimitError(error);

  useEffect(() => {
    if (!rateLimited) return;
    setBackoffUntilMs((current) => Math.max(current, Date.now() + monitorBackoffMs));
  }, [rateLimited, error]);

  useEffect(() => {
    if (backoffRemainingMs <= 0) return;
    const timer = window.setInterval(() => setNowMs(Date.now()), 1_000);
    return () => window.clearInterval(timer);
  }, [backoffRemainingMs]);

  useEffect(() => {
    const latest = Math.max(
      dashboardQuery.dataUpdatedAt,
      staffQuery.dataUpdatedAt,
      slaQuery.dataUpdatedAt,
      threadsQuery.dataUpdatedAt,
      historyThreadsQuery.dataUpdatedAt,
    );
    if (latest > 0) setLastSyncedAt(latest);
  }, [
    dashboardQuery.dataUpdatedAt,
    staffQuery.dataUpdatedAt,
    slaQuery.dataUpdatedAt,
    threadsQuery.dataUpdatedAt,
    historyThreadsQuery.dataUpdatedAt,
  ]);

  useEffect(() => {
    setWatchedThreadKeys((current) => {
      const next = pruneWatchedThreadKeys(current, allThreadKeys, layoutMode);
      return sameStringList(current, next) ? current : next;
    });
  }, [allThreadKeys, layoutMode]);

  useEffect(() => {
    if (!focusedThreadKey || allThreadKeys.includes(focusedThreadKey)) return;
    setFocusedThreadKey(threadKeys[0] ?? "");
  }, [allThreadKeys, focusedThreadKey, threadKeys]);

  useEffect(() => {
    if (manualWallSelection) return;
    if (watchedThreadKeys.length > 0 || !prioritizedThreads[0]) return;
    const firstKey = threadKey(prioritizedThreads[0]);
    setFocusedThreadKey(firstKey);
    setWatchedThreadKeys(addWatchedThreadKey([], firstKey, layoutMode));
  }, [layoutMode, manualWallSelection, prioritizedThreads, watchedThreadKeys.length]);

  useEffect(() => {
    if (manualWallSelection) return;
    const topThread = prioritizedThreads[0];
    if (!topThread || monitorThreadPriority(topThread, riskThreadKeys) <= 0) return;
    const topKey = threadKey(topThread);
    setWatchedThreadKeys((current) =>
      sameStringList(current, promoteWatchedThreadKey(current, topKey, layoutMode))
        ? addOrReplaceWatchedThreadKey(current, topKey, layoutMode)
        : promoteWatchedThreadKey(current, topKey, layoutMode),
    );
    setFocusedThreadKey((current) => current || topKey);
  }, [layoutMode, manualWallSelection, prioritizedThreads, riskThreadKeys]);

  useEffect(() => {
    if (watchedThreadKeys.length === 0) setManualWallSelection(false);
  }, [watchedThreadKeys.length]);

  useEffect(() => {
    if (!replacementThreadKey || allThreadKeys.includes(replacementThreadKey)) return;
    setReplacementThreadKey("");
  }, [allThreadKeys, replacementThreadKey]);

  useEffect(() => {
    if (focusedEmptySlotIndex === null) return;
    if (
      focusedEmptySlotIndex < watchedThreadKeys.length ||
      focusedEmptySlotIndex >= monitorLayoutCapacity(layoutMode)
    ) {
      setFocusedEmptySlotIndex(null);
    }
  }, [focusedEmptySlotIndex, layoutMode, watchedThreadKeys.length]);

  useEffect(
    () => () => {
      if (replacementFeedbackTimerRef.current !== null) {
        window.clearTimeout(replacementFeedbackTimerRef.current);
      }
    },
    [],
  );

  const watchedThreads = watchedThreadKeys
    .map((key) => allMonitorThreads.find((thread) => threadKey(thread) === key))
    .filter((thread): thread is CustomerServiceThread => Boolean(thread));
  const detailQueries = useQueries({
    queries: watchedThreads.map((thread) => ({
      enabled: Boolean(client && thread.threadType && thread.threadId),
      queryFn: () =>
        client!.getCustomerServiceMonitorThreadDetail(
          thread.threadType,
          thread.threadId,
        ),
      queryKey: [
        ...pcQueryKeys.customerServiceThreadDetail(
          apiBaseUrl,
          tenantToken,
          thread.threadType,
          thread.threadId,
        ),
        isMonitorHistoryThread(thread) ? "monitor-history" : "monitor",
      ],
      refetchOnWindowFocus: false,
      refetchInterval: queryRefetchInterval,
      retry: false,
      staleTime: monitorStaleMs,
    })),
  });
  const detailQueryByKey = new Map(
    watchedThreads.map((thread, index) => [
      threadKey(thread),
      detailQueries[index] as DetailQueryState | undefined,
    ]),
  );
  const transferThreadMessages = transferThread
    ? readDetailMessages(
        monitorThreadDetailData(
          transferThread,
          detailQueryByKey.get(threadKey(transferThread))?.data,
        ),
      )
    : [];
  const transferTargets = useMemo(
    () =>
      transferThread
        ? monitorTransferTargets(transferThread, staffItems, transferThreadMessages)
        : [],
    [staffItems, transferThread, transferThreadMessages],
  );
  const refreshMonitorQueries = () => {
    void dashboardQuery.refetch();
    void staffQuery.refetch();
    void slaQuery.refetch();
    if (monitorRealtimeEnabled) void threadsQuery.refetch();
    if (monitorHistoryEnabled) void historyThreadsQuery.refetch();
  };
  const transferThreadMutation = useMutation({
    mutationFn: async (payload: {
      reason: string;
      targetId: string;
      thread: CustomerServiceThread;
    }) => {
      if (!client) throw new Error("Customer service API is not ready");
      return client.assignCustomerServiceThread(
        payload.thread.threadType,
        payload.thread.threadId,
        { staffUserId: payload.targetId },
      );
    },
    onSuccess: () => {
      setTransferThread(null);
      setTransferReason("");
      setSelectedTransferTargetId("");
      setTransferErrorText(null);
      refreshMonitorQueries();
    },
    onError: (error) => {
      setTransferErrorText(formatError(error));
    },
  });
  const managementActionMutation = useMutation({
    mutationFn: async (payload: {
      action: MonitorManagementAction;
      thread: CustomerServiceThread;
    }) => {
      if (!client) throw new Error("Customer service API is not ready");
      if (payload.action === "force-close") {
        return client.forceCloseCustomerServiceThread(
          payload.thread.threadType,
          payload.thread.threadId,
        );
      }
      if (payload.action === "freeze") {
        return client.freezeCustomerServiceThread(
          payload.thread.threadType,
          payload.thread.threadId,
        );
      }
      return client.unfreezeCustomerServiceThread(
        payload.thread.threadType,
        payload.thread.threadId,
      );
    },
    onSuccess: () => {
      refreshMonitorQueries();
    },
    onError: (error) => {
      window.alert(formatError(error));
    },
  });

  const setLayout = (nextLayoutMode: MonitorLayoutMode) => {
    setLayoutMode(nextLayoutMode);
    setWatchedThreadKeys((current) => trimWatchedThreadKeys(current, nextLayoutMode));
    setFocusedEmptySlotIndex(null);
    setReplacementThreadKey("");
    setExpandedThreadKey("");
  };
  const watchThread = (thread: CustomerServiceThread) => {
    const key = threadKey(thread);
    setManualWallSelection(true);
    if (
      focusedEmptySlotIndex !== null &&
      !watchedThreadKeys.includes(key) &&
      watchedThreadKeys.length < monitorLayoutCapacity(layoutMode)
    ) {
      setWatchedThreadKeys((current) =>
        dropWatchedThreadKeyAtIndex(current, key, focusedEmptySlotIndex, layoutMode),
      );
      setFocusedThreadKey(key);
      setFocusedEmptySlotIndex(null);
      setReplacementThreadKey("");
      return;
    }
    const nextSelection = selectWatchedThreadKey(
      watchedThreadKeys,
      key,
      focusedThreadKey,
      layoutMode,
    );
    setWatchedThreadKeys(nextSelection.watchedThreadKeys);
    setFocusedThreadKey(nextSelection.focusedThreadKey);
    setFocusedEmptySlotIndex(null);
    setReplacementThreadKey(nextSelection.replacementThreadKey);
    if (nextSelection.replaced) {
      setRecentlyReplacedThreadKey(nextSelection.focusedThreadKey);
      if (replacementFeedbackTimerRef.current !== null) {
        window.clearTimeout(replacementFeedbackTimerRef.current);
      }
      replacementFeedbackTimerRef.current = window.setTimeout(() => {
        setRecentlyReplacedThreadKey("");
        replacementFeedbackTimerRef.current = null;
      }, 600);
    }
  };
  const dropThreadToWatchSlot = (draggedThreadKey: string, slotIndex: number) => {
    if (!allThreadKeys.includes(draggedThreadKey)) return;
    setManualWallSelection(true);
    setFocusedThreadKey(draggedThreadKey);
    setFocusedEmptySlotIndex(null);
    setReplacementThreadKey("");
    setWatchedThreadKeys((current) =>
      dropWatchedThreadKeyAtIndex(current, draggedThreadKey, slotIndex, layoutMode),
    );
  };
  const openThreadForAssist = (thread: CustomerServiceThread) => {
    if (isMonitorHistoryThread(thread)) return;
    openCustomerServiceThread(thread.threadId || thread.conversationId, "user");
    setActiveModule("onlineService");
    onOpenOnlineService();
  };
  const openTransferDialog = (thread: CustomerServiceThread) => {
    if (isMonitorHistoryThread(thread)) return;
    setTransferThread(thread);
    setTransferReason("");
    setSelectedTransferTargetId("");
    setTransferErrorText(null);
  };
  const confirmTransferThread = () => {
    if (!transferThread || !selectedTransferTargetId) return;
    transferThreadMutation.mutate({
      reason: transferReason,
      targetId: selectedTransferTargetId,
      thread: transferThread,
    });
  };
  const executeManagementAction = async (
    thread: CustomerServiceThread,
    action: MonitorManagementAction,
  ) => {
    if (isMonitorHistoryThread(thread) || managementActionMutation.isPending) return;
    const confirmText = monitorManagementConfirmText(thread, action, t);
    if (confirmText) {
      const confirmed = await requestMessageCustomConfirmation(confirmText, {
        confirmText: t("common.confirm"),
        tone: "danger",
      });
      if (!confirmed) return;
    }
    managementActionMutation.mutate({ action, thread });
  };
  const refetchAll = () => {
    setBackoffUntilMs(0);
    refreshMonitorQueries();
  };

  return (
    <div className="cs-monitor-panel">
      <MonitorToolbar
        dashboard={dashboardQuery.data}
        filters={filters}
        layoutMode={layoutMode}
        loading={loading}
        onFilterChange={setFilters}
        onLayoutChange={setLayout}
        onRefresh={refetchAll}
        backoffRemainingMs={backoffRemainingMs}
        lastSyncedAt={lastSyncedAt}
        riskCount={riskItems.length}
        serviceThreads={realtimeServiceThreads}
        staffItems={staffItems}
        t={t}
      />

      {error && (
        <PanelState
          tone="error"
          text={t("workbench.monitor.loadFailed", { error: formatError(error) })}
        />
      )}

      <div className="cs-monitor-command-center">
        <MonitorThreadPool
          focusedThreadKey={focusedThreadKey}
          loading={loading}
          onFocusThread={watchThread}
          onDragThreadKey={setFocusedThreadKey}
          replacementThreadKey={replacementThreadKey}
          riskThreadKeys={riskThreadKeys}
          staffItems={staffItems}
          t={t}
          threads={prioritizedThreads}
          watchedThreadKeys={watchedThreadKeys}
        />
        <MonitorWall
          apiBaseUrl={apiBaseUrl}
          detailQueryByKey={detailQueryByKey}
          expandedThreadKey={expandedThreadKey}
          focusedEmptySlotIndex={focusedEmptySlotIndex}
          focusedThreadKey={focusedThreadKey}
          layoutMode={layoutMode}
          onFocusThread={(key) => {
            setFocusedThreadKey(key);
            setFocusedEmptySlotIndex(null);
          }}
          onFocusEmptySlot={(slotIndex) => {
            setFocusedThreadKey("");
            setFocusedEmptySlotIndex(slotIndex);
          }}
          onManagementAction={executeManagementAction}
          onOpenThreadForAssist={openThreadForAssist}
          onOpenTransfer={openTransferDialog}
          onRemoveThread={(key) => {
            setManualWallSelection(true);
            setWatchedThreadKeys((current) => removeWatchedThreadKey(current, key));
          }}
          onDropThreadToSlot={dropThreadToWatchSlot}
          onReplaceThread={(targetKey) => {
            setManualWallSelection(true);
            setWatchedThreadKeys((current) =>
              replaceWatchedThreadKey(current, targetKey, replacementThreadKey, layoutMode),
            );
            setFocusedThreadKey(replacementThreadKey);
            setReplacementThreadKey("");
          }}
          onToggleExpanded={(key) =>
            setExpandedThreadKey((current) => (current === key ? "" : key))
          }
          replacementThread={prioritizedThreads.find(
            (thread) => threadKey(thread) === replacementThreadKey,
          )}
          onCancelReplace={() => setReplacementThreadKey("")}
          recentlyReplacedThreadKey={recentlyReplacedThreadKey}
          riskThreadKeys={riskThreadKeys}
          staffItems={staffItems}
          t={t}
          tenantToken={tenantToken}
          watchedThreads={watchedThreads}
        />
      </div>
      {transferThread && (
        <CustomerServiceTransferDialog
          currentStaffName={monitorTransferCurrentStaffName(
            transferThread,
            staffItems,
            t("customerService.transfer.unassignedStaff"),
            transferThreadMessages,
          )}
          disabled={transferThreadMutation.isPending}
          errorText={transferErrorText}
          loading={staffQuery.isLoading || staffQuery.isFetching}
          reason={transferReason}
          selectedTargetId={selectedTransferTargetId}
          targets={transferTargets}
          threadTitle={threadTitle(transferThread, t)}
          onCancel={() => {
            setTransferThread(null);
            setTransferReason("");
            setSelectedTransferTargetId("");
            setTransferErrorText(null);
          }}
          onConfirm={confirmTransferThread}
          onReasonChange={setTransferReason}
          onTargetChange={setSelectedTransferTargetId}
        />
      )}
    </div>
  );
}

function MonitorToolbar({
  backoffRemainingMs,
  dashboard,
  filters,
  lastSyncedAt,
  layoutMode,
  loading,
  onFilterChange,
  onLayoutChange,
  onRefresh,
  riskCount,
  serviceThreads,
  staffItems,
  t,
}: {
  backoffRemainingMs: number;
  dashboard?: CustomerServiceMonitorDashboardDto;
  filters: MonitorFilters;
  lastSyncedAt: number | null;
  layoutMode: MonitorLayoutMode;
  loading: boolean;
  onFilterChange: (filters: MonitorFilters) => void;
  onLayoutChange: (layoutMode: MonitorLayoutMode) => void;
  onRefresh: () => void;
  riskCount: number;
  serviceThreads: CustomerServiceThread[];
  staffItems: CustomerServiceStaffStatusDto[];
  t: Translate;
}) {
  const syncText =
    backoffRemainingMs > 0
      ? t("workbench.monitor.backoff", {
          seconds: Math.ceil(backoffRemainingMs / 1_000),
        })
      : lastSyncedAt
        ? t("workbench.monitor.lastSynced", {
            time: formatMonthDayTime(new Date(lastSyncedAt).toISOString()),
          })
        : t("workbench.monitor.realtime");
  return (
    <header className="cs-monitor-toolbar">
      <div className="cs-monitor-toolbar-row cs-monitor-toolbar-summary">
        <div className="cs-monitor-live-chip">
          <Radio size={14} />
          <span>{syncText}</span>
        </div>
        <div className="cs-monitor-toolbar-stats" aria-label={t("workbench.monitor.kpisAria")}>
          {monitorKpis(dashboard, serviceThreads, riskCount, t).map((item) => (
            <span key={item.label}>
              {item.label}
              <strong>{item.value}</strong>
            </span>
          ))}
        </div>
        <div className="cs-monitor-layout-switch" aria-label={t("workbench.monitor.layout")}>
          <LayoutGrid size={14} />
          {monitorLayoutModes.map((mode) => (
            <button
              className={mode === layoutMode ? "active" : ""}
              key={mode}
              onClick={() => onLayoutChange(mode)}
              type="button"
            >
              {mode}
            </button>
          ))}
        </div>
      </div>
      <div className="cs-monitor-toolbar-row cs-monitor-toolbar-controls">
        <section className="cs-monitor-filters" aria-label={t("workbench.monitor.filtersAria")}>
          <select
            value={filters.status}
            onChange={(event) =>
              onFilterChange({ ...filters, status: event.target.value })
            }
          >
            <option value="active">{t("workbench.monitor.status.active")}</option>
            <option value="queued">{t("workbench.monitor.status.queued")}</option>
            <option value="closed">{t("customerService.status.closed")}</option>
            <option value="">{t("workbench.monitor.all")}</option>
          </select>
          <MonitorStaffSelect
            filters={filters}
            onFilterChange={onFilterChange}
            staffItems={staffItems}
            t={t}
          />
          <select
            value={filters.slaRisk}
            onChange={(event) =>
              onFilterChange({ ...filters, slaRisk: event.target.value })
            }
          >
            <option value="">{t("workbench.monitor.all")}</option>
            <option value="true">{t("workbench.monitor.kpi.slaRisk")}</option>
          </select>
          <label className="cs-monitor-search">
            <Search size={14} />
            <input
              value={filters.keyword}
              placeholder={t("workbench.monitor.keywordPlaceholder")}
              onChange={(event) =>
                onFilterChange({ ...filters, keyword: event.target.value })
              }
            />
          </label>
        </section>
        <button
          className="cs-monitor-refresh"
          disabled={loading}
          onClick={onRefresh}
          type="button"
        >
          <RefreshCw size={14} />
          {t("common.query")}
        </button>
      </div>
    </header>
  );
}

function MonitorThreadPool({
  focusedThreadKey,
  loading,
  onDragThreadKey,
  onFocusThread,
  replacementThreadKey,
  riskThreadKeys,
  staffItems,
  t,
  threads,
  watchedThreadKeys,
}: {
  focusedThreadKey: string;
  loading: boolean;
  onDragThreadKey: (threadKey: string) => void;
  onFocusThread: (thread: CustomerServiceThread) => void;
  replacementThreadKey: string;
  riskThreadKeys: Set<string>;
  staffItems: CustomerServiceStaffStatusDto[];
  t: Translate;
  threads: CustomerServiceThread[];
  watchedThreadKeys: string[];
}) {
  return (
    <section className="cs-monitor-thread-pool">
      <PanelHeader
        icon={Activity}
        title={t("workbench.monitor.threadPool")}
        meta={t("workbench.monitor.resultCount", { count: threads.length })}
      />
      {threads.length === 0 ? (
        <PanelState
          text={loading ? t("workbench.monitor.loading") : t("workbench.monitor.emptyThreads")}
        />
      ) : (
        <div className="cs-monitor-thread-list">
          {threads.map((thread) => {
            const key = threadKey(thread);
            const watched = watchedThreadKeys.includes(key);
            const risky = riskThreadKeys.has(key);
            const statusClass = threadStatusClass(thread.status);
            const staffProfile = threadStaffProfile(thread, staffItems);
            const customerIdentity = createCustomerServiceIdentityViewModel({
              fallbackName: t("customerService.visitor"),
              thread,
            });
            const unassigned = !staffProfile.isAssigned;
            return (
              <article
                className={`${key === focusedThreadKey ? "active" : ""} ${watched ? "watched" : ""} ${key === replacementThreadKey ? "replace-pending" : ""} ${statusClass} ${unassigned ? "unassigned" : ""} ${risky ? "risk" : ""}`}
                draggable
                key={key}
                onDragStart={(event) => {
                  event.dataTransfer.effectAllowed = "copyMove";
                  event.dataTransfer.setData(monitorThreadDragMime, key);
                  event.dataTransfer.setData("text/plain", key);
                  onDragThreadKey(key);
                }}
                >
                <button type="button" onClick={() => onFocusThread(thread)}>
                  <span className="cs-monitor-thread-avatars" aria-hidden="true">
                    {!unassigned && (
                      <PcAvatar
                        avatarUrl={staffProfile.avatarUrl}
                        className="e-avatar cs-monitor-thread-avatar staff"
                        name={staffProfile.displayName}
                      />
                    )}
                    <PcAvatar
                      avatarUrl={customerIdentity.avatarUrl}
                      className={`e-avatar cs-monitor-thread-avatar customer ${customerIdentity.avatarTone}`}
                      name={customerIdentity.avatarName}
                    />
                  </span>
                  <span className="cs-monitor-thread-main">
                    <strong>{threadTitle(thread, t)}</strong>
                    <em>{monitorThreadPreview(thread, t)}</em>
                  </span>
                  <span className="cs-monitor-thread-meta">
                    {!unassigned && <small>{staffProfile.displayName}</small>}
                  </span>
                  <small className="cs-monitor-thread-time">{formatThreadTime(thread)}</small>
                  {risky && <b>{t("workbench.monitor.slaRisk")}</b>}
                </button>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}

function MonitorStaffSelect({
  filters,
  onFilterChange,
  staffItems,
  t,
}: {
  filters: MonitorFilters;
  onFilterChange: (filters: MonitorFilters) => void;
  staffItems: CustomerServiceStaffStatusDto[];
  t: Translate;
}) {
  const selectedStaffUserId = filters.assignedStaffUserIds[0] ?? "";
  const selectStaff = (staffUserId: string) => {
    onFilterChange({
      ...filters,
      assignedStaffUserIds: staffUserId ? [staffUserId] : [],
    });
  };

  return (
    <select
      className={`cs-monitor-staff-select ${selectedStaffUserId ? "active" : ""}`}
      value={selectedStaffUserId}
      onChange={(event) => selectStaff(event.target.value)}
    >
      <option value="">{t("workbench.monitor.allStaff")}</option>
      {staffItems.map((staff) => {
        const displayName = staff.displayName || staff.staffUserId;
        const activeCount = staff.activeSessionCount;
        const maxCount = staff.maxConcurrentSessions;
        const loadText =
          activeCount === undefined || activeCount === null
            ? ""
            : maxCount === undefined || maxCount === null
              ? String(activeCount)
              : `${activeCount}/${maxCount}`;
        return (
          <option key={staff.staffUserId} value={staff.staffUserId}>
            {loadText ? `${displayName} ${loadText}` : displayName}
          </option>
        );
      })}
    </select>
  );
}

function MonitorWall({
  apiBaseUrl,
  detailQueryByKey,
  expandedThreadKey,
  focusedEmptySlotIndex,
  focusedThreadKey,
  layoutMode,
  onCancelReplace,
  onFocusEmptySlot,
  onFocusThread,
  onManagementAction,
  onOpenThreadForAssist,
  onOpenTransfer,
  onDropThreadToSlot,
  onRemoveThread,
  onReplaceThread,
  onToggleExpanded,
  replacementThread,
  recentlyReplacedThreadKey,
  riskThreadKeys,
  staffItems,
  t,
  tenantToken,
  watchedThreads,
}: {
  apiBaseUrl?: string;
  detailQueryByKey: Map<string, DetailQueryState | undefined>;
  expandedThreadKey: string;
  focusedEmptySlotIndex: number | null;
  focusedThreadKey: string;
  layoutMode: MonitorLayoutMode;
  onCancelReplace: () => void;
  onFocusEmptySlot: (slotIndex: number) => void;
  onFocusThread: (threadKey: string) => void;
  onManagementAction: (
    thread: CustomerServiceThread,
    action: MonitorManagementAction,
  ) => void;
  onOpenThreadForAssist: (thread: CustomerServiceThread) => void;
  onOpenTransfer: (thread: CustomerServiceThread) => void;
  onDropThreadToSlot: (threadKey: string, slotIndex: number) => void;
  onRemoveThread: (threadKey: string) => void;
  onReplaceThread: (targetThreadKey: string) => void;
  onToggleExpanded: (threadKey: string) => void;
  replacementThread?: CustomerServiceThread;
  recentlyReplacedThreadKey: string;
  riskThreadKeys: Set<string>;
  staffItems: CustomerServiceStaffStatusDto[];
  t: Translate;
  tenantToken?: string;
  watchedThreads: CustomerServiceThread[];
}) {
  const capacity = monitorLayoutCapacity(layoutMode);
  const slots = Array.from({ length: capacity }, (_, index) => watchedThreads[index] ?? null);
  return (
    <section className={`cs-monitor-wall layout-${layoutMode.replace("x", "-")} ${expandedThreadKey ? "has-expanded" : ""}`}>
      <PanelHeader
        icon={ShieldAlert}
        title={t("workbench.monitor.wall")}
        meta={
          replacementThread
            ? t("workbench.monitor.replaceMode")
            : `${watchedThreads.length}/${capacity}`
        }
      />
      {replacementThread && (
        <div className="cs-monitor-replace-banner">
          <span>
            {t("workbench.monitor.replacePrompt", {
              title: threadTitle(replacementThread, t),
            })}
          </span>
          <button type="button" onClick={onCancelReplace}>
            {t("common.cancel")}
          </button>
        </div>
      )}
      <div className="cs-monitor-wall-grid">
        {slots.map((thread, index) =>
          thread ? (
            <MonitorWindow
              apiBaseUrl={apiBaseUrl}
              detailQuery={detailQueryByKey.get(threadKey(thread))}
              expanded={threadKey(thread) === expandedThreadKey}
              focused={threadKey(thread) === focusedThreadKey}
              key={threadKey(thread)}
              layoutMode={layoutMode}
              onFocus={() => onFocusThread(threadKey(thread))}
              onDropThread={(draggedThreadKey) => onDropThreadToSlot(draggedThreadKey, index)}
              onManagementAction={(action) => onManagementAction(thread, action)}
              onOpenThreadForAssist={() => onOpenThreadForAssist(thread)}
              onOpenTransfer={() => onOpenTransfer(thread)}
              onRemove={() => onRemoveThread(threadKey(thread))}
              onReplace={() => onReplaceThread(threadKey(thread))}
              onToggleExpanded={() => onToggleExpanded(threadKey(thread))}
              replacementActive={Boolean(replacementThread)}
              recentlyReplaced={threadKey(thread) === recentlyReplacedThreadKey}
              risky={riskThreadKeys.has(threadKey(thread))}
              staffItems={staffItems}
              t={t}
              tenantToken={tenantToken}
              thread={thread}
            />
          ) : (
            <article
              className={`cs-monitor-empty-slot ${focusedEmptySlotIndex === index ? "focused" : ""}`}
              key={`slot-${index}`}
              onClick={() => onFocusEmptySlot(index)}
              onDragOver={(event) => {
                if (!hasMonitorThreadDragData(event)) return;
                event.preventDefault();
                event.dataTransfer.dropEffect = "copy";
              }}
              onDrop={(event) => {
                const draggedThreadKey = readMonitorThreadDragData(event);
                if (!draggedThreadKey) return;
                event.preventDefault();
                onDropThreadToSlot(draggedThreadKey, index);
              }}
            >
              <LayoutGrid size={18} />
              <span>{t("workbench.monitor.emptySlot")}</span>
            </article>
          ),
        )}
      </div>
    </section>
  );
}

function MonitorWindow({
  apiBaseUrl,
  detailQuery,
  expanded,
  focused,
  layoutMode,
  onFocus,
  onDropThread,
  onManagementAction,
  onOpenThreadForAssist,
  onOpenTransfer,
  onRemove,
  onReplace,
  onToggleExpanded,
  replacementActive,
  recentlyReplaced,
  risky,
  staffItems,
  t,
  tenantToken,
  thread,
}: {
  apiBaseUrl?: string;
  detailQuery?: DetailQueryState;
  expanded: boolean;
  focused: boolean;
  layoutMode: MonitorLayoutMode;
  onFocus: () => void;
  onDropThread: (threadKey: string) => void;
  onManagementAction: (action: MonitorManagementAction) => void;
  onOpenThreadForAssist: () => void;
  onOpenTransfer: () => void;
  onRemove: () => void;
  onReplace: () => void;
  onToggleExpanded: () => void;
  replacementActive: boolean;
  recentlyReplaced: boolean;
  risky: boolean;
  staffItems: CustomerServiceStaffStatusDto[];
  t: Translate;
  tenantToken?: string;
  thread: CustomerServiceThread;
}) {
  const [profilePopover, setProfilePopover] =
    useState<MonitorProfilePopoverState | null>(null);
  const historyThread = isMonitorHistoryThread(thread);
  const detailData = monitorThreadDetailData(thread, detailQuery?.data, t);
  const frozen = isMonitorThreadFrozen(detailData) || isMonitorThreadFrozen(thread);
  const messages = readDetailMessages(detailData);
  const displayMessages = applyCustomerServiceReadStatusToMessages(
    detailData,
    messages,
  );
  const {
    handleScroll: handleMessageStageScroll,
    jumpToLatest,
    pendingNewMessageCount,
    stageRef: messageStageRef,
  } = useWechatBottomFollow({
    conversationKey: thread.threadId,
    isMineMessage: isStaffMessage,
    messageKey: monitorMessageKey,
    messages: displayMessages,
  });
  const messageStageState = monitorMessageStageState(
    detailQuery,
    displayMessages,
    t,
    historyThread,
  );
  const customerIdentity = createCustomerServiceIdentityViewModel({
    fallbackName: threadCustomerName(thread, t),
    thread,
  });
  const customerName = customerIdentity.displayName;
  const staffProfile = threadStaffProfile(
    monitorThreadForProfile(thread, detailData),
    staffItems,
    messages,
  );
  const staffName = staffProfile.displayName;
  const sourceSummary = threadSourceSummary(thread);
  const customerTags = monitorCustomerTags(thread);
  const customerAvatarUrl = customerIdentity.avatarUrl;
  const unassigned = !staffProfile.isAssigned;
  const openProfilePopover = (
    kind: MonitorProfilePopoverState["kind"],
    event: MouseEvent<HTMLElement>,
  ) => {
    event.stopPropagation();
    const rect = event.currentTarget.getBoundingClientRect();
    setProfilePopover({
      kind,
      x: Math.min(rect.left, window.innerWidth - 336),
      y: Math.min(rect.bottom + 8, window.innerHeight - 320),
    });
  };
  const openMessageAvatarPopover = (
    event: MouseEvent<HTMLButtonElement>,
    _message: MessageItemDto,
    mine: boolean,
  ) => {
    openProfilePopover(mine ? "staff" : "customer", event);
  };
  return (
    <article
      className={`cs-monitor-window ${expanded ? "expanded" : ""} ${focused ? "focused" : ""} ${replacementActive ? "replace-target" : ""} ${recentlyReplaced ? "recently-replaced" : ""} ${threadStatusClass(thread.status)} ${unassigned ? "unassigned" : ""} ${risky ? "risk" : ""}`}
      onClick={() => {
        setProfilePopover(null);
        onFocus();
      }}
      onDragOver={(event) => {
        if (!hasMonitorThreadDragData(event)) return;
        event.preventDefault();
        event.dataTransfer.dropEffect = "move";
      }}
      onDrop={(event) => {
        const draggedThreadKey = readMonitorThreadDragData(event);
        if (!draggedThreadKey) return;
        event.preventDefault();
        event.stopPropagation();
        onDropThread(draggedThreadKey);
      }}
    >
      {replacementActive && (
        <button
          className="cs-monitor-replace-target"
          onClick={(event) => {
            event.stopPropagation();
            onReplace();
          }}
          type="button"
        >
          {t("workbench.monitor.replaceThisWindow")}
        </button>
      )}
      <header className="cs-monitor-chat-head">
        <div className="cs-monitor-avatar-pair" aria-label={t("workbench.monitor.chatInfo")}>
          <button
            className={`cs-monitor-avatar-button staff ${unassigned ? "unassigned" : ""}`}
            type="button"
            aria-label={t("workbench.monitor.openStaffProfile")}
            title={t("workbench.monitor.openStaffProfile")}
            onClick={(event) => openProfilePopover("staff", event)}
          >
            <PcAvatar
              avatarUrl={staffProfile.avatarUrl}
              className="e-avatar cs-monitor-avatar"
              name={unassigned ? t("workbench.monitor.unassigned") : staffName}
            />
          </button>
          <button
            className="cs-monitor-avatar-button customer"
            type="button"
            aria-label={t("workbench.monitor.openCustomerProfile")}
            title={t("workbench.monitor.openCustomerProfile")}
            onClick={(event) => openProfilePopover("customer", event)}
          >
            <PcAvatar
              avatarUrl={customerAvatarUrl}
              className={`e-avatar cs-monitor-avatar ${customerIdentity.avatarTone}`}
              name={customerIdentity.avatarName}
            />
          </button>
        </div>
        <div className="cs-monitor-chat-main">
          <div className="cs-monitor-chat-line" aria-label={t("workbench.monitor.chatInfo")}>
            {sourceSummary && <span>{sourceSummary}</span>}
            {customerTags.map((tag) => (
              <span className="customer-tag" key={tag}>
                {tag}
              </span>
            ))}
            {risky && (
              <span className="risk">
                <TriangleAlert size={12} />
                {t("workbench.monitor.slaRisk")}
              </span>
            )}
          </div>
        </div>
        <div className="cs-monitor-window-actions">
          {!historyThread && (
            <button aria-label="改派客服" onClick={(event) => { event.stopPropagation(); onOpenTransfer(); }} title="改派客服" type="button">
              <ArrowRightLeft size={13} />
            </button>
          )}
          {!historyThread && (
            <button
              aria-label={frozen ? "解冻会话" : "冻结会话"}
              className={frozen ? "warning" : ""}
              onClick={(event) => {
                event.stopPropagation();
                onManagementAction(frozen ? "unfreeze" : "freeze");
              }}
              title={frozen ? "解冻会话" : "冻结会话"}
              type="button"
            >
              {frozen ? <Unlock size={13} /> : <Lock size={13} />}
            </button>
          )}
          {!historyThread && (
            <button
              aria-label="强制关闭"
              className="danger"
              onClick={(event) => {
                event.stopPropagation();
                onManagementAction("force-close");
              }}
              title="强制关闭"
              type="button"
            >
              <Power size={13} />
            </button>
          )}
          <button aria-label={expanded ? t("workbench.monitor.shrinkWindow") : t("workbench.monitor.expandWindow")} onClick={(event) => { event.stopPropagation(); onToggleExpanded(); }} title={expanded ? t("workbench.monitor.shrinkWindow") : t("workbench.monitor.expandWindow")} type="button">
            {expanded ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
          </button>
          {!historyThread && (
            <button aria-label={t("workbench.monitor.jumpThread")} onClick={(event) => { event.stopPropagation(); onOpenThreadForAssist(); }} title={t("workbench.monitor.jumpThread")} type="button">
              <ExternalLink size={13} />
            </button>
          )}
          <button aria-label={t("workbench.monitor.closeWindow")} onClick={(event) => { event.stopPropagation(); onRemove(); }} title={t("workbench.monitor.closeWindow")} type="button">
            <X size={13} />
          </button>
        </div>
      </header>
      <CustomerServiceMessageStage
        assetBaseUrl={apiBaseUrl}
        authToken={tenantToken}
        isMineMessage={isStaffMessage}
        jumpToLatest={jumpToLatest}
        messageAnnotations={emptyMessageAnnotations}
        messageMenu={null}
        mineAvatarUrl={staffProfile.avatarUrl}
        messages={displayMessages}
        messageStageState={messageStageState}
        pendingNewMessageCount={pendingNewMessageCount}
        peerAvatarUrl={customerAvatarUrl}
        selectedThread={thread}
        stageRef={messageStageRef}
        title={threadTitle(thread, t)}
        onContextMenu={(event) => {
          event.preventDefault();
          event.stopPropagation();
        }}
        onAvatarClick={openMessageAvatarPopover}
        onMenuAction={noop}
        onScroll={handleMessageStageScroll}
        onUploadAction={noop}
      />
      {profilePopover && (
        <>
          <button
            className="cs-monitor-profile-dismiss"
            type="button"
            aria-label={t("common.close")}
            onClick={(event) => {
              event.stopPropagation();
              setProfilePopover(null);
            }}
          />
          <MonitorProfilePopover
            customerAvatarUrl={customerAvatarUrl}
            customerName={customerIdentity.displayName}
            historyThread={historyThread}
            kind={profilePopover.kind}
            onClose={() => setProfilePopover(null)}
            onOpenReadonlyDetail={onOpenThreadForAssist}
            risky={risky}
            sourceSummary={sourceSummary}
            staffProfile={staffProfile}
            t={t}
            thread={thread}
            x={profilePopover.x}
            y={profilePopover.y}
          />
        </>
      )}
    </article>
  );
}

function PanelHeader({
  icon: Icon,
  meta,
  title,
}: {
  icon: LucideIcon;
  meta: string;
  title: string;
}) {
  return (
    <header className="cs-monitor-panel-head">
      <span><Icon size={15} />{title}</span>
      <em>{meta}</em>
    </header>
  );
}

function MonitorProfilePopover({
  customerAvatarUrl,
  customerName,
  historyThread,
  kind,
  onClose,
  onOpenReadonlyDetail,
  risky,
  sourceSummary,
  staffProfile,
  t,
  thread,
  x,
  y,
}: {
  customerAvatarUrl?: string | null;
  customerName: string;
  historyThread: boolean;
  kind: "customer" | "staff";
  onClose: () => void;
  onOpenReadonlyDetail: () => void;
  risky: boolean;
  sourceSummary: string;
  staffProfile: MonitorStaffProfile;
  t: Translate;
  thread: CustomerServiceThread;
  x: number;
  y: number;
}) {
  const customerRows = [
    [t("workbench.monitor.statusLabel"), threadStatusLabel(thread.status, t)],
    [t("workbench.monitor.source"), sourceSummary || "--"],
    [t("workbench.monitor.threadId"), thread.threadId],
    [t("workbench.monitor.customerLevel"), thread.customerLevel || (thread.isVip ? "VIP" : "--")],
    [t("workbench.monitor.updatedAt"), formatThreadTime(thread)],
  ];
  const staffRows = [
    [t("workbench.monitor.staffId"), staffProfile.staffUserId || "--"],
    [t("workbench.monitor.statusLabel"), staffProfile.statusLabel || "--"],
    [t("workbench.monitor.staffLoadLabel"), staffLoadText(staffProfile)],
    [t("workbench.monitor.lastOnline"), formatMonthDayTime(staffProfile.lastOnlineAt)],
    [t("workbench.monitor.heartbeat"), formatMonthDayTime(staffProfile.lastHeartbeatAt)],
  ];
  const rows = kind === "customer" ? customerRows : staffRows;
  const title = kind === "customer"
    ? customerName
    : staffProfile.displayName === "--"
      ? t("workbench.monitor.unassigned")
      : staffProfile.displayName;
  const subtitle = kind === "customer"
    ? t("workbench.monitor.customerProfile")
    : t("workbench.monitor.staffProfile");
  const tags = kind === "customer"
    ? [
        ...(thread.isVip ? ["VIP"] : []),
        ...(thread.tags ?? []),
        ...(risky ? [t("workbench.monitor.slaRisk")] : []),
      ].slice(0, 5)
    : [
        staffProfile.queueAcceptEnabled ? t("workbench.monitor.acceptingQueue") : "",
        staffProfile.statusLabel,
      ].filter(Boolean);

  return (
    <aside
      className="pc-avatar-profile-popover cs-monitor-profile-popover"
      role="dialog"
      aria-label={subtitle}
      style={{ left: x, top: y }}
      onClick={(event) => event.stopPropagation()}
    >
      <button
        className="pc-avatar-profile-close"
        type="button"
        aria-label={t("common.close")}
        onClick={onClose}
      >
        <X size={14} />
      </button>
      <div className="pc-avatar-profile-head">
        <PcAvatar
          avatarUrl={kind === "customer" ? customerAvatarUrl : staffProfile.avatarUrl}
          className={`pc-avatar-profile-image ${kind === "staff" && staffProfile.displayName === "--" ? "unassigned" : ""}`}
          name={title}
        />
        <div>
          <strong>{title}</strong>
          <span>{subtitle}</span>
        </div>
      </div>
      <div className="pc-avatar-profile-rows">
        {rows.map(([label, value]) => (
          <div key={label}>
            <span>{label}</span>
            <strong>{value || "--"}</strong>
          </div>
        ))}
      </div>
      {tags.length > 0 && (
        <div className="pc-avatar-profile-tags">
          {tags.map((tag) => <span key={tag}>{tag}</span>)}
        </div>
      )}
      {kind === "customer" && !historyThread && (
        <footer className="cs-monitor-profile-actions">
          <button type="button" onClick={onOpenReadonlyDetail}>
            <ExternalLink size={13} />
            {t("workbench.monitor.openReadonlyDetail")}
          </button>
        </footer>
      )}
    </aside>
  );
}

function monitorMessageStageState(
  detailQuery: DetailQueryState | undefined,
  messages: MessageItemDto[],
  t: Translate,
  historyThread = false,
) {
  if (detailQuery?.isError) {
    return {
      kind: "error" as const,
      text: t("workbench.monitor.detailFailed", { error: formatError(detailQuery.error) }),
      tone: "error" as const,
    };
  }
  if (detailQuery?.isLoading) {
    return {
      kind: "loading" as const,
      text: t("workbench.monitor.loadingDetail"),
      tone: "muted" as const,
    };
  }
  if (messages.length === 0) {
    return {
      kind: "empty" as const,
      text: historyThread
        ? "历史会话暂无消息快照。"
        : t("workbench.monitor.emptyMessages"),
      tone: "muted" as const,
    };
  }
  return undefined;
}

function noop() {}

function hasMonitorThreadDragData(event: DragEvent<HTMLElement>) {
  return Array.from(event.dataTransfer.types).includes(monitorThreadDragMime);
}

function readMonitorThreadDragData(event: DragEvent<HTMLElement>) {
  return (
    event.dataTransfer.getData(monitorThreadDragMime) ||
    event.dataTransfer.getData("text/plain")
  ).trim();
}

function dropWatchedThreadKeyAtIndex(
  watchedThreadKeys: string[],
  draggedThreadKey: string,
  slotIndex: number,
  layoutMode: MonitorLayoutMode,
) {
  const key = draggedThreadKey.trim();
  if (!key) return trimWatchedThreadKeys(watchedThreadKeys, layoutMode);
  const capacity = monitorLayoutCapacity(layoutMode);
  const current = trimWatchedThreadKeys(watchedThreadKeys, layoutMode);
  const boundedIndex = Math.max(0, Math.min(slotIndex, capacity - 1));
  const existingIndex = current.indexOf(key);
  if (existingIndex >= 0) {
    const next = current.filter((item) => item !== key);
    next.splice(Math.min(boundedIndex, next.length), 0, key);
    return next.slice(0, capacity);
  }
  if (boundedIndex < current.length) {
    return current.map((item, index) => (index === boundedIndex ? key : item));
  }
  return [...current, key].slice(0, capacity);
}

function monitorQueryParams(filters: MonitorFilters): MonitorThreadQueryParams[] {
  const keyword = filters.keyword.trim();
  const slaRisk = filters.slaRisk.trim();
  const base: MonitorThreadQueryParams = {
    pageSize: 100,
    ...(keyword ? { keyword } : {}),
    ...(slaRisk ? { slaRisk } : {}),
    ...(filters.status === "active" || filters.status === "queued"
      ? { status: filters.status }
      : {}),
    threadType: "temp_session" as const,
  };
  return monitorSelectedStaffUserIds(filters).map((staffUserId) => ({
    ...base,
    ...(staffUserId ? { assignedStaffUserId: staffUserId } : {}),
  }));
}

function monitorHistoryQueryParams(filters: MonitorFilters): MonitorHistoryQueryParams[] {
  const keyword = filters.keyword.trim();
  const slaRisk = filters.slaRisk.trim();
  const base: MonitorHistoryQueryParams = {
    limit: monitorHistoryLimit,
    ...(keyword ? { keyword } : {}),
    ...(slaRisk ? { slaRisk } : {}),
    status: "closed",
    threadType: "temp_session" as const,
  };
  return monitorSelectedStaffUserIds(filters).map((staffUserId) => ({
    ...base,
    ...(staffUserId ? { staffUserId } : {}),
  }));
}

function monitorSelectedStaffUserIds(filters: MonitorFilters) {
  const staffUserIds = Array.from(new Set(filters.assignedStaffUserIds.filter(Boolean)));
  return staffUserIds.length > 0 ? staffUserIds : [""];
}

async function loadMonitorThreadItems(
  client: CustomerServiceApiClient,
  paramsList: MonitorThreadQueryParams[],
) {
  const responses = await Promise.all(
    paramsList.map((params) => client.getCustomerServiceMonitorThreads(params)),
  );
  return dedupeMonitorThreads(responses.flatMap((response) => response.items ?? []));
}

async function loadMonitorHistoryThreadItems(
  client: CustomerServiceApiClient,
  paramsList: MonitorHistoryQueryParams[],
) {
  const responses = await Promise.all(
    paramsList.map((params) => client.getCustomerServiceHistoryThreads(params)),
  );
  return dedupeMonitorThreads(responses.flatMap((response) => response.items ?? []));
}

function monitorThreadsForFilter(
  realtimeThreads: CustomerServiceThread[],
  historyThreads: CustomerServiceThread[],
  status: string,
) {
  const realtimeServiceThreads = realtimeThreads.filter(isOnlineServiceMonitorThread);
  const historyServiceThreads = historyThreads.filter(isOnlineServiceMonitorThread);
  if (status === "active" || status === "queued") return realtimeServiceThreads;
  if (status === "closed") return sortMonitorThreadsByRecent(historyServiceThreads);
  return sortMonitorThreadsByStatusAndRecent(
    dedupeMonitorThreads([...realtimeServiceThreads, ...historyServiceThreads]),
  );
}

function isOnlineServiceMonitorThread(thread: CustomerServiceThread) {
  return thread.threadType === "temp_session";
}

function dedupeMonitorThreads(threads: CustomerServiceThread[]) {
  const byKey = new Map<string, CustomerServiceThread>();
  for (const thread of threads) {
    const key = threadKey(thread);
    if (!key || byKey.has(key)) continue;
    byKey.set(key, thread);
  }
  return Array.from(byKey.values());
}

function sortMonitorThreadsByRecent(threads: CustomerServiceThread[]) {
  return [...threads].sort(
    (left, right) => monitorThreadRecentMs(right) - monitorThreadRecentMs(left),
  );
}

function sortMonitorThreadsByStatusAndRecent(threads: CustomerServiceThread[]) {
  return [...threads].sort((left, right) => {
    const rankDelta = monitorThreadStatusRank(left) - monitorThreadStatusRank(right);
    if (rankDelta !== 0) return rankDelta;
    return monitorThreadRecentMs(right) - monitorThreadRecentMs(left);
  });
}

function monitorThreadStatusRank(thread: CustomerServiceThread) {
  if (monitorThreadMatchesStatus(thread, "active")) return 0;
  if (monitorThreadMatchesStatus(thread, "queued")) return 1;
  if (isClosedMonitorThreadStatus(thread.status)) return 3;
  return 2;
}

function monitorThreadRecentMs(thread: CustomerServiceThread) {
  const record = thread as CustomerServiceThread & Record<string, unknown>;
  return Math.max(
    dateValueMs(thread.lastMessageAt),
    dateValueMs(thread.updatedAt),
    dateValueMs(thread.assignedAt),
    dateValueMs(readStringField(record, ["closedAt", "acceptedAt", "startedAt", "createdAt"])),
  );
}

function dateValueMs(value?: string | null) {
  if (!value) return 0;
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? timestamp : 0;
}

function filterMonitorThreads(
  threads: CustomerServiceThread[],
  filters: MonitorFilters,
  staffItems: CustomerServiceStaffStatusDto[],
) {
  const selectedStaffIds = new Set(filters.assignedStaffUserIds.filter(Boolean));
  const keyword = filters.keyword.trim().toLowerCase();
  return threads.filter((thread) => {
    if (filters.status && !monitorThreadMatchesStatus(thread, filters.status)) return false;
    const staffProfile = threadStaffProfile(thread, staffItems);
    if (selectedStaffIds.size > 0 && !selectedStaffIds.has(staffProfile.staffUserId)) {
      return false;
    }
    if (!keyword) return true;
    return monitorThreadSearchText(thread, staffProfile).includes(keyword);
  });
}

function monitorThreadMatchesStatus(thread: CustomerServiceThread, status: string) {
  if (!status) return true;
  const normalized = String(thread.status ?? "").toLowerCase();
  if (status === "queued") {
    return (
      normalized.includes("queue") ||
      normalized.includes("pending") ||
      normalized.includes("waiting")
    );
  }
  if (status === "active") {
    return (
      normalized.includes("active") ||
      normalized.includes("serving") ||
      normalized.includes("processing") ||
      normalized.includes("ongoing")
    );
  }
  if (status === "closed") return isClosedMonitorThreadStatus(thread.status);
  return normalized === status.toLowerCase();
}

function isMonitorThreadFrozen(value: unknown) {
  if (!value || typeof value !== "object") return false;
  const record = value as Record<string, unknown>;
  const frozen =
    readBooleanField(record, ["isFrozen", "frozen"]) ||
    String(record.freezeStatus ?? record.freeze_status ?? "")
      .trim()
      .toLowerCase() === "frozen";
  return frozen;
}

function monitorManagementConfirmText(
  thread: CustomerServiceThread,
  action: MonitorManagementAction,
  t: Translate,
) {
  const title = threadTitle(thread, t);
  if (action === "force-close") {
    return `确认强制关闭「${title}」？关闭后会话将进入历史只读。`;
  }
  if (action === "freeze") {
    return `确认冻结「${title}」？冻结后客户和客服将暂时无法继续发送消息。`;
  }
  return `确认解冻「${title}」？解冻后会话可恢复发送。`;
}

function monitorThreadSearchText(
  thread: CustomerServiceThread,
  staffProfile: MonitorStaffProfile,
) {
  const record = thread as CustomerServiceThread & Record<string, unknown>;
  return [
    thread.title,
    thread.lastMessagePreview,
    thread.threadId,
    thread.conversationId,
    thread.source,
    thread.sourceChannel,
    thread.channel,
    thread.provider,
    staffProfile.displayName,
    staffProfile.staffUserId,
    readStringField(record, ["customerDisplayName", "customerName", "visitorDisplayName", "visitorName"]),
    readStringField(record, ["customerUserId", "visitorUserId", "customerId", "visitorId", "userId"]),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function monitorKpis(
  dashboard: CustomerServiceMonitorDashboardDto | undefined,
  serviceThreads: CustomerServiceThread[],
  riskCount: number,
  t: Translate,
) {
  const activeCount = serviceThreads.filter((thread) =>
    monitorThreadMatchesStatus(thread, "active"),
  ).length;
  const queuedCount = serviceThreads.filter((thread) =>
    monitorThreadMatchesStatus(thread, "queued"),
  ).length;
  return [
    { label: t("workbench.monitor.kpi.active"), value: numberLabel(activeCount) },
    { label: t("workbench.monitor.kpi.queued"), value: numberLabel(queuedCount) },
    { label: t("workbench.monitor.kpi.onlineStaff"), value: numberLabel(dashboard?.onlineStaffCount) },
    { label: t("workbench.monitor.kpi.slaRisk"), value: numberLabel(riskCount) },
  ];
}

function flattenSlaRiskItems(
  dashboard: CustomerServiceSlaDashboardDto | undefined,
): CustomerServiceSlaRiskItemDto[] {
  return [
    ...(dashboard?.breachedItems ?? []),
    ...(dashboard?.warningItems ?? []),
    ...(dashboard?.items ?? []),
  ];
}

function isOnlineServiceSlaRiskItem(item: CustomerServiceSlaRiskItemDto) {
  return !item.threadType || item.threadType === "temp_session";
}

function riskThreadKeySet(items: CustomerServiceSlaRiskItemDto[]) {
  return new Set(
    items
      .map((item) =>
        item.threadType && item.threadId
          ? `${item.threadType}:${item.threadId}`
          : item.threadId
            ? `temp_session:${item.threadId}`
            : "",
      )
      .filter(Boolean),
  );
}

function threadKey(thread?: CustomerServiceThread) {
  if (!thread) return "";
  return `${thread.threadType}:${thread.threadId}`;
}

function threadTitle(thread: CustomerServiceThread, t: Translate) {
  return thread.title || t("customerService.visitor");
}

function threadCustomerName(thread: CustomerServiceThread, t: Translate) {
  const record = thread as CustomerServiceThread & Record<string, unknown>;
  return (
    readStringField(record, [
      "customerDisplayName",
      "customerName",
      "visitorDisplayName",
      "visitorName",
      "contactName",
      "userDisplayName",
      "nickname",
    ]) ||
    thread.title ||
    readStringField(record, ["customerUserId", "visitorId", "userId", "contactUserId"]) ||
    t("customerService.visitor")
  );
}

function threadChannel(thread: CustomerServiceThread) {
  return (
    usefulSourceLabel(channelLabel(thread.sourceChannel || thread.channel || thread.source || thread.provider)) ||
    (thread.threadType === "temp_session" ? "Widget" : "IM Direct")
  );
}

function threadSourceSummary(thread: CustomerServiceThread) {
  const record = thread as CustomerServiceThread & Record<string, unknown>;
  const values = [
    threadChannel(thread),
    readStringField(record, [
      "sourceName",
      "sourceLabel",
      "sourcePageTitle",
      "landingPageTitle",
      "referrerTitle",
    ]),
    readStringField(record, ["sourceUrl", "landingPageUrl", "referrerUrl"]),
  ].map(usefulSourceLabel).filter(Boolean);
  return Array.from(new Set(values)).slice(0, 2).join(" / ");
}

function monitorCustomerTags(thread: CustomerServiceThread) {
  const record = thread as CustomerServiceThread & Record<string, unknown>;
  const tags = [
    ...readStringListField(record, ["tags", "customerTags", "labels", "customerLabels"]),
    readStringField(record, ["customerLevel", "level", "grade", "rank"]),
    readStringField(record, ["riskLevel", "riskStatus"]),
    readBooleanField(record, ["isVip", "vip"]) ? "VIP" : "",
  ]
    .map((tag) => tag.trim())
    .filter(Boolean);
  return Array.from(new Set(tags)).slice(0, 3);
}

function threadStatusLabel(status: string | undefined, t: Translate) {
  const normalized = String(status ?? "").toLowerCase();
  if (normalized.includes("queue")) return t("workbench.monitor.status.queued");
  if (normalized.includes("active") || normalized.includes("serving")) return t("workbench.monitor.status.active");
  if (isClosedMonitorThreadStatus(status)) return t("customerService.status.closed");
  return status || "--";
}

function threadStatusClass(status: string | undefined) {
  const normalized = String(status ?? "").toLowerCase();
  if (normalized.includes("queue")) return "queued";
  if (normalized.includes("active") || normalized.includes("serving")) return "active";
  if (isClosedMonitorThreadStatus(status)) return "closed";
  return "unknown";
}

function isClosedMonitorThreadStatus(status: string | undefined) {
  const normalized = String(status ?? "").toLowerCase();
  return (
    normalized.includes("closed") ||
    normalized.includes("ended") ||
    normalized.includes("archived")
  );
}

function isMonitorHistoryThread(thread: CustomerServiceThread) {
  return Boolean(thread.historyItem) || isClosedMonitorThreadStatus(thread.status);
}

function threadStaffName(
  thread: CustomerServiceThread,
  staffItems: CustomerServiceStaffStatusDto[],
) {
  return threadStaffProfile(thread, staffItems).displayName;
}

function threadStaffProfile(
  thread: CustomerServiceThread,
  staffItems: CustomerServiceStaffStatusDto[],
  messages: MessageItemDto[] = [],
): MonitorStaffProfile {
  return createCustomerServiceStaffProfileViewModel({
    messages,
    staffItems,
    statusLabel: staffStatusLabel,
    thread,
  });
}

function monitorThreadForProfile(
  thread: CustomerServiceThread,
  detailData: unknown,
): CustomerServiceThread {
  if (!detailData || typeof detailData !== "object") return thread;
  return {
    ...thread,
    ...(detailData as Partial<CustomerServiceThread>),
  };
}

function monitorTransferTargets(
  thread: CustomerServiceThread,
  staffItems: CustomerServiceStaffStatusDto[],
  messages: MessageItemDto[] = [],
): CustomerServiceTransferTarget[] {
  const currentStaffId = threadStaffProfile(thread, staffItems, messages).staffUserId;
  return staffItems
    .filter((staff) => staff.staffUserId && staff.staffUserId !== currentStaffId)
    .map((staff) => ({
      avatarUrl: staff.avatarUrl,
      displayName: staff.displayName || staff.staffUserId,
      roleLabel: "customer_service" as const,
      userId: staff.staffUserId,
    }))
    .sort((left, right) => left.displayName.localeCompare(right.displayName));
}

function monitorTransferCurrentStaffName(
  thread: CustomerServiceThread,
  staffItems: CustomerServiceStaffStatusDto[],
  unassignedLabel: string,
  messages: MessageItemDto[] = [],
) {
  const profile = threadStaffProfile(thread, staffItems, messages);
  return profile.isAssigned ? profile.displayName : unassignedLabel;
}

function readStringField(record: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return "";
}

function readFirstStringField(records: Record<string, unknown>[], keys: string[]) {
  for (const record of records) {
    const value = readStringField(record, keys);
    if (value) return value;
  }
  return "";
}

function readStringListField(record: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = record[key];
    if (Array.isArray(value)) {
      return value
        .map((item) => (typeof item === "string" ? item.trim() : ""))
        .filter(Boolean);
    }
    if (typeof value === "string" && value.trim()) {
      return value
        .split(/[,\uFF0C]/)
        .map((item) => item.trim())
        .filter(Boolean);
    }
  }
  return [];
}

function readBooleanField(record: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "boolean") return value;
    if (typeof value === "string") {
      const normalized = value.trim().toLowerCase();
      if (normalized === "true" || normalized === "1" || normalized === "yes") return true;
      if (normalized === "false" || normalized === "0" || normalized === "no") return false;
    }
  }
  return false;
}

function formatThreadTime(thread: CustomerServiceThread) {
  return formatMonthDayTime(thread.updatedAt || thread.lastMessageAt || thread.assignedAt);
}

function monitorThreadPreview(thread: CustomerServiceThread, t: Translate) {
  const preview = thread.lastMessagePreview?.trim();
  if (preview) return preview;
  if (isMonitorHistoryThread(thread)) return monitorClosedNotificationText(thread, t);
  return t("customerService.threadList.noMessage");
}

function monitorClosedNotificationText(thread: CustomerServiceThread, t: Translate) {
  const statusText = t(customerServiceHistoryStatusKey(thread.status || "closed"));
  const timeText = formatMonitorClosedTime(thread);
  return [
    t("customerService.status.closed"),
    statusText,
    timeText,
  ].filter(Boolean).join(" · ");
}

function formatMonitorClosedTime(thread: CustomerServiceThread) {
  const record = thread as CustomerServiceThread & Record<string, unknown>;
  return formatMonthDayTime(
    readStringField(record, [
      "closedAt",
      "endedAt",
      "updatedAt",
      "lastMessageAt",
      "assignedAt",
      "acceptedAt",
      "startedAt",
      "createdAt",
    ]),
  );
}

function staffStatusLabel(staff?: CustomerServiceStaffStatusDto) {
  const value = staff?.serviceStatus ?? staff?.status;
  return value === undefined || value === null || value === "" ? "--" : String(value);
}

function staffLoadText(staff: MonitorStaffProfile) {
  const active = staff.activeSessionCount;
  const max = staff.maxConcurrentSessions;
  if (active === undefined || active === null) return "--";
  if (max === undefined || max === null) return String(active);
  return `${active}/${max}`;
}

function usefulSourceLabel(value?: string | null) {
  const label = value?.trim();
  if (!label) return "";
  const normalized = label.toLowerCase().replace(/[\s_-]+/g, "");
  if (normalized === "unknownsource" || normalized === "unknown") return "";
  return label;
}

function monitorThreadDetailData(
  thread: CustomerServiceThread,
  detail: unknown,
  t?: Translate,
) {
  if (!isMonitorHistoryThread(thread)) return detail;
  const record = thread as CustomerServiceThread & Record<string, unknown>;
  const historyRecord =
    thread.historyItem && typeof thread.historyItem === "object"
      ? (thread.historyItem as Record<string, unknown>)
      : {};
  const detailRecord = detail && typeof detail === "object"
    ? (detail as Record<string, unknown>)
    : {};
  return {
    ...historyRecord,
    ...record,
    ...detailRecord,
    messages: readHistorySnapshotMessages(t, detailRecord, record, historyRecord),
    readStatus: readHistorySnapshotReadStatus(detailRecord, record, historyRecord),
  };
}

function readHistorySnapshotMessages(
  t: Translate | undefined,
  ...records: Record<string, unknown>[]
) {
  const messages = firstMessageArray(
    records.flatMap((record) => [
      record.messages,
      record.messageItems,
      record.chatMessages,
      record.messageSnapshots,
    ]),
  );
  return appendHistoryClosedNoticeMessage(messages, records, t);
}

function readHistorySnapshotReadStatus(
  ...records: Record<string, unknown>[]
) {
  const value = records
    .map((record) => record.readStatus ?? record.read_status)
    .find((item) => item && typeof item === "object");
  return value && typeof value === "object" ? value : null;
}

function firstMessageArray(values: unknown[]) {
  const value = values.find(Array.isArray);
  return Array.isArray(value) ? [...(value as MessageItemDto[])] : [];
}

function appendHistoryClosedNoticeMessage(
  messages: MessageItemDto[],
  records: Record<string, unknown>[],
  t?: Translate,
) {
  if (historyMessagesContainClosedNotice(messages)) return messages;
  const notice = historyClosedNoticeMessage(records, t);
  return notice ? [...messages, notice] : messages;
}

function historyClosedNoticeMessage(
  records: Record<string, unknown>[],
  t?: Translate,
): MessageItemDto | null {
  const status = readFirstStringField(records, ["status"]);
  if (!isClosedMonitorThreadStatus(status)) return null;
  const sentAt = readFirstStringField(records, [
    "closedAt",
    "endedAt",
    "updatedAt",
    "lastMessageAt",
  ]);
  const preview = historyClosedNoticeText(status || "closed", sentAt, t);
  const conversationId = readFirstStringField(records, ["conversationId", "threadId"]) || "history";
  return {
    body: {
      event: "customer_service_thread_closed",
      text: preview,
    },
    conversationId,
    direction: "system",
    messageId: `${conversationId}:history-closed-notice`,
    messageType: "event",
    preview,
    sentAt,
    status: "sent",
  };
}

function historyClosedNoticeText(status: string, sentAt?: string, t?: Translate) {
  const statusText = t?.(customerServiceHistoryStatusKey(status)) || status || "Closed";
  const closedText = t?.("customerService.status.closed") || "Closed";
  const timeText = formatMonthDayTime(sentAt);
  return [closedText, statusText, timeText].filter(Boolean).join(" · ");
}

function historyMessagesContainClosedNotice(messages: MessageItemDto[]) {
  return messages.some((message) => {
    const type = String(message.messageType ?? "").trim().toLowerCase();
    const body = message.body ?? {};
    const event = String(body.event ?? body.type ?? "").trim().toLowerCase();
    const text = [
      message.preview,
      body.text,
      body.eventText,
      body.notice,
    ].map((value) => String(value ?? "").toLowerCase()).join(" ");
    return (
      event.includes("closed") ||
      event.includes("ended") ||
      ((type === "event" || type === "system" || type === "notice") &&
        (text.includes("关闭") || text.includes("结束") || text.includes("closed") || text.includes("ended")))
    );
  });
}

function readDetailMessages(detail: unknown): MessageItemDto[] {
  if (!detail || typeof detail !== "object") return [];
  const messages = (detail as { messages?: MessageItemDto[] }).messages;
  return Array.isArray(messages) ? messages : [];
}

function sameStringList(left: string[], right: string[]) {
  return left.length === right.length && left.every((item, index) => item === right[index]);
}

function isStaffMessage(message: MessageItemDto) {
  const record = message as MessageItemDto & Record<string, unknown>;
  const role = String(
    record.senderRole ?? record.senderType ?? record.fromRole ?? record.role ?? "",
  )
    .trim()
    .toLowerCase()
    .replace(/-/g, "_");
  if (
    ["staff", "agent", "operator", "customer_service", "service_staff", "kefu"].some(
      (item) => role.includes(item),
    )
  ) {
    return true;
  }
  const direction = String(record.direction ?? record.messageDirection ?? "")
    .trim()
    .toLowerCase();
  return ["out", "outbound", "sent", "send", "mine"].some((item) =>
    direction.includes(item),
  );
}

function monitorMessageKey(message: MessageItemDto) {
  return (
    message.messageId ||
    `${message.conversationSeq ?? ""}-${message.sentAt ?? ""}-${message.preview ?? ""}`
  );
}

function isRateLimitError(error: unknown) {
  if (!error) return false;
  const record = error as Record<string, unknown>;
  const status = Number(record.status ?? record.statusCode);
  const code = String(record.code ?? "").toLowerCase();
  const message = formatError(error).toLowerCase();
  return (
    status === 429 ||
    code.includes("rate") ||
    code.includes("too_many") ||
    message.includes("too many") ||
    message.includes("rate limit") ||
    message.includes("频繁") ||
    message.includes("稍后")
  );
}

function numberLabel(value?: number | string | null) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return "--";
  return numeric.toLocaleString();
}

