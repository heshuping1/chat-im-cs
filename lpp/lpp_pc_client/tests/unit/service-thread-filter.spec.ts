import { describe, expect, it } from "vitest";

import { isRiskyThread } from "../../src/renderer/components/ThreadList";
import type { CustomerServiceThread } from "../../src/renderer/data/api-client";

describe("online service thread filtering", () => {
  const baseThread: CustomerServiceThread = {
    assignedAt: null,
    avatarUrl: null,
    conversationId: "conv-1",
    customerAvatarUrl: null,
    customerLevel: "普通客户",
    isVip: true,
    lastMessageAt: null,
    lastMessagePreview: "你好",
    priority: "normal",
    source: "web",
    sourceChannel: "web",
    status: "serving",
    threadId: "thread-1",
    threadType: "temp_session",
    title: "访客",
    unreadCount: 0,
    updatedAt: null,
  };

  it("uses SLA risk signals instead of VIP as the queue risk filter", () => {
    expect(isRiskyThread(baseThread)).toBe(false);
    expect(isRiskyThread({ ...baseThread, priority: "urgent" })).toBe(true);
    expect(isRiskyThread({ ...baseThread, lastMessagePreview: "客户投诉超时" })).toBe(true);
    expect(isRiskyThread({ ...baseThread, isVip: false, slaRisk: true } as CustomerServiceThread)).toBe(true);
  });
});
