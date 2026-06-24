import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Download, RefreshCw } from "lucide-react";
import { useMemo, useState, type CSSProperties } from "react";
import type { DateRange } from "react-day-picker";

import type {
  ExportTaskDto,
  StaffChannelBreakdownDto,
  TempDistributionPointDto,
  TempSessionStatsDto,
} from "../data/api-client";
import { useAuthSession } from "../data/auth/auth-store";
import { pcQueryKeys } from "../data/query-keys";
import { createApiClient } from "../data/runtime";
import { resolveServicePerformanceStaff } from "../customer-service/models/servicePerformanceModel";
import { formatError } from "../lib/format";
import { CustomerServiceDateRangeFilter } from "./CustomerServiceDateRangeFilter";
import { CustomerServiceExportTaskDialog } from "./CustomerServiceExportTaskDialog";
import { PanelState } from "./PanelState";
import type {
  DataCenterReportComponentProps,
  DataCenterReportDefinition,
} from "./data-center/dataCenterReportTypes";

type ExportPreset =
  | "all"
  | "today"
  | "yesterday"
  | "last7"
  | "last30"
  | "thisWeek"
  | "lastWeek"
  | "thisMonth"
  | "lastMonth"
  | "custom";

type ExportRange = {
  from: string;
  preset: ExportPreset;
  to: string;
};

type ExportTaskFilters = Record<string, unknown>;

const exportPresets: Array<{ label: string; value: ExportPreset }> = [
  { label: "全部", value: "all" },
  { label: "今日", value: "today" },
  { label: "昨日", value: "yesterday" },
  { label: "近7天", value: "last7" },
  { label: "近30天", value: "last30" },
  { label: "本周", value: "thisWeek" },
  { label: "上周", value: "lastWeek" },
  { label: "本月", value: "thisMonth" },
  { label: "上月", value: "lastMonth" },
  { label: "自定义", value: "custom" },
];

export function CustomerServiceConversationStatsReport({
  dataCenterView,
  report,
}: DataCenterReportComponentProps) {
  const session = useAuthSession();
  const queryClient = useQueryClient();
  const client = useMemo(() => (session ? createApiClient(session) : null), [session]);
  const canReadTeamStats = dataCenterView !== "self-service";
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [statsRange, setStatsRange] = useState<ExportRange>(() => presetRange("today"));
  const [exportRange, setExportRange] = useState<ExportRange>(() => presetRange("today"));
  const [customDatePickerOpen, setCustomDatePickerOpen] = useState(false);
  const [exportDatePickerOpen, setExportDatePickerOpen] = useState(false);
  const [expandedStaffId, setExpandedStaffId] = useState<string | null>(null);
  const [exportNotice, setExportNotice] = useState("");
  const exportType = statsExportType(report);
  const statsParams = useMemo(() => statsExportFilters(statsRange), [statsRange]);
  const exportParams = useMemo(() => statsExportFilters(exportRange), [exportRange]);
  const exportTasksKey = useMemo(
    () => [
      ...pcQueryKeys.customerServiceExportTasks(
        session?.apiBaseUrl,
        session?.tenantToken,
      ),
      exportType,
    ],
    [exportType, session?.apiBaseUrl, session?.tenantToken],
  );

  const statsQuery = useQuery({
    queryKey: [
      ...pcQueryKeys.customerServiceTempSessionStats(
        session?.apiBaseUrl,
        session?.tenantToken,
      ),
      statsParams,
    ],
    enabled: Boolean(client && canReadTeamStats),
    queryFn: () => client!.getTempSessionStats(statsParams),
    staleTime: 60_000,
  });
  const exportStatsQuery = useQuery({
    queryKey: [
      ...pcQueryKeys.customerServiceTempSessionStats(
        session?.apiBaseUrl,
        session?.tenantToken,
      ),
      exportParams,
      "export-preview",
    ],
    enabled: Boolean(client && canReadTeamStats && exportDialogOpen),
    queryFn: () => client!.getTempSessionStats(exportParams),
    staleTime: 10_000,
  });
  const exportSessionCount = safeNumber(exportStatsQuery.data?.totalSessions);
  const exportPreviewChecking =
    exportDialogOpen && (exportStatsQuery.isLoading || exportStatsQuery.isFetching);
  const exportCreateDisabledReason = !canReadTeamStats
    ? "当前账号无权导出"
    : !isExportRangeSubmittable(exportRange)
      ? "请选择有效的导出时间范围"
      : exportPreviewChecking
        ? "正在检查当前条件是否有数据"
        : exportStatsQuery.isError
          ? "当前条件数据检查失败"
          : exportSessionCount <= 0
            ? "当前条件没有可导出的数据"
            : undefined;
  const exportCreateText = exportPreviewChecking
    ? "检查数据中"
    : exportStatsQuery.isError
      ? "无法检查数据"
      : exportSessionCount <= 0
        ? "无数据可导出"
        : "创建导出任务";

  const exportTasksQuery = useQuery({
    queryKey: exportTasksKey,
    enabled: Boolean(client && canReadTeamStats && exportDialogOpen),
    queryFn: () => client!.getCustomerServiceExportTasks({ exportType }),
    refetchInterval: (query) =>
      query.state.data?.some((task) => isExportTaskRunning(task.status)) ? 5000 : false,
    staleTime: 15_000,
  });

  const exportMutation = useMutation({
    mutationFn: async (exportFilters: ExportTaskFilters) => {
      if (!client) throw new Error("API client is not ready");
      if (!canReadTeamStats) throw new Error("当前账号无权查看团队统计数据");
      if (exportSessionCount <= 0) throw new Error("当前条件没有可导出的数据");
      return client.createCustomerServiceExportTask({
        exportType,
        filters: exportFilters,
      });
    },
    onSuccess: (task) => {
      const taskId = task.taskId || "";
      setExportNotice(taskId ? `报表导出任务已创建：${taskId}` : "报表导出任务已创建");
      void queryClient.invalidateQueries({ queryKey: exportTasksKey });
    },
    onError: (error) => {
      setExportNotice(`报表导出失败：${formatError(error)}`);
    },
  });

  const downloadMutation = useMutation({
    mutationFn: async (task: ExportTaskDto) => {
      if (!client) throw new Error("API client is not ready");
      const taskId = exportTaskId(task);
      if (!taskId) throw new Error("导出任务缺少 taskId");
      const file = await client.downloadCustomerServiceExportTask(taskId);
      const fileName = file.fileName || task.fileName || `${taskId}.csv`;
      const savedPath = await saveExportFile(file.blob, fileName);
      return { savedPath, taskId };
    },
    onSuccess: ({ savedPath, taskId }) => {
      setExportNotice(savedPath ? `导出文件已保存并打开目录：${savedPath}` : `导出文件已开始下载：${taskId}`);
    },
    onError: (error) => {
      setExportNotice(`导出文件下载失败：${formatError(error)}`);
    },
  });

  const model = createConversationStatsModel(statsQuery.data, statsRange);
  const isExportDisabled = !client || !canReadTeamStats || exportMutation.isPending;
  const selectedStatsDateRange = useMemo<DateRange>(
    () => ({
      from: parseStatsDate(statsRange.from),
      to: parseStatsDate(statsRange.to),
    }),
    [statsRange.from, statsRange.to],
  );
  const selectedExportDateRange = useMemo<DateRange>(
    () => ({
      from: parseStatsDate(exportRange.from),
      to: parseStatsDate(exportRange.to),
    }),
    [exportRange.from, exportRange.to],
  );
  const customStatsFromTime = statsTimePart(statsRange.from, "00:00:00");
  const customStatsToTime = statsTimePart(statsRange.to, "23:59:59");
  const customExportFromTime = statsTimePart(exportRange.from, "00:00:00");
  const customExportToTime = statsTimePart(exportRange.to, "23:59:59");
  const applyStatsPreset = (preset: ExportPreset) => {
    setCustomDatePickerOpen(preset === "custom");
    setStatsRange(presetRange(preset, statsRange));
  };
  const applyCustomStatsDateRange = (range: DateRange | undefined) => {
    setStatsRange((current) => ({
      from: formatStatsDateTime(range?.from, statsTimePart(current.from, "00:00:00")),
      preset: "custom",
      to: formatStatsDateTime(range?.to, statsTimePart(current.to, "23:59:59")),
    }));
  };
  const updateCustomStatsDateTime = (side: "from" | "to", time: string) => {
    setStatsRange((current) => {
      const date = parseStatsDate(current[side]);
      return {
        ...current,
        preset: "custom",
        [side]: formatStatsDateTime(date, normalizeStatsTime(time, side === "from" ? "00:00:00" : "23:59:59")),
      };
    });
  };
  const applyExportPreset = (preset: ExportPreset) => {
    setExportDatePickerOpen(preset === "custom");
    setExportRange(presetRange(preset, exportRange));
  };
  const applyCustomExportDateRange = (range: DateRange | undefined) => {
    setExportRange((current) => ({
      from: formatStatsDateTime(range?.from, statsTimePart(current.from, "00:00:00")),
      preset: "custom",
      to: formatStatsDateTime(range?.to, statsTimePart(current.to, "23:59:59")),
    }));
  };
  const updateCustomExportDateTime = (side: "from" | "to", time: string) => {
    setExportRange((current) => {
      const date = parseStatsDate(current[side]);
      return {
        ...current,
        preset: "custom",
        [side]: formatStatsDateTime(date, normalizeStatsTime(time, side === "from" ? "00:00:00" : "23:59:59")),
      };
    });
  };

  return (
    <section className="cs-stats-page data-center-report-content">
      <header className="cs-stats-toolbar">
        <div className="cs-stats-title">
          <h1>统计对话</h1>
        </div>
        <div className="cs-stats-range-inline" aria-label="统计日期范围">
          <StatsDateRangeFilter
            pickerOpen={customDatePickerOpen}
            preset={statsRange.preset}
            range={selectedStatsDateRange}
            fromTime={customStatsFromTime}
            toTime={customStatsToTime}
            onPickerOpenChange={setCustomDatePickerOpen}
            onPresetChange={applyStatsPreset}
            onRangeChange={applyCustomStatsDateRange}
            onTimeChange={updateCustomStatsDateTime}
          />
        </div>
        <div className="cs-stats-actions">
          <button
            type="button"
            onClick={() => statsQuery.refetch()}
            disabled={!canReadTeamStats || statsQuery.isFetching}
          >
            <RefreshCw size={15} />
            {statsQuery.isFetching ? "刷新中" : "刷新"}
          </button>
          <button
            type="button"
            className="primary"
            onClick={() => {
              setExportRange(statsRange);
              setExportDatePickerOpen(false);
              setExportDialogOpen(true);
            }}
            disabled={isExportDisabled}
          >
            <Download size={15} />
            导出
          </button>
        </div>
      </header>

      {!canReadTeamStats && <PanelState text="当前账号无权查看团队统计数据。" />}

      {canReadTeamStats && (
        <>
          <section className="cs-stats-kpi-grid" aria-label="统计对话核心指标">
            {model.kpis.map((item) => (
              <article key={item.label}>
                <span>{item.label}</span>
                <strong>{item.value}</strong>
                <small>{item.hint}</small>
              </article>
            ))}
          </section>

          <section className="cs-stats-console">
            <section className="cs-stats-trend-panel">
              <header>
                <div>
                  <h2>对话量趋势</h2>
                  <p>按所选日期范围返回的趋势点展示。</p>
                </div>
                <div className="cs-stats-trend-head-actions">
                  {!statsQuery.isLoading && !statsQuery.isError && <ConversationTrendSummary items={model.trend} />}
                </div>
              </header>
              {statsQuery.isError && (
                <PanelState tone="error" text={`统计数据加载失败：${formatError(statsQuery.error)}`} />
              )}
              {!statsQuery.isError && statsQuery.isLoading && <PanelState text="正在加载统计数据..." />}
              {!statsQuery.isLoading && !statsQuery.isError && (
                <ConversationTrendChart items={model.trend} />
              )}
            </section>

            <section className="cs-stats-staff-panel">
              <header>
                <div>
                  <h2>坐席效率</h2>
                  <p>按客服聚合接待量、首响、处理时长和评分，支持按渠道展开。</p>
                </div>
              </header>
              {model.staffRows.length === 0 ? (
                <PanelState text="暂无坐席效率数据。请确认所选日期内有已接待会话，或通过下方导出任务下载坐席日报。" />
              ) : (
                <div className="cs-stats-staff-table" role="table" aria-label="坐席效率">
                  <div className="cs-stats-staff-row heading" role="row">
                    <span>客服</span>
                    <span>接待</span>
                    <span>首响</span>
                    <span>处理</span>
                    <span>评分</span>
                    <span>优秀率</span>
                    <span>渠道</span>
                  </div>
                  {model.staffRows.map((row) => {
                    const expanded = expandedStaffId === row.staffUserId;
                    return (
                      <div className="cs-stats-staff-group" key={row.staffUserId}>
                        <div className="cs-stats-staff-row" role="row">
                          <strong>{row.displayName}</strong>
                          <span>{row.sessionsServed}</span>
                          <span>{row.avgFirstResponse}</span>
                          <span>{row.avgDuration}</span>
                          <span>{row.avgRating}</span>
                          <span>{row.excellentRate}</span>
                          <button
                            type="button"
                            disabled={row.channelRows.length === 0}
                            onClick={() => setExpandedStaffId(expanded ? null : row.staffUserId)}
                          >
                            {row.channelRows.length ? (expanded ? "收起" : "展开") : "--"}
                          </button>
                        </div>
                        {expanded && (
                          <div className="cs-stats-channel-breakdown">
                            {row.channelRows.map((channel) => (
                              <div className="cs-stats-channel-row" key={channel.channel}>
                                <span>{channel.channel}</span>
                                <span>{channel.sessionsServed}</span>
                                <span>{channel.avgFirstResponse}</span>
                                <span>{channel.avgDuration}</span>
                                <span>{channel.avgRating}</span>
                                <span>{channel.excellentRate}</span>
                                <span />
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </section>

            <aside className="cs-stats-side-panel">
              <DistributionPanel
                emptyText="接口未返回 channelDistribution，暂无来源渠道分布。"
                items={model.channelDistribution}
                variant="pie"
                title="来源渠道"
              />
              <DistributionPanel
                emptyText="接口未返回 categoryDistribution，暂无会话分类分布。"
                items={model.categoryDistribution}
                variant="pie"
                title="会话分类"
              />
            </aside>
          </section>
        </>
      )}

      {exportDialogOpen && (
        <CustomerServiceExportTaskDialog
          title="导出统计对话"
          conditionEditor={(createAction) => (
            <div className="cs-stats-export-condition-editor stats">
              <StatsDateRangeFilter
                pickerOpen={exportDatePickerOpen}
                preset={exportRange.preset}
                range={selectedExportDateRange}
                fromTime={customExportFromTime}
                toTime={customExportToTime}
                onPickerOpenChange={setExportDatePickerOpen}
                onPresetChange={applyExportPreset}
                onRangeChange={applyCustomExportDateRange}
                onTimeChange={updateCustomExportDateTime}
              />
              <div className="cs-stats-export-form-actions inline">
                {createAction}
              </div>
            </div>
          )}
          notice={exportNotice}
          tasks={sortExportTasks(exportTasksQuery.data ?? []).map((task) => {
            const taskId = exportTaskId(task);
            const status = task.status || "--";
            return {
              canDownload: isExportTaskCompleted(status) && Boolean(taskId),
              completedAtLabel: task.completedAt ? dateTimeLabel(task.completedAt) : undefined,
              createdAtLabel: dateTimeLabel(task.createdAt),
              key: taskId || `${task.exportType}-${task.createdAt}`,
              payload: task,
              recordCountLabel: exportRecordCountLabel(task.recordCount),
              status,
              statusLabel: exportTaskStatusLabel(status),
              title: task.fileName || exportTaskTitle(task),
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
          onCreate={() => exportMutation.mutate(exportParams)}
          onDownload={(task) => downloadMutation.mutate(task.payload as ExportTaskDto)}
        />
      )}
    </section>
  );
}

function DistributionPanel({
  emptyText,
  items,
  title,
  variant = "bars",
}: {
  emptyText: string;
  items: TempDistributionPointDto[];
  title: string;
  variant?: "bars" | "pie";
}) {
  return (
    <section>
      <h2>{title}</h2>
      {items.length === 0 ? (
        <PanelState text={emptyText} />
      ) : variant === "pie" ? (
        <DistributionPieChart items={items} />
      ) : (
        <div className="cs-stats-bars compact">
          {distributionRows(items).map((item) => (
            <div key={item.label}>
              <span>{item.label}</span>
              <b style={{ width: `${item.percent}%` }} />
              <em>{item.value}</em>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function ConversationTrendSummary({ items }: { items: TempDistributionPointDto[] }) {
  const rows = items.length ? items : [{ label: "当前统计", value: 0 }];
  const values = rows.map((item) => safeNumber(item.value));
  const total = values.reduce((sum, value) => sum + value, 0);
  const average = rows.length ? total / rows.length : 0;
  const peak = rows.reduce(
    (current, item) => (safeNumber(item.value) > safeNumber(current.value) ? item : current),
    rows[0] ?? { label: "--", value: 0 },
  );

  return (
    <div className="cs-stats-trend-summary" aria-label="趋势统计摘要">
      <span>总量 {numberLabel(total)}</span>
      <span>峰值 {peak.label || "--"} · {numberLabel(peak.value)}</span>
      <span>均值 {numberLabel(Math.round(average))}</span>
    </div>
  );
}

function ConversationTrendChart({ items }: { items: TempDistributionPointDto[] }) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const rows = items.length ? items : [{ label: "当前统计", value: 0 }];
  const values = rows.map((item) => safeNumber(item.value));
  const rawMax = Math.max(...values, 0);
  const max = Math.max(Math.ceil(rawMax * 1.18), 1);
  const total = values.reduce((sum, value) => sum + value, 0);
  const average = rows.length ? total / rows.length : 0;
  const chart = {
    bottom: 220,
    height: 252,
    left: 44,
    right: 34,
    top: 20,
    width: 1280,
  };
  const plotWidth = chart.width - chart.left - chart.right;
  const plotHeight = chart.bottom - chart.top;
  const step = rows.length > 1 ? plotWidth / (rows.length - 1) : 0;
  const barWidth = Math.max(6, Math.min(20, plotWidth / Math.max(rows.length * 2.2, 1)));
  const labelStride = Math.max(1, Math.ceil(rows.length / 10));
  const valueToY = (value: number) => chart.top + (1 - value / max) * plotHeight;
  const tickValues = [max, Math.round(max / 2), 0];
  const points = rows.map((item, index) => {
    const value = safeNumber(item.value);
    const x = rows.length > 1 ? chart.left + step * index : chart.left + plotWidth / 2;
    const y = valueToY(value);
    return {
      barHeight: Math.max(value > 0 ? 3 : 0, chart.bottom - y),
      index,
      isPeak: rawMax > 0 && value === rawMax,
      isZero: value === 0,
      label: item.label || "--",
      showLabel: index === 0 || index === rows.length - 1 || index % labelStride === 0,
      value,
      x,
      y,
    };
  });
  const linePoints = points.map((point) => `${point.x},${point.y}`).join(" ");
  const areaPoints =
    points.length > 0
      ? `${chart.left},${chart.bottom} ${linePoints} ${chart.width - chart.right},${chart.bottom}`
      : "";
  const activePoint = hoveredIndex === null ? null : points[hoveredIndex];
  const tooltipWidth = 104;
  const tooltipHeight = 46;
  const tooltipX = activePoint
    ? Math.min(Math.max(activePoint.x - tooltipWidth / 2, 6), chart.width - tooltipWidth - 6)
    : 0;
  const tooltipY = activePoint
    ? Math.max(chart.top + 4, activePoint.y - tooltipHeight - 12)
    : 0;
  const hitWidth = rows.length > 1 ? Math.max(16, step) : plotWidth;
  const averageY = valueToY(average);

  return (
    <div className="cs-stats-trend-chart" onMouseLeave={() => setHoveredIndex(null)}>
      <svg
        className="cs-stats-trend-svg"
        viewBox={`0 0 ${chart.width} ${chart.height}`}
        role="img"
        aria-label="对话量趋势柱状折线图"
      >
        <defs>
          <linearGradient id="cs-stats-trend-area" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#10b981" stopOpacity="0.18" />
            <stop offset="100%" stopColor="#10b981" stopOpacity="0.02" />
          </linearGradient>
        </defs>
        {tickValues.map((tickValue) => {
          const y = valueToY(tickValue);
          return (
            <g key={`tick-${tickValue}`}>
              <line
                className={tickValue === 0 ? "cs-stats-trend-axis" : "cs-stats-trend-grid"}
                x1={chart.left}
                x2={chart.width - chart.right}
                y1={y}
                y2={y}
              />
              <text
                className="cs-stats-trend-y-label"
                textAnchor="end"
                x={chart.left - 10}
                y={y + 3}
              >
                {numberLabel(tickValue)}
              </text>
            </g>
          );
        })}
        {rawMax > 0 && (
          <line
            className="cs-stats-trend-average"
            x1={chart.left}
            x2={chart.width - chart.right}
            y1={averageY}
            y2={averageY}
          />
        )}
        <line
          className="cs-stats-trend-axis"
          x1={chart.left}
          x2={chart.width - chart.right}
          y1={chart.bottom}
          y2={chart.bottom}
        />
        {areaPoints && <polygon className="cs-stats-trend-area" points={areaPoints} />}
        {points.map((point) => (
          <rect
            className="cs-stats-trend-bar"
            height={point.barHeight}
            key={`bar-${point.label}`}
            rx="4"
            width={barWidth}
            x={point.x - barWidth / 2}
            y={chart.bottom - point.barHeight}
          >
            <title>{`${point.label}：${numberLabel(point.value)}`}</title>
          </rect>
        ))}
        {points.length > 1 && <polyline className="cs-stats-trend-line" points={linePoints} />}
        {points.map((point) => (
          <circle
            className={[
              "cs-stats-trend-point",
              point.isZero ? "zero" : "",
              point.isPeak ? "peak" : "",
            ].filter(Boolean).join(" ")}
            cx={point.x}
            cy={point.y}
            key={`point-${point.label}`}
            r={point.isPeak ? 4.8 : point.isZero ? 2.4 : 3.6}
          >
            <title>{`${point.label}：${numberLabel(point.value)}`}</title>
          </circle>
        ))}
        {activePoint && (
          <>
            <line
              className="cs-stats-trend-cursor"
              x1={activePoint.x}
              x2={activePoint.x}
              y1={chart.top}
              y2={chart.bottom}
            />
            <circle
              className="cs-stats-trend-point active"
              cx={activePoint.x}
              cy={activePoint.y}
              r="5"
            />
            <g className="cs-stats-trend-tooltip" transform={`translate(${tooltipX} ${tooltipY})`}>
              <rect width={tooltipWidth} height={tooltipHeight} rx="7" />
              <text x="10" y="18">{activePoint.label}</text>
              <text className="value" x="10" y="35">{numberLabel(activePoint.value)} 次</text>
            </g>
          </>
        )}
        {points.filter((point) => point.showLabel).map((point) => (
          <text
            className="cs-stats-trend-label"
            key={`label-${point.label}`}
            textAnchor="middle"
            x={point.x}
            y={chart.bottom + 18}
          >
            {point.label}
          </text>
        ))}
        {points.map((point) => (
          <rect
            className="cs-stats-trend-hit"
            key={`hit-${point.label}-${point.index}`}
            x={point.x - hitWidth / 2}
            y={chart.top}
            width={hitWidth}
            height={chart.bottom - chart.top}
            onMouseEnter={() => setHoveredIndex(point.index)}
            onMouseMove={() => setHoveredIndex(point.index)}
          />
        ))}
      </svg>
    </div>
  );
}

function DistributionPieChart({ items }: { items: TempDistributionPointDto[] }) {
  const rows = pieDistributionRows(items);
  const total = rows.reduce((sum, row) => sum + row.value, 0);
  const gradient =
    total > 0
      ? rows
          .reduce(
            (parts, row) => {
              const start = parts.cursor;
              const end = start + (row.value / total) * 360;
              return {
                cursor: end,
                segments: [
                  ...parts.segments,
                  `${row.color} ${start.toFixed(2)}deg ${end.toFixed(2)}deg`,
                ],
              };
            },
            { cursor: 0, segments: [] as string[] },
          )
          .segments.join(", ")
      : "#e2e8f0 0deg 360deg";
  return (
    <div className="cs-stats-pie-panel">
      <div
        className="cs-stats-pie"
        aria-hidden="true"
        style={{ "--cs-stats-pie": `conic-gradient(${gradient})` } as CSSProperties}
      >
        <span>{numberLabel(total)}</span>
      </div>
      <div className="cs-stats-pie-legend">
        {rows.map((row) => (
          <div key={row.label}>
            <i style={{ background: row.color }} />
            <span>{row.label}</span>
            <strong>{numberLabel(row.value)} · {row.percent}%</strong>
          </div>
        ))}
      </div>
    </div>
  );
}

function StatsDateRangeFilter(props: {
  fromTime: string;
  onPickerOpenChange: (open: boolean) => void;
  onPresetChange: (preset: ExportPreset) => void;
  onRangeChange: (range: DateRange | undefined) => void;
  onTimeChange: (side: "from" | "to", time: string) => void;
  pickerOpen: boolean;
  preset: ExportPreset;
  range: DateRange;
  toTime: string;
}) {
  return (
    <CustomerServiceDateRangeFilter
      {...props}
      className="cs-stats-date-filter"
      presetOptions={exportPresets}
      rangeLabel={statsDateRangeLabel}
    />
  );
}

function createConversationStatsModel(stats?: TempSessionStatsDto, rangeFilter?: ExportRange) {
  const sessionTrend = filterTrendByRange(stats?.sessionTrend ?? [], rangeFilter);
  const trend = sessionTrend.length
    ? sessionTrend
    : [{ label: "当前统计", value: safeNumber(stats?.totalSessions) }];
  return {
    categoryDistribution: stats?.categoryDistribution ?? [],
    channelDistribution: stats?.channelDistribution ?? [],
    kpis: [
      {
        hint: "统计接口返回的全部会话",
        label: "对话总量",
        value: numberLabel(stats?.totalSessions),
      },
      {
        hint: "已被客服接待",
        label: "已接待",
        value: numberLabel(stats?.totalServed),
      },
      {
        hint: "当前排队中",
        label: "排队中",
        value: numberLabel(stats?.totalQueued),
      },
      {
        hint: "客户放弃或未完成",
        label: "放弃会话",
        value: numberLabel(stats?.totalAbandoned),
      },
      {
        hint: "进入队列后的平均等待",
        label: "平均等待",
        value: durationLabel(stats?.avgWaitSeconds),
      },
      {
        hint: "首次人工回复等待",
        label: "平均首响",
        value: durationLabel(stats?.avgFirstResponseSeconds),
      },
      {
        hint: "结束会话平均处理",
        label: "平均处理",
        value: durationLabel(stats?.avgDurationSeconds),
      },
      {
        hint: "客户评价平均分",
        label: "满意度",
        value: ratingLabel(stats?.avgRating),
      },
    ],
    staffRows: [...resolveServicePerformanceStaff(stats)]
      .sort((left, right) => safeNumber(right.sessionsServed) - safeNumber(left.sessionsServed))
      .map((staff) => ({
        avgDuration: durationLabel(staff.avgDurationSeconds),
        avgFirstResponse: durationLabel(staff.avgFirstResponseSeconds),
        avgRating: ratingLabel(staff.avgRating),
        channelRows: channelRows(staff.byChannel),
        displayName: staff.displayName || staff.staffUserId || "--",
        excellentRate: percentLabel(staff.excellentRate),
        sessionsServed: numberLabel(staff.sessionsServed),
        staffUserId: staff.staffUserId || staff.displayName,
      })),
    trend,
  };
}

function channelRows(items?: StaffChannelBreakdownDto[]) {
  return (items ?? []).map((item) => ({
    avgDuration: durationLabel(item.avgDurationSeconds),
    avgFirstResponse: durationLabel(item.avgFirstResponseSeconds),
    avgRating: ratingLabel(item.avgRating),
    channel: channelName(item.channel),
    excellentRate: percentLabel(item.excellentRate),
    sessionsServed: numberLabel(item.sessionsServed),
  }));
}

function statsExportType(report: DataCenterReportDefinition): "cs_staff_daily_stats" {
  return report.exportTypes.includes("cs_staff_daily_stats")
    ? "cs_staff_daily_stats"
    : "cs_staff_daily_stats";
}

function exportTaskId(task: ExportTaskDto) {
  return task.taskId || "";
}

function exportTaskTitle(task: ExportTaskDto) {
  return task.exportType === "cs_staff_daily_stats" ? "坐席日报统计" : task.exportType || "导出任务";
}

function exportRecordCountLabel(value?: number | null) {
  return typeof value === "number" && Number.isFinite(value) ? `${value} 条` : undefined;
}

function sortExportTasks(tasks: ExportTaskDto[]) {
  return [...tasks].sort((left, right) => {
    const leftTime = new Date(left.createdAt || "").getTime();
    const rightTime = new Date(right.createdAt || "").getTime();
    return (Number.isFinite(rightTime) ? rightTime : 0) - (Number.isFinite(leftTime) ? leftTime : 0);
  });
}

function isExportTaskRunning(status?: string | null) {
  const normalized = (status || "").toLowerCase();
  return normalized === "pending" || normalized === "processing";
}

function isExportTaskCompleted(status?: string | null) {
  return (status || "").toLowerCase() === "completed";
}

function exportTaskStatusLabel(status?: string | null) {
  const normalized = (status || "").toLowerCase();
  if (normalized === "pending") return "排队中";
  if (normalized === "processing") return "生成中";
  if (normalized === "completed") return "已完成";
  if (normalized === "failed") return "失败";
  return status || "--";
}

function dateTimeLabel(value?: string | null) {
  if (!value) return "--";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}

async function saveExportFile(blob: Blob, fileName: string) {
  const desktopApi = typeof window !== "undefined" ? window.desktopApi : undefined;
  if (desktopApi?.saveAndRevealFile) {
    return desktopApi.saveAndRevealFile({
      bytes: await blob.arrayBuffer(),
      defaultName: fileName,
      filters: [{ name: "CSV", extensions: ["csv"] }],
    });
  }
  triggerBrowserDownload(blob, fileName);
  return null;
}

function triggerBrowserDownload(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function statsExportFilters(input: ExportRange) {
  if (input.preset === "all") return {};
  return {
    ...(input.from ? { from: input.from } : {}),
    ...(input.to ? { to: input.to } : {}),
  };
}

function isExportRangeSubmittable(input: ExportRange) {
  return input.preset === "all" || Boolean(input.from && input.to);
}

function distributionRows(items: TempDistributionPointDto[]) {
  const rows = items.length ? items : [{ label: "暂无数据", value: 0 }];
  const total = rows.reduce((sum, item) => sum + safeNumber(item.value), 0);
  const max = Math.max(...rows.map((item) => safeNumber(item.value)), 1);
  return rows.map((item) => {
    const value = safeNumber(item.value);
    const percent = total > 0 ? Math.round((value / total) * 100) : 0;
    return {
      label: item.label || "--",
      percent: Math.max(6, Math.round((value / max) * 100)),
      value: `${numberLabel(value)}${total > 0 ? ` · ${percent}%` : ""}`,
    };
  });
}

function pieDistributionRows(items: TempDistributionPointDto[]) {
  const colors = ["#10b981", "#2563eb", "#f59e0b", "#ef4444", "#8b5cf6", "#64748b"];
  const sorted = items
    .map((item) => ({
      label: item.label || "--",
      value: safeNumber(item.value),
    }))
    .filter((item) => item.value > 0)
    .sort((left, right) => right.value - left.value);
  const visible = sorted.slice(0, 5);
  const rest = sorted.slice(5).reduce((sum, item) => sum + item.value, 0);
  const rows = rest > 0 ? [...visible, { label: "其他", value: rest }] : visible;
  const total = rows.reduce((sum, item) => sum + item.value, 0);
  return rows.map((item, index) => ({
    ...item,
    color: colors[index % colors.length],
    percent: total > 0 ? Math.round((item.value / total) * 100) : 0,
  }));
}

function filterTrendByRange(items: TempDistributionPointDto[], rangeFilter?: ExportRange) {
  if (!rangeFilter?.from || !rangeFilter.to || items.length === 0) return items;
  const from = parseStatsDate(rangeFilter.from);
  const to = parseStatsDate(rangeFilter.to);
  if (!from || !to) return items;
  const fromTime = startOfDay(from).getTime();
  const toTime = startOfDay(to).getTime();
  let parsedAny = false;
  const valuesByDate = new Map<string, number>();
  const passthroughItems: TempDistributionPointDto[] = [];
  items.forEach((item) => {
    const date = parseTrendPointDate(item.label, from, to);
    if (!date) {
      passthroughItems.push(item);
      return;
    }
    parsedAny = true;
    const time = date.getTime();
    if (time < fromTime || time > toTime) return;
    const key = dateInputValue(date);
    valuesByDate.set(key, (valuesByDate.get(key) ?? 0) + safeNumber(item.value));
  });
  if (!parsedAny) return items;
  return [
    ...trendRangeDays(from, to).map((date) => {
      const key = dateInputValue(date);
      return {
        label: trendDateLabel(date),
        value: valuesByDate.get(key) ?? 0,
      };
    }),
    ...passthroughItems,
  ];
}

function trendRangeDays(from: Date, to: Date) {
  const days: Date[] = [];
  let cursor = startOfDay(from);
  const endTime = startOfDay(to).getTime();
  while (cursor.getTime() <= endTime) {
    days.push(cursor);
    cursor = addDays(cursor, 1);
  }
  return days;
}

function trendDateLabel(date: Date) {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${month}-${day}`;
}

function parseTrendPointDate(label: string | undefined, from: Date, to: Date) {
  const text = (label || "").trim();
  const fullDateMatch = text.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (fullDateMatch) {
    return parseTrendDateParts(
      Number(fullDateMatch[1]),
      Number(fullDateMatch[2]),
      Number(fullDateMatch[3]),
    );
  }
  const shortDateMatch = text.match(/^(\d{1,2})-(\d{1,2})$/);
  if (!shortDateMatch) return undefined;
  const month = Number(shortDateMatch[1]);
  const day = Number(shortDateMatch[2]);
  const candidateYears = Array.from(new Set([from.getFullYear(), to.getFullYear()]));
  const candidates = candidateYears
    .map((year) => parseTrendDateParts(year, month, day))
    .filter((date): date is Date => Boolean(date));
  return (
    candidates.find((date) => date >= startOfDay(from) && date <= startOfDay(to)) ??
    candidates[0]
  );
}

function parseTrendDateParts(year: number, month: number, day: number) {
  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) return undefined;
  const date = new Date(year, month - 1, day);
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return undefined;
  }
  return startOfDay(date);
}

function presetRange(preset: ExportPreset, current?: ExportRange): ExportRange {
  const today = startOfDay(new Date());
  if (preset === "all") return { from: "", preset: "all", to: "" };
  if (preset === "custom" && current) return { ...current, preset: "custom" };
  if (preset === "yesterday") {
    const day = addDays(today, -1);
    return range(preset, day, day);
  }
  if (preset === "last7") return range(preset, addDays(today, -6), today);
  if (preset === "last30") return range(preset, addDays(today, -29), today);
  if (preset === "thisWeek") return range(preset, startOfWeek(today), today);
  if (preset === "lastWeek") {
    const end = addDays(startOfWeek(today), -1);
    return range(preset, startOfWeek(end), end);
  }
  if (preset === "thisMonth") return range(preset, startOfMonth(today), today);
  if (preset === "lastMonth") {
    const end = addDays(startOfMonth(today), -1);
    return range(preset, startOfMonth(end), end);
  }
  return range("today", today, today);
}

function range(preset: ExportPreset, from: Date, to: Date): ExportRange {
  return {
    from: formatStatsDateTime(from, "00:00:00"),
    preset,
    to: formatStatsDateTime(to, "23:59:59"),
  };
}

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function startOfWeek(date: Date) {
  const day = date.getDay() || 7;
  return addDays(startOfDay(date), 1 - day);
}

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function dateInputValue(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseStatsDate(value: string) {
  if (!value) return undefined;
  const [dateText] = value.trim().split(/[T ]/);
  const [yearText, monthText, dayText] = dateText.split("-");
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) return undefined;
  return new Date(year, month - 1, day);
}

function formatStatsDateTime(date: Date | undefined, time: string) {
  if (!date) return "";
  return `${dateInputValue(date)}T${normalizeStatsTime(time, "00:00:00")}`;
}

function statsTimePart(value: string, fallback: string) {
  const time = value.includes("T") ? value.split("T")[1] : value.split(" ")[1];
  return normalizeStatsTime(time || "", fallback);
}

function normalizeStatsTime(value: string, fallback: string) {
  const [hour = "", minute = "", second = ""] = value.split(":");
  const h = normalizeStatsTimeUnit(hour, 23);
  const m = normalizeStatsTimeUnit(minute, 59);
  const s = normalizeStatsTimeUnit(second, 59);
  if (h === null || m === null || s === null) return fallback;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function normalizeStatsTimeUnit(value: string, max: number) {
  const number = Number(value);
  if (!Number.isInteger(number) || number < 0 || number > max) return null;
  return number;
}

function statsDateRangeLabel(range: DateRange, fromTime: string, toTime: string) {
  const from = range.from ? formatStatsDateTime(range.from, fromTime).replace("T", " ") : "";
  const to = range.to ? formatStatsDateTime(range.to, toTime).replace("T", " ") : "";
  if (from && to) return `${from} ~ ${to}`;
  if (from) return `${from} ~ 结束时间`;
  return "选择日期范围";
}

function channelName(channel?: string) {
  if (channel === "widget") return "访客会话";
  if (channel === "im_direct") return "IM 直聊";
  return channel || "--";
}

function durationLabel(seconds?: number) {
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

function ratingLabel(value?: number) {
  if (typeof value !== "number" || !Number.isFinite(value)) return "--";
  return value.toFixed(2);
}

function percentLabel(value?: number) {
  if (typeof value !== "number" || !Number.isFinite(value)) return "--";
  return `${Math.round(value * 100)}%`;
}

function safeNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}
