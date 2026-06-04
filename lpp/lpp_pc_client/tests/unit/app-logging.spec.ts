import { describe, expect, it, vi } from "vitest";

import {
  configureMainAppLogBackend,
  createMainAppLogRecord,
  recordMainAppLog,
  type ElectronLogLike,
} from "../../src/main/app-logging";

describe("main app logging", () => {
  it("creates structured records and redacts sensitive values", () => {
    const record = createMainAppLogRecord({
      context: {
        authorization: "Bearer raw-token",
        nested: {
          password: "secret",
          visible: "ok",
        },
        path: "/api/messages?token=raw-token",
      },
      error: new Error("request failed with Bearer raw-token"),
      event: "ipc.invoke.failed",
      level: "error",
      module: "desktop-ipc",
      occurredAt: new Date("2026-06-04T00:00:00.000Z"),
      phase: "invoke",
      reason: "token=raw-token",
      result: "failed",
      traceId: "ipc-test-trace",
    });

    expect(record).toEqual({
      context: {
        authorization: "[redacted]",
        nested: {
          password: "[redacted]",
          visible: "ok",
        },
        path: "/api/messages?[redacted]",
      },
      error: {
        message: "request failed with Bearer ***",
        name: "Error",
      },
      event: "ipc.invoke.failed",
      level: "error",
      module: "desktop-ipc",
      occurredAt: "2026-06-04T00:00:00.000Z",
      phase: "invoke",
      reason: "[redacted]",
      result: "failed",
      traceId: "ipc-test-trace",
    });
  });

  it("writes records through the provided electron-log compatible backend", () => {
    const backend: ElectronLogLike = {
      debug: vi.fn(),
      error: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
    };

    const record = recordMainAppLog(backend, {
      event: "app.ready",
      level: "info",
      module: "electron-main",
      occurredAt: new Date("2026-06-04T00:00:00.000Z"),
      phase: "startup",
      result: "ok",
      traceId: "startup-test-trace",
    });

    expect(backend.info).toHaveBeenCalledWith("[electron-main] app.ready", record);
    expect(backend.error).not.toHaveBeenCalled();
  });

  it("configures electron-log compatible file and console transports", () => {
    const backend = {
      debug: vi.fn(),
      error: vi.fn(),
      info: vi.fn(),
      transports: {
        console: {},
        file: {
          resolvePathFn: undefined,
        },
      },
      warn: vi.fn(),
    };

    configureMainAppLogBackend(backend, {
      diagnosticsDir: "/tmp/lpp-diagnostics",
      isDev: false,
    });

    expect(backend.transports.file).toMatchObject({
      fileName: "lpp-main.log",
      level: "info",
      maxSize: 2 * 1024 * 1024,
    });
    expect(backend.transports.console).toMatchObject({
      format: "{text}",
      level: "warn",
    });
    expect(backend.transports.file.resolvePathFn()).toBe("/tmp/lpp-diagnostics/lpp-main.log");
    expect(backend.transports.file.format({ data: ["hello"], level: "info" })).toContain(
      "[info] hello",
    );
  });
});
