import { describe, expect, it } from "vitest";
import {
  consumeDesktopNotificationDedupe,
  deriveTaskbarBadge,
  dismissRealtimeReminderById,
  dismissRealtimeRemindersForTarget,
  resetDesktopNotificationDedupeForTest,
  notificationPayloadForPolicy,
  reduceRealtimeReminders,
  shouldPushCustomerServiceQueueReminder,
  shouldPushCustomerServiceThreadMessageReminder,
  shouldPushRealtimeReminder,
  shouldShowCustomerServiceThreadMessageDesktopNotificationForTarget,
  shouldShowDesktopNotification,
  shouldShowDesktopNotificationForTarget,
  taskbarBadgeLabel,
} from "../../src/renderer/data/reminder/reminder-service";
import type { PcRealtimeReminder } from "../../src/renderer/data/reminder/reminder-types";
import { defaultPcSettings } from "../../src/renderer/data/settings/pc-settings";

describe("reminder service", () => {
  it("deduplicates by id, prunes expired reminders, and caps the list", () => {
    const now = 1_000_000;
    const current: PcRealtimeReminder[] = [
      createReminder("a", now - 100),
      createReminder("b", now - 31 * 60 * 1000),
      createReminder("c", now - 200),
    ];

    const next = reduceRealtimeReminders(
      current,
      {
        id: "a",
        title: "new a",
        body: "body",
        targetModule: "messages",
      },
      { limit: 2, now },
    );

    expect(next).toEqual([
      expect.objectContaining({ id: "a", title: "new a", createdAt: now }),
      expect.objectContaining({ id: "c" }),
    ]);
  });

  it("dismisses by id or target", () => {
    const current: PcRealtimeReminder[] = [
      createReminder("a", 1, "messages", "c1"),
      createReminder("b", 1, "messages", "c2"),
      createReminder("c", 1, "onlineService", "t1"),
    ];

    expect(dismissRealtimeReminderById(current, "b").map((item) => item.id)).toEqual([
      "a",
      "c",
    ]);
    expect(
      dismissRealtimeRemindersForTarget(current, "messages", "c1").map(
        (item) => item.id,
      ),
    ).toEqual(["b", "c"]);
    expect(dismissRealtimeRemindersForTarget(current, "messages").map((item) => item.id)).toEqual([
      "c",
    ]);
  });

  it("uses settings policy for realtime and desktop notifications", () => {
    expect(shouldPushRealtimeReminder(defaultPcSettings, "serviceQueue")).toBe(true);
    expect(shouldPushCustomerServiceQueueReminder(defaultPcSettings)).toBe(true);
    expect(shouldPushCustomerServiceThreadMessageReminder(defaultPcSettings)).toBe(false);
    expect(
      shouldPushCustomerServiceThreadMessageReminder({
        ...defaultPcSettings,
        customerServiceMessageNotifications: true,
      }),
    ).toBe(true);
    expect(
      shouldPushCustomerServiceThreadMessageReminder({
        ...defaultPcSettings,
        customerServiceMessageNotifications: true,
        serviceQueueNotifications: false,
      }),
    ).toBe(true);
    expect(
      shouldPushCustomerServiceQueueReminder({
        ...defaultPcSettings,
        serviceQueueNotifications: false,
      }),
    ).toBe(false);
    expect(shouldShowDesktopNotification(defaultPcSettings, "serviceQueue")).toBe(true);
    expect(
      shouldShowDesktopNotification(
        {
          ...defaultPcSettings,
          desktopNotifications: false,
        },
        "serviceQueue",
      ),
    ).toBe(false);
    expect(
      shouldPushRealtimeReminder(
        {
          ...defaultPcSettings,
          imNotifications: false,
        },
        "im",
      ),
    ).toBe(false);
    expect(
      shouldPushRealtimeReminder(
        {
          ...defaultPcSettings,
          doNotDisturb: true,
        },
        "im",
      ),
    ).toBe(false);
    expect(
      shouldPushRealtimeReminder(
        {
          ...defaultPcSettings,
          doNotDisturb: true,
        },
        "serviceQueue",
      ),
    ).toBe(true);
    expect(shouldPushRealtimeReminder(defaultPcSettings, "sla")).toBe(true);
    expect(
      shouldPushRealtimeReminder(
        {
          ...defaultPcSettings,
          slaTimeoutNotifications: false,
        },
        "sla",
      ),
    ).toBe(false);
    expect(
      shouldShowDesktopNotificationForTarget(defaultPcSettings, "serviceQueue", {
        activeModule: "onlineService",
        activeTargetId: "t1",
        targetId: "t1",
        targetModule: "onlineService",
        windowFocused: true,
      }),
    ).toBe(false);
    expect(
      shouldShowDesktopNotificationForTarget(defaultPcSettings, "serviceQueue", {
        activeModule: "onlineService",
        activeTargetId: "t1",
        targetId: "t1",
        targetModule: "onlineService",
        windowFocused: false,
      }),
    ).toBe(true);
    expect(
      shouldShowDesktopNotificationForTarget(defaultPcSettings, "serviceQueue", {
        activeModule: "messages",
        activeTargetId: "t1",
        targetId: "t1",
        targetModule: "onlineService",
        windowFocused: true,
      }),
    ).toBe(true);
    expect(
      shouldShowCustomerServiceThreadMessageDesktopNotificationForTarget(
        {
          ...defaultPcSettings,
          customerServiceMessageNotifications: true,
          serviceQueueNotifications: false,
        },
        {
          activeModule: "onlineService",
          activeTargetId: "t1",
          targetId: "t2",
          targetModule: "onlineService",
          windowFocused: true,
        },
      ),
    ).toBe(true);
  });

  it("hides desktop notification content when preview is disabled", () => {
    expect(
      notificationPayloadForPolicy(
        { title: "客户消息", body: "银行卡 1234", conversationId: "c1" },
        { ...defaultPcSettings, notificationPreview: false },
      ),
    ).toEqual({
      title: "客户消息",
      body: "你有一条新提醒，内容已按隐私设置隐藏。",
      conversationId: "c1",
    });
    expect(
      notificationPayloadForPolicy(
        {
          title: "目标-Fuyuan（富元）",
          body: "访客: 2222",
          channel: "serviceQueue",
          targetModule: "onlineService",
          targetId: "t1",
        },
        { ...defaultPcSettings, notificationPreview: false },
      ),
    ).toEqual({
      title: "目标-Fuyuan（富元）",
      body: "收到一条在线客服消息",
      channel: "serviceQueue",
      targetModule: "onlineService",
      targetId: "t1",
    });
  });

  it("deduplicates identical desktop notifications within the short window", () => {
    resetDesktopNotificationDedupeForTest();
    const payload = {
      title: "在线客服新消息",
      body: "访客发来一条消息",
      targetId: "thread-1",
      targetModule: "onlineService" as const,
    };

    expect(consumeDesktopNotificationDedupe(payload, { channel: "serviceQueue" }, 1_000)).toBe(false);
    expect(consumeDesktopNotificationDedupe(payload, { channel: "serviceQueue" }, 2_000)).toBe(true);
  });

  it("does not deduplicate different desktop notification targets, bodies, or channels", () => {
    resetDesktopNotificationDedupeForTest();
    const payload = {
      title: "在线客服新消息",
      body: "访客发来一条消息",
      targetId: "thread-1",
      targetModule: "onlineService" as const,
    };

    expect(consumeDesktopNotificationDedupe(payload, { channel: "serviceQueue" }, 1_000)).toBe(false);
    expect(
      consumeDesktopNotificationDedupe(
        { ...payload, targetId: "thread-2" },
        { channel: "serviceQueue" },
        1_100,
      ),
    ).toBe(false);
    expect(
      consumeDesktopNotificationDedupe(
        { ...payload, body: "访客又发来一条消息" },
        { channel: "serviceQueue" },
        1_200,
      ),
    ).toBe(false);
    expect(consumeDesktopNotificationDedupe(payload, { channel: "im" }, 1_300)).toBe(false);
  });

  it("allows identical desktop notifications after the dedupe window", () => {
    resetDesktopNotificationDedupeForTest();
    const payload = {
      title: "在线客服新消息",
      body: "访客发来一条消息",
      targetId: "thread-1",
      targetModule: "onlineService" as const,
    };

    expect(consumeDesktopNotificationDedupe(payload, { channel: "serviceQueue" }, 1_000)).toBe(false);
    expect(consumeDesktopNotificationDedupe(payload, { channel: "serviceQueue" }, 3_001)).toBe(false);
  });

  it("derives taskbar badge count and urgency from pending work", () => {
    expect(
      deriveTaskbarBadge({
        contactRequestCount: 1,
        imUnreadCount: 2,
        serviceQueueCount: 3,
        serviceUnreadCount: 4,
      }),
    ).toEqual({ count: 10, urgent: true });
    expect(deriveTaskbarBadge({ imUnreadCount: 2 })).toEqual({
      count: 2,
      urgent: false,
    });
    expect(
      deriveTaskbarBadge({
        contactRequestCount: -3,
        imUnreadCount: Number.NaN,
        serviceQueueCount: 0,
        serviceUnreadCount: 0,
      }),
    ).toEqual({ count: 0, urgent: false });
  });

  it("formats taskbar badge labels with 99+ cap", () => {
    expect(taskbarBadgeLabel(0)).toBe("");
    expect(taskbarBadgeLabel(1)).toBe("1");
    expect(taskbarBadgeLabel(99)).toBe("99");
    expect(taskbarBadgeLabel(100)).toBe("99+");
  });
});

function createReminder(
  id: string,
  createdAt: number,
  targetModule: PcRealtimeReminder["targetModule"] = "messages",
  targetId?: string,
): PcRealtimeReminder {
  return {
    id,
    title: id,
    body: id,
    targetModule,
    targetId,
    createdAt,
  };
}
