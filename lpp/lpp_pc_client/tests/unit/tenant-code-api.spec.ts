import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApiClient } from "../../src/renderer/data/api-client";

describe("tenant code platform api", () => {
  const originalFetch = globalThis.fetch;
  const requests: Array<{
    authorization?: string | null;
    body?: unknown;
    method: string;
    url: string;
  }> = [];

  beforeEach(() => {
    requests.length = 0;
    globalThis.fetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const headers = new Headers(init?.headers);
      requests.push({
        authorization: headers.get("Authorization"),
        body: init?.body ? JSON.parse(String(init.body)) : undefined,
        method: init?.method ?? "GET",
        url: String(input),
      });
      const url = String(input);
      const data = url.includes("/tenants/by-code/")
        ? {
            tenantId: "tenant-1",
            tenantCode: "mouse-corp",
            tenantName: "Mouse Corp",
            logoUrl: "https://cdn.example/logo.png",
            tenantDescription: "Private tenant",
            industry: "Fintech",
            memberCount: 12,
            joinApprovalMode: "manual",
            alreadyMember: false,
          }
        : {
            status: "pending",
            message: "申请已提交，等待管理员审核",
          };
      return new Response(JSON.stringify({ code: "OK", data }), { status: 200 });
    }) as typeof fetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it("previews tenant by exact code with platform token", async () => {
    const client = apiClient();

    await expect(client.previewTenantByCode("Mouse-Corp")).resolves.toMatchObject({
      tenantCode: "mouse-corp",
      tenantName: "Mouse Corp",
      joinApprovalMode: "manual",
      alreadyMember: false,
    });

    expect(requests[0]).toMatchObject({
      authorization: "Bearer platform-token",
      body: undefined,
      method: "GET",
      url: "https://api.example/api/platform/v1/tenants/by-code/Mouse-Corp",
    });
  });

  it("submits join by tenant code as the write action", async () => {
    const client = apiClient();

    await expect(
      client.joinTenantByCode({ tenantCode: "mouse-corp", message: "please approve" }),
    ).resolves.toMatchObject({
      status: "pending",
      message: "申请已提交，等待管理员审核",
    });

    expect(requests[0]).toMatchObject({
      authorization: "Bearer platform-token",
      body: { tenantCode: "mouse-corp", message: "please approve" },
      method: "POST",
      url: "https://api.example/api/platform/v1/tenants/join-by-code",
    });
  });

  it("supports auto-join token responses and already-member previews", async () => {
    globalThis.fetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const headers = new Headers(init?.headers);
      requests.push({
        authorization: headers.get("Authorization"),
        body: init?.body ? JSON.parse(String(init.body)) : undefined,
        method: init?.method ?? "GET",
        url: String(input),
      });
      const url = String(input);
      const data = url.includes("/tenants/by-code/")
        ? {
            tenantId: "tenant-2",
            tenantCode: "auto-corp",
            tenantName: "Auto Corp",
            memberCount: 3,
            joinApprovalMode: "auto",
            alreadyMember: true,
          }
        : {
            tenantId: "tenant-2",
            userId: "user-2",
            platformUserId: "platform-user-2",
            lppId: "lpp-2",
            displayName: "Auto User",
            accessToken: "tenant-token",
            refreshToken: "tenant-refresh",
            expiresIn: 3600,
          };
      return new Response(JSON.stringify({ code: "OK", data }), { status: 200 });
    }) as typeof fetch;
    const client = apiClient();

    await expect(client.previewTenantByCode("auto-corp")).resolves.toMatchObject({
      joinApprovalMode: "auto",
      alreadyMember: true,
    });
    await expect(client.joinTenantByCode({ tenantCode: "auto-corp" })).resolves.toMatchObject({
      accessToken: "tenant-token",
      tenantId: "tenant-2",
    });
  });
});

function apiClient() {
  return new ApiClient({
    baseUrl: "https://api.example",
    platformToken: "platform-token",
    traceId: "trace-tenant-code",
  });
}
