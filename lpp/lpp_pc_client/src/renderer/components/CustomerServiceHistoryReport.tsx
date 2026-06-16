import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { DayPicker, type DateRange } from "react-day-picker";
import "react-day-picker/style.css";
import {
  Download,
  Eye,
  Info,
  RefreshCw,
  Search,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import type {
  ConversationListItem,
  CustomerServiceThread,
  CustomerServiceThreadType,
  ExportTaskDto,
  MessageItemDto,
  CustomerServiceHistorySummary,
  TenantMemberDto,
} from "../data/api-client";
import { useAuthSession } from "../data/auth/auth-store";
import { pcQueryKeys } from "../data/query-keys";
import { createApiClient } from "../data/runtime";
import type { PcDataCenterView } from "../data/workspace-access";
import { formatError, formatMonthDayTime } from "../lib/format";
import { MessageHistoryLookupDialog } from "../messages/components/MessageHistoryLookupDialog";
import {
  createMessageLookupScope,
  filterMessagesByHistory,
  getHistoryFilterCounts,
  type HistoryFilterKey,
} from "../messages/models/messageListModel";
import { channelLabel } from "./ChannelBadge";
import { CustomerServiceExportTaskDialog } from "./CustomerServiceExportTaskDialog";
import type { DataCenterReportDefinition } from "./data-center/dataCenterReportTypes";
import { PanelState } from "./PanelState";
import { PcAvatar } from "./PcAvatar";

type HistoryDatePreset =
  | "all"
  | "today"
  | "yesterday"
  | "last7"
  | "last30"
  | "thisWeek"
  | "thisMonth"
  | "custom";

type HistoryFilters = {
  assignedStaffUserId: string;
  conversationId: string;
  country: string;
  customerId: string;
  customerUserId: string;
  from: string;
  keyword: string;
  locale: string;
  rating: string;
  region: string;
  senderUserId: string;
  slaRisk: string;
  sourcePlatform: string;
  staffUserId: string;
  threadType: "all" | CustomerServiceThreadType;
  to: string;
  visitorUserId: string;
};

const historyPageSizeOptions = [10, 20, 50, 100];

const defaultFilters: HistoryFilters = {
  assignedStaffUserId: "",
  conversationId: "",
  country: "",
  customerId: "",
  customerUserId: "",
  from: "",
  keyword: "",
  locale: "",
  rating: "",
  region: "",
  senderUserId: "",
  slaRisk: "",
  sourcePlatform: "",
  staffUserId: "",
  threadType: "all",
  to: "",
  visitorUserId: "",
};

const historyDatePresetOptions: Array<{ label: string; value: HistoryDatePreset }> = [
  { label: "全部", value: "all" },
  { label: "今日", value: "today" },
  { label: "昨日", value: "yesterday" },
  { label: "近7天", value: "last7" },
  { label: "近30天", value: "last30" },
  { label: "本周", value: "thisWeek" },
  { label: "本月", value: "thisMonth" },
  { label: "自定义", value: "custom" },
];

type HistoryThreadsPage = {
  items: CustomerServiceThread[];
  nextCursor?: string | null;
  summary?: CustomerServiceHistorySummary | null;
};

type HistoryPartyProfile = {
  avatarUrl?: string | null;
  details: Array<[string, string]>;
  name: string;
  title: string;
};

export function CustomerServiceHistoryReport({
  dataCenterView = "enterprise-owner",
  report,
}: {
  dataCenterView?: PcDataCenterView;
  report: DataCenterReportDefinition;
}) {
  const session = useAuthSession();
  const [filters, setFilters] = useState<HistoryFilters>(defaultFilters);
  const [datePreset, setDatePreset] = useState<HistoryDatePreset>("all");
  const [customDatePickerOpen, setCustomDatePickerOpen] = useState(false);
  const [staffPickerOpen, setStaffPickerOpen] = useState(false);
  const [staffPickerKeyword, setStaffPickerKeyword] = useState("");
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [historyPageIndex, setHistoryPageIndex] = useState(0);
  const [historyPageSize, setHistoryPageSize] = useState(20);
  const [detailThreadKey, setDetailThreadKey] = useState("");
  const [detailSearch, setDetailSearch] = useState("");
  const [infoThread, setInfoThread] = useState<CustomerServiceThread | null>(null);
  const [partyProfile, setPartyProfile] = useState<HistoryPartyProfile | null>(null);
  const [lookupHistoryFilter, setLookupHistoryFilter] =
    useState<HistoryFilterKey>("all");
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [exportFilters, setExportFilters] = useState<HistoryFilters>(defaultFilters);
  const [exportDatePreset, setExportDatePreset] = useState<HistoryDatePreset>("all");
  const [exportCustomDatePickerOpen, setExportCustomDatePickerOpen] = useState(false);
  const [exportNotice, setExportNotice] = useState("");
  const queryClient = useQueryClient();
  const client = useMemo(() => (session ? createApiClient(session) : null), [session]);
  const historyExportTypeValue = useMemo(() => historyExportType(report), [report]);
  const exportTasksKey = useMemo(
    () => [
      ...pcQueryKeys.customerServiceExportTasks(
        session?.apiBaseUrl,
        session?.tenantToken,
      ),
      historyExportTypeValue,
      "history",
    ],
    [historyExportTypeValue, session?.apiBaseUrl, session?.tenantToken],
  );
  const historyParams = useMemo(
    () => historyQueryParams(filters, historyPageSize),
    [filters, historyPageSize],
  );
  const exportPreviewParams = useMemo(
    () => historyQueryParams(exportFilters, 1),
    [exportFilters],
  );
  const currentHistoryExportFilters = useMemo(() => historyExportFilters(exportFilters), [exportFilters]);
  const lookupScope = useMemo(() => createMessageLookupScope("server"), []);

  useEffect(() => {
    setHistoryPageIndex(0);
  }, [dataCenterView, historyParams]);

  const historyQuery = useInfiniteQuery({
    queryKey: [
      ...pcQueryKeys.customerServiceHistory(
        session?.apiBaseUrl,
        session?.tenantToken,
        historyPageSize,
      ),
      historyParams,
      dataCenterView,
    ],
    initialPageParam: null as string | null,
    enabled: Boolean(client),
    queryFn: ({ pageParam }) =>
      client!.getCustomerServiceHistoryThreads({
        ...historyParams,
        cursor: pageParam,
      }),
    getNextPageParam: (lastPage) => lastPage.nextCursor || undefined,
    staleTime: 30_000,
  });

  const historyPages = (historyQuery.data?.pages ?? []) as HistoryThreadsPage[];
  const allLoadedThreads = historyPages.flatMap((page) => page.items);
  const historySummary = historyPages.find((page) => page.summary)?.summary;
  const totalHistoryCount = historySummary?.totalSessions ?? allLoadedThreads.length;
  const totalHistoryPages = Math.max(1, Math.ceil(totalHistoryCount / historyPageSize));
  const totalLoadedHistoryPages = Math.max(
    1,
    Math.ceil(allLoadedThreads.length / historyPageSize),
  );
  const latestHistoryPage = historyPages[historyPages.length - 1];
  const currentHistoryStart = historyPageIndex * historyPageSize;
  const threads = allLoadedThreads.slice(
    currentHistoryStart,
    currentHistoryStart + historyPageSize,
  );
  const historyFieldColumns = useMemo(() => createHistoryFieldColumns(threads), [threads]);
  const detailThread = allLoadedThreads.find((thread) => threadKey(thread) === detailThreadKey);
  const tenantMembersQuery = useQuery({
    queryKey: pcQueryKeys.tenantMembers(session?.apiBaseUrl, session?.tenantToken),
    enabled: Boolean(client),
    queryFn: () => client!.getTenantMembers(),
    staleTime: 5 * 60_000,
  });
  const tenantMemberByIdentity = useMemo(
    () => createTenantMemberIdentityMap(tenantMembersQuery.data ?? []),
    [tenantMembersQuery.data],
  );
  const staffFilterMembers = useMemo(
    () => createHistoryStaffPickerMembers(tenantMembersQuery.data ?? []),
    [tenantMembersQuery.data],
  );

  const detailQuery = useQuery<unknown>({
    queryKey: pcQueryKeys.customerServiceThreadDetail(
      session?.apiBaseUrl,
      session?.tenantToken,
      detailThread?.threadType,
      detailThread?.threadId,
    ),
    enabled: Boolean(client && detailThread?.threadType && detailThread?.threadId),
    queryFn: () =>
      client!.getWorkbenchThreadDetail(
        detailThread!.threadType,
        detailThread!.threadId,
      ),
    staleTime: 20_000,
  });

  const summary = useMemo(
    () => createHistorySummary(historySummary ?? undefined, allLoadedThreads),
    [allLoadedThreads, historySummary],
  );
  const detailMessages = useMemo(
    () => readDetailMessages(detailQuery.data).filter(isVisibleHistoryMessage),
    [detailQuery.data],
  );
  const lookupCounts = useMemo(() => getHistoryFilterCounts(detailMessages), [detailMessages]);
  const visibleDetailMessages = useMemo(
    () =>
      filterMessagesByKeyword(
        filterMessagesByHistory(detailMessages, lookupHistoryFilter),
        detailSearch,
      ),
    [detailMessages, detailSearch, lookupHistoryFilter],
  );
  const detailConversation = useMemo(
    () => (detailThread ? historyThreadToLookupConversation(detailThread) : null),
    [detailThread],
  );

  const canExportHistory = Boolean(client) && dataCenterView !== "self-service";
  const exportPreviewQuery = useQuery({
    queryKey: [
      ...pcQueryKeys.customerServiceHistory(
        session?.apiBaseUrl,
        session?.tenantToken,
        1,
      ),
      exportPreviewParams,
      dataCenterView,
      "export-preview",
    ],
    enabled: Boolean(client && canExportHistory && exportDialogOpen),
    queryFn: () =>
      client!.getCustomerServiceHistoryThreads({
        ...exportPreviewParams,
        cursor: null,
      }),
    staleTime: 10_000,
  });
  const exportPreviewCount = historyPreviewCount(exportPreviewQuery.data);
  const exportPreviewChecking =
    exportDialogOpen && (exportPreviewQuery.isLoading || exportPreviewQuery.isFetching);
  const exportCreateDisabledReason = !canExportHistory
    ? "当前账号无权导出"
    : exportPreviewChecking
      ? "正在检查当前条件是否有数据"
      : exportPreviewQuery.isError
        ? "当前条件数据检查失败"
        : exportPreviewCount <= 0
          ? "当前条件没有可导出的数据"
          : undefined;
  const exportCreateText = exportPreviewChecking
    ? "检查数据中"
    : exportPreviewQuery.isError
      ? "无法检查数据"
      : exportPreviewCount <= 0
        ? "无数据可导出"
        : "创建导出任务";

  const exportMutation = useMutation({
    mutationFn: async (exportFilters: Record<string, unknown>) => {
      if (!client) throw new Error("API client is not ready");
      if (exportPreviewCount <= 0) throw new Error("当前条件没有可导出的数据");
      return client.createCustomerServiceExportTask({
        exportType: historyExportTypeValue,
        filters: exportFilters,
      });
    },
    onSuccess: (task) => {
      const taskId = task.taskId || "";
      setExportNotice(taskId ? `已创建导出任务：${taskId}` : "已创建导出任务");
      setExportDialogOpen(true);
      void queryClient.invalidateQueries({ queryKey: exportTasksKey });
    },
    onError: (error) => {
      setExportNotice(`导出任务创建失败：${formatError(error)}`);
    },
  });
  const exportTasksQuery = useQuery({
    queryKey: exportTasksKey,
    enabled: Boolean(client && canExportHistory && exportDialogOpen),
    queryFn: () => client!.getCustomerServiceExportTasks({ exportType: historyExportTypeValue }),
    refetchInterval: (query) =>
      query.state.data?.some((task) => isHistoryExportTaskRunning(task.status)) ? 5000 : false,
    staleTime: 15_000,
  });
  const downloadMutation = useMutation({
    mutationFn: async (task: ExportTaskDto) => {
      if (!client) throw new Error("API client is not ready");
      const taskId = historyExportTaskId(task);
      if (!taskId) throw new Error("导出任务缺少 taskId");
      const file = await client.downloadCustomerServiceExportTask(taskId);
      const fileName = file.fileName || task.fileName || `${taskId}.csv`;
      const savedPath = await saveHistoryExportFile(file.blob, fileName);
      return { savedPath, taskId };
    },
    onSuccess: ({ savedPath, taskId }) => {
      setExportNotice(savedPath ? `导出文件已保存并打开目录：${savedPath}` : `导出文件已开始下载：${taskId}`);
    },
    onError: (error) => {
      setExportNotice(`导出文件下载失败：${formatError(error)}`);
    },
  });
  const selectedDateRange = useMemo<DateRange>(
    () => ({
      from: parseHistoryDate(filters.from),
      to: parseHistoryDate(filters.to),
    }),
    [filters.from, filters.to],
  );
  const selectedExportDateRange = useMemo<DateRange>(
    () => ({
      from: parseHistoryDate(exportFilters.from),
      to: parseHistoryDate(exportFilters.to),
    }),
    [exportFilters.from, exportFilters.to],
  );
  const customFromTime = historyTimePart(filters.from, "00:00:00");
  const customToTime = historyTimePart(filters.to, "23:59:59");
  const exportCustomFromTime = historyTimePart(exportFilters.from, "00:00:00");
  const exportCustomToTime = historyTimePart(exportFilters.to, "23:59:59");

  const applyDatePreset = (preset: HistoryDatePreset) => {
    setDatePreset(preset);
    setHistoryPageIndex(0);
    if (preset === "custom") {
      setCustomDatePickerOpen(true);
      return;
    }
    const range = historyDatePresetRange(preset);
    setCustomDatePickerOpen(false);
    setFilters((current) => ({
      ...current,
      from: range.from,
      to: range.to,
    }));
  };

  const applyCustomDateRange = (range: DateRange | undefined) => {
    setDatePreset("custom");
    setHistoryPageIndex(0);
    setFilters((current) => ({
      ...current,
      from: formatHistoryDateTime(range?.from, historyTimePart(current.from, "00:00:00")),
      to: formatHistoryDateTime(range?.to, historyTimePart(current.to, "23:59:59")),
    }));
  };

  const updateCustomDateTime = (side: "from" | "to", time: string) => {
    setDatePreset("custom");
    setHistoryPageIndex(0);
    setFilters((current) => {
      const date = parseHistoryDate(current[side]);
      return {
        ...current,
        [side]: formatHistoryDateTime(date, normalizeHistoryTime(time, side === "from" ? "00:00:00" : "23:59:59")),
      };
    });
  };
  const applyExportDatePreset = (preset: HistoryDatePreset) => {
    setExportDatePreset(preset);
    if (preset === "custom") {
      setExportCustomDatePickerOpen(true);
      return;
    }
    const range = historyDatePresetRange(preset);
    setExportCustomDatePickerOpen(false);
    setExportFilters((current) => ({
      ...current,
      from: range.from,
      to: range.to,
    }));
  };

  const applyCustomExportDateRange = (range: DateRange | undefined) => {
    setExportDatePreset("custom");
    setExportFilters((current) => ({
      ...current,
      from: formatHistoryDateTime(range?.from, historyTimePart(current.from, "00:00:00")),
      to: formatHistoryDateTime(range?.to, historyTimePart(current.to, "23:59:59")),
    }));
  };

  const updateCustomExportDateTime = (side: "from" | "to", time: string) => {
    setExportDatePreset("custom");
    setExportFilters((current) => {
      const date = parseHistoryDate(current[side]);
      return {
        ...current,
        [side]: formatHistoryDateTime(date, normalizeHistoryTime(time, side === "from" ? "00:00:00" : "23:59:59")),
      };
    });
  };

  const selectStaffFilter = (staffUserId: string) => {
    setHistoryPageIndex(0);
    setStaffPickerOpen(false);
    setStaffPickerKeyword("");
    setFilters((current) => ({ ...current, staffUserId }));
  };
  const clearStaffFilter = () => {
    setHistoryPageIndex(0);
    setStaffPickerOpen(false);
    setStaffPickerKeyword("");
    setFilters((current) => ({ ...current, staffUserId: "" }));
  };
  const openDetail = (thread: CustomerServiceThread) => {
    setDetailThreadKey(threadKey(thread));
    setDetailSearch("");
    setLookupHistoryFilter("all");
  };

  const closeDetail = () => {
    setDetailThreadKey("");
    setDetailSearch("");
    setLookupHistoryFilter("all");
  };

  const goToNextHistoryPage = () => {
    if (historyPageIndex < totalLoadedHistoryPages - 1) {
      setHistoryPageIndex((current) => current + 1);
      return;
    }
    if (!latestHistoryPage?.nextCursor || historyQuery.isFetchingNextPage) return;
    void historyQuery.fetchNextPage().then((result) => {
      if (!result.isError) setHistoryPageIndex((current) => current + 1);
    });
  };

  const changeHistoryPageSize = (value: string) => {
    const nextPageSize = Number(value);
    if (!historyPageSizeOptions.includes(nextPageSize)) return;
    setHistoryPageIndex(0);
    setHistoryPageSize(nextPageSize);
  };

  return (
    <section className="cs-history-page data-center-report-content">
      <section className="cs-history-summary-grid" aria-label="历史对话统计">
        {summary.map((item) => (
          <article key={item.label}>
            <span>{item.label}</span>
            <strong>{item.value}</strong>
            <small>{item.hint}</small>
          </article>
        ))}
      </section>

      <section className="cs-history-filter-card">
        <div className="cs-history-commerce-search">
          <HistoryInput
            className="search-field"
            label="客户关键词"
            value={filters.keyword}
            placeholder="客户名称、客户 ID、手机号、邮箱..."
            onChange={(keyword) => setFilters((current) => ({ ...current, keyword }))}
          />
          <HistoryInput label="客户 ID" value={filters.customerId} onChange={(customerId) => setFilters((current) => ({ ...current, customerId }))} />
          <HistoryStaffPicker
            keyword={staffPickerKeyword}
            loading={tenantMembersQuery.isLoading}
            members={staffFilterMembers}
            open={staffPickerOpen}
            selectedUserId={filters.staffUserId}
            syncError={tenantMembersQuery.error}
            onClear={clearStaffFilter}
            onKeywordChange={setStaffPickerKeyword}
            onOpenChange={setStaffPickerOpen}
            onSelect={selectStaffFilter}
          />
          <div className="cs-history-actions">
            <button type="button" onClick={() => {
              setHistoryPageIndex(0);
              setDatePreset("all");
              setCustomDatePickerOpen(false);
              setStaffPickerOpen(false);
              setStaffPickerKeyword("");
              setFilters(defaultFilters);
            }}>
              重置
            </button>
            <button
              type="button"
              className="primary"
              onClick={() => {
                setHistoryPageIndex(0);
                void historyQuery.refetch();
              }}
              disabled={historyQuery.isFetching}
            >
              <RefreshCw size={15} />
              查询
            </button>
            <button type="button" onClick={() => setAdvancedOpen((current) => !current)}>
              {advancedOpen ? "收起更多条件" : "更多条件"}
            </button>
            <button
              type="button"
              className="primary"
              onClick={() => {
                setExportFilters(filters);
                setExportDatePreset(datePreset);
                setExportCustomDatePickerOpen(false);
                setExportDialogOpen(true);
              }}
              disabled={!canExportHistory || exportMutation.isPending}
            >
              <Download size={15} />
              导出
            </button>
          </div>
        </div>

        <div className="cs-history-filter-grid cs-history-filter-lines">
          <div className="cs-history-filter-line">
            <HistoryFilterOptionRow
              label="会话类型"
              value={filters.threadType}
              options={[
                ["all", "全部"],
                ["temp_session", "访客会话"],
                ["im_direct", "IM 直聊"],
              ]}
              onChange={(threadType) =>
                setFilters((current) => ({
                  ...current,
                  threadType: threadType as HistoryFilters["threadType"],
                }))
              }
            />
          </div>
          <div className="cs-history-filter-line">
            <div className="cs-history-filter-row">
              <span className="cs-history-filter-row-label">创建时间：</span>
              <HistoryDateRangeFilter
                pickerOpen={customDatePickerOpen}
                preset={datePreset}
                range={selectedDateRange}
                fromTime={customFromTime}
                toTime={customToTime}
                onPickerOpenChange={setCustomDatePickerOpen}
                onPresetChange={applyDatePreset}
                onRangeChange={applyCustomDateRange}
                onTimeChange={updateCustomDateTime}
              />
            </div>
          </div>
        </div>

        {advancedOpen && (
          <div className="cs-history-filter-grid advanced">
            <HistoryInput label="注册用户 ID" value={filters.customerUserId} onChange={(customerUserId) => setFilters((current) => ({ ...current, customerUserId }))} />
            <HistoryInput label="访客用户 ID" value={filters.visitorUserId} onChange={(visitorUserId) => setFilters((current) => ({ ...current, visitorUserId }))} />
            <HistoryInput label="发送人 ID" value={filters.senderUserId} onChange={(senderUserId) => setFilters((current) => ({ ...current, senderUserId }))} />
            <HistoryInput label="指派客服 ID" value={filters.assignedStaffUserId} onChange={(assignedStaffUserId) => setFilters((current) => ({ ...current, assignedStaffUserId }))} />
            <HistoryInput label="语言" value={filters.locale} placeholder="zh-CN / en-US" onChange={(locale) => setFilters((current) => ({ ...current, locale }))} />
            <HistoryInput label="来源平台" value={filters.sourcePlatform} placeholder="web / app" onChange={(sourcePlatform) => setFilters((current) => ({ ...current, sourcePlatform }))} />
            <HistoryInput label="国家" value={filters.country} onChange={(country) => setFilters((current) => ({ ...current, country }))} />
            <HistoryInput label="地区" value={filters.region} onChange={(region) => setFilters((current) => ({ ...current, region }))} />
            <HistoryInput label="评分" value={filters.rating} placeholder="1-5" onChange={(rating) => setFilters((current) => ({ ...current, rating }))} />
            <HistoryInput label="SLA 风险" value={filters.slaRisk} placeholder="1 / 2 / 3" onChange={(slaRisk) => setFilters((current) => ({ ...current, slaRisk }))} />
          </div>
        )}

      </section>

      <section className="cs-history-results-panel">
        {historyQuery.isError && (
          <PanelState tone="error" text={`历史对话加载失败：${formatError(historyQuery.error)}`} />
        )}
        {!historyQuery.isError && threads.length === 0 && (
          <PanelState text={historyEmptyText(historyQuery.isLoading, filters.keyword)} />
        )}
        {threads.length > 0 && (
          <div className="cs-history-thread-table" aria-label="历史对话查询结果">
            <div className="cs-history-field-table-scroll">
              <table className="cs-history-field-table">
                <thead>
                  <tr>
                    {historyFieldColumns.map((column) => (
                      <th key={column.key} className={historyFieldColumnClass(column.key)}>
                        {column.label}
                      </th>
                    ))}
                    <th>操作</th>
                  </tr>
                </thead>
                <tbody>
                  {threads.map((thread) => (
                    <tr key={threadKey(thread)}>
                      {historyFieldColumns.map((column) => (
                        <td
                          key={`${threadKey(thread)}:${column.key}`}
                          className={historyFieldColumnClass(column.key)}
                        >
                          {renderHistoryFieldCell(
                            thread,
                            column.key,
                            setPartyProfile,
                            tenantMemberByIdentity,
                          )}
                        </td>
                      ))}
                      <td>
                        <div className="cs-history-row-actions">
                          <button type="button" onClick={() => setInfoThread(thread)}>
                            <Info size={14} />
                            详情
                          </button>
                          <button type="button" onClick={() => openDetail(thread)}>
                            <Eye size={14} />
                            聊天记录
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
        <footer className="cs-history-pagination">
          <span>
            {latestHistoryPage?.nextCursor ? "已载入" : "共"} {totalHistoryCount} 条
          </span>
          <label>
            <span>每页</span>
            <select
              value={historyPageSize}
              onChange={(event) => changeHistoryPageSize(event.target.value)}
              disabled={historyQuery.isFetching}
            >
              {historyPageSizeOptions.map((pageSize) => (
                <option key={pageSize} value={pageSize}>
                  {pageSize} 条
                </option>
              ))}
            </select>
          </label>
          <span>
            第 {historyPageIndex + 1} / {totalHistoryPages}
            {latestHistoryPage?.nextCursor ? " 页 · 还有更多" : " 页"}
          </span>
          <button
            type="button"
            onClick={() => setHistoryPageIndex((current) => Math.max(0, current - 1))}
            disabled={historyPageIndex === 0 || historyQuery.isFetching}
          >
            上一页
          </button>
          <button
            type="button"
            onClick={goToNextHistoryPage}
            disabled={
              historyQuery.isFetchingNextPage ||
              (historyPageIndex >= totalLoadedHistoryPages - 1 && !latestHistoryPage?.nextCursor)
            }
          >
            {historyQuery.isFetchingNextPage ? "加载中" : "下一页"}
          </button>
        </footer>
      </section>

      {detailThread && detailConversation && (
        <MessageHistoryLookupDialog
          accountId={session?.userId}
          assetBaseUrl={session?.apiBaseUrl}
          authToken={session?.tenantToken}
          conversation={detailConversation}
          currentUserAvatarUrl={session?.avatarUrl}
          currentUserDisplayName={session?.displayName}
          historyCounts={lookupCounts}
          historyFilter={lookupHistoryFilter}
          isMineMessage={(message) => isMineHistoryMessage(message, session)}
          loadedMessages={detailMessages}
          lookupScope={lookupScope}
          messageSearchKeyword={detailSearch}
          messages={visibleDetailMessages}
          onClearMessageSearch={() => setDetailSearch("")}
          onClose={closeDetail}
          onHistoryFilterChange={setLookupHistoryFilter}
          onMessageSearchKeywordChange={setDetailSearch}
          onScrollToMessage={() => undefined}
        />
      )}

      {partyProfile && (
        <HistoryPartyProfileDialog
          profile={partyProfile}
          onClose={() => setPartyProfile(null)}
        />
      )}

      {infoThread && (
        <HistoryThreadDetailDialog
          columns={historyFieldColumns}
          onClose={() => setInfoThread(null)}
          thread={infoThread}
        />
      )}

      {exportDialogOpen && (
        <CustomerServiceExportTaskDialog
          title="导出历史对话"
          conditionEditor={(createAction) => (
            <div className="cs-stats-export-condition-editor history">
              <div className="cs-stats-export-compact-search">
                <HistoryInput
                  className="search-field"
                  label="客户关键词"
                  value={exportFilters.keyword}
                  placeholder="客户名称、客户 ID、手机号、邮箱..."
                  onChange={(keyword) => setExportFilters((current) => ({ ...current, keyword }))}
                />
                <HistoryInput label="客户 ID" value={exportFilters.customerId} onChange={(customerId) => setExportFilters((current) => ({ ...current, customerId }))} />
                <HistoryInput label="客服 ID" value={exportFilters.staffUserId} onChange={(staffUserId) => setExportFilters((current) => ({ ...current, staffUserId }))} />
                <div className="cs-stats-export-form-actions inline">
                  {createAction}
                </div>
              </div>
              <div className="cs-history-filter-grid cs-history-filter-lines cs-stats-export-filter-lines">
                <div className="cs-history-filter-line paired">
                  <HistoryFilterOptionRow
                    label="会话类型"
                    value={exportFilters.threadType}
                    options={[
                      ["all", "全部"],
                      ["temp_session", "访客会话"],
                      ["im_direct", "IM 直聊"],
                    ]}
                    onChange={(threadType) =>
                      setExportFilters((current) => ({
                        ...current,
                        threadType: threadType as HistoryFilters["threadType"],
                      }))
                    }
                  />
                  <div className="cs-history-filter-row cs-stats-export-row-input">
                    <span className="cs-history-filter-row-label">会话 ID：</span>
                    <input
                      value={exportFilters.conversationId}
                      onChange={(event) =>
                        setExportFilters((current) => ({
                          ...current,
                          conversationId: event.target.value,
                        }))
                      }
                    />
                  </div>
                </div>
                <div className="cs-history-filter-line full">
                  <div className="cs-history-filter-row">
                    <span className="cs-history-filter-row-label">创建时间：</span>
                    <HistoryDateRangeFilter
                      pickerOpen={exportCustomDatePickerOpen}
                      preset={exportDatePreset}
                      range={selectedExportDateRange}
                      fromTime={exportCustomFromTime}
                      toTime={exportCustomToTime}
                      onPickerOpenChange={setExportCustomDatePickerOpen}
                      onPresetChange={applyExportDatePreset}
                      onRangeChange={applyCustomExportDateRange}
                      onTimeChange={updateCustomExportDateTime}
                    />
                  </div>
                </div>
              </div>
              <details className="cs-stats-export-more-conditions">
                <summary>更多导出条件</summary>
                <div className="cs-stats-export-condition-grid advanced">
                  <HistoryInput label="注册用户 ID" value={exportFilters.customerUserId} onChange={(customerUserId) => setExportFilters((current) => ({ ...current, customerUserId }))} />
                  <HistoryInput label="访客用户 ID" value={exportFilters.visitorUserId} onChange={(visitorUserId) => setExportFilters((current) => ({ ...current, visitorUserId }))} />
                  <HistoryInput label="发送人 ID" value={exportFilters.senderUserId} onChange={(senderUserId) => setExportFilters((current) => ({ ...current, senderUserId }))} />
                  <HistoryInput label="指派客服 ID" value={exportFilters.assignedStaffUserId} onChange={(assignedStaffUserId) => setExportFilters((current) => ({ ...current, assignedStaffUserId }))} />
                  <HistoryInput label="语言" value={exportFilters.locale} placeholder="zh-CN / en-US" onChange={(locale) => setExportFilters((current) => ({ ...current, locale }))} />
                  <HistoryInput label="来源平台" value={exportFilters.sourcePlatform} placeholder="web / app" onChange={(sourcePlatform) => setExportFilters((current) => ({ ...current, sourcePlatform }))} />
                  <HistoryInput label="国家" value={exportFilters.country} onChange={(country) => setExportFilters((current) => ({ ...current, country }))} />
                  <HistoryInput label="地区" value={exportFilters.region} onChange={(region) => setExportFilters((current) => ({ ...current, region }))} />
                </div>
              </details>
            </div>
          )}
          notice={exportNotice}
          tasks={sortHistoryExportTasks(exportTasksQuery.data ?? []).map((task) => {
            const taskId = historyExportTaskId(task);
            const status = task.status || "--";
            return {
              canDownload: isHistoryExportTaskCompleted(status) && Boolean(taskId),
              completedAtLabel: task.completedAt ? historyDateTimeLabel(task.completedAt) : undefined,
              createdAtLabel: historyDateTimeLabel(task.createdAt),
              key: taskId || `${task.exportType}-${task.createdAt}`,
              payload: task,
              recordCountLabel: historyExportRecordCountLabel(task.recordCount),
              status,
              statusLabel: historyExportTaskStatusLabel(status),
              title: task.fileName || historyExportTaskTitle(task),
            };
          })}
          loading={exportTasksQuery.isLoading}
          errorText={
            exportTasksQuery.isError
              ? `导出任务加载失败：${formatError(exportTasksQuery.error)}`
              : undefined
          }
          downloadPending={downloadMutation.isPending}
          createPending={exportMutation.isPending}
          createText={exportCreateText}
          createDisabled={Boolean(exportCreateDisabledReason)}
          createDisabledReason={exportCreateDisabledReason}
          onClose={() => setExportDialogOpen(false)}
          onCreate={() => exportMutation.mutate(currentHistoryExportFilters)}
          onDownload={(task) => downloadMutation.mutate(task.payload as ExportTaskDto)}
        />
      )}
    </section>
  );
}

function historyExportType(report: DataCenterReportDefinition): "cs_sessions" {
  return report.exportTypes.includes("cs_sessions") ? "cs_sessions" : "cs_sessions";
}

function historyExportTaskId(task: ExportTaskDto) {
  return task.taskId || "";
}

function historyExportTaskTitle(task: ExportTaskDto) {
  return task.exportType === "cs_sessions" ? "历史对话明细" : task.exportType || "导出任务";
}

function historyExportRecordCountLabel(value?: number | null) {
  return typeof value === "number" && Number.isFinite(value) ? `${value} 条` : undefined;
}

function historyPreviewCount(page?: HistoryThreadsPage) {
  if (!page) return 0;
  return page.summary?.totalSessions ?? page.items.length;
}

function isHistoryExportTaskRunning(status?: string | null) {
  const normalized = (status || "").toLowerCase();
  return normalized === "pending" || normalized === "processing";
}

function isHistoryExportTaskCompleted(status?: string | null) {
  return (status || "").toLowerCase() === "completed";
}

function historyExportTaskStatusLabel(status?: string | null) {
  const normalized = (status || "").toLowerCase();
  if (normalized === "pending") return "排队中";
  if (normalized === "processing") return "生成中";
  if (normalized === "completed") return "已完成";
  if (normalized === "failed") return "失败";
  return status || "--";
}

function historyDateTimeLabel(value?: string | null) {
  if (!value) return "--";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}

async function saveHistoryExportFile(blob: Blob, fileName: string) {
  const desktopApi = typeof window !== "undefined" ? window.desktopApi : undefined;
  if (desktopApi?.saveAndRevealFile) {
    return desktopApi.saveAndRevealFile({
      bytes: await blob.arrayBuffer(),
      defaultName: fileName,
      filters: [{ name: "CSV", extensions: ["csv"] }],
    });
  }
  triggerHistoryBrowserDownload(blob, fileName);
  return null;
}

function triggerHistoryBrowserDownload(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

type HistoryFieldColumn = {
  key: string;
  label: string;
};

type HistoryDetailRow = {
  key: string;
  label: string;
  value: string;
};

type HistoryDetailSection = {
  key: string;
  title: string;
  rows: HistoryDetailRow[];
};

const preferredHistoryFieldLabels: Record<string, string> = {
  threadType: "会话类型",
  threadId: "会话 ID",
  conversationId: "Conversation ID",
  tenantId: "租户 ID",
  status: "状态",
  statusCode: "状态码",
  title: "标题/客户",
  customerIdentity: "客户名称",
  customerUserId: "客户用户 ID",
  visitorUserId: "访客用户 ID",
  customerId: "客户 ID",
  customerDisplayName: "客户显示名",
  customerName: "客户名称",
  customerNickname: "客户昵称",
  visitorDisplayName: "访客显示名",
  visitorName: "访客名称",
  visitorNickname: "访客昵称",
  peerDisplayName: "对端显示名",
  staffUserId: "客服 ID",
  staffIdentity: "客服",
  assignedStaffUserId: "指派客服 ID",
  source: "来源",
  from: "From",
  channel: "渠道",
  sourceChannel: "来源渠道",
  entryChannel: "入口渠道",
  platform: "平台",
  sourcePlatform: "来源平台",
  provider: "Provider",
  appId: "应用 ID",
  appCode: "应用 Code",
  appName: "应用名",
  appDisplayName: "应用显示名",
  packageName: "包名",
  brandName: "品牌",
  tenantAppName: "租户应用",
  avatarUrl: "头像",
  customerAvatarUrl: "客户头像",
  lastMessagePreview: "最近消息",
  unreadCount: "未读",
  durationSeconds: "会话时长",
  firstResponseSeconds: "首次响应耗时",
  transferCount: "转接次数",
  rating: "满意度评分",
  createdAt: "创建时间",
  startedAt: "开始时间",
  queueEnteredAt: "入队时间",
  acceptedAt: "接待时间",
  firstResponseAt: "首次响应时间",
  closedAt: "关闭时间",
  lastMessageAt: "最近消息时间",
  updatedAt: "更新时间",
  riskLevel: "风险等级",
  riskReasonsJson: "风险原因",
  locale: "语言",
  category: "会话分类",
  country: "国家",
  region: "地区",
  participation: "参与关系",
};

const primaryHistoryFieldOrder = [
  "threadType",
  "staffIdentity",
  "customerIdentity",
  "status",
  "riskLevel",
  "sourceChannel",
  "sourcePlatform",
  "unreadCount",
  "rating",
  "durationSeconds",
  "lastMessageAt",
  "createdAt",
];
const preferredHistoryFieldOrder = [
  ...primaryHistoryFieldOrder,
  ...Object.keys(preferredHistoryFieldLabels).filter(
    (key) => !primaryHistoryFieldOrder.includes(key),
  ),
];
const fallbackHistoryFieldOrder = primaryHistoryFieldOrder;

function createHistoryFieldColumns(threads: CustomerServiceThread[]): HistoryFieldColumn[] {
  const keys = new Set<string>();
  primaryHistoryFieldOrder.forEach((key) => keys.add(key));
  if (threads.length === 0) fallbackHistoryFieldOrder.forEach((key) => keys.add(key));
  return preferredHistoryFieldOrder.filter((key) => keys.has(key)).map((key) => ({
    key,
    label: preferredHistoryFieldLabels[key] ?? key,
  }));
}

function historyFieldColumnClass(key: string) {
  return `cs-history-field-${key.replace(/[^a-zA-Z0-9_-]/g, "-")}`;
}

function historyFieldValue(thread: CustomerServiceThread, key: string) {
  const raw = historyItemRecord(thread);
  if (key === "customerIdentity") return historyCustomerName(thread, raw);
  if (key === "staffIdentity") return historyStaffName(raw);
  if (key === "threadType") return threadTypeLabel(firstHistoryText(raw.threadType, thread.threadType));
  if (key === "status") return statusLabel(firstHistoryText(raw.status, thread.status));
  if (key === "riskLevel") return riskLevelLabel(raw.riskLevel);
  if (key === "sourceChannel") return sourceChannelFilterLabel(firstHistoryText(raw.sourceChannel, thread.sourceChannel, thread.channel, thread.source, thread.provider));
  if (key === "sourcePlatform") return sourcePlatformLabel(firstHistoryText(raw.sourcePlatform, thread.platform, thread.provider, thread.source));
  if (key === "rating") return ratingLabel(raw.rating);
  if (key === "durationSeconds") return durationLabel(historyNumber(raw.durationSeconds));
  if (Object.prototype.hasOwnProperty.call(raw, key)) return raw[key];
  if (key === "threadType") return threadTypeLabel(thread.threadType);
  if (key === "threadId") return thread.threadId;
  if (key === "conversationId") return thread.conversationId;
  if (key === "status") return statusLabel(thread.status);
  if (key === "title") return thread.title;
  if (key === "sourceChannel") return threadChannel(thread);
  if (key === "lastMessagePreview") return thread.lastMessagePreview;
  if (key === "unreadCount") return thread.unreadCount;
  if (key === "lastMessageAt") return thread.lastMessageAt;
  return undefined;
}

function renderHistoryFieldCell(
  thread: CustomerServiceThread,
  key: string,
  onOpenProfile: (profile: HistoryPartyProfile) => void,
  tenantMemberByIdentity: Map<string, TenantMemberDto>,
) {
  const raw = historyItemRecord(thread);
  if (key === "customerIdentity") {
    const profile = historyCustomerProfile(
      thread,
      raw,
      findTenantMemberByHistoryIdentity(tenantMemberByIdentity, [
        raw.customerUserId,
        raw.visitorUserId,
      ]),
    );
    return (
      <button
        type="button"
        className="cs-history-party-trigger"
        onClick={() => onOpenProfile(profile)}
      >
        <HistoryPartyInlineProfile profile={profile} />
      </button>
    );
  }
  if (key === "staffIdentity") {
    const profile = historyStaffProfile(
      raw,
      findTenantMemberByHistoryIdentity(tenantMemberByIdentity, [
        raw.staffUserId,
        raw.assignedStaffUserId,
      ]),
    );
    return (
      <button
        type="button"
        className="cs-history-party-trigger"
        onClick={() => onOpenProfile(profile)}
      >
        <HistoryPartyInlineProfile profile={profile} />
      </button>
    );
  }
  return formatHistoryFieldValue(historyFieldValue(thread, key));
}

function historyItemRecord(thread: CustomerServiceThread): Record<string, unknown> {
  return thread.historyItem && typeof thread.historyItem === "object"
    ? thread.historyItem
    : {};
}

function historyCustomerProfile(
  thread: CustomerServiceThread,
  raw: Record<string, unknown>,
  tenantMember?: TenantMemberDto,
): HistoryPartyProfile {
  const name = tenantMember?.displayName || historyCustomerName(thread, raw);
  const details = historyProfileDetails([
    ["通讯录", tenantMember ? "已关联通讯录" : "未关联通讯录"],
    ["星络号", tenantMember?.greenBubbleNo || firstHistoryText(raw.lppId, raw.lppNo, raw.lppNumber, raw.customerLppId, raw.customerLppNo, raw.greenBubbleId, raw.greenBubbleNo)],
    ["通讯录角色", tenantMemberRoleLabel(tenantMember?.membershipRole)],
    ["来源平台", raw.sourcePlatform],
    ["来源渠道", raw.sourceChannel],
    ["语言", raw.locale],
    ["分类", raw.category],
    ["地区", [raw.country, raw.region].filter(Boolean).join(" / ")],
  ]);
  return {
    avatarUrl: tenantMember?.avatarUrl || firstHistoryText(raw.customerAvatarUrl, raw.avatarUrl, thread.customerAvatarUrl, thread.avatarUrl),
    details,
    name,
    title: "客户信息",
  };
}

function historyStaffProfile(
  raw: Record<string, unknown>,
  tenantMember?: TenantMemberDto,
): HistoryPartyProfile {
  const name = tenantMember?.displayName || historyStaffName(raw);
  const details = historyProfileDetails([
    ["通讯录", tenantMember ? "已关联通讯录" : "未关联通讯录"],
    ["星络号", tenantMember?.greenBubbleNo || firstHistoryText(raw.staffLppId, raw.staffLppNo, raw.lppId, raw.lppNo)],
    ["通讯录角色", tenantMemberRoleLabel(tenantMember?.membershipRole)],
    ["参与关系", raw.participation],
  ]);
  return {
    avatarUrl: tenantMember?.avatarUrl || firstHistoryText(raw.staffAvatarUrl, raw.assignedStaffAvatarUrl),
    details,
    name,
    title: "客服信息",
  };
}

function historyCustomerName(
  thread: CustomerServiceThread,
  raw: Record<string, unknown>,
) {
  return firstHistoryText(
    raw.customerDisplayName,
    raw.customerName,
    raw.customerNickname,
    raw.visitorDisplayName,
    raw.visitorName,
    raw.visitorNickname,
    raw.peerDisplayName,
    thread.title,
  );
}

function historyStaffName(raw: Record<string, unknown>) {
  return firstHistoryText(
    raw.staffDisplayName,
    raw.assignedStaffName,
    raw.staffName,
  );
}

function historyProfileDetails(items: Array<[string, unknown]>) {
  return items
    .map(([label, value]) => [label, firstHistoryText(value)] as [string, string])
    .filter(([, value]) => value);
}

function createTenantMemberIdentityMap(members: TenantMemberDto[]) {
  const map = new Map<string, TenantMemberDto>();
  members.forEach((member) => {
    [member.userId, member.platformUserId, member.greenBubbleNo]
      .filter(Boolean)
      .forEach((identity) => map.set(String(identity), member));
  });
  return map;
}

function findTenantMemberByHistoryIdentity(
  tenantMemberByIdentity: Map<string, TenantMemberDto>,
  identities: unknown[],
) {
  for (const identity of identities) {
    const text = firstHistoryText(identity);
    if (!text) continue;
    const member = tenantMemberByIdentity.get(text);
    if (member) return member;
  }
  return undefined;
}

function tenantMemberRoleLabel(role?: number) {
  if (role === undefined || role === null) return "";
  if (role >= 4) return "所有者";
  if (role >= 3) return "管理员";
  if (role >= 2) return "客服";
  if (role >= 1) return "技术支持";
  return "普通成员";
}

function historyThreadDetailRows(
  thread: CustomerServiceThread,
  columns: HistoryFieldColumn[],
): HistoryDetailRow[] {
  const visibleKeys = new Set(columns.map((column) => column.key));
  const record = historyThreadDetailRecord(thread);
  const keys = new Set<string>();
  preferredHistoryFieldOrder.forEach((key) => {
    if (!visibleKeys.has(key) && hasHistoryDetailValue(record[key])) keys.add(key);
  });
  Object.keys(record).forEach((key) => {
    if (
      key !== "historyItem" &&
      !visibleKeys.has(key) &&
      hasHistoryDetailValue(record[key])
    ) {
      keys.add(key);
    }
  });
  return Array.from(keys).map((key) => ({
    key,
    label: preferredHistoryFieldLabels[key] ?? key,
    value: formatHistoryDetailValue(key, record[key]),
  }));
}

const historyDetailSectionDefinitions: Array<{
  key: string;
  title: string;
  fields: string[];
}> = [
  {
    key: "conversation",
    title: "会话信息",
    fields: [
      "threadType",
      "status",
      "statusCode",
      "title",
      "category",
      "rating",
      "riskLevel",
      "transferCount",
      "durationSeconds",
    ],
  },
  {
    key: "participants",
    title: "双方信息",
    fields: [
      "customerDisplayName",
      "customerName",
      "customerNickname",
      "visitorDisplayName",
      "visitorName",
      "visitorNickname",
      "peerDisplayName",
      "customerUserId",
      "visitorUserId",
      "customerId",
      "staffDisplayName",
      "staffUserId",
      "assignedStaffUserId",
      "participation",
    ],
  },
  {
    key: "time",
    title: "时间与效率",
    fields: [
      "createdAt",
      "startedAt",
      "queueEnteredAt",
      "acceptedAt",
      "firstResponseAt",
      "closedAt",
      "lastMessageAt",
      "updatedAt",
      "firstResponseSeconds",
    ],
  },
  {
    key: "source",
    title: "来源与运营",
    fields: [
      "sourceChannel",
      "sourcePlatform",
      "source",
      "from",
      "channel",
      "entryChannel",
      "platform",
      "provider",
      "locale",
      "country",
      "region",
      "riskReasonsJson",
    ],
  },
  {
    key: "system",
    title: "系统标识",
    fields: [
      "threadId",
      "conversationId",
      "tenantId",
      "appId",
      "appCode",
      "appName",
      "appDisplayName",
      "packageName",
      "brandName",
      "tenantAppName",
      "avatarUrl",
      "customerAvatarUrl",
    ],
  },
];

function historyThreadDetailSections(rows: HistoryDetailRow[]): HistoryDetailSection[] {
  const rowByKey = new Map(rows.map((row) => [row.key, row]));
  const usedKeys = new Set<string>();
  const sections = historyDetailSectionDefinitions
    .map((section) => {
      const sectionRows = section.fields
        .map((field) => rowByKey.get(field))
        .filter((row): row is HistoryDetailRow => Boolean(row));
      sectionRows.forEach((row) => usedKeys.add(row.key));
      return { key: section.key, title: section.title, rows: sectionRows };
    })
    .filter((section) => section.rows.length > 0);
  const extraRows = rows.filter((row) => !usedKeys.has(row.key));
  if (extraRows.length > 0) {
    sections.push({ key: "extra", title: "其他字段", rows: extraRows });
  }
  return sections;
}

function historyThreadDetailRecord(thread: CustomerServiceThread) {
  const record: Record<string, unknown> = {};
  Object.entries(thread as unknown as Record<string, unknown>).forEach(([key, value]) => {
    if (key !== "historyItem") record[key] = value;
  });
  Object.entries(historyItemRecord(thread)).forEach(([key, value]) => {
    record[key] = value;
  });
  return record;
}

function hasHistoryDetailValue(value: unknown) {
  if (value === null || value === undefined) return false;
  if (typeof value === "string") return value.trim().length > 0;
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === "object") return Object.keys(value).length > 0;
  return true;
}

function formatHistoryDetailValue(key: string, value: unknown) {
  if (key === "status") return statusLabel(firstHistoryText(value));
  if (key === "threadType") return threadTypeLabel(firstHistoryText(value));
  if (key === "riskLevel") return riskLevelLabel(value);
  if (key === "rating") return ratingLabel(value);
  if (key === "sourceChannel") {
    return sourceChannelFilterLabel(firstHistoryText(value));
  }
  if (key === "sourcePlatform") {
    return sourcePlatformLabel(firstHistoryText(value));
  }
  if (key === "durationSeconds" || key === "firstResponseSeconds") {
    return durationLabel(historyNumber(value));
  }
  if (key.endsWith("At")) return historyDateTimeText(value);
  return formatHistoryFieldValue(value);
}

function historyDateTimeText(value: unknown) {
  const text = firstHistoryText(value);
  if (!text) return "--";
  const date = new Date(text);
  if (Number.isNaN(date.getTime())) return text;
  return date.toLocaleString();
}

function firstHistoryText(...values: unknown[]) {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value.trim();
    if (typeof value === "number" && Number.isFinite(value)) return String(value);
  }
  return "";
}

function historyNumber(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return undefined;
}

function formatHistoryFieldValue(value: unknown) {
  if (value === null || value === undefined || value === "") return "--";
  if (typeof value === "boolean") return value ? "true" : "false";
  if (typeof value === "number") return Number.isFinite(value) ? String(value) : "--";
  if (typeof value === "string") return value;
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function historyThreadToLookupConversation(thread: CustomerServiceThread): ConversationListItem {
  return {
    conversationId: thread.conversationId || thread.threadId,
    conversationType: thread.threadType,
    title: thread.title || "访客",
    avatarUrl: thread.avatarUrl || thread.customerAvatarUrl,
    unreadCount: thread.unreadCount,
    lastMessage: {
      preview: thread.lastMessagePreview,
      sentAt: thread.lastMessageAt ?? undefined,
    },
  };
}

function HistoryInput({
  className,
  label,
  onChange,
  placeholder,
  type = "text",
  value,
}: {
  className?: string;
  label: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
  value: string;
}) {
  return (
    <label className={className}>
      <span>{label}</span>
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}

function HistoryStaffPicker({
  keyword,
  loading,
  members,
  onClear,
  onKeywordChange,
  onOpenChange,
  onSelect,
  open,
  selectedUserId,
  syncError,
}: {
  keyword: string;
  loading: boolean;
  members: TenantMemberDto[];
  onClear: () => void;
  onKeywordChange: (value: string) => void;
  onOpenChange: (open: boolean) => void;
  onSelect: (staffUserId: string) => void;
  open: boolean;
  selectedUserId: string;
  syncError: unknown;
}) {
  const selectedMember = members.find((member) => member.userId === selectedUserId);
  const visibleMembers = filterHistoryStaffPickerMembers(members, keyword);
  const hasSyncError = Boolean(syncError);
  const buttonLabel = selectedMember
    ? historyStaffPickerName(selectedMember)
    : selectedUserId
      ? `已选员工 ${selectedUserId}`
      : "从通讯录选择";

  return (
    <div className="cs-history-staff-picker">
      <span>参与客服</span>
      <div className="cs-history-staff-picker-control">
        <button
          className={`cs-history-staff-trigger ${selectedUserId ? "selected" : ""}`}
          type="button"
          onClick={() => onOpenChange(!open)}
        >
          <span>{buttonLabel}</span>
          {selectedUserId && (
            <em>{selectedMember ? historyStaffPickerMeta(selectedMember) : "单选员工"}</em>
          )}
        </button>
        {selectedUserId && (
          <button
            className="cs-history-staff-clear"
            type="button"
            aria-label="清除参与客服筛选"
            onClick={onClear}
          >
            <X size={13} />
          </button>
        )}
        {open && (
          <div className="cs-history-staff-popover">
            <label className="cs-history-staff-search">
              <Search size={14} aria-hidden="true" />
              <input
                value={keyword}
                placeholder="搜索员工姓名 / 绿泡号"
                onChange={(event) => onKeywordChange(event.target.value)}
              />
            </label>
            <div className="cs-history-staff-list" role="listbox" aria-label="选择参与客服">
              {loading && <p>正在读取通讯录...</p>}
              {!loading && hasSyncError && <p>通讯录同步失败，无法选择员工。</p>}
              {!loading && !hasSyncError && visibleMembers.length === 0 && (
                <p>{keyword.trim() ? "未找到匹配员工" : "通讯录暂无可选员工"}</p>
              )}
              {!loading &&
                !hasSyncError &&
                visibleMembers.map((member) => (
                  <button
                    key={member.userId}
                    type="button"
                    role="option"
                    aria-selected={member.userId === selectedUserId}
                    className={member.userId === selectedUserId ? "selected" : undefined}
                    onClick={() => onSelect(member.userId)}
                  >
                    <PcAvatar
                      avatarUrl={member.avatarUrl}
                      className="cs-history-staff-avatar"
                      name={historyStaffPickerName(member)}
                    />
                    <span>
                      <strong>{historyStaffPickerName(member)}</strong>
                      <em>{historyStaffPickerMeta(member)}</em>
                    </span>
                  </button>
                ))}
            </div>
            <footer>
              <span>当前接口仅支持单个参与客服筛选</span>
              <button type="button" onClick={() => onOpenChange(false)}>
                关闭
              </button>
            </footer>
          </div>
        )}
      </div>
    </div>
  );
}

function HistoryPartyInlineProfile({ profile }: { profile: HistoryPartyProfile }) {
  return (
    <>
      <PcAvatar
        avatarUrl={profile.avatarUrl}
        className="cs-history-party-mini-avatar"
        name={profile.name || "--"}
      />
      <span className="cs-history-party-name">{profile.name || "--"}</span>
    </>
  );
}

function HistoryPartyProfileDialog({
  onClose,
  profile,
}: {
  onClose: () => void;
  profile: HistoryPartyProfile;
}) {
  return (
    <div className="cs-history-party-modal" role="presentation" onClick={onClose}>
      <section
        className="cs-history-party-dialog"
        role="dialog"
        aria-modal="true"
        aria-label={profile.title}
        onClick={(event) => event.stopPropagation()}
      >
        <header>
          <h2>{profile.title}</h2>
          <button type="button" onClick={onClose} aria-label="关闭">
            ×
          </button>
        </header>
        <div className="cs-history-party-main">
          <PcAvatar
            avatarUrl={profile.avatarUrl}
            className="cs-history-party-avatar"
            name={profile.name || "--"}
          />
          <strong>{profile.name || "--"}</strong>
        </div>
        <dl>
          {profile.details.length > 0 ? (
            profile.details.map(([label, value]) => (
              <div key={label}>
                <dt>{label}</dt>
                <dd>{value}</dd>
              </div>
            ))
          ) : (
            <div>
              <dt>资料</dt>
              <dd>接口未返回更多信息</dd>
            </div>
          )}
        </dl>
      </section>
    </div>
  );
}

function HistoryThreadDetailDialog({
  columns,
  onClose,
  thread,
}: {
  columns: HistoryFieldColumn[];
  onClose: () => void;
  thread: CustomerServiceThread;
}) {
  const raw = historyItemRecord(thread);
  const rows = historyThreadDetailRows(thread, columns);
  const sections = historyThreadDetailSections(rows);
  const title = historyCustomerName(thread, raw) || historyStaffName(raw) || "会话详情";
  return (
    <div className="cs-history-info-modal" role="presentation" onClick={onClose}>
      <section
        className="cs-history-info-dialog"
        role="dialog"
        aria-modal="true"
        aria-label="会话详情"
        onClick={(event) => event.stopPropagation()}
      >
        <header>
          <div>
            <h2>会话详情</h2>
            <p>{title}</p>
          </div>
          <button type="button" onClick={onClose} aria-label="关闭">
            ×
          </button>
        </header>
        {sections.length > 0 ? (
          <div className="cs-history-info-sections">
            {sections.map((section) => (
              <section key={section.key} className="cs-history-info-section">
                <h3>{section.title}</h3>
                <dl className="cs-history-info-grid">
                  {section.rows.map((row) => (
                    <div key={row.key}>
                      <dt>{row.label}</dt>
                      <dd title={row.value}>{row.value}</dd>
                    </div>
                  ))}
                </dl>
              </section>
            ))}
          </div>
        ) : (
          <PanelState text="接口未返回更多详情字段。" />
        )}
      </section>
    </div>
  );
}

function HistoryFilterOptionRow({
  label,
  onChange,
  options,
  value,
}: {
  label: string;
  onChange: (value: string) => void;
  options: Array<[string, string]>;
  value: string;
}) {
  return (
    <div className="cs-history-filter-row">
      <span className="cs-history-filter-row-label">{label}：</span>
      <div className="cs-history-filter-options">
        {options.map(([optionValue, text]) => (
          <button
            key={optionValue}
            type="button"
            className={value === optionValue ? "active" : undefined}
            onClick={() => onChange(optionValue)}
          >
            {text}
          </button>
        ))}
      </div>
    </div>
  );
}

function HistoryDateRangeFilter({
  fromTime,
  onPickerOpenChange,
  onPresetChange,
  onRangeChange,
  onTimeChange,
  pickerOpen,
  preset,
  range,
  toTime,
}: {
  fromTime: string;
  onPickerOpenChange: (open: boolean) => void;
  onPresetChange: (preset: HistoryDatePreset) => void;
  onRangeChange: (range: DateRange | undefined) => void;
  onTimeChange: (side: "from" | "to", time: string) => void;
  pickerOpen: boolean;
  preset: HistoryDatePreset;
  range: DateRange;
  toTime: string;
}) {
  return (
    <div className="cs-history-date-filter">
      <div className="cs-history-filter-options">
        {historyDatePresetOptions.map((option) => (
          <button
            key={option.value}
            type="button"
            className={preset === option.value ? "active" : undefined}
            onClick={() => onPresetChange(option.value)}
          >
            {option.label}
          </button>
        ))}
      </div>
      {preset === "custom" && (
        <div className="cs-history-date-custom">
          <button
            type="button"
            className="cs-history-date-trigger"
            onClick={() => onPickerOpenChange(true)}
          >
            {historyDateRangeLabel(range, fromTime, toTime)}
          </button>
          {pickerOpen && (
            <div className="cs-history-date-popover">
              <DayPicker
                captionLayout="dropdown"
                mode="range"
                numberOfMonths={1}
                selected={range}
                weekStartsOn={1}
                onSelect={onRangeChange}
              />
              <div className="cs-history-time-grid">
                <label>
                  <input
                    aria-label="开始时间"
                    type="time"
                    step={1}
                    value={fromTime}
                    disabled={!range.from}
                    onChange={(event) => onTimeChange("from", event.target.value)}
                  />
                </label>
                <label>
                  <input
                    aria-label="结束时间"
                    type="time"
                    step={1}
                    value={toTime}
                    disabled={!range.to}
                    onChange={(event) => onTimeChange("to", event.target.value)}
                  />
                </label>
              </div>
              <footer>
                <button type="button" onClick={() => onRangeChange(undefined)}>
                  清空
                </button>
                <button type="button" className="primary" onClick={() => onPickerOpenChange(false)}>
                  完成
                </button>
              </footer>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function historyDatePresetRange(preset: HistoryDatePreset) {
  const today = startOfHistoryDay(new Date());
  if (preset === "all" || preset === "custom") return { from: "", to: "" };
  if (preset === "today") {
    return { from: formatHistoryDateTime(today, "00:00:00"), to: formatHistoryDateTime(today, "23:59:59") };
  }
  if (preset === "yesterday") {
    const value = addHistoryDays(today, -1);
    return { from: formatHistoryDateTime(value, "00:00:00"), to: formatHistoryDateTime(value, "23:59:59") };
  }
  if (preset === "last7") {
    return { from: formatHistoryDateTime(addHistoryDays(today, -6), "00:00:00"), to: formatHistoryDateTime(today, "23:59:59") };
  }
  if (preset === "last30") {
    return { from: formatHistoryDateTime(addHistoryDays(today, -29), "00:00:00"), to: formatHistoryDateTime(today, "23:59:59") };
  }
  if (preset === "thisWeek") {
    const day = today.getDay() || 7;
    return { from: formatHistoryDateTime(addHistoryDays(today, 1 - day), "00:00:00"), to: formatHistoryDateTime(today, "23:59:59") };
  }
  if (preset === "thisMonth") {
    return {
      from: formatHistoryDateTime(new Date(today.getFullYear(), today.getMonth(), 1), "00:00:00"),
      to: formatHistoryDateTime(today, "23:59:59"),
    };
  }
  return { from: "", to: "" };
}

function historyDateRangeLabel(range: DateRange, fromTime: string, toTime: string) {
  const from = formatHistoryDateTime(range.from, fromTime).replace("T", " ");
  const to = formatHistoryDateTime(range.to, toTime).replace("T", " ");
  if (from && to) return `${from} ~ ${to}`;
  if (from) return `${from} ~ 结束时间`;
  return "选择日期范围";
}

function parseHistoryDate(value: string) {
  if (!value) return undefined;
  const datePart = value.trim().split(/[ T]/)[0] ?? "";
  const [yearText, monthText, dayText] = datePart.split("-");
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) return undefined;
  return new Date(year, month - 1, day);
}

function formatHistoryDate(date?: Date) {
  if (!date) return "";
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatHistoryDateTime(date: Date | undefined, time: string) {
  const dateText = formatHistoryDate(date);
  if (!dateText) return "";
  return `${dateText}T${normalizeHistoryTime(time, "00:00:00")}`;
}

function historyTimePart(value: string, fallback: string) {
  const time = value.trim().split(/[ T]/)[1] ?? "";
  return normalizeHistoryTime(time, fallback);
}

function normalizeHistoryTime(value: string, fallback: string) {
  const [hour = "", minute = "", second = ""] = value.split(":");
  const h = normalizeHistoryTimeUnit(hour, 23);
  const m = normalizeHistoryTimeUnit(minute, 59);
  const s = normalizeHistoryTimeUnit(second, 59);
  if (!h || !m || !s) return fallback;
  return `${h}:${m}:${s}`;
}

function normalizeHistoryTimeUnit(value: string, max: number) {
  if (!/^\d{1,2}$/.test(value)) return "";
  const number = Number(value);
  if (!Number.isInteger(number) || number < 0 || number > max) return "";
  return String(number).padStart(2, "0");
}

function startOfHistoryDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function addHistoryDays(date: Date, days: number) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
}

function createHistoryStaffPickerMembers(members: TenantMemberDto[]) {
  return members
    .filter((member) => member.userId && isSelectableHistoryStaffMember(member))
    .slice()
    .sort((left, right) =>
      historyStaffPickerName(left).localeCompare(historyStaffPickerName(right), "zh-Hans-CN"),
    );
}

function filterHistoryStaffPickerMembers(members: TenantMemberDto[], keyword: string) {
  const normalizedKeyword = keyword.trim().toLowerCase();
  if (!normalizedKeyword) return members.slice(0, 80);
  return members
    .filter((member) => historyStaffPickerSearchText(member).includes(normalizedKeyword))
    .slice(0, 80);
}

function isSelectableHistoryStaffMember(member: TenantMemberDto) {
  return Number(member.membershipRole ?? 1) !== 0;
}

function historyStaffPickerName(member: TenantMemberDto) {
  return member.displayName?.trim() || member.greenBubbleNo || member.userId || "未命名员工";
}

function historyStaffPickerMeta(member: TenantMemberDto) {
  return [
    historyStaffRoleLabel(member.membershipRole),
    member.greenBubbleNo ? `绿泡号 ${member.greenBubbleNo}` : "",
    member.userId ? `ID ${shortHistoryIdentity(member.userId)}` : "",
  ]
    .filter(Boolean)
    .join(" · ");
}

function historyStaffPickerSearchText(member: TenantMemberDto) {
  return [
    member.displayName,
    member.userId,
    member.platformUserId,
    member.greenBubbleNo,
    historyStaffRoleLabel(member.membershipRole),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function historyStaffRoleLabel(role?: number) {
  if (role === 4) return "所有者";
  if (role === 3) return "管理员";
  if (role === 2) return "客服";
  if (role === 1) return "员工";
  return "成员";
}

function shortHistoryIdentity(value: string) {
  return value.length > 12 ? `${value.slice(0, 8)}...` : value;
}

function historyQueryParams(filters: HistoryFilters, limit: number) {
  const rating = filters.rating.trim();
  const minRiskLevel = filters.slaRisk.trim();
  return {
    ...(filters.threadType !== "all" ? { threadType: filters.threadType } : {}),
    ...(filters.from ? { from: filters.from } : {}),
    ...(filters.to ? { to: filters.to } : {}),
    ...(filters.conversationId ? { conversationId: filters.conversationId } : {}),
    ...(filters.customerId ? { customerId: filters.customerId } : {}),
    ...(filters.customerUserId ? { customerUserId: filters.customerUserId } : {}),
    ...(filters.visitorUserId ? { visitorUserId: filters.visitorUserId } : {}),
    ...(filters.senderUserId ? { senderUserId: filters.senderUserId } : {}),
    ...(filters.keyword ? { keyword: filters.keyword } : {}),
    ...(filters.staffUserId ? { staffUserId: filters.staffUserId } : {}),
    ...(filters.assignedStaffUserId ? { assignedStaffUserId: filters.assignedStaffUserId } : {}),
    ...(filters.locale ? { locale: filters.locale } : {}),
    ...(filters.sourcePlatform ? { sourcePlatform: filters.sourcePlatform } : {}),
    ...(filters.country ? { country: filters.country } : {}),
    ...(filters.region ? { region: filters.region } : {}),
    ...(rating ? { minRating: rating, maxRating: rating } : {}),
    ...(minRiskLevel ? { minRiskLevel } : {}),
    limit,
  };
}

function historyEmptyText(isLoading: boolean, keyword: string) {
  if (isLoading) return "正在加载历史对话...";
  if (keyword.trim()) {
    return "没有找到匹配客户身份的历史对话。消息内容请进入“聊天记录”后在弹窗内搜索。";
  }
  return "没有找到符合条件的历史对话";
}

function historyExportFilters(filters: HistoryFilters) {
  const rating = filters.rating.trim();
  const minRiskLevel = filters.slaRisk.trim();
  return {
    ...(filters.threadType !== "all" ? { threadType: filters.threadType } : {}),
    ...(filters.from ? { from: filters.from } : {}),
    ...(filters.to ? { to: filters.to } : {}),
    ...(filters.conversationId ? { conversationId: filters.conversationId } : {}),
    ...(filters.customerId ? { customerId: filters.customerId } : {}),
    ...(filters.customerUserId ? { customerUserId: filters.customerUserId } : {}),
    ...(filters.visitorUserId ? { visitorUserId: filters.visitorUserId } : {}),
    ...(filters.senderUserId ? { senderUserId: filters.senderUserId } : {}),
    ...(filters.keyword ? { keyword: filters.keyword } : {}),
    ...(filters.staffUserId ? { staffUserId: filters.staffUserId } : {}),
    ...(filters.assignedStaffUserId ? { assignedStaffUserId: filters.assignedStaffUserId } : {}),
    ...(filters.locale ? { locale: filters.locale } : {}),
    ...(filters.sourcePlatform ? { sourcePlatform: filters.sourcePlatform } : {}),
    ...(filters.country ? { country: filters.country } : {}),
    ...(filters.region ? { region: filters.region } : {}),
    ...(rating ? { minRating: rating, maxRating: rating } : {}),
    ...(minRiskLevel ? { minRiskLevel } : {}),
  };
}

function sortHistoryExportTasks(tasks: ExportTaskDto[]) {
  return [...tasks].sort((left, right) => {
    const leftTime = new Date(left.createdAt || "").getTime();
    const rightTime = new Date(right.createdAt || "").getTime();
    return (Number.isFinite(rightTime) ? rightTime : 0) - (Number.isFinite(leftTime) ? leftTime : 0);
  });
}

function sourceChannelFilterLabel(value: string) {
  const normalized = value.trim().toLowerCase();
  if (!normalized) return "未知渠道";
  if (normalized.includes("temp-chat-widget")) return "网页小组件";
  if (normalized.includes("widget")) return "网页小组件";
  if (normalized.includes("codex-script")) return "脚本接入";
  if (normalized.includes("cli-temp")) return "临时链路";
  if (normalized.includes("wechat") || normalized.includes("weixin")) return "微信";
  if (normalized.includes("douyin") || normalized.includes("tiktok")) return "抖音";
  if (normalized.includes("app")) return "自有 App";
  const label = channelLabel(value);
  return label === value ? "其他渠道" : label;
}

function sourcePlatformLabel(value: string) {
  const normalized = value.trim().toLowerCase();
  if (!normalized) return "未知平台";
  if (normalized === "web" || normalized === "h5" || normalized.includes("browser")) return "网页端";
  if (normalized === "app" || normalized.includes("mobile")) return "移动 App";
  if (normalized.includes("desktop") || normalized.includes("pc")) return "PC 端";
  if (normalized.includes("wechat") || normalized.includes("weixin")) return "微信";
  if (normalized.includes("douyin") || normalized.includes("tiktok")) return "抖音";
  if (normalized.includes("cli")) return "命令行";
  return value;
}

function createHistorySummary(
  stats: CustomerServiceHistorySummary | null | undefined,
  threads: CustomerServiceThread[],
) {
  const topSource = topDistributionLabel(
    stats?.sourcePlatformDistribution ?? stats?.channelDistribution,
  );
  return [
    {
      label: "对话总量",
      value: numberLabel(stats?.totalSessions ?? threads.length),
      hint: "当前查询范围",
    },
    {
      label: "平均首响",
      value: durationLabel(stats?.avgFirstResponseSeconds),
      hint: "客户首次收到回复的平均等待",
    },
    {
      label: "平均处理时长",
      value: durationLabel(stats?.avgDurationSeconds),
      hint: "从进线到结束的平均耗时",
    },
    {
      label: "满意度评分",
      value: stats?.avgRating ? stats.avgRating.toFixed(2) : "--",
      hint: "客户评价平均分",
    },
    {
      label: "主要来源",
      value: topSource,
      hint: "占比最高的来源渠道",
    },
  ];
}

function readDetailMessages(detail: unknown): MessageItemDto[] {
  if (!detail || typeof detail !== "object") return [];
  const messages = (detail as { messages?: MessageItemDto[] }).messages;
  return Array.isArray(messages) ? messages : [];
}

function isVisibleHistoryMessage(message: MessageItemDto) {
  const status = String(message.status ?? "").trim().toLowerCase();
  return !message.isRecalled && status !== "recalled";
}

function filterMessagesByKeyword(messages: MessageItemDto[], keyword: string) {
  const normalized = keyword.trim().toLowerCase();
  if (!normalized) return messages;
  return messages.filter((message) => messageSearchText(message).includes(normalized));
}

function messageSearchText(message: MessageItemDto) {
  return [
    message.preview,
    message.senderDisplayName,
    message.messageType,
    typeof message.body?.text === "string" ? message.body.text : "",
    typeof message.body?.content === "string" ? message.body.content : "",
    typeof message.body?.caption === "string" ? message.body.caption : "",
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function topDistributionLabel(items?: Array<{ label: string; value: number }>) {
  const top = items?.slice().sort((a, b) => b.value - a.value)[0];
  return top ? `${top.label} ${top.value}` : "--";
}

function threadKey(thread?: CustomerServiceThread) {
  if (!thread) return "";
  return `${thread.threadType}:${thread.threadId}`;
}

function threadChannel(thread: CustomerServiceThread) {
  return (
    channelLabel(thread.sourceChannel || thread.channel || thread.source || thread.provider) ||
    (thread.threadType === "temp_session" ? "访客会话" : "IM 直聊")
  );
}

function threadTypeLabel(type?: string) {
  if (type === "temp_session") return "临时会话";
  if (type === "im_direct") return "IM 直聊";
  if (type === "direct_customer") return "客户直聊";
  return type || "--";
}

function riskLevelLabel(value: unknown) {
  const text = firstHistoryText(value).toLowerCase();
  if (!text) return "--";
  if (text === "0" || text === "normal" || text === "none") return "正常";
  if (text === "1" || text === "risk" || text === "warning") return "有风险";
  if (text === "2" || text === "breached" || text === "violation" || text === "overdue") return "已违约";
  return firstHistoryText(value);
}

function ratingLabel(value: unknown) {
  const rating = historyNumber(value);
  if (!rating) return "--";
  const rounded = Math.round(rating);
  if (rounded === 1) return "1分 · 极差";
  if (rounded === 2) return "2分 · 不满意";
  if (rounded === 3) return "3分 · 一般";
  if (rounded === 4) return "4分 · 满意";
  if (rounded === 5) return "5分 · 非常满意";
  return `${rating}分`;
}

function statusLabel(status?: string) {
  const normalized = String(status ?? "").trim().toLowerCase();
  if (!normalized) return "--";
  if (normalized.includes("timeout") || normalized === "7") return "超时关闭";
  if (normalized.includes("visitor") || normalized === "5") return "访客关闭";
  if (normalized.includes("staff") || normalized === "6") return "客服关闭";
  if (normalized.includes("system") || normalized === "8") return "系统关闭";
  if (normalized.startsWith("closed") || normalized === "9") return "已结束";
  if (normalized.includes("queue")) return "排队中";
  if (normalized.includes("active") || normalized.includes("serving")) return "接待中";
  if (normalized.includes("open")) return "未结束";
  return status ?? "--";
}

function formatThreadTime(thread: CustomerServiceThread) {
  return formatMonthDayTime(thread.updatedAt || thread.lastMessageAt || thread.assignedAt);
}

function shortThreadId(threadId: string) {
  if (!threadId) return "--";
  return threadId.length > 12 ? `${threadId.slice(0, 8)}...` : threadId;
}

function isMineHistoryMessage(message: MessageItemDto, session: ReturnType<typeof useAuthSession>) {
  if (message.isMine || message.isSelf) return true;
  const direction = String(message.direction ?? "").trim().toLowerCase();
  if (["out", "outbound", "sent", "staff", "agent"].includes(direction)) return true;
  const senderIds = [
    message.senderUserId,
    message.senderId,
    message.fromUserId,
    message.senderPlatformUserId,
    message.platformUserId,
    message.senderLppId,
    message.lppId,
  ].filter(Boolean);
  return [session?.userId, session?.platformUserId, session?.lppId].some(
    (id) => id && senderIds.includes(id),
  );
}

function durationLabel(seconds?: number | null) {
  if (!seconds || seconds <= 0) return "--";
  const minutes = Math.floor(seconds / 60);
  const remain = Math.round(seconds % 60);
  if (minutes <= 0) return `${remain}秒`;
  if (minutes < 60) return `${minutes}分${remain}秒`;
  const hours = Math.floor(minutes / 60);
  const restMinutes = minutes % 60;
  return `${hours}小时${restMinutes}分`;
}

function numberLabel(value?: number) {
  if (typeof value !== "number" || !Number.isFinite(value)) return "--";
  return value.toLocaleString();
}
