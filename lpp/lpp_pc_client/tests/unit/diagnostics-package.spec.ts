import { describe, expect, it } from "vitest";

import {
  createDiagnosticsExportPayload,
  sanitizeDiagnosticsValue,
} from "../../src/renderer/data/diagnostics/diagnostics-package";

describe("diagnostics package", () => {
  it("collects buffered diagnostics into a bounded export payload", () => {
    const now = new Date("2026-05-29T10:00:00.000Z");
    const payload = createDiagnosticsExportPayload({
      now,
      target: {
        __lppGatewayDiagnostics: Array.from({ length: 205 }, (_, index) => ({
          traceId: `gateway-${index}`,
          module: "gateway",
          phase: "dispatch",
          result: "ok",
        })),
        __lppApiErrorDiagnostics: [
          {
            traceId: "api-error-1",
            module: "api-error",
            phase: "request",
            result: "failed",
            error: {
              message: "request failed",
            },
          },
        ],
        __lppRuntimeErrorDiagnostics: [
          {
            traceId: "runtime-error-1",
            module: "runtime-error",
            event: "renderer.error",
            result: "failed",
            error: {
              message: "renderer failed",
            },
          },
        ],
        location: {
          pathname: "/settings",
        },
        navigator: {
          language: "zh-CN",
          onLine: true,
          platform: "MacIntel",
          userAgent: "vitest",
        },
      },
      traceId: "trace-1",
    });

    expect(payload.generatedAt).toBe("2026-05-29T10:00:00.000Z");
    expect(payload.traceId).toBe("trace-1");
    expect(payload.breadcrumbs).toContain("gateway:205");
    expect(payload.breadcrumbs).toContain("runtime-error:1");
    expect(payload.diagnostics?.gateway.records).toHaveLength(200);
    expect(payload.diagnostics?.["runtime-error"].records).toHaveLength(1);
    expect(payload.diagnostics?.gateway.truncated).toBe(true);
    expect(payload.diagnostics?.runtime.records[0]).toMatchObject({
      language: "zh-CN",
      pathname: "/settings",
    });
    expect(payload.errors).toEqual([
      {
        at: "api-error-1",
        message: "request failed",
        requestId: undefined,
      },
      {
        at: "runtime-error-1",
        message: "renderer failed",
        requestId: undefined,
      },
    ]);
  });

  it("redacts sensitive keys and bearer headers before export", () => {
    expect(
      sanitizeDiagnosticsValue({
        authorization: "Bearer raw-token",
        nested: {
          refreshToken: "refresh-token",
          text: "failed with Bearer abc.def",
        },
      }),
    ).toEqual({
      authorization: "[redacted]",
      nested: {
        refreshToken: "[redacted]",
        text: "failed with Bearer ***",
      },
    });
  });
});
