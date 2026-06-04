import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  createElectronRuntimeDiagnosticRecord,
  createElectronRuntimeDiagnosticsSnapshot,
  mergeElectronRuntimeDiagnosticsPayload,
  recordElectronRuntimeDiagnostic,
  resetElectronRuntimeDiagnosticsForTest,
  setElectronRuntimeDiagnosticLogger,
} from "../../src/main/runtime-diagnostics";
import type { ElectronLogLike } from "../../src/main/app-logging";

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

  it("records sanitized media cache failures for video diagnostics", () => {
    const record = createElectronRuntimeDiagnosticRecord({
      event: "media.cache_failed",
      error: new Error("文件下载失败：HTTP 403; content-type=application/json"),
      occurredAt: new Date("2026-05-30T00:00:00.000Z"),
      reason: "kind=video urlType=https fileName=clip.mp4 token=raw-token",
    });

    expect(record).toMatchObject({
      event: "media.cache_failed",
      reason: "kind=video urlType=https fileName=clip.mp4 [redacted]",
      error: {
        message: "文件下载失败：HTTP 403; content-type=application/json",
      },
    });
  });

  it("records local media cache failure reasons without full source paths", () => {
    const record = createElectronRuntimeDiagnosticRecord({
      event: "media.local_cache_failed",
      error: new Error("本地媒体文件不可用：source_file_unavailable"),
      occurredAt: new Date("2026-05-31T00:00:00.000Z"),
      reason: "kind=video urlType=blob fileName=clip.mp4 source=source_file_unavailable",
    });

    expect(record).toMatchObject({
      event: "media.local_cache_failed",
      reason: "kind=video urlType=blob fileName=clip.mp4 source=source_file_unavailable",
      error: {
        message: "本地媒体文件不可用：source_file_unavailable",
      },
    });
  });

  it("mirrors runtime diagnostics to the main app logger when configured", () => {
    const logger: ElectronLogLike = {
      debug: vi.fn(),
      error: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
    };
    setElectronRuntimeDiagnosticLogger(logger);

    const record = recordElectronRuntimeDiagnostic({
      event: "main.unhandled_rejection",
      error: new Error("request failed with Bearer raw-token"),
      occurredAt: new Date("2026-06-04T00:00:00.000Z"),
      reason: "token=raw-token",
    });

    expect(logger.error).toHaveBeenCalledWith(
      "[electron-runtime] main.unhandled_rejection",
      expect.objectContaining({
        error: {
          message: "request failed with Bearer ***",
          name: "Error",
        },
        event: "main.unhandled_rejection",
        level: "error",
        module: "electron-runtime",
        phase: "runtime",
        reason: "[redacted]",
        result: "failed",
        traceId: record.traceId,
      }),
    );
  });
});
