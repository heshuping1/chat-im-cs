import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getPcSettingsSnapshot: vi.fn(() => ({ apiTrafficLogLevel: "body" })),
  writeRendererAppLog: vi.fn(),
}));

vi.mock("../../src/renderer/data/logging/app-log", () => ({
  writeRendererAppLog: mocks.writeRendererAppLog,
}));

vi.mock("../../src/renderer/data/settings/settings-store", () => ({
  getPcSettingsSnapshot: mocks.getPcSettingsSnapshot,
}));

import { logApiTrafficDiagnostic } from "../../src/renderer/data/api/api-traffic-diagnostics";

describe("api traffic diagnostics", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it("passes request and response JSON structures into app logs", () => {
    const recordApiTrafficDiagnostic = vi.fn(() => Promise.resolve());
    vi.stubGlobal("window", {
      desktopApi: {
        recordApiTrafficDiagnostic,
      },
    });

    logApiTrafficDiagnostic({
      durationMs: 42,
      method: "POST",
      path: "/api/messages?token=raw-token",
      phase: "request",
      requestBody: {
        text: "hello",
        token: "raw-token",
      },
      requestId: "req-1",
      responseBody: {
        code: 0,
        data: {
          messageId: "m-1",
        },
      },
      result: "success",
      status: 200,
    });

    expect(mocks.writeRendererAppLog).toHaveBeenCalledWith(
      expect.objectContaining({
        context: expect.objectContaining({
          request: {
            text: "hello",
            token: "[redacted]",
          },
          response: {
            code: 0,
            data: {
              messageId: "m-1",
            },
          },
        }),
        event: "api.request.completed",
        module: "api",
      }),
    );
  });

  it("keeps server error code and request id searchable in app logs", () => {
    mocks.getPcSettingsSnapshot.mockReturnValue({ apiTrafficLogLevel: "summary" });
    const recordApiTrafficDiagnostic = vi.fn(() => Promise.resolve());
    vi.stubGlobal("window", {
      desktopApi: {
        recordApiTrafficDiagnostic,
      },
    });

    logApiTrafficDiagnostic({
      durationMs: 100,
      method: "POST",
      path: "/api/platform/v1/auth/login",
      phase: "request",
      requestBody: {
        captchaAnswer: "1234",
        identifier: "tree6",
        password: "secret-password",
      },
      requestId: "req-login-1",
      responseBody: {
        code: "AUTH_INVALID_CREDENTIALS",
        message: "账号或密码不正确",
        requestId: "req-login-1",
        data: null,
      },
      result: "failed",
      status: 401,
    });

    expect(mocks.writeRendererAppLog).toHaveBeenCalledWith(
      expect.objectContaining({
        context: expect.objectContaining({
          request: {
            captchaAnswer: "[redacted]",
            identifier: "tree6",
            password: "[redacted]",
          },
          response: expect.objectContaining({
            code: "AUTH_INVALID_CREDENTIALS",
            data: null,
            message: "账号或密码不正确",
            requestId: "req-login-1",
          }),
        }),
        event: "api.request.failed",
        level: "error",
        module: "api",
      }),
    );
    expect(JSON.stringify(mocks.writeRendererAppLog.mock.calls)).not.toContain("secret-password");
    expect(JSON.stringify(mocks.writeRendererAppLog.mock.calls)).not.toContain("1234");
  });

  it("masks email identifiers in summary app logs", () => {
    mocks.getPcSettingsSnapshot.mockReturnValue({ apiTrafficLogLevel: "summary" });
    const recordApiTrafficDiagnostic = vi.fn(() => Promise.resolve());
    vi.stubGlobal("window", {
      desktopApi: {
        recordApiTrafficDiagnostic,
      },
    });

    logApiTrafficDiagnostic({
      durationMs: 100,
      method: "POST",
      path: "/api/platform/v1/auth/login",
      phase: "request",
      requestBody: {
        identifier: "alice@example.com",
        password: "secret-password",
      },
      result: "failed",
      status: 401,
    });

    expect(mocks.writeRendererAppLog).toHaveBeenCalledWith(
      expect.objectContaining({
        context: expect.objectContaining({
          request: expect.objectContaining({
            identifier: "al***@example.com",
          }),
        }),
      }),
    );
    expect(JSON.stringify(mocks.writeRendererAppLog.mock.calls)).not.toContain("alice@example.com");
    expect(JSON.stringify(mocks.writeRendererAppLog.mock.calls)).not.toContain("secret-password");
  });
});
