import { describe, expect, it } from "vitest";
import { createApiErrorDiagnosticRecord } from "../../src/renderer/data/api/api-error-diagnostics";
import { ApiError } from "../../src/renderer/data/api/base";

describe("api error diagnostics", () => {
  it("creates structured request diagnostics without query details", () => {
    const record = createApiErrorDiagnosticRecord({
      phase: "request",
      method: "POST",
      path: "/api/messages?token=secret&requestId=req-1",
      durationMs: 42,
      error: new ApiError("HTTP 500 /api/messages?token=secret", "SERVER_ERROR", "req-1", 500),
    });

    expect(record.module).toBe("api-error");
    expect(record.taskId).toBe("P3-API-005C");
    expect(record.traceId).toMatch(/^api-error-request-/);
    expect(record.method).toBe("POST");
    expect(record.path).toBe("/api/messages");
    expect(record.durationMs).toBe(42);
    expect(record.error).toMatchObject({
      kind: "server",
      code: "SERVER_ERROR",
      requestId: "req-1",
      status: 500,
    });
  });

  it("creates upload diagnostics for aborted requests", () => {
    const record = createApiErrorDiagnosticRecord({
      phase: "upload",
      method: "POST",
      path: "/api/media",
      error: new DOMException("Upload aborted", "AbortError"),
    });

    expect(record.phase).toBe("upload");
    expect(record.error.kind).toBe("aborted");
    expect(record.error.userMessage).toBe("操作已取消");
  });
});
