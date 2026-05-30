import { describe, expect, it } from "vitest";

import {
  appendStartupDiagnostic,
  createStartupDiagnosticRecord,
} from "../../src/renderer/data/performance/startup-performance";

describe("startup performance diagnostics", () => {
  it("creates budgeted startup diagnostic records", () => {
    const record = createStartupDiagnosticRecord({
      budgetMs: 2_500,
      durationMs: 2_760.4,
      event: "startup.first-interactive",
      phase: "interactive",
      surface: "authenticated-shell",
      timestamp: 1_717_000_000_000,
    });

    expect(record).toMatchObject({
      module: "startup",
      taskId: "P8-PERF-001B",
      event: "startup.first-interactive",
      phase: "interactive",
      result: "warning",
      durationMs: 2760,
      budgetMs: 2500,
      reason: "startup_budget_exceeded",
      context: {
        surface: "authenticated-shell",
      },
    });
    expect(record.traceId).toMatch(/^startup-interactive-/);
  });

  it("buffers startup diagnostics for diagnostics package export", () => {
    const target = {
      __lppStartupDiagnostics: [] as ReturnType<typeof createStartupDiagnosticRecord>[],
    };

    appendStartupDiagnostic(
      createStartupDiagnosticRecord({
        budgetMs: 800,
        durationMs: 100,
        event: "startup.renderer-entry",
        phase: "entry",
      }),
      target,
    );

    expect(target.__lppStartupDiagnostics).toHaveLength(1);
    expect(target.__lppStartupDiagnostics[0].result).toBe("ok");
  });
});
