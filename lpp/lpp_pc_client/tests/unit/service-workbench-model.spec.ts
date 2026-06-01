import { describe, expect, it } from "vitest";

import type { CustomerServiceThread } from "../../src/renderer/data/api/types";
import {
  createServiceCommandMetrics,
  createServiceThreadListCounts,
  createServiceThreadListEmptyState,
} from "../../src/renderer/customer-service/models/serviceWorkbenchModel";

describe("customer service workbench model", () => {
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
        ],
        queueItems: [thread({ threadId: "queued-1", status: "queued" })],
        summary: { activeCount: 2, allCount: 3, queuedCount: 1, vipCount: 0 },
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
    expect(metrics.metrics.map((item) => [item.label, item.value])).toEqual([
      ["容量", "2/5"],
      ["排队", "1"],
      ["进行中", "2"],
      ["未读", "3"],
      ["SLA", "1"],
    ]);
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
