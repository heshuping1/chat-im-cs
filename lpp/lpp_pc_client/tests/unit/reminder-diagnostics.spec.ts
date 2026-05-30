import { describe, expect, it } from "vitest";
import { createReminderDiagnosticRecord } from "../../src/renderer/data/reminder/reminder-diagnostics";

describe("reminder diagnostics", () => {
  it("creates structured reminder diagnostic records without sensitive payload", () => {
    const record = createReminderDiagnosticRecord({
      event: "reminder.push",
      phase: "push",
      result: "success",
      reason: "realtime_reminder_upserted",
      context: {
        reminderId: "r1",
        targetModule: "messages",
        targetId: "conversation-1",
        beforeCount: 0,
        afterCount: 1,
      },
    });

    expect(record.module).toBe("reminder");
    expect(record.taskId).toBe("P2-ST-005C");
    expect(record.traceId).toMatch(/^reminder-push-/);
    expect(record.context).toEqual({
      reminderId: "r1",
      targetModule: "messages",
      targetId: "conversation-1",
      beforeCount: 0,
      afterCount: 1,
    });
  });
});
