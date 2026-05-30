import { describe, expect, it } from "vitest";

import {
  currentIsoTimestamp,
  formatBadgeCount,
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
    expect(formatShortDate("2026-05-30T01:02:03.000Z")).toBe("2026-05-30");
    expect(formatShortDate("not-a-date")).toBe("not-a-date");
    expect(formatShortDate(null)).toBe("--");
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
