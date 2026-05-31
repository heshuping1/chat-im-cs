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

  it("records React boundary context without leaking URL query secrets", () => {
    const record = createRuntimeErrorDiagnosticRecord({
      event: "renderer.error",
      error: new Error("Should have a queue. token=secret"),
      message: "\n    at MessageCenter (http://localhost:5173/src/renderer/components/MessageCenter.tsx)",
      now: new Date("2026-05-31T00:00:00.000Z"),
      source: "AppErrorBoundary",
      context: {
        activeModule: "messages",
        componentStack:
          "\n    at MessageCenter (http://localhost:5173/src/renderer/components/MessageCenter.tsx?token=secret)",
        resetKey: "messages",
        url: "http://localhost:5173/?token=secret&conversationId=c1",
      },
    });

    expect(record.error.message).toBe("Should have a queue. [redacted]");
    expect(record.context).toMatchObject({
      activeModule: "messages",
      componentStack: expect.stringContaining("MessageCenter"),
      resetKey: "messages",
      url: "http://localhost:5173/?[redacted]&conversationId=c1",
    });
    expect(JSON.stringify(record)).not.toContain("secret");
  });
});
