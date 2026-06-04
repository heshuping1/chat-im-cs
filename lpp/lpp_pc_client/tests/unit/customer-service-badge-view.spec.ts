import { describe, expect, it } from "vitest";

import type { CustomerServiceThread } from "../../src/renderer/data/api/types";
import { resolveCustomerServiceBadgeView } from "../../src/renderer/data/customer-service/customer-service-badge-view";

describe("customer service badge view", () => {
  it("aggregates displayable queued sessions and active unread without summary inflation", () => {
    const view = resolveCustomerServiceBadgeView({
      activeItems: [
        thread({ threadId: "active-1", unreadCount: 2 }),
        thread({ threadId: "active-2", unreadCount: 3 }),
      ],
      queueItems: [thread({ status: "queued", threadId: "queue-1", unreadCount: 9 })],
      summaryQueuedCount: 4,
      threadDataLoaded: true,
    });

    expect(view.queuedTempSessions.map((item) => item.threadId)).toEqual(["queue-1"]);
    expect(view.activeTempSessions.map((item) => item.threadId)).toEqual([
      "active-1",
      "active-2",
    ]);
    expect(view.queuedServiceCount).toBe(1);
    expect(view.activeServiceUnreadCount).toBe(5);
    expect(view.taskbarServiceUnreadCount).toBe(5);
    expect(view.serviceAlertCount).toBe(6);
  });

  it("does not create strong service alerts from summary-only queued counts", () => {
    const view = resolveCustomerServiceBadgeView({
      activeItems: [],
      queueItems: [],
      summaryQueuedCount: 1,
      threadDataLoaded: true,
    });

    expect(view.queuedServiceCount).toBe(0);
    expect(view.serviceAlertCount).toBe(0);
  });

  it("returns zero counters before workbench data is loaded", () => {
    expect(
      resolveCustomerServiceBadgeView({
        activeItems: [thread({ unreadCount: 2 })],
        queueItems: [thread({ status: "queued" })],
        summaryQueuedCount: 10,
        threadDataLoaded: false,
      }),
    ).toMatchObject({
      activeServiceUnreadCount: 0,
      queuedServiceCount: 0,
      serviceAlertCount: 0,
      taskbarServiceUnreadCount: 0,
    });
  });

  it("counts only temp-session active unread for service badges", () => {
    const view = resolveCustomerServiceBadgeView({
      activeItems: [
        thread({ threadId: "temp-active", threadType: "temp_session", unreadCount: 2 }),
        thread({ status: "closed_by_visitor", threadId: "temp-closed", unreadCount: 7 }),
        thread({ threadId: "im-direct-active", threadType: "im_direct", unreadCount: 9 }),
      ],
      queueItems: [
        thread({ status: "queued", threadId: "temp-queue", threadType: "temp_session" }),
        thread({ status: "closed_timeout", threadId: "temp-closed-queue", unreadCount: 5 }),
        thread({ status: "queued", threadId: "im-direct-queue", threadType: "im_direct" }),
      ],
      summaryQueuedCount: 0,
      threadDataLoaded: true,
    });

    expect(view.activeTempSessions.map((item) => item.threadId)).toEqual(["temp-active"]);
    expect(view.queuedTempSessions.map((item) => item.threadId)).toEqual(["temp-queue"]);
    expect(view.activeServiceUnreadCount).toBe(2);
    expect(view.taskbarServiceUnreadCount).toBe(2);
    expect(view.serviceAlertCount).toBe(3);
    expect(view.closedHistoryUnreadCount).toBe(12);
  });
});

function thread(overrides: Partial<CustomerServiceThread> = {}): CustomerServiceThread {
  return {
    conversationId: overrides.threadId ?? "thread-1",
    status: "active",
    threadId: "thread-1",
    threadType: "temp_session",
    title: "Visitor",
    unreadCount: 0,
    ...overrides,
  };
}
