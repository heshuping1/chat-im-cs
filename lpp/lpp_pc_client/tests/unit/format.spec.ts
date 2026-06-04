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
import {
  normalizePcUserTimezone,
  pcUserTimezoneOptions,
} from "../../src/renderer/data/time/user-timezone";

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

    expect(formatShortDate(value, { timezone: "UTC+00:00" })).toBe("2026-05-30");
    expect(formatShortDate(value, { timezone: "UTC+08:00" })).toBe("2026-05-31");
    expect(formatMonthDayTime(value, { timezone: "UTC+08:00" })).toBe("05/31 07:30");
    expect(formatClockTime(value, { timezone: "UTC+00:00" })).toBe("23:30");
    expect(formatClockTime(value, { timezone: "UTC+08:00" })).toBe("07:30");
  });

  it("uses the selected PC timezone for chat day boundaries", () => {
    const now = "2026-05-31T01:00:00.000Z";
    const value = "2026-05-30T23:30:00.000Z";

    expect(formatChatTime(value, { timezone: "UTC+00:00", now })).toBe("5/30");
    expect(formatChatTime(value, { timezone: "UTC+08:00", now })).toBe("07:30");
    expect(formatChatMessageTime(value, { timezone: "UTC+00:00", now })).toBe("5/30 23:30");
    expect(formatChatMessageTime(value, { timezone: "UTC+08:00", now })).toBe("07:30");
  });

  it("exposes 24 fixed UTC timezones plus system default", () => {
    expect(pcUserTimezoneOptions).toHaveLength(25);
    expect(pcUserTimezoneOptions.filter((timezone) => timezone !== "系统默认")).toHaveLength(24);
    expect(pcUserTimezoneOptions).toContain("UTC-12:00");
    expect(pcUserTimezoneOptions).toContain("UTC+11:00");
  });

  it("normalizes legacy timezone values into fixed UTC options", () => {
    expect(normalizePcUserTimezone("Asia/Shanghai")).toBe("UTC+08:00");
    expect(normalizePcUserTimezone("UTC")).toBe("UTC+00:00");
    expect(normalizePcUserTimezone("bad")).toBe("系统默认");
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
