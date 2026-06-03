import { describe, expect, it } from "vitest";
import {
  getDiagnosticsRecordGroups,
  getDiagnosticsRecordFilterSummaries,
  getDiagnosticsRecordsLogText,
  getRecentDiagnosticsRecords,
  summarizeDiagnosticsRecords,
} from "../../src/renderer/settings/models/diagnosticsRecords";

describe("diagnostics records view model", () => {
  it("aggregates recent records from supported diagnostics modules", () => {
    const records = getRecentDiagnosticsRecords({
      limit: 10,
      target: {
        __lppMessageCenterDiagnostics: [
          {
            traceId: "msg-trace-1",
            module: "message-center",
            taskId: "P5-IM-001E",
            event: "command.failed",
            phase: "command",
            result: "failed",
            timestamp: 1_700_000_000_000,
            reason: "send failed",
          },
        ],
        __lppGatewayDiagnostics: [
          {
            traceId: "gateway-trace-1",
            module: "gateway",
            taskId: "P1-OBS-001",
            event: "im.message.received",
            phase: "handled",
            result: "ok",
            timestamp: 1_700_000_001_000,
          },
        ],
      },
    });

    expect(records.map((record) => record.module)).toEqual(["gateway", "message-center"]);
    expect(records[0]).toMatchObject({
      event: "im.message.received",
      moduleLabel: "网关",
      phase: "handled",
      result: "ok",
      traceId: "gateway-trace-1",
    });
  });

  it("filters records by product module group", () => {
    const records = getRecentDiagnosticsRecords({
      moduleFilter: "api-error",
      target: {
        __lppApiErrorDiagnostics: [
          {
            traceId: "api-trace-1",
            module: "api-error",
            taskId: "P3-API-005C",
            phase: "request",
            result: "failed",
            timestamp: 1_700_000_002_000,
            method: "POST",
            path: "/api/messages",
            error: {
              kind: "server",
              code: "SERVER_ERROR",
              userMessage: "服务异常",
            },
          },
        ],
        __lppSettingsDiagnostics: [
          {
            traceId: "settings-trace-1",
            module: "settings",
            taskId: "P2-ST-002D",
            event: "settings.update",
            phase: "update",
            result: "success",
            timestamp: 1_700_000_001_000,
          },
        ],
      },
    });

    expect(records).toHaveLength(1);
    expect(records[0]).toMatchObject({
      module: "api-error",
      moduleLabel: "API 错误",
      reason: "服务异常",
    });
  });

  it("redacts sensitive details and truncates long summaries", () => {
    const records = getRecentDiagnosticsRecords({
      target: {
        __lppSettingsDiagnostics: [
          {
            traceId: "settings-trace-sensitive",
            module: "settings",
            taskId: "P2-ST-002D",
            event: "settings.persist",
            phase: "persist",
            result: "failed",
            timestamp: 1_700_000_003_000,
            reason:
              "Bearer abc.def token=secret Authorization: secret Cookie: sid=1 mobile 13812345678 " +
              "x".repeat(200),
          },
        ],
      },
    });

    expect(records[0].reason).toContain("Bearer ***");
    expect(records[0].reason).toContain("[redacted]");
    expect(records[0].reason).toContain("138****5678");
    expect(records[0].reason.length).toBeLessThanOrEqual(123);
    expect(records[0].reason).not.toContain("abc.def");
    expect(records[0].reason).not.toContain("secret");
  });

  it("summarizes empty and failed diagnostics records", () => {
    expect(summarizeDiagnosticsRecords([])).toEqual({
      failedCount: 0,
      latestErrorAt: null,
      totalCount: 0,
    });

    expect(
      summarizeDiagnosticsRecords([
        {
          at: "2026-06-03T10:00:00.000Z",
          event: "settings.update",
          module: "settings",
          moduleLabel: "设置",
          phase: "update",
          reason: "ok",
          result: "success",
          traceId: "settings-ok",
        },
        {
          at: "2026-06-03T10:01:00.000Z",
          event: "command.failed",
          module: "message-center",
          moduleLabel: "消息链路",
          phase: "command",
          reason: "failed",
          result: "failed",
          traceId: "message-failed",
        },
      ]),
    ).toEqual({
      failedCount: 1,
      latestErrorAt: "2026-06-03T10:01:00.000Z",
      totalCount: 2,
    });
  });

  it("groups records by module and exposes readable text log lines", () => {
    const records = getRecentDiagnosticsRecords({
      target: {
        __lppMessageCenterDiagnostics: Array.from({ length: 3 }, (_, index) => ({
          traceId: `msg-trace-${index}`,
          module: "message-center",
          taskId: "P5-IM-001E",
          event: "command.failed",
          phase: "command",
          result: "failed",
          timestamp: 1_700_000_000_000 + index,
          reason: `send failed ${index}`,
        })),
        __lppGatewayDiagnostics: [
          {
            traceId: "gateway-trace-1",
            module: "gateway",
            taskId: "P1-OBS-001",
            event: "im.message.received",
            phase: "handled",
            result: "ok",
            timestamp: 1_700_000_010_000,
          },
        ],
      },
    });
    const groups = getDiagnosticsRecordGroups(records);

    expect(groups.map((group) => group.moduleLabel)).toEqual(["网关", "消息链路"]);
    expect(groups[1].records).toHaveLength(3);
    expect(groups[1].records[0].logLine).toContain("[消息链路]");
    expect(groups[1].records[0].logLine).toContain("command.failed");
    expect(groups[1].records[0].logLine).toContain("send failed");
    expect(groups[1].records[0].logLine).toContain("trace=msg-trace-");
  });

  it("builds a chronological combined log for the all filter", () => {
    const records = getRecentDiagnosticsRecords({
      target: {
        __lppMessageCenterDiagnostics: [
          {
            traceId: "msg-trace-1",
            module: "message-center",
            taskId: "P5-IM-001E",
            event: "command.failed",
            phase: "command",
            result: "failed",
            timestamp: 1_700_000_000_000,
            reason: "send failed",
          },
        ],
        __lppApiErrorDiagnostics: [
          {
            traceId: "api-trace-1",
            module: "api-error",
            taskId: "P3-API-005C",
            phase: "request",
            result: "failed",
            timestamp: 1_700_000_001_000,
            error: {
              kind: "server",
              userMessage: "目标内容不存在",
            },
          },
        ],
      },
    });

    const logText = getDiagnosticsRecordsLogText(records);

    expect(logText.split("\n")).toHaveLength(2);
    expect(logText.split("\n")[0]).toContain("[API 错误]");
    expect(logText.split("\n")[1]).toContain("[消息链路]");
  });

  it("summarizes filter counts from the complete diagnostics set", () => {
    const records = getRecentDiagnosticsRecords({
      target: {
        __lppMessageCenterDiagnostics: [
          {
            traceId: "msg-trace-1",
            module: "message-center",
            taskId: "P5-IM-001E",
            event: "command.failed",
            phase: "command",
            result: "failed",
            timestamp: 1_700_000_000_000,
          },
        ],
        __lppGatewayDiagnostics: [
          {
            traceId: "gateway-trace-1",
            module: "gateway",
            taskId: "P1-OBS-001",
            event: "im.message.received",
            phase: "handled",
            result: "ok",
            timestamp: 1_700_000_001_000,
          },
        ],
      },
    });

    expect(getDiagnosticsRecordFilterSummaries(records)).toEqual([
      { id: "all", label: "全部", count: 2, failedCount: 1 },
      { id: "message", label: "消息链路", count: 1, failedCount: 1 },
      { id: "gateway", label: "网关", count: 1, failedCount: 0 },
      { id: "cs-routing", label: "客服路由", count: 0, failedCount: 0 },
      { id: "api-error", label: "API 错误", count: 0, failedCount: 0 },
      { id: "settings", label: "设置", count: 0, failedCount: 0 },
      { id: "runtime", label: "运行时", count: 0, failedCount: 0 },
    ]);
  });
});
