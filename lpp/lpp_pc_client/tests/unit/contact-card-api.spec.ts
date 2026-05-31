import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ApiClient } from "../../src/renderer/data/api-client";

describe("contact card and friend relation api", () => {
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
      return new Response(JSON.stringify({
        code: "OK",
        data: { messageId: "m1", conversationId: "c1" },
      }), { status: 200 });
    }) as typeof fetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it("sends contact_card messages using the documented body.contactCard shape", async () => {
    const client = apiClient();

    await client.sendConversationContactCardMessage("direct", "c1", {
      avatarUrl: "https://assets/avatar.png",
      displayName: "张三",
      email: "z@example.com",
      mobile: "138****0000",
      userId: "u-card",
    }, undefined, { clientMsgId: "pc-card-1" });

    expect(requests[0]).toEqual({
      method: "POST",
      url: "https://api.example/api/client/v1/direct-chats/c1/messages",
      body: {
        body: {
          contactCard: {
            avatarUrl: "https://assets/avatar.png",
            displayName: "张三",
            email: "z@example.com",
            mobile: "138****0000",
            userId: "u-card",
          },
        },
        clientMsgId: "pc-card-1",
        messageType: "contact_card",
        replyToMessageId: null,
      },
    });
  });

  it("uses server-documented friends, profile and blocklist endpoints", async () => {
    const client = apiClient();

    await client.sendFriendRequest("u2", "我是 Eric");
    await client.deleteFriend("u2");
    await client.blockUser("u2");
    await client.getUserProfile("u2");

    expect(requests.map((item) => ({
      body: item.body,
      method: item.method,
      path: item.url.replace("https://api.example", ""),
    }))).toEqual([
      {
        body: { message: "我是 Eric", toUserId: "u2" },
        method: "POST",
        path: "/api/client/v1/friends/request",
      },
      {
        body: undefined,
        method: "DELETE",
        path: "/api/client/v1/friends/u2",
      },
      {
        body: { blockedUserId: "u2" },
        method: "POST",
        path: "/api/client/v1/blocklist",
      },
      {
        body: undefined,
        method: "GET",
        path: "/api/client/v1/users/u2/profile",
      },
    ]);
  });

  it("updates friend profile metadata through the documented friend item endpoint", async () => {
    const client = apiClient();

    await client.updateFriendProfile("u2", {
      note: "私人备注",
      remarkName: "李四",
      tags: ["重点", "跟进"],
    });

    expect(requests[0]).toEqual({
      method: "PUT",
      url: "https://api.example/api/client/v1/friends/u2",
      body: {
        note: "私人备注",
        remarkName: "李四",
        tags: ["重点", "跟进"],
      },
    });
  });

  it("creates group chats using the documented title payload only", async () => {
    const client = apiClient();

    await client.createGroupChat({
      name: "旧入口群名",
      title: "  项目联调群  ",
      memberUserIds: ["u1", "u2", "u1", ""],
    });

    expect(requests[0]).toEqual({
      method: "POST",
      url: "https://api.example/api/client/v1/groups/",
      body: {
        title: "项目联调群",
        memberUserIds: ["u1", "u2"],
      },
    });
    expect(requests[0]?.body).not.toHaveProperty("name");
  });
});

function apiClient() {
  return new ApiClient({
    baseUrl: "https://api.example",
    tenantToken: "tenant-token",
    traceId: "trace-contact-card",
  });
}
