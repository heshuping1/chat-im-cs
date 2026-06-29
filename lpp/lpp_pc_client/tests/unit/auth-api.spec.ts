import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ApiClient, endpointPlan } from "../../src/renderer/data/api-client";

describe("auth api client", () => {
  const originalFetch = globalThis.fetch;
  const originalWindow = globalThis.window;
  const requests: Array<{ body?: unknown; method: string; url: string }> = [];
  const diagnosticRecords: unknown[] = [];

  beforeEach(() => {
    requests.length = 0;
    diagnosticRecords.length = 0;
    (globalThis as any).window = {
      desktopApi: {
        recordMessageReminderDiagnostic: vi.fn((record: unknown) => {
          diagnosticRecords.push(record);
          return Promise.resolve();
        }),
      },
      localStorage: {
        getItem: vi.fn(() => null),
        setItem: vi.fn(),
      },
    };
    globalThis.fetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      requests.push({
        body: init?.body ? JSON.parse(String(init.body)) : undefined,
        method: init?.method ?? "GET",
        url: String(input),
      });
      return new Response(
        JSON.stringify({
          code: "OK",
          data: {
            platformToken: "platform-token",
            platformUserId: "platform-user-1",
            lppId: "lpp_10086",
            displayName: "新用户",
            tenants: [],
          },
        }),
        { status: 200 },
      );
    }) as typeof fetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    (globalThis as any).window = originalWindow;
  });

  it("declares the platform registration endpoint", () => {
    expect(endpointPlan.platformRegister).toBe("/api/platform/v1/auth/register");
    expect(endpointPlan.platformInvitation).toBe("/api/platform/v1/invitations/{code}");
    expect(endpointPlan.platformInvitationAccept).toBe("/api/platform/v1/invitations/{code}/accept");
    expect(endpointPlan.refreshPlatformTokenByRefreshToken).toBe(
      "/api/platform/v1/auth/refresh-platform-token-by-refresh-token",
    );
    expect(endpointPlan.deviceSessionExchange).toBe(
      "/api/platform/v1/auth/device-session/exchange",
    );
    expect(endpointPlan.tenantTokenRefresh).toBe("/api/client/v1/auth/refresh");
  });

  it("registers platform accounts with trimmed public fields and no local-only fields", async () => {
    await apiClient().platformRegister({
      displayName: "  新用户  ",
      email: " pc@example.test ",
      mobile: " ",
      password: " DoNotTrimPassword ",
      captchaToken: " captcha-token ",
      captchaAnswer: " 42 ",
      verificationCode: " 123456 ",
      tenantId: " tenant-1 ",
      avatarUrl: " data:image/svg+xml,%3Csvg%3Eavatar%3C/svg%3E ",
    });

    expect(requests[0]).toEqual({
      method: "POST",
      url: "https://api.example/api/platform/v1/auth/register",
      body: {
        displayName: "新用户",
        email: "pc@example.test",
        mobile: null,
        password: " DoNotTrimPassword ",
        captchaToken: "captcha-token",
        captchaAnswer: "42",
        verificationCode: "123456",
        tenantId: "tenant-1",
        avatarUrl: "data:image/svg+xml,%3Csvg%3Eavatar%3C/svg%3E",
      },
    });
    expect(JSON.stringify(requests[0].body)).not.toContain("invite");
    expect(JSON.stringify(requests[0].body)).not.toContain("invitation");
  });

  it("keeps platform login request shape stable", async () => {
    await apiClient().platformLogin({
      identifier: "pc@example.test",
      password: "secret",
      loginType: "email",
    });

    expect(requests[0]).toMatchObject({
      method: "POST",
      url: "https://api.example/api/platform/v1/auth/login",
      body: {
        identifier: "pc@example.test",
        password: "secret",
        loginType: "email",
        captchaToken: null,
        captchaAnswer: null,
        issueRefreshToken: true,
        trustDevice: true,
        devicePlatform: "pc",
      },
    });
  });

  it("refreshes platform and tenant credentials through dedicated auth endpoints", async () => {
    await apiClient().refreshPlatformTokenByRefreshToken("prt_token");
    await apiClient().deviceSessionExchange({
      deviceSessionToken: "ds_token",
      issueRefreshToken: true,
    });
    await apiClient().refreshTenantToken("tenant-refresh-token");

    expect(requests[0]).toEqual({
      body: { platformRefreshToken: "prt_token" },
      method: "POST",
      url: "https://api.example/api/platform/v1/auth/refresh-platform-token-by-refresh-token",
    });
    expect(requests[1]).toEqual({
      body: { deviceSessionToken: "ds_token", issueRefreshToken: true },
      method: "POST",
      url: "https://api.example/api/platform/v1/auth/device-session/exchange",
    });
    expect(requests[2]).toEqual({
      body: { refreshToken: "tenant-refresh-token" },
      method: "POST",
      url: "https://api.example/api/client/v1/auth/refresh",
    });
  });

  it("previews and accepts platform invitations by code with platform token", async () => {
    await apiClient().getPlatformInvitationPreview(" D0BFA03D38DC013C ");
    await apiClient().acceptPlatformInvitation(" D0BFA03D38DC013C ");

    expect(requests[0]).toMatchObject({
      method: "GET",
      url: "https://api.example/api/platform/v1/invitations/D0BFA03D38DC013C",
    });
    expect(requests[1]).toMatchObject({
      method: "POST",
      url: "https://api.example/api/platform/v1/invitations/D0BFA03D38DC013C/accept",
      body: {},
    });
  });

  it("records invitation API gateway request and response diagnostics through desktop diagnostics", async () => {
    await apiClient().getPlatformInvitationPreview(" 5BC4B6A19CF80546 ");

    expect(diagnosticRecords).toHaveLength(2);
    expect(diagnosticRecords[0]).toMatchObject({
      event: "auth.invitation.preview",
      source: "auth-api-gateway",
      phase: "request",
      route: "platform-invitation",
      classification: {
        endpoint: "/api/platform/v1/invitations/{code}",
        method: "GET",
        platformSessionPresent: true,
        result: "request",
      },
    });
    expect(diagnosticRecords[1]).toMatchObject({
      event: "auth.invitation.preview",
      source: "auth-api-gateway",
      phase: "response",
      classification: {
        result: "success",
      },
    });
    expect(JSON.stringify(diagnosticRecords)).not.toContain("5BC4B6A19CF80546");
  });
});

function apiClient() {
  return new ApiClient({
    baseUrl: "https://api.example",
    platformToken: "platform-token",
    tenantToken: "tenant-token",
    traceId: "trace-auth",
  });
}
