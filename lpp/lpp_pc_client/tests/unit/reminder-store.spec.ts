import { describe, expect, it, vi } from "vitest";
import {
  selectDismissRealtimeReminder,
  selectDismissRealtimeRemindersForTarget,
  selectPushRealtimeReminder,
  selectRealtimeReminders,
} from "../../src/renderer/data/reminder/reminder-store";
import type { PcRealtimeReminder } from "../../src/renderer/data/reminder/reminder-types";

describe("reminder store selectors", () => {
  it("selects reminder state and actions from compatible workspace state", () => {
    const reminder: PcRealtimeReminder = {
      id: "r1",
      title: "提醒",
      body: "body",
      targetModule: "messages",
      createdAt: 1,
    };
    const pushRealtimeReminder = vi.fn();
    const dismissRealtimeReminder = vi.fn();
    const dismissRealtimeRemindersForTarget = vi.fn();
    const state = {
      realtimeReminders: [reminder],
      pushRealtimeReminder,
      dismissRealtimeReminder,
      dismissRealtimeRemindersForTarget,
    };

    expect(selectRealtimeReminders(state)).toEqual([reminder]);
    expect(selectPushRealtimeReminder(state)).toBe(pushRealtimeReminder);
    expect(selectDismissRealtimeReminder(state)).toBe(dismissRealtimeReminder);
    expect(selectDismissRealtimeRemindersForTarget(state)).toBe(
      dismissRealtimeRemindersForTarget,
    );
  });
});
