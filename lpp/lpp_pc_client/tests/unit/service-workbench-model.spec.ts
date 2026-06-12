import { describe, expect, it } from "vitest";

import type { CustomerServiceThread } from "../../src/renderer/data/api/types";
import {
  createCustomerServiceLiveCounters,
  createServiceCommandMetrics,
  createServiceHistoryTabBadge,
  createServiceHistoryThreadStatusText,
  createServiceHistoryUnreadCount,
  createServiceThreadListCounts,
  createServiceThreadListEmptyState,
  createServiceThreadListViewModel,
} from "../../src/renderer/customer-service/models/serviceWorkbenchModel";

describe("customer service workbench model", () => {
  it("derives live counters from displayable temp sessions instead of raw summaries", () => {
    const counters = createCustomerServiceLiveCounters({
      activeItems: [
        thread({ threadId: "serving-1", status: "serving", unreadCount: 2 }),
        thread({ threadId: "direct-1", status: "serving", threadType: "im_direct", unreadCount: 9 }),
        thread({ threadId: "closed-1", status: "closed_by_staff", unreadCount: 7 }),
        thread({ threadId: "queued-in-active", status: "queued", unreadCount: 4 }),
        thread({ threadId: "pending-in-active", status: "pending", unreadCount: 8 }),
      ],
      isRiskyThread: (item) => item.priority === "urgent",
      queueItems: [
        thread({ priority: "urgent", status: "queued", threadId: "queued-1" }),
        thread({ status: "closed_timeout", threadId: "closed-queue", unreadCount: 5 }),
      ],
    });

    expect(counters).toMatchObject({
      activeCount: 1,
      activeUnreadCount: 2,
      queuedCount: 3,
      serviceAlertCount: 5,
      slaRiskCount: 1,
      totalCount: 4,
    });
    expect(counters.activeTempSessions.map((item) => item.threadId)).toEqual([
      "serving-1",
    ]);
    expect(counters.queuedTempSessions.map((item) => item.threadId)).toEqual([
      "queued-1",
      "queued-in-active",
      "pending-in-active",
    ]);
  });

  it("derives command bar metrics from current threads and reception status", () => {
    const metrics = createServiceCommandMetrics({
      isRiskyThread: (thread) => thread.priority === "urgent",
      receptionStatus: {
        activeSessionCount: 2,
        maxConcurrentSessions: 5,
        queueAcceptEnabled: true,
        serviceStatus: "online",
      },
      threads: {
        activeItems: [
          thread({ threadId: "active-1", status: "serving", unreadCount: 3 }),
          thread({ threadId: "active-2", priority: "urgent", status: "serving" }),
          thread({ threadId: "closed-1", status: "closed_by_visitor", unreadCount: 7 }),
        ],
        queueItems: [
          thread({ threadId: "queued-1", status: "queued" }),
          thread({ threadId: "closed-queue", status: "closed_timeout", unreadCount: 5 }),
        ],
        summary: { activeCount: 4, allCount: 5, queuedCount: 2, vipCount: 0 },
      },
    });

    expect(metrics).toMatchObject({
      activeCount: 2,
      activeSessions: 2,
      activeUnreadCount: 3,
      capacityText: "2/5",
      hasReceptionStatus: true,
      hasThreadData: true,
      queuedCount: 1,
      queueEnabled: true,
      serviceStatus: "online",
      serviceStatusLabel: "在线",
      slaRiskCount: 1,
      totalCount: 3,
    });
    expect(metrics.metrics.map((item) => item.value)).toEqual([
      "2/5",
      "1",
      "2",
      "3",
      "1",
    ]);
  });

  it("uses visible online-service threads instead of reception active sessions for active counts", () => {
    const metrics = createServiceCommandMetrics({
      isRiskyThread: () => false,
      receptionStatus: {
        activeSessionCount: 1,
        maxConcurrentSessions: 10,
        queueAcceptEnabled: false,
        serviceStatus: "online",
      },
      threads: {
        activeItems: [
          thread({ threadId: "im-direct-1", status: "active", threadType: "im_direct" }),
        ],
        queueItems: [],
        summary: { activeCount: 1, allCount: 1, queuedCount: 0, vipCount: 0 },
      },
    });

    expect(metrics).toMatchObject({
      activeCount: 0,
      activeSessions: 0,
      capacityText: "0/10",
      queuedCount: 0,
      totalCount: 0,
    });
  });

  it("does not turn missing reception or thread data into fake status and counts", () => {
    const metrics = createServiceCommandMetrics({
      isRiskyThread: () => false,
    });

    expect(metrics).toMatchObject({
      activeCount: 0,
      activeSessions: null,
      activeUnreadCount: 0,
      capacityText: "--",
      hasReceptionStatus: false,
      hasThreadData: false,
      queuedCount: 0,
      serviceStatus: "unknown",
      serviceStatusLabel: "未同步",
      totalCount: 0,
    });
    expect(metrics.metrics.map((item) => [item.label, item.value])).toEqual([
      ["容量", "--"],
      ["排队", "--"],
      ["进行中", "--"],
      ["未读", "--"],
      ["SLA", "--"],
    ]);
  });

  it("uses only confirmed last-known status when reception query is absent", () => {
    const metrics = createServiceCommandMetrics({
      isRiskyThread: () => false,
      lastKnownStatus: "busy",
      threads: {
        activeItems: [thread({ threadId: "active-1", status: "serving" })],
        queueItems: [],
        summary: { activeCount: 1, allCount: 1, queuedCount: 0, vipCount: 0 },
      },
    });

    expect(metrics.serviceStatus).toBe("busy");
    expect(metrics.serviceStatusLabel).toBe("忙碌");
    expect(metrics.hasReceptionStatus).toBe(false);
    expect(metrics.activeCount).toBe(1);
    expect(metrics.activeSessions).toBeNull();
    expect(metrics.capacityText).toBe("--");
  });

  it("keeps list counts aligned with filters", () => {
    expect(
      createServiceThreadListCounts(
        [
          thread({ status: "queued" }),
          thread({ priority: "urgent", status: "serving" }),
          thread({ status: "serving" }),
          thread({ status: "serving", threadType: "im_direct" }),
          thread({ status: "closed_timeout" }),
        ],
        (item) => item.priority === "urgent",
      ),
    ).toEqual({
      all: 3,
      queued: 1,
      serving: 2,
      sla: 1,
    });
  });

  it("builds one current thread view model for tabs, filters and cards", () => {
    const view = createServiceThreadListViewModel({
      isRiskyThread: (item) => item.priority === "urgent",
      threads: {
        activeItems: [
          thread({ status: "serving", threadId: "serving-1" }),
          thread({ priority: "urgent", status: "active", threadId: "serving-2" }),
          thread({ status: "closed_timeout", threadId: "closed-active" }),
        ],
        queueItems: [
          thread({ status: "queued", threadId: "queued-1" }),
          thread({ status: "pending", threadId: "queued-2" }),
        ],
      },
    });

    expect(view.currentThreads.map((item) => item.threadId)).toEqual([
      "queued-1",
      "queued-2",
      "serving-1",
      "serving-2",
    ]);
    expect(view.queuedThreads.map((item) => item.threadId)).toEqual([
      "queued-1",
      "queued-2",
    ]);
    expect(view.servingThreads.map((item) => item.threadId)).toEqual([
      "serving-1",
      "serving-2",
    ]);
    expect(view.slaThreads.map((item) => item.threadId)).toEqual(["serving-2"]);
    expect(view.counts).toEqual({
      all: 4,
      queued: 2,
      serving: 2,
      sla: 1,
    });
  });

  it("counts pending temp sessions as queued instead of active reminders", () => {
    expect(
      createServiceThreadListCounts(
        [
          thread({ status: "pending", threadId: "pending-1", unreadCount: 4 }),
          thread({ status: "queueing", threadId: "queueing-1" }),
          thread({ status: "serving", threadId: "serving-1", unreadCount: 2 }),
          thread({ status: "archived", threadId: "archived-1", unreadCount: 9 }),
          thread({ status: "transferred", threadId: "transferred-1", unreadCount: 5 }),
          thread({ status: "pending", threadId: "direct-pending", threadType: "im_direct", unreadCount: 7 }),
        ],
        () => false,
      ),
    ).toEqual({
      all: 3,
      queued: 2,
      serving: 1,
      sla: 0,
    });
  });

  it("keeps closed unread as a weak history-list signal", () => {
    const historyThreads = [
      thread({ status: "closed_by_visitor", threadId: "history-unread", unreadCount: 3 }),
      thread({ status: "closed_timeout", threadId: "history-read", unreadCount: 0 }),
      thread({ status: "serving", threadId: "live-unread", unreadCount: 4 }),
    ];

    expect(createServiceHistoryUnreadCount(historyThreads)).toBe(3);
    expect(createServiceHistoryTabBadge(historyThreads)).toEqual({
      threadCount: 3,
      unreadCount: 3,
    });
    expect(createServiceHistoryThreadStatusText(historyThreads[0])).toBe("已结束 · 未读 3");
    expect(createServiceHistoryThreadStatusText(historyThreads[1])).toBe("超时关闭");
  });

  it("explains why the current filter is empty", () => {
    const counts = { all: 3, queued: 1, serving: 2, sla: 0 };

    expect(
      createServiceThreadListEmptyState({
        currentCounts: counts,
        filter: "sla",
        historyCount: 5,
        mode: "current",
      }),
    ).toMatchObject({
      description: expect.stringContaining("SLA 风险"),
      title: "暂无 SLA 风险",
    });

    expect(
      createServiceThreadListEmptyState({
        currentCounts: counts,
        filter: "serving",
        historyCount: 5,
        mode: "current",
      }),
    ).toMatchObject({
      description: expect.stringContaining("当前没有接待中会话"),
      title: "当前筛选为空",
    });
  });

  it("separates search, history and all-empty states", () => {
    const emptyCounts = { all: 0, queued: 0, serving: 0, sla: 0 };

    expect(
      createServiceThreadListEmptyState({
        currentCounts: emptyCounts,
        filter: "all",
        historyCount: 0,
        mode: "current",
        query: "alice",
      }),
    ).toMatchObject({
      actionLabel: "清空搜索",
      title: "未找到匹配会话",
    });

    expect(
      createServiceThreadListEmptyState({
        currentCounts: emptyCounts,
        filter: "all",
        historyCount: 0,
        mode: "history",
      }),
    ).toMatchObject({
      title: "暂无历史会话",
    });

    expect(
      createServiceThreadListEmptyState({
        currentCounts: emptyCounts,
        filter: "all",
        historyCount: 0,
        mode: "current",
      }),
    ).toMatchObject({
      title: "暂无当前会话",
    });
  });
});

function thread(overrides: Partial<CustomerServiceThread> = {}): CustomerServiceThread {
  return {
    conversationId: overrides.threadId ?? "thread-1",
    status: "queued",
    threadId: "thread-1",
    threadType: "temp_session",
    title: "Visitor",
    unreadCount: 0,
    ...overrides,
  };
}
