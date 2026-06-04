import { mkdtemp, readFile, rm, stat, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { describe, expect, it, vi } from "vitest";

import {
  configureMainAppLogBackend,
  createFileAppLogRecord,
  createMainAppLogRecord,
  mainAppLogBackend,
  recordMainAppLog,
  writeAppLogToFile,
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
        path: "/api/messages?token=[redacted]",
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
      logsDir: "/tmp/lpp-logs",
      isDev: false,
    });

    expect(backend.transports.file).toMatchObject({
      fileName: "root.log",
      level: "info",
      maxSize: 2 * 1024 * 1024,
    });
    expect(backend.transports.console).toMatchObject({
      format: "{text}",
      level: "warn",
    });
    expect(backend.transports.file.resolvePathFn().replaceAll("\\", "/")).toBe(
      "/tmp/lpp-logs/root.log",
    );
    expect(backend.transports.file.format({ data: ["hello"], level: "info" })).toContain(
      "[info] hello",
    );
  });

  it("creates file app log records for renderer supplied auth role events", () => {
    const record = createFileAppLogRecord({
      context: {
        email: "a@example.com",
        phone: "13800138000",
        query: "/api/me?access_token=raw-token",
        tenantId: "tenant-1",
        spaceRole: 0,
        tenantRole: 2,
        sessionRole: 0,
        token: "raw-token",
      },
      event: "auth.space.switch.apply",
      module: "auth",
      occurredAt: "2026-06-04T00:00:00.000Z",
      phase: "role",
      result: "ok",
      traceId: "role-test-trace",
    });

    expect(record).toMatchObject({
      context: {
        email: "[email-redacted]",
        phone: "[phone-redacted]",
        query: "/api/me?access_token=[redacted]",
        tenantId: "tenant-1",
        spaceRole: 0,
        tenantRole: 2,
        sessionRole: 0,
        token: "[redacted]",
      },
      event: "auth.space.switch.apply",
      module: "auth",
      occurredAt: "2026-06-04T00:00:00.000Z",
      phase: "role",
      result: "ok",
      traceId: "role-test-trace",
    });
  });

  it("writes all renderer app logs to root.log and mirrors errors to error.log", async () => {
    const logsDir = await mkdtemp(join(tmpdir(), "lpp-logs-"));
    const backend = {
      debug: vi.fn(),
      error: vi.fn(),
      info: vi.fn(),
      transports: {
        file: {
          resolvePathFn: undefined,
        },
      },
      warn: vi.fn(),
    };

    try {
      configureMainAppLogBackend(backend, { logsDir, isDev: false });
      const rootLogPath = join(logsDir, "root.log");
      const errorLogPath = join(logsDir, "error.log");
      await writeFile(rootLogPath, "x".repeat(2 * 1024 * 1024 + 1), "utf8");

      await writeAppLogToFile({
        context: {
          tenantId: "tenant-1",
          tenantRole: 2,
          sessionRole: 0,
          password: "raw-password",
        },
        event: "auth.space.switch.apply",
        module: "auth",
        occurredAt: "2026-06-04T12:00:00.000Z",
        phase: "role",
        result: "ok",
        traceId: "pc-space-test",
      });
      await writeAppLogToFile({
        context: {
          method: "GET",
          path: "/api/messages",
          status: 500,
        },
        error: "request failed",
        event: "api.request.failed",
        level: "error",
        module: "api",
        occurredAt: "2026-06-04T12:01:00.000Z",
        phase: "request",
        result: "failed",
        traceId: "pc-api-test",
      });

      const rootLogText = await readFile(rootLogPath, "utf8");
      expect(rootLogText).toContain(
        "2026-06-04T12:00:00.000Z [info] [auth] auth.space.switch.apply",
      );
      expect(rootLogText).toContain(
        "2026-06-04T12:01:00.000Z [error] [api] api.request.failed",
      );
      expect(rootLogText).toContain("tenantRole=2");
      expect(rootLogText).toContain("sessionRole=0");
      expect(rootLogText).toContain("password=[redacted]");
      const errorLogText = await readFile(errorLogPath, "utf8");
      expect(errorLogText).not.toContain("auth.space.switch.apply");
      expect(errorLogText).toContain("[api] api.request.failed");
      expect(await stat(`${rootLogPath}.1`)).toMatchObject({ size: 2 * 1024 * 1024 + 1 });
    } finally {
      await rm(logsDir, { force: true, recursive: true });
    }
  });

  it("keeps request and response log values as JSON without turning the whole log line into JSON", async () => {
    const logsDir = await mkdtemp(join(tmpdir(), "lpp-logs-"));
    const backend = {
      debug: vi.fn(),
      error: vi.fn(),
      info: vi.fn(),
      transports: {
        file: {
          resolvePathFn: undefined,
        },
      },
      warn: vi.fn(),
    };

    try {
      configureMainAppLogBackend(backend, { logsDir, isDev: false });
      const rootLogPath = join(logsDir, "root.log");

      await writeAppLogToFile({
        context: {
          method: "POST",
          path: "/api/messages",
          request: {
            body: {
              text: "hello",
              token: "raw-token",
            },
            kind: "object",
          },
          response: {
            body: {
              code: 0,
              data: {
                messageId: "m-1",
              },
            },
            kind: "object",
          },
        },
        event: "api.request.completed",
        module: "api",
        occurredAt: "2026-06-04T12:03:00.000Z",
        phase: "request",
        result: "ok",
        traceId: "pc-api-json-test",
      });

      const rootLogText = await readFile(rootLogPath, "utf8");
      const line = rootLogText.trim();
      expect(line).toContain("2026-06-04T12:03:00.000Z [info] [api] api.request.completed");
      expect(line).not.toMatch(/^\{/);
      expect(line).toContain('request={"body":{"text":"hello","token":"[redacted]"},"kind":"object"}');
      expect(line).toContain('response={"body":{"code":0,"data":{"messageId":"m-1"}},"kind":"object"}');
    } finally {
      await rm(logsDir, { force: true, recursive: true });
    }
  });

  it("mirrors default main app errors to error.log", async () => {
    const logsDir = await mkdtemp(join(tmpdir(), "lpp-logs-"));

    try {
      configureMainAppLogBackend(mainAppLogBackend, { logsDir, isDev: false });
      recordMainAppLog(mainAppLogBackend, {
        error: new Error("boom"),
        event: "main.unhandled_rejection",
        level: "error",
        module: "electron-runtime",
        occurredAt: new Date("2026-06-04T12:02:00.000Z"),
        phase: "runtime",
        result: "failed",
        traceId: "pc-runtime-test",
      });

      await vi.waitFor(async () => {
        const errorLogText = await readFile(join(logsDir, "error.log"), "utf8");
        expect(errorLogText).toContain("[electron-runtime] main.unhandled_rejection");
      });
    } finally {
      await rm(logsDir, { force: true, recursive: true });
    }
  });
});
