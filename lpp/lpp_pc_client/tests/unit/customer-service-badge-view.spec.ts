import { describe, expect, it } from "vitest";

import type { CustomerServiceThread } from "../../src/renderer/data/api/types";
import { resolveCustomerServiceBadgeView } from "../../src/renderer/data/customer-service/customer-service-badge-view";

describe("customer service badge view", () => {
  it("aggregates queued sessions and active unread without reminder count stacking", () => {
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
    expect(view.queuedServiceCount).toBe(4);
    expect(view.activeServiceUnreadCount).toBe(5);
    expect(view.taskbarServiceUnreadCount).toBe(5);
    expect(view.serviceAlertCount).toBe(9);
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
