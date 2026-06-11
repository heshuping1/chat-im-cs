export type ServicePerformanceTranslate = (key: string) => string;

export interface ServicePerformanceDistributionPoint {
  label: string;
  value: number;
}

export interface ServicePerformanceChannelDto {
  channel: string;
  sessionsServed?: number;
  avgFirstResponseSeconds?: number;
  avgDurationSeconds?: number;
  avgRating?: number;
  excellentRate?: number;
}

export interface ServicePerformanceStaffDto {
  staffUserId: string;
  displayName: string;
  sessionsServed?: number;
  avgFirstResponseSeconds?: number;
  avgDurationSeconds?: number;
  avgRating?: number;
  excellentRate?: number;
  byChannel?: ServicePerformanceChannelDto[];
}

export interface ServicePerformanceStatsDto {
  totalSessions?: number;
  totalServed?: number;
  avgFirstResponseSeconds?: number;
  avgDurationSeconds?: number;
  channelDistribution?: ServicePerformanceDistributionPoint[];
  staffPerformance?: ServicePerformanceStaffDto[];
  staffStats?: ServicePerformanceStaffDto[];
  staffDailyStats?: ServicePerformanceStaffDto[];
  agentPerformance?: ServicePerformanceStaffDto[];
  agentStats?: ServicePerformanceStaffDto[];
  staff_performance?: ServicePerformanceStaffDto[];
  staff_stats?: ServicePerformanceStaffDto[];
  staff_daily_stats?: ServicePerformanceStaffDto[];
  agent_performance?: ServicePerformanceStaffDto[];
  agent_stats?: ServicePerformanceStaffDto[];
}

export interface ServicePerformanceKpi {
  key: string;
  labelKey: string;
  value: string;
}

export interface ServicePerformanceDistributionItem {
  label: string;
  value: string;
}

export interface ServicePerformanceChannelBreakdown {
  channel: "widget" | "im_direct";
  labelKey: string;
  sessionsServed: string;
  avgFirstResponse: string;
  avgDuration: string;
  avgRating: string;
  excellentRate: string;
}

export interface ServicePerformanceStaffRow {
  staffUserId: string;
  displayName: string;
  sessionsServed: string;
  avgFirstResponse: string;
  avgDuration: string;
  avgRating: string;
  excellentRate: string;
  channelBreakdown: ServicePerformanceChannelBreakdown[];
}

export interface ServicePerformanceModel {
  isEmpty: boolean;
  kpis: ServicePerformanceKpi[];
  channelDistribution: ServicePerformanceDistributionItem[];
  channelDistributionHint: string;
  staffRows: ServicePerformanceStaffRow[];
}

export interface CreateServicePerformanceModelInput {
  stats?: ServicePerformanceStatsDto;
  translate: ServicePerformanceTranslate;
}

const knownChannels = ["widget", "im_direct"] as const;

export function canViewTeamServicePerformance(input?: {
  membershipRole?: number;
} | null) {
  return input?.membershipRole === 3 || input?.membershipRole === 4;
}

export function createServicePerformanceModel({
  stats,
  translate,
}: CreateServicePerformanceModelInput): ServicePerformanceModel {
  const staffPerformance = resolveServicePerformanceStaff(stats);
  return {
    isEmpty: !stats || staffPerformance.length === 0,
    kpis: [
      {
        key: "totalSessions",
        labelKey: "workbench.performance.totalSessions",
        value: formatInteger(stats?.totalSessions),
      },
      {
        key: "totalServed",
        labelKey: "workbench.performance.totalServed",
        value: formatInteger(stats?.totalServed),
      },
      {
        key: "avgFirstResponse",
        labelKey: "workbench.performance.avgFirstResponse",
        value: formatSeconds(stats?.avgFirstResponseSeconds),
      },
      {
        key: "avgDuration",
        labelKey: "workbench.performance.avgDuration",
        value: formatSeconds(stats?.avgDurationSeconds),
      },
    ],
    channelDistribution: (stats?.channelDistribution ?? []).map((item) => ({
      label: item.label || "--",
      value: formatInteger(item.value),
    })),
    channelDistributionHint: translate("workbench.performance.sourcePlatformHint"),
    staffRows: [...staffPerformance]
      .sort((left, right) => safeNumber(right.sessionsServed) - safeNumber(left.sessionsServed))
      .map((staff) => ({
        staffUserId: staff.staffUserId,
        displayName: staff.displayName || "--",
        sessionsServed: formatInteger(staff.sessionsServed),
        avgFirstResponse: formatSeconds(staff.avgFirstResponseSeconds),
        avgDuration: formatSeconds(staff.avgDurationSeconds),
        avgRating: formatRating(staff.avgRating),
        excellentRate: formatPercent(staff.excellentRate),
        channelBreakdown: createChannelBreakdown(staff.byChannel ?? []),
      })),
  };
}

export function resolveServicePerformanceStaff(
  stats?: ServicePerformanceStatsDto | null,
): ServicePerformanceStaffDto[] {
  const rows = firstArrayValue(stats, [
    "staffPerformance",
    "staffStats",
    "staffDailyStats",
    "agentPerformance",
    "agentStats",
    "staff_performance",
    "staff_stats",
    "staff_daily_stats",
    "agent_performance",
    "agent_stats",
  ]);
  return rows.map(normalizeServicePerformanceStaff).filter((staff) =>
    Boolean(
      staff.staffUserId ||
        staff.displayName ||
        safeNumber(staff.sessionsServed) > 0 ||
        staff.byChannel?.length,
    ),
  );
}

function normalizeServicePerformanceStaff(input: unknown): ServicePerformanceStaffDto {
  const record = asRecord(input);
  return {
    staffUserId: readString(record, [
      "staffUserId",
      "staff_user_id",
      "staffId",
      "staff_id",
      "agentUserId",
      "agent_user_id",
      "userId",
      "user_id",
      "id",
    ]),
    displayName: readString(record, [
      "displayName",
      "display_name",
      "staffName",
      "staff_name",
      "agentName",
      "agent_name",
      "nickname",
      "name",
    ]),
    sessionsServed: readNumber(record, [
      "sessionsServed",
      "sessions_served",
      "servedSessions",
      "served_sessions",
      "servedCount",
      "served_count",
      "sessionCount",
      "session_count",
    ]),
    avgFirstResponseSeconds: readNumber(record, [
      "avgFirstResponseSeconds",
      "avg_first_response_seconds",
      "firstResponseAvgSeconds",
      "first_response_avg_seconds",
    ]),
    avgDurationSeconds: readNumber(record, [
      "avgDurationSeconds",
      "avg_duration_seconds",
      "durationAvgSeconds",
      "duration_avg_seconds",
    ]),
    avgRating: readNumber(record, ["avgRating", "avg_rating", "ratingAvg", "rating_avg"]),
    excellentRate: readNumber(record, [
      "excellentRate",
      "excellent_rate",
      "qualityPassRate",
      "quality_pass_rate",
    ]),
    byChannel: firstArrayValue(record, ["byChannel", "by_channel", "channels", "channelStats"])
      .map(normalizeServicePerformanceChannel)
      .filter((channel) => Boolean(channel.channel)),
  };
}

function normalizeServicePerformanceChannel(input: unknown): ServicePerformanceChannelDto {
  const record = asRecord(input);
  return {
    channel: readString(record, ["channel", "sourceChannel", "source_channel", "sourcePlatform", "source_platform"]),
    sessionsServed: readNumber(record, [
      "sessionsServed",
      "sessions_served",
      "servedSessions",
      "served_sessions",
      "servedCount",
      "served_count",
      "sessionCount",
      "session_count",
    ]),
    avgFirstResponseSeconds: readNumber(record, [
      "avgFirstResponseSeconds",
      "avg_first_response_seconds",
      "firstResponseAvgSeconds",
      "first_response_avg_seconds",
    ]),
    avgDurationSeconds: readNumber(record, [
      "avgDurationSeconds",
      "avg_duration_seconds",
      "durationAvgSeconds",
      "duration_avg_seconds",
    ]),
    avgRating: readNumber(record, ["avgRating", "avg_rating", "ratingAvg", "rating_avg"]),
    excellentRate: readNumber(record, [
      "excellentRate",
      "excellent_rate",
      "qualityPassRate",
      "quality_pass_rate",
    ]),
  };
}

function createChannelBreakdown(
  breakdown: ServicePerformanceChannelDto[] | undefined,
): ServicePerformanceChannelBreakdown[] {
  return knownChannels.map((channel) => {
    const item = breakdown?.find((candidate) => candidate.channel === channel);
    return {
      channel,
      labelKey:
        channel === "widget"
          ? "workbench.performance.channel.widget"
          : "workbench.performance.channel.imDirect",
      sessionsServed: formatInteger(item?.sessionsServed, "0"),
      avgFirstResponse: formatSeconds(item?.avgFirstResponseSeconds),
      avgDuration: formatSeconds(item?.avgDurationSeconds),
      avgRating: formatRating(item?.avgRating),
      excellentRate: formatPercent(item?.excellentRate),
    };
  });
}

function firstArrayValue(
  input: Record<string, unknown> | ServicePerformanceStatsDto | null | undefined,
  keys: string[],
) {
  const record = asRecord(input);
  for (const key of keys) {
    const value = record[key];
    if (Array.isArray(value)) return value;
  }
  return [];
}

function readString(record: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) return value.trim();
    if (typeof value === "number" && Number.isFinite(value)) return String(value);
  }
  return "";
}

function readNumber(record: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "string" && value.trim()) {
      const numberValue = Number(value);
      if (Number.isFinite(numberValue)) return numberValue;
    }
  }
  return undefined;
}

function asRecord(input: unknown): Record<string, unknown> {
  return input && typeof input === "object" ? (input as Record<string, unknown>) : {};
}

function formatInteger(value: unknown, emptyValue = "--") {
  return typeof value === "number" && Number.isFinite(value)
    ? String(Math.round(value))
    : emptyValue;
}

function formatSeconds(value: unknown) {
  if (typeof value !== "number" || !Number.isFinite(value)) return "--";
  if (value < 60) return `${Math.round(value)}s`;
  return `${Math.round(value / 60)}m`;
}

function formatRating(value: unknown) {
  if (typeof value !== "number" || !Number.isFinite(value)) return "--";
  return value.toFixed(1);
}

function formatPercent(value: unknown) {
  if (typeof value !== "number" || !Number.isFinite(value)) return "--";
  return `${Math.round(value * 100)}%`;
}

function safeNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}
