import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { recoverAuthSession } from "../../src/renderer/data/auth/auth-session-recovery";
import type { AuthSession } from "../../src/renderer/data/auth/auth-session";

describe("auth session recovery", () => {
  const originalFetch = globalThis.fetch;
  const requests: Array<{ body?: unknown; method: string; url: string }> = [];

  beforeEach(() => {
    requests.length = 0;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.unstubAllGlobals();
  });

  it("rebuilds the current tenant session from a device session token", async () => {
    globalThis.fetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      requests.push({
        body: init?.body ? JSON.parse(String(init.body)) : undefined,
        method: init?.method ?? "GET",
        url: String(input),
      });
      if (String(input).endsWith("/api/platform/v1/auth/device-session/exchange")) {
        return ok({
          displayName: "Tester",
          lppId: "lpp_1",
          platformRefreshToken: "prt-new",
          platformToken: "platform-new",
          platformUserId: "platform-user-1",
        });
      }
      if (String(input).endsWith("/api/platform/v1/auth/select-tenant")) {
        return ok({
          accessToken: "tenant-new",
          displayName: "Tester",
          lppId: "lpp_1",
          platformUserId: "platform-user-1",
          refreshToken: "tenant-refresh-new",
          tenantId: "tenant-1",
          userId: "user-1",
          spaceContext: { spaceType: 2, tenantId: "tenant-1" },
        });
      }
      if (String(input).endsWith("/api/client/v1/profile/me")) {
        return ok({
          avatarUrl: "https://assets.example/avatar.png",
          displayName: "Tester",
          lppId: "lpp_1",
          platformUserId: "platform-user-1",
          userId: "user-1",
          userType: 2,
        });
      }
      if (String(input).endsWith("/api/client/v1/tenant/info")) {
        return ok({
          logoUrl: "https://assets.example/logo.png",
          tenantCode: "ACME",
          tenantId: "tenant-1",
          tenantName: "Acme",
        });
      }
      if (String(input).endsWith("/api/platform/v1/my/tenants")) {
        return ok([
          {
            membershipRole: 2,
            tenantCode: "ACME",
            tenantId: "tenant-1",
            tenantName: "Acme",
          },
        ]);
      }
      throw new Error(`Unexpected request ${String(input)}`);
    }) as typeof fetch;

    const recovered = await recoverAuthSession({
      apiBaseUrl: "https://api.example.com",
      deviceSessionInactiveExpiresAt: "2026-09-01T00:00:00.000Z",
      deviceSessionIssuedAt: "2026-06-01T00:00:00.000Z",
      deviceSessionToken: "ds-token",
      displayName: "Tester",
      lppId: "lpp_1",
      platformRefreshToken: "prt-old",
      platformToken: "platform-old",
      platformUserId: "platform-user-1",
      refreshToken: "tenant-refresh-old",
      roleLabel: "鎴愬憳",
      spaceType: 2,
      tenantId: "tenant-1",
      tenantToken: "tenant-old",
      tenants: [{ tenantId: "tenant-1", tenantName: "Acme", membershipRole: 0 }],
      userId: "user-1",
    } satisfies AuthSession);

    expect(recovered).toMatchObject({
      deviceSessionToken: "ds-token",
      displayName: "Tester",
      membershipRole: 2,
      platformRefreshToken: "prt-new",
      platformToken: "platform-new",
      refreshToken: "tenant-refresh-new",
      roleLabel: "客服",
      tenantCode: "ACME",
      tenantId: "tenant-1",
      tenantName: "Acme",
      tenantToken: "tenant-new",
      userId: "user-1",
      userType: 2,
    });
    expect(requests.map((request) => request.url)).toEqual([
      "https://api.example.com/api/platform/v1/auth/device-session/exchange",
      "https://api.example.com/api/platform/v1/auth/select-tenant",
      "https://api.example.com/api/client/v1/profile/me",
      "https://api.example.com/api/client/v1/tenant/info",
      "https://api.example.com/api/platform/v1/my/tenants",
    ]);
  });

  it("falls back to tenant refresh when no platform recovery credential exists", async () => {
    globalThis.fetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      requests.push({
        body: init?.body ? JSON.parse(String(init.body)) : undefined,
        method: init?.method ?? "GET",
        url: String(input),
      });
      if (String(input).endsWith("/api/client/v1/auth/refresh")) {
        return ok({
          accessToken: "tenant-new",
          refreshToken: "tenant-refresh-new",
          userId: "user-1",
        });
      }
      if (String(input).endsWith("/api/client/v1/profile/me")) {
        return ok({
          displayName: "Tester",
          lppId: "lpp_1",
          platformUserId: "platform-user-1",
          userId: "user-1",
        });
      }
      if (String(input).endsWith("/api/client/v1/tenant/info")) {
        return ok({
          tenantCode: "ACME",
          tenantId: "tenant-1",
          tenantName: "Acme",
        });
      }
      throw new Error(`Unexpected request ${String(input)}`);
    }) as typeof fetch;

    const recovered = await recoverAuthSession({
      apiBaseUrl: "https://api.example.com",
      displayName: "Tester",
      lppId: "lpp_1",
      platformUserId: "platform-user-1",
      refreshToken: "tenant-refresh-old",
      spaceType: 2,
      tenantId: "tenant-1",
      tenantToken: "tenant-old",
      userId: "user-1",
    } satisfies AuthSession);

    expect(recovered).toMatchObject({
      refreshToken: "tenant-refresh-new",
      tenantCode: "ACME",
      tenantName: "Acme",
      tenantToken: "tenant-new",
      userId: "user-1",
    });
    expect(requests.map((request) => request.url)).toEqual([
      "https://api.example.com/api/client/v1/auth/refresh",
      "https://api.example.com/api/client/v1/profile/me",
      "https://api.example.com/api/client/v1/tenant/info",
    ]);
  });

  it("keeps the stored session during startup recovery when transport errors are temporary", async () => {
    globalThis.fetch = vi.fn(async () => {
      throw new Error("network down");
    }) as typeof fetch;

    const session = {
      apiBaseUrl: "https://api.example.com",
      deviceSessionToken: "ds-token",
      displayName: "Tester",
      tenantToken: "tenant-old",
    } satisfies AuthSession;

    await expect(
      recoverAuthSession(session, { fallbackToStoredSessionOnError: true }),
    ).resolves.toBe(session);
  });
});

function ok(data: unknown) {
  return new Response(JSON.stringify({ code: "OK", data }), { status: 200 });
}
