import { describe, expect, it } from "vitest";
import {
  dismissRealtimeReminderById,
  dismissRealtimeRemindersForTarget,
  reduceRealtimeReminders,
  shouldPushRealtimeReminder,
  shouldShowDesktopNotification,
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
