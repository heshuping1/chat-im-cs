import { describe, expect, it } from "vitest";
import {
  formatUpdateSize,
  updatePackageSummary,
  updateProgressText,
  updateStateCanDownload,
  updateStateCanInstall,
} from "../../src/renderer/settings/models/clientUpdateModel";
import type { ClientUpdateState } from "../../src/shared/desktop-api";

describe("client update model", () => {
  const baseState: ClientUpdateState = {
    currentVersion: "0.1.0",
    preferences: {
      autoCheck: false,
      channel: "stable",
      downloadMode: "differential-first",
    },
    phase: "idle",
  };

  it("formats package and progress summaries", () => {
    expect(formatUpdateSize(1024 * 1024 * 12.5)).toBe("13 MB");
    expect(
      updatePackageSummary({
        force: true,
        sizeBytes: 1024 * 640,
        updateKind: "delta",
        version: "0.1.1",
      }),
    ).toBe("增量更新 0.1.1，640 KB，强制更新");
    expect(
      updateProgressText({
        bytesPerSecond: 2048,
        percent: 38.2,
        total: 1024,
        transferred: 512,
      }),
    ).toBe("38% · 512 B / 1.0 KB");
  });

  it("derives download and install actions from state", () => {
    expect(updateStateCanDownload({ ...baseState, phase: "available" })).toBe(true);
    expect(updateStateCanDownload({ ...baseState, phase: "downloading" })).toBe(false);
    expect(updateStateCanInstall({ ...baseState, phase: "downloaded" })).toBe(true);
    expect(updateStateCanInstall({ ...baseState, phase: "available" })).toBe(false);
  });
});
