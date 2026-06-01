import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApiClient } from "../../src/renderer/data/api-client";

describe("ai suggestion api", () => {
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
      const url = String(input);
      const data = url.includes("/ai-suggestions/") && url.endsWith("/adopt")
        ? { suggestionId: "s1", text: "Adopted draft", status: 1 }
        : url.includes("/ai-suggestions")
          ? { items: [{ suggestionId: "s1", text: "History draft", status: 0 }] }
          : { suggestionId: "s2", text: "Generated draft", source: "external_rag", status: 0 };
      return new Response(JSON.stringify({ code: "OK", data }), { status: 200 });
    }) as typeof fetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it("uses documented thread type segments for generate and history", async () => {
    const client = apiClient();

    await client.generateAiSuggestion("temp_session", "t1", "m1");
    await client.getAiSuggestions("im_direct", "t2", 12);

    expect(requests.map((item) => ({
      body: item.body,
      method: item.method,
      path: item.url.replace("https://api.example", ""),
    }))).toEqual([
      {
        body: { customerMessageId: "m1" },
        method: "POST",
        path: "/api/client/v1/customer-service/workbench/threads/temp_session/t1/ai-suggestion",
      },
      {
        body: undefined,
        method: "GET",
        path: "/api/client/v1/customer-service/workbench/threads/im_direct/t2/ai-suggestions?limit=12",
      },
    ]);
  });

  it("normalizes generate, history and adopt responses", async () => {
    const client = apiClient();

    await expect(client.generateAiSuggestion("temp_session", "t1")).resolves.toMatchObject({
      suggestionId: "s2",
      text: "Generated draft",
      source: "external_rag",
    });
    await expect(client.getAiSuggestions("temp_session", "t1")).resolves.toEqual([
      expect.objectContaining({ suggestionId: "s1", text: "History draft" }),
    ]);
    await expect(client.adoptAiSuggestion("s1")).resolves.toMatchObject({
      suggestionId: "s1",
      text: "Adopted draft",
    });
  });
});

function apiClient() {
  return new ApiClient({
    baseUrl: "https://api.example",
    tenantToken: "tenant-token",
    traceId: "trace-ai-suggestion",
  });
}
