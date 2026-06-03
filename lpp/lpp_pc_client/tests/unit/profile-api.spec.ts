import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ProfileApiClient, endpointPlan } from "../../src/renderer/data/api-client";

describe("profile api client", () => {
  const originalFetch = globalThis.fetch;
  const requests: Array<{ headers: Record<string, string>; method: string; url: string }> =
    [];

  beforeEach(() => {
    requests.length = 0;
    globalThis.fetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const headers = new Headers(init?.headers);
      requests.push({
        headers: Object.fromEntries(headers.entries()),
        method: init?.method ?? "GET",
        url: String(input),
      });
      return new Response(
        JSON.stringify({
          code: "OK",
          data: {
            spaces: [],
            totalUnreadConversationCount: 0,
            totalUnreadMessageCount: 0,
            unreadSpaceCount: 0,
          },
        }),
        { status: 200 },
      );
    }) as typeof fetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it("declares the platform space unread summary endpoint", () => {
    expect(endpointPlan.platformSpaceUnreadSummary).toBe(
      "/api/platform/v1/my/spaces/unread-summary",
    );
  });

  it("loads space unread summary with the platform token", async () => {
    await apiClient().getPlatformSpaceUnreadSummary();

    expect(requests[0]).toMatchObject({
      method: "GET",
      url: "https://api.example.test/api/platform/v1/my/spaces/unread-summary",
    });
    expect(requests[0].headers.authorization).toBe("Bearer platform-token");
  });
});

function apiClient() {
  return new ProfileApiClient({
    baseUrl: "https://api.example.test",
    platformToken: "platform-token",
    tenantToken: "tenant-token",
    traceId: "trace-profile",
  });
}
