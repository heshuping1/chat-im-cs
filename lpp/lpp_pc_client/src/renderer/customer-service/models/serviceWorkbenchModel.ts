import type {
  CustomerServiceThread,
  CustomerServiceThreadsResponse,
  StaffReceptionStatusDto,
} from "../../data/api/types";
import {
  createCustomerServiceLiveCounters,
} from "../../data/customer-service/customer-service-live-counters";
import { isTerminalCustomerServiceThreadStatus } from "../../data/customer-service/cs-thread-state";
import {
  customerServiceHistoryStatusLabel,
} from "../../data/customer-service-display";
import type { CustomerServiceStatus } from "../../data/types";

export type ServiceThreadListMode = "current" | "history";
export type ServiceThreadListFilter = "all" | "queued" | "serving" | "sla";

export interface ServiceThreadListCounts {
  all: number;
  queued: number;
  serving: number;
  sla: number;
}

export interface ServiceThreadListEmptyState {
  actionLabel?: string;
  description: string;
  title: string;
}

export interface ServiceCommandMetric {
  label: string;
  tone?: "danger" | "muted" | "normal" | "success" | "warning";
  value: string;
}

export interface ServiceCommandMetrics {
  activeCount: number;
  activeSessions?: number | null;
  activeUnreadCount: number;
  capacityText: string;
  hasReceptionStatus: boolean;
  hasThreadData: boolean;
  metrics: ServiceCommandMetric[];
  maxSessions?: number | null;
  queuedCount: number;
  queueEnabled?: boolean | null;
  serviceStatus: CustomerServiceStatus | string;
  serviceStatusLabel: string;
  slaRiskCount: number;
  totalCount: number;
}

export { createCustomerServiceLiveCounters };

export function createServiceThreadListCounts(
  threads: CustomerServiceThread[],
  isRiskyThread: (thread: CustomerServiceThread) => boolean,
): ServiceThreadListCounts {
  const counters = createCustomerServiceLiveCounters({
    activeItems: threads,
    isRiskyThread,
  });
  return {
    all: counters.totalCount,
    queued: counters.queuedCount,
    serving: counters.activeCount,
    sla: counters.slaRiskCount,
  };
}

export function createServiceHistoryUnreadCount(threads: CustomerServiceThread[]) {
  return threads
    .filter((thread) => isTerminalCustomerServiceThreadStatus(thread.status))
    .reduce((sum, thread) => sum + Math.max(0, Number(thread.unreadCount ?? 0)), 0);
}

export function createServiceHistoryTabBadge(threads: CustomerServiceThread[]) {
  return {
    threadCount: threads.length,
    unreadCount: createServiceHistoryUnreadCount(threads),
  };
}

export function createServiceHistoryThreadStatusText(thread: CustomerServiceThread) {
  const label = customerServiceHistoryStatusLabel(thread.status);
  const unreadCount = Math.max(0, Number(thread.unreadCount ?? 0));
  return unreadCount > 0 ? `已结束 · 未读 ${unreadCount}` : label;
}

export function isRiskyCustomerServiceThread(thread: CustomerServiceThread) {
  const record = thread as unknown as Record<string, unknown>;
  const booleanRiskFields = [
    "slaRisk",
    "isSlaRisk",
    "hasSlaRisk",
    "risk",
    "atRisk",
    "overdue",
    "isOverdue",
  ];
  if (booleanRiskFields.some((field) => record[field] === true)) return true;

  const textValues = [
    thread.priority,
    thread.lastMessagePreview,
    thread.customerLevel,
    record.riskLevel,
    record.slaRiskLevel,
    record.slaStatus,
    record.slaState,
    record.riskReason,
    record.tags,
  ]
    .flatMap((value) => (Array.isArray(value) ? value : [value]))
    .filter(Boolean)
    .map((value) => String(value).toLowerCase());

  return ["high", "urgent", "risk", "投诉", "超时", "overdue", "timeout", "breach"].some(
    (token) => textValues.some((value) => value.includes(token.toLowerCase())),
  );
}

export function createServiceThreadListEmptyState(input: {
  currentCounts: ServiceThreadListCounts;
  filter: ServiceThreadListFilter;
  historyCount: number;
  mode: ServiceThreadListMode;
  query?: string;
}): ServiceThreadListEmptyState {
  const hasQuery = Boolean(input.query?.trim());

  if (hasQuery) {
    return {
      actionLabel: "清空搜索",
      description:
        input.mode === "history"
          ? "历史会话里没有匹配的客户、渠道或消息内容，可清空搜索后继续查看。"
          : "当前会话池没有匹配项，可清空搜索或切换历史会话继续排查。",
      title: "未找到匹配会话",
    };
  }

  if (input.mode === "history") {
    return {
      description:
        input.historyCount > 0
          ? "当前历史筛选没有可展示会话，可回到当前会话池继续处理在线访客。"
          : "已结束会话会进入历史列表；当前可先关注排队、进行中和 SLA 风险。",
      title: input.historyCount > 0 ? "当前历史筛选为空" : "暂无历史会话",
    };
  }

  if (input.currentCounts.all === 0) {
    return {
      description:
        "排队访客出现后会自动进入会话池；也可以切换历史查看已结束会话。",
      title: "暂无当前会话",
    };
  }

  if (input.filter === "queued") {
    return {
      actionLabel: "查看全部",
      description:
        "当前没有等待接入的访客。可切换全部或进行中，继续处理已接待会话。",
      title: "当前筛选为空",
    };
  }

  if (input.filter === "serving") {
    return {
      actionLabel: "查看排队",
      description:
        "当前没有接待中会话。可切换排队接入访客，或查看历史记录。",
      title: "当前筛选为空",
    };
  }

  if (input.filter === "sla") {
    return {
      actionLabel: "查看全部",
      description:
        "暂未发现 SLA 风险信号。可回到全部会话，按未读和最后消息时间继续处理。",
      title: "暂无 SLA 风险",
    };
  }

  return {
    description:
      "当前筛选下没有可处理会话。可切换历史或等待排队访客进入会话池。",
    title: "当前筛选为空",
  };
}

export function createServiceCommandMetrics(input: {
  isRiskyThread: (thread: CustomerServiceThread) => boolean;
  lastKnownStatus?: CustomerServiceStatus | null;
  receptionStatus?: StaffReceptionStatusDto;
  threads?: CustomerServiceThreadsResponse;
}): ServiceCommandMetrics {
  const hasThreadData = Boolean(input.threads);
  const hasReceptionStatus = Boolean(input.receptionStatus);
  const liveCounters = createCustomerServiceLiveCounters({
    activeItems: input.threads?.activeItems,
    isRiskyThread: input.isRiskyThread,
    queueItems: input.threads?.queueItems,
  });
  const {
    activeCount,
    activeUnreadCount,
    queuedCount,
    slaRiskCount,
    totalCount,
  } = liveCounters;
  const serviceStatus =
    input.receptionStatus?.serviceStatus ?? input.lastKnownStatus ?? "unknown";
  const activeSessions = input.receptionStatus?.activeSessionCount ?? null;
  const maxSessions = input.receptionStatus?.maxConcurrentSessions;
  const capacityText =
    activeSessions === null
      ? "--"
      : typeof maxSessions === "number" && maxSessions > 0
        ? `${activeSessions}/${maxSessions}`
        : `${activeSessions}/--`;
  const threadMetricValue = (value: number) => (hasThreadData ? String(value) : "--");

  return {
    activeCount,
    activeSessions,
    activeUnreadCount,
    capacityText,
    hasReceptionStatus,
    hasThreadData,
    maxSessions,
    queuedCount,
    queueEnabled: input.receptionStatus?.queueAcceptEnabled,
    serviceStatus,
    serviceStatusLabel: serviceStatusLabel(serviceStatus),
    slaRiskCount,
    totalCount,
    metrics: [
      { label: "容量", value: capacityText, tone: "success" },
      { label: "排队", value: threadMetricValue(queuedCount), tone: queuedCount > 0 ? "warning" : "normal" },
      { label: "进行中", value: threadMetricValue(activeCount), tone: "normal" },
      { label: "未读", value: threadMetricValue(activeUnreadCount), tone: activeUnreadCount > 0 ? "warning" : "normal" },
      { label: "SLA", value: threadMetricValue(slaRiskCount), tone: slaRiskCount > 0 ? "danger" : "normal" },
    ],
  };
}

function serviceStatusLabel(status?: string | null) {
  if (status === "online") return "在线";
  if (status === "busy") return "忙碌";
  if (status === "break") return "小休";
  if (status === "offline") return "离线";
  return "未同步";
}
