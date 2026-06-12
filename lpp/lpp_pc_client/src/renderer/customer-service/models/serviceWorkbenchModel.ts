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
  customerServiceHistoryStatusKey,
  isQueuedCustomerServiceThread,
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
  actionLabelKey?: string;
  description?: string;
  descriptionKey: string;
  title?: string;
  titleKey: string;
}

export interface ServiceCommandMetric {
  label?: string;
  labelKey: string;
  tone?: "danger" | "muted" | "normal" | "success" | "warning";
  value: string;
}

export interface ServiceTextDescriptor {
  key: string;
  params?: Record<string, string | number>;
}

export interface ServiceThreadListViewModel {
  counts: ServiceThreadListCounts;
  currentThreads: CustomerServiceThread[];
  historyThreads: CustomerServiceThread[];
  queuedThreads: CustomerServiceThread[];
  servingThreads: CustomerServiceThread[];
  slaThreads: CustomerServiceThread[];
}

export interface ServiceCommandMetrics {
  activeCount: number;
  activeSessions?: number | null;
  activeUnreadCount: number;
  assignedSessions?: number | null;
  capacityText: string;
  hasReceptionStatus: boolean;
  hasThreadData: boolean;
  metrics: ServiceCommandMetric[];
  maxSessions?: number | null;
  queuedCount: number;
  queueEnabled?: boolean | null;
  serviceStatus: CustomerServiceStatus | string;
  serviceStatusLabel?: string;
  serviceStatusLabelKey: string;
  slaRiskCount: number;
  totalCount: number;
}

export { createCustomerServiceLiveCounters };

export function createServiceThreadListViewModel(input: {
  historyThreads?: CustomerServiceThread[];
  isRiskyThread: (thread: CustomerServiceThread) => boolean;
  threads?: Pick<CustomerServiceThreadsResponse, "activeItems" | "queueItems">;
}): ServiceThreadListViewModel {
  const liveCounters = createCustomerServiceLiveCounters({
    activeItems: input.threads?.activeItems,
    isRiskyThread: input.isRiskyThread,
    queueItems: input.threads?.queueItems,
  });
  const currentThreads = liveCounters.currentTempSessions;
  const queuedThreads = currentThreads.filter(isQueuedCustomerServiceThread);
  const servingThreads = currentThreads.filter((thread) => !isQueuedCustomerServiceThread(thread));
  const slaThreads = currentThreads.filter(input.isRiskyThread);

  return {
    counts: {
      all: currentThreads.length,
      queued: queuedThreads.length,
      serving: servingThreads.length,
      sla: slaThreads.length,
    },
    currentThreads,
    historyThreads: input.historyThreads ?? [],
    queuedThreads,
    servingThreads,
    slaThreads,
  };
}

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

export function createServiceHistoryThreadStatusDescriptor(thread: CustomerServiceThread): ServiceTextDescriptor {
  const unreadCount = Math.max(0, Number(thread.unreadCount ?? 0));
  return unreadCount > 0
    ? { key: "customerService.threadList.historyStatusUnread", params: { count: unreadCount } }
    : { key: customerServiceHistoryStatusKey(thread.status) };
}

export function createServiceHistoryThreadStatusText(thread: CustomerServiceThread) {
  const descriptor = createServiceHistoryThreadStatusDescriptor(thread);
  if (descriptor.key === "customerService.threadList.historyStatusUnread") {
    return `已结束 · 未读 ${descriptor.params?.count ?? 0}`;
  }
  if (descriptor.key === "customerService.threadList.historyStatus.closedTimeout") return "超时关闭";
  if (descriptor.key === "customerService.threadList.historyStatus.closedByVisitor") return "访客关闭";
  if (descriptor.key === "customerService.threadList.historyStatus.closedByStaff") return "客服关闭";
  if (descriptor.key === "customerService.threadList.historyStatus.closedSystem") return "系统关闭";
  if (descriptor.key === "customerService.threadList.historyStatus.archived") return "已归档";
  return "已结束";
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

  return ["high", "urgent", "risk", "\u6295\u8bc9", "\u8d85\u65f6", "overdue", "timeout", "breach"].some(
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
      actionLabelKey: "customerService.threadList.empty.clearSearch",
      actionLabel: "清空搜索",
      descriptionKey:
        input.mode === "history"
          ? "customerService.threadList.empty.searchHistoryDescription"
          : "customerService.threadList.empty.searchCurrentDescription",
      titleKey: "customerService.threadList.empty.searchTitle",
      title: "未找到匹配会话",
    };
  }

  if (input.mode === "history") {
    return {
      descriptionKey:
        input.historyCount > 0
          ? "customerService.threadList.empty.historyFilteredDescription"
          : "customerService.threadList.empty.noHistoryDescription",
      description: input.historyCount > 0 ? "当前筛选没有历史会话。" : "暂无历史会话。",
      titleKey: input.historyCount > 0
        ? "customerService.threadList.empty.historyFilteredTitle"
        : "customerService.threadList.empty.noHistoryTitle",
      title: input.historyCount > 0 ? "当前筛选为空" : "暂无历史会话",
    };
  }

  if (input.currentCounts.all === 0) {
    return {
      descriptionKey: "customerService.threadList.empty.noCurrentDescription",
      description: "当前没有待处理或接待中的会话。",
      titleKey: "customerService.threadList.empty.noCurrentTitle",
      title: "暂无当前会话",
    };
  }

  if (input.filter === "queued") {
    return {
      actionLabelKey: "customerService.threadList.empty.viewAll",
      actionLabel: "查看全部",
      descriptionKey: "customerService.threadList.empty.queuedDescription",
      description: "当前没有排队会话。",
      titleKey: "customerService.threadList.empty.filteredTitle",
      title: "当前筛选为空",
    };
  }

  if (input.filter === "serving") {
    return {
      actionLabelKey: "customerService.threadList.empty.viewQueued",
      actionLabel: "查看排队",
      descriptionKey: "customerService.threadList.empty.servingDescription",
      description: "当前没有接待中会话。",
      titleKey: "customerService.threadList.empty.filteredTitle",
      title: "当前筛选为空",
    };
  }

  if (input.filter === "sla") {
    return {
      actionLabelKey: "customerService.threadList.empty.viewAll",
      actionLabel: "查看全部",
      descriptionKey: "customerService.threadList.empty.slaDescription",
      description: "当前没有 SLA 风险会话。",
      titleKey: "customerService.threadList.empty.noSlaTitle",
      title: "暂无 SLA 风险",
    };
  }

  return {
    descriptionKey: "customerService.threadList.empty.filteredDescription",
    description: "当前筛选没有可显示会话。",
    titleKey: "customerService.threadList.empty.filteredTitle",
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
  const activeSessions = hasReceptionStatus && hasThreadData ? activeCount : null;
  const apiActiveSessions = nonNegativeInteger(input.receptionStatus?.activeSessionCount);
  const reservedSessions = nonNegativeInteger(input.receptionStatus?.reservedSessionCount);
  const assignedSessions =
    apiActiveSessions !== null || reservedSessions !== null
      ? (apiActiveSessions ?? 0) + (reservedSessions ?? 0)
      : activeSessions;
  const maxSessions = positiveInteger(input.receptionStatus?.maxConcurrentSessions);
  const capacityText =
    assignedSessions === null
      ? "--"
      : typeof maxSessions === "number" && maxSessions > 0
        ? `${assignedSessions}/${maxSessions}`
        : `${assignedSessions}/--`;
  const maxSessionsText = maxSessions === null ? "--" : String(maxSessions);
  const threadMetricValue = (value: number) => (hasThreadData ? String(value) : "--");

  return {
    activeCount,
    activeSessions,
    activeUnreadCount,
    assignedSessions,
    capacityText,
    hasReceptionStatus,
    hasThreadData,
    maxSessions,
    queuedCount,
    queueEnabled: input.receptionStatus?.queueAcceptEnabled,
    serviceStatus,
    serviceStatusLabel: serviceStatusLabel(serviceStatus),
    serviceStatusLabelKey: serviceStatusLabelKey(serviceStatus),
    slaRiskCount,
    totalCount,
    metrics: [
      { label: "已分配", labelKey: "customerService.online.metrics.assigned", value: capacityText, tone: "success" },
      { label: "最大", labelKey: "customerService.online.metrics.maxAssignable", value: maxSessionsText, tone: "normal" },
      { label: "排队", labelKey: "customerService.online.metrics.queued", value: threadMetricValue(queuedCount), tone: queuedCount > 0 ? "warning" : "normal" },
      { label: "进行中", labelKey: "customerService.online.metrics.active", value: threadMetricValue(activeCount), tone: "normal" },
      { label: "未读", labelKey: "customerService.online.metrics.unread", value: threadMetricValue(activeUnreadCount), tone: activeUnreadCount > 0 ? "warning" : "normal" },
      { label: "SLA", labelKey: "customerService.online.metrics.sla", value: threadMetricValue(slaRiskCount), tone: slaRiskCount > 0 ? "danger" : "normal" },
    ],
  };
}

function nonNegativeInteger(value?: number | null) {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  return Math.max(0, Math.floor(value));
}

function positiveInteger(value?: number | null) {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) return null;
  return Math.floor(value);
}

function serviceStatusLabelKey(status?: string | null) {
  if (status === "online") return "customerService.online.status.online";
  if (status === "busy") return "customerService.online.status.busy";
  if (status === "break") return "customerService.online.status.break";
  if (status === "offline") return "customerService.online.status.offline";
  return "customerService.online.status.unsynced";
}

function serviceStatusLabel(status?: string | null) {
  if (status === "online") return "在线";
  if (status === "busy") return "忙碌";
  if (status === "break") return "短暂离开";
  if (status === "offline") return "离线";
  return "未同步";
}
