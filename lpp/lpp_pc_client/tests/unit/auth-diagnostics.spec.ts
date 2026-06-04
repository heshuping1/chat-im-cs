import { describe, expect, it } from "vitest";
import {
  createAuthDiagnosticRecord,
  sanitizeAuthDiagnosticContext,
} from "../../src/renderer/data/auth/auth-diagnostics";

describe("auth diagnostics", () => {
  it("creates structured auth diagnostic records", () => {
    const record = createAuthDiagnosticRecord({
      event: "auth.session.restore",
      phase: "restore",
      result: "success",
      reason: "stored_session",
      context: {
        apiBaseUrl: "https://api.example.com",
        hasTenantToken: true,
      },
    });

    expect(record.module).toBe("auth");
    expect(record.taskId).toBe("P2-ST-001F");
    expect(record.traceId).toMatch(/^auth-restore-/);
    expect(record.context).toEqual({
      apiBaseUrl: "https://api.example.com",
      hasTenantToken: true,
    });
  });

  it("redacts sensitive diagnostic context keys", () => {
    expect(
      sanitizeAuthDiagnosticContext({
        apiBaseUrl: "https://api.example.com",
        tenantToken: "tenant-token",
        nested: {
          refreshToken: "refresh-token",
          userId: "user-1",
        },
      }),
    ).toEqual({
      apiBaseUrl: "https://api.example.com",
      tenantToken: "[redacted]",
      nested: {
        refreshToken: "[redacted]",
        userId: "user-1",
      },
    });
  });

});
