import { describe, expect, it } from "vitest";

import {
  currentIsoTimestamp,
  formatBadgeCount,
  formatChatMessageTime,
  formatChatTime,
  formatClockTime,
  formatMonthDayTime,
  formatShortDate,
  timestampFromDateValue,
} from "../../src/renderer/lib/format";

describe("format helpers", () => {
  it("formats badge counts with the shared 99+ cap", () => {
    expect(formatBadgeCount(undefined)).toBe("0");
    expect(formatBadgeCount(0)).toBe("0");
    expect(formatBadgeCount(8)).toBe("8");
    expect(formatBadgeCount(100)).toBe("99+");
  });

  it("formats short dates and preserves invalid text", () => {
    expect(formatShortDate("2026-05-30T01:02:03.000Z", { timezone: "UTC" })).toBe(
      "2026-05-30",
    );
    expect(formatShortDate("not-a-date")).toBe("not-a-date");
    expect(formatShortDate(null)).toBe("--");
  });

  it("formats display times in the selected PC timezone", () => {
    const value = "2026-05-30T23:30:00.000Z";

    expect(formatShortDate(value, { timezone: "UTC" })).toBe("2026-05-30");
    expect(formatShortDate(value, { timezone: "Asia/Shanghai" })).toBe("2026-05-31");
    expect(formatMonthDayTime(value, { timezone: "Asia/Shanghai" })).toBe("05/31 07:30");
    expect(formatClockTime(value, { timezone: "UTC" })).toBe("23:30");
    expect(formatClockTime(value, { timezone: "Asia/Shanghai" })).toBe("07:30");
  });

  it("uses the selected PC timezone for chat day boundaries", () => {
    const now = "2026-05-31T01:00:00.000Z";
    const value = "2026-05-30T23:30:00.000Z";

    expect(formatChatTime(value, { timezone: "UTC", now })).toBe("5/30");
    expect(formatChatTime(value, { timezone: "Asia/Shanghai", now })).toBe("07:30");
    expect(formatChatMessageTime(value, { timezone: "UTC", now })).toBe("5/30 23:30");
    expect(formatChatMessageTime(value, { timezone: "Asia/Shanghai", now })).toBe("07:30");
  });

  it("normalizes date values for sort and local timestamps", () => {
    expect(timestampFromDateValue("2026-05-30T00:00:00.000Z")).toBe(
      Date.parse("2026-05-30T00:00:00.000Z"),
    );
    expect(timestampFromDateValue("bad")).toBe(0);
    expect(currentIsoTimestamp(Date.parse("2026-05-30T00:00:00.000Z"))).toBe(
      "2026-05-30T00:00:00.000Z",
    );
  });
});
