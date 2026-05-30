import { describe, expect, it } from "vitest";

import {
  extractPerformanceSamples,
  percentile,
  summarizePerformanceSamples,
} from "../../src/renderer/data/performance/performance-samples";
import type { DiagnosticsPayload } from "../../src/shared/desktop-api";

describe("performance samples", () => {
  it("extracts startup samples from diagnostics payloads", () => {
    const payload: DiagnosticsPayload = {
      breadcrumbs: [],
      diagnostics: {
        runtime: {
          recordCount: 1,
          records: [{ platform: "Win32" }],
        },
        startup: {
          recordCount: 2,
          records: [
            {
              event: "startup.renderer-entry",
              durationMs: 620,
            },
            {
              event: "startup.first-interactive",
              durationMs: 1800,
            },
          ],
        },
      },
      errors: [],
      generatedAt: "2026-05-30T00:00:00.000Z",
      sessionId: "s1",
      traceId: "trace-1",
    };

    expect(extractPerformanceSamples([payload])).toEqual([
      {
        metric: "startup.renderer-entry",
        durationMs: 620,
        generatedAt: "2026-05-30T00:00:00.000Z",
        platform: "Win32",
        source: "trace-1:0:0",
      },
      {
        metric: "startup.first-interactive",
        durationMs: 1800,
        generatedAt: "2026-05-30T00:00:00.000Z",
        platform: "Win32",
        source: "trace-1:0:1",
      },
    ]);
  });

  it("summarizes samples with percentile budgets", () => {
    const summary = summarizePerformanceSamples(
      [100, 200, 300, 400].map((durationMs) => ({
        metric: "startup.renderer-entry",
        durationMs,
        source: String(durationMs),
      })),
      { "startup.renderer-entry": 250 },
    );

    expect(summary).toEqual([
      {
        metric: "startup.renderer-entry",
        count: 4,
        minMs: 100,
        p50Ms: 200,
        p75Ms: 300,
        p95Ms: 400,
        maxMs: 400,
        budgetMs: 250,
        status: "warning",
      },
    ]);
  });

  it("uses nearest-rank percentile", () => {
    expect(percentile([1, 2, 3, 4, 5], 75)).toBe(4);
    expect(percentile([5, 1, 3], 50)).toBe(3);
    expect(percentile([], 95)).toBe(0);
  });
});
