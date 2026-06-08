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
  const staffPerformance = stats?.staffPerformance ?? [];
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
