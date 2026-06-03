import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ApiClient, endpointPlan } from "../../src/renderer/data/api-client";

describe("auth api client", () => {
  const originalFetch = globalThis.fetch;
  const requests: Array<{ body?: unknown; method: string; url: string }> = [];

  beforeEach(() => {
    requests.length = 0;
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
  });

  it("declares the platform registration endpoint", () => {
    expect(endpointPlan.platformRegister).toBe("/api/platform/v1/auth/register");
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
        devicePlatform: "pc",
      },
    });
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
