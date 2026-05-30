import { describe, expect, it, beforeEach } from "vitest";

import {
  createElectronRuntimeDiagnosticRecord,
  createElectronRuntimeDiagnosticsSnapshot,
  mergeElectronRuntimeDiagnosticsPayload,
  recordElectronRuntimeDiagnostic,
  resetElectronRuntimeDiagnosticsForTest,
} from "../../src/main/runtime-diagnostics";

describe("electron runtime diagnostics", () => {
  beforeEach(() => {
    resetElectronRuntimeDiagnosticsForTest();
  });

  it("creates sanitized runtime diagnostics without leaking tokens", () => {
    const record = createElectronRuntimeDiagnosticRecord({
      event: "main.unhandled_rejection",
      error: new Error("request failed with Bearer raw-token"),
      occurredAt: new Date("2026-05-30T00:00:00.000Z"),
      reason: "token=raw-token",
    });

    expect(record).toMatchObject({
      module: "electron-runtime",
      event: "main.unhandled_rejection",
      result: "failed",
      occurredAt: "2026-05-30T00:00:00.000Z",
      reason: "[redacted]",
      error: {
        name: "Error",
        message: "request failed with Bearer ***",
      },
    });
  });

  it("exports a bounded snapshot and merges it into diagnostics payload", () => {
    recordElectronRuntimeDiagnostic({
      event: "renderer.render_process_gone",
      occurredAt: new Date("2026-05-30T00:00:00.000Z"),
      reason: "crashed",
      exitCode: 9,
      windowId: 1,
    });

    const snapshot = createElectronRuntimeDiagnosticsSnapshot();
    expect(snapshot.records).toHaveLength(1);

    const payload = mergeElectronRuntimeDiagnosticsPayload({
      breadcrumbs: ["pc.open"],
      errors: [],
      generatedAt: "2026-05-30T00:00:00.000Z",
      sessionId: "s1",
      traceId: "t1",
    });

    expect(payload.breadcrumbs).toContain("electron-runtime:1");
    expect(payload.diagnostics?.["electron-runtime"].records).toHaveLength(1);
    expect(payload.errors[0]).toMatchObject({
      message: "crashed",
    });
  });
});
