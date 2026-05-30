import { describe, expect, it } from "vitest";

import {
  createRuntimeErrorDiagnosticRecord,
  logRuntimeErrorDiagnostic,
} from "../../src/renderer/data/diagnostics/runtime-error-diagnostics";

describe("runtime error diagnostics", () => {
  it("creates sanitized renderer error diagnostics", () => {
    const record = createRuntimeErrorDiagnosticRecord({
      event: "renderer.error",
      error: new Error("failed with Bearer raw-token"),
      now: new Date("2026-05-30T00:00:00.000Z"),
      source: "https://example.com/app.js?token=raw",
      lineno: 10,
      colno: 4,
    });

    expect(record).toMatchObject({
      module: "runtime-error",
      event: "renderer.error",
      result: "failed",
      occurredAt: "2026-05-30T00:00:00.000Z",
      error: {
        name: "Error",
        message: "failed with Bearer ***",
        source: "https://example.com/app.js?[redacted]",
        lineno: 10,
        colno: 4,
      },
    });
  });

  it("stores diagnostics in a bounded window buffer", () => {
    const target = {} as Window & {
      __lppRuntimeErrorDiagnostics?: ReturnType<typeof createRuntimeErrorDiagnosticRecord>[];
    };

    logRuntimeErrorDiagnostic(
      {
        event: "renderer.unhandled_rejection",
        error: "boom",
        now: new Date("2026-05-30T00:00:00.000Z"),
      },
      target,
    );

    expect(target.__lppRuntimeErrorDiagnostics).toHaveLength(1);
    expect(target.__lppRuntimeErrorDiagnostics?.[0].error.message).toBe("boom");
  });
});
