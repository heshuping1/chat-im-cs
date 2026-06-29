import { describe, expect, it } from "vitest";

import {
  formatHistoryDateTime,
  historyDatePresetRange,
  historyQueryDateTimeToUtc,
  parseHistoryDate,
} from "../../src/renderer/components/historyDateRange";

describe("customer-service history date range", () => {
  it("uses the selected PC timezone calendar day for the today preset", () => {
    expect(
      historyDatePresetRange("today", "UTC+08:00", new Date("2026-06-29T02:05:26+08:00")),
    ).toEqual({
      from: "2026-06-29T00:00:00",
      to: "2026-06-29T23:59:59",
    });

    expect(
      historyDatePresetRange("yesterday", "UTC+08:00", new Date("2026-06-29T02:05:26+08:00")),
    ).toEqual({
      from: "2026-06-28T00:00:00",
      to: "2026-06-28T23:59:59",
    });
  });

  it("changes the calendar day when the selected timezone changes", () => {
    expect(
      historyDatePresetRange("today", "UTC+00:00", new Date("2026-06-29T02:05:26+08:00")),
    ).toEqual({
      from: "2026-06-28T00:00:00",
      to: "2026-06-28T23:59:59",
    });

    expect(
      historyDatePresetRange("today", "UTC+08:00", new Date("2026-06-29T13:55:29+08:00")),
    ).toEqual({
      from: "2026-06-29T00:00:00",
      to: "2026-06-29T23:59:59",
    });
  });

  it("converts the selected timezone calendar range into UTC query timestamps", () => {
    expect(historyQueryDateTimeToUtc("2026-06-29T00:00:00", "UTC+08:00")).toBe(
      "2026-06-28T16:00:00Z",
    );
    expect(historyQueryDateTimeToUtc("2026-06-29T23:59:59", "UTC+08:00")).toBe(
      "2026-06-29T15:59:59Z",
    );
    expect(historyQueryDateTimeToUtc("2026-06-29T00:00:00", "UTC+00:00")).toBe(
      "2026-06-29T00:00:00Z",
    );
  });

  it("keeps custom calendar selections stable before UTC conversion", () => {
    const date = parseHistoryDate("2026-06-29T00:00:00");

    expect(formatHistoryDateTime(date, "23:59:59")).toBe("2026-06-29T23:59:59");
  });
});
