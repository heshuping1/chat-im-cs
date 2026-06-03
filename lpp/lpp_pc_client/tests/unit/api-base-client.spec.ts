import { afterEach, describe, expect, it, vi } from "vitest";

import { ApiBaseClient } from "../../src/renderer/data/api/base";

describe("ApiBaseClient", () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it("sends admin requests to the configured admin API base URL", async () => {
    const requests: string[] = [];
    globalThis.fetch = vi.fn(async (input: RequestInfo | URL) => {
      requests.push(String(input));
      return new Response(JSON.stringify({ code: "OK", data: { ok: true } }), {
        status: 200,
      });
    }) as typeof fetch;
    const client = new ApiBaseClient({
      adminBaseUrl: "https://admin.example.test",
      adminToken: "admin-token",
      baseUrl: "https://chat.example.test",
      tenantToken: "tenant-token",
      traceId: "trace-api-base",
    });

    await client.request("/api/admin/v1/conversation-management/conversations", {}, true);

    expect(requests).toEqual([
      "https://admin.example.test/api/admin/v1/conversation-management/conversations",
    ]);
  });
});
