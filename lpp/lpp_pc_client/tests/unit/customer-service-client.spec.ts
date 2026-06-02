import { beforeEach, describe, expect, it } from "vitest";

import { CustomerServiceApiClient } from "../../src/renderer/data/api/customer-service-client";
import type { CustomerServiceThreadsResponse } from "../../src/renderer/data/api/types";
import {
  customerServiceIndexScopeKey,
  rememberCustomerServiceCompatUnreadCandidate,
  rememberCustomerServiceConversationIndex,
  rememberCustomerServiceStaffSentMessage,
  resetCustomerServiceConversationIndexForTest,
} from "../../src/renderer/data/customer-service/cs-conversation-index";

const testScopeKey = customerServiceIndexScopeKey({
  apiBaseUrl: "https://api.example.test",
  tenantToken: "tenant-token",
});

class TestCustomerServiceApiClient extends CustomerServiceApiClient {
  constructor(private readonly response: CustomerServiceThreadsResponse) {
    super({
      baseUrl: "https://api.example.test",
      tenantToken: "tenant-token",
      traceId: "test-trace",
    });
  }

  override async request<T>() {
    return this.response as T;
  }
}

describe("CustomerServiceApiClient", () => {
  beforeEach(() => {
    resetCustomerServiceConversationIndexForTest();
  });

  it("overlays missing workbench thread preview and unread from indexed temp-session data", async () => {
    rememberCustomerServiceConversationIndex({
      conversationId: "im-conversation-cs-1",
      lastMessageAt: "2026-06-01T10:00:00.000Z",
      lastMessageId: "m1",
      lastMessagePreview: "visitor text",
      overlayUnreadCount: 6,
      scopeKey: testScopeKey,
      threadId: "temp-session-1",
      threadType: "temp_session",
    });
    const client = new TestCustomerServiceApiClient({
      activeItems: [
        {
          conversationId: "im-conversation-cs-1",
          lastMessageAt: "2026-06-01T09:59:00.000Z",
          status: "active",
          threadId: "temp-session-1",
          threadType: "temp_session",
          title: "Visitor",
          unreadCount: 0,
        },
      ],
      queueItems: [],
    });

    await expect(client.getWorkbenchThreads()).resolves.toMatchObject({
      activeItems: [
        {
          lastMessageAt: "2026-06-01T09:59:00.000Z",
          lastMessagePreview: "visitor text",
          unreadCount: 6,
        },
      ],
    });
  });

  it("keeps server preview and larger server unread when they are present", async () => {
    rememberCustomerServiceConversationIndex({
      conversationId: "im-conversation-cs-1",
      lastMessagePreview: "local visitor text",
      overlayUnreadCount: 1,
      scopeKey: testScopeKey,
      threadId: "temp-session-1",
      threadType: "temp_session",
    });
    const client = new TestCustomerServiceApiClient({
      activeItems: [
        {
          conversationId: "im-conversation-cs-1",
          lastMessageSeq: 1,
          lastMessagePreview: "server visitor text",
          status: "active",
          threadId: "temp-session-1",
          threadType: "temp_session",
          title: "Visitor",
          unreadCount: 3,
        },
      ],
      queueItems: [],
    });

    await expect(client.getWorkbenchThreads()).resolves.toMatchObject({
      activeItems: [
        {
          lastMessagePreview: "server visitor text",
          unreadCount: 3,
        },
      ],
    });
  });

  it("does not let stale workbench unread overwrite newer gateway visitor unread", async () => {
    rememberCustomerServiceConversationIndex({
      conversationId: "im-conversation-cs-stale",
      lastMessageId: "gateway-5",
      lastMessagePreview: "gateway visitor text",
      lastMessageSeq: 5,
      overlayUnreadCount: 2,
      scopeKey: testScopeKey,
      threadId: "temp-session-stale",
      threadType: "temp_session",
    });
    const client = new TestCustomerServiceApiClient({
      activeItems: [
        {
          conversationId: "im-conversation-cs-stale",
          lastMessagePreview: "old server text",
          lastMessageSeq: 4,
          status: "active",
          threadId: "temp-session-stale",
          threadType: "temp_session",
          title: "Visitor",
          unreadCount: 10,
        } as never,
      ],
      queueItems: [],
    });

    await expect(client.getWorkbenchThreads()).resolves.toMatchObject({
      activeItems: [
        {
          lastMessagePreview: "old server text",
          unreadCount: 2,
        },
      ],
    });
  });

  it("accepts newer workbench unread when snapshot seq is ahead of local gateway state", async () => {
    rememberCustomerServiceConversationIndex({
      conversationId: "im-conversation-cs-newer",
      lastMessageSeq: 5,
      overlayUnreadCount: 2,
      scopeKey: testScopeKey,
      threadId: "temp-session-newer",
      threadType: "temp_session",
    });
    const client = new TestCustomerServiceApiClient({
      activeItems: [
        {
          conversationId: "im-conversation-cs-newer",
          lastMessageSeq: 6,
          status: "active",
          threadId: "temp-session-newer",
          threadType: "temp_session",
          title: "Visitor",
          unreadCount: 10,
        } as never,
      ],
      queueItems: [],
    });

    await expect(client.getWorkbenchThreads()).resolves.toMatchObject({
      activeItems: [{ unreadCount: 10 }],
    });
  });

  it("uses bounded im-list compat unread when direction is unknown and no staff send is known", async () => {
    rememberCustomerServiceCompatUnreadCandidate({
      conversationId: "im-conversation-cs-compat",
      lastMessageAt: "2026-06-01T10:00:00.000Z",
      lastMessageId: "m-compat-5",
      lastMessagePreview: "visitor text",
      lastMessageSeq: 5,
      lastReadSeq: 0,
      scopeKey: testScopeKey,
      threadId: "temp-session-compat",
      threadType: "temp_session",
      rawUnreadCount: 5,
      unreadCount: 5,
      unreadReason: "compat-unknown-suppressed",
    });
    const client = new TestCustomerServiceApiClient({
      activeItems: [
        {
          conversationId: "im-conversation-cs-compat",
          lastMessagePreview: null as never,
          status: "active",
          threadId: "temp-session-compat",
          threadType: "temp_session",
          title: "Visitor",
          unreadCount: 0,
        },
      ],
      queueItems: [],
    });

    await expect(client.getWorkbenchThreads()).resolves.toMatchObject({
      activeItems: [
        {
          lastMessageId: "m-compat-5",
          lastMessagePreview: "visitor text",
          unreadCount: 5,
        },
      ],
    });
  });

  it("subtracts locally known staff-sent messages from unknown im-list compat unread", async () => {
    rememberCustomerServiceStaffSentMessage({
      conversationId: "im-conversation-cs-bounded",
      message: {
        body: { text: "agent 1" },
        conversationId: "im-conversation-cs-bounded",
        conversationSeq: 3,
        messageId: "staff-3",
        messageType: "text",
        preview: "agent 1",
      },
      scopeKey: testScopeKey,
      threadId: "temp-session-bounded",
      threadType: "temp_session",
    });
    rememberCustomerServiceStaffSentMessage({
      conversationId: "im-conversation-cs-bounded",
      message: {
        body: { text: "agent 2" },
        conversationId: "im-conversation-cs-bounded",
        conversationSeq: 4,
        messageId: "staff-4",
        messageType: "text",
        preview: "agent 2",
      },
      scopeKey: testScopeKey,
      threadId: "temp-session-bounded",
      threadType: "temp_session",
    });
    rememberCustomerServiceCompatUnreadCandidate({
      conversationId: "im-conversation-cs-bounded",
      lastMessageId: "staff-4",
      lastMessagePreview: "agent 2",
      lastMessageSeq: 4,
      lastReadSeq: 0,
      rawUnreadCount: 4,
      scopeKey: testScopeKey,
      threadId: "temp-session-bounded",
      threadType: "temp_session",
      unreadCount: 4,
      unreadReason: "compat-unknown-suppressed",
    });
    const client = new TestCustomerServiceApiClient({
      activeItems: [
        {
          conversationId: "im-conversation-cs-bounded",
          status: "active",
          threadId: "temp-session-bounded",
          threadType: "temp_session",
          title: "Visitor",
          unreadCount: 0,
        },
      ],
      queueItems: [],
    });

    await expect(client.getWorkbenchThreads()).resolves.toMatchObject({
      activeItems: [{ unreadCount: 2 }],
    });
  });

  it("uses trusted im-list compat unread when workbench unread and overlay are empty", async () => {
    rememberCustomerServiceCompatUnreadCandidate({
      conversationId: "im-conversation-cs-compat-trusted",
      lastMessageAt: "2026-06-01T10:00:00.000Z",
      lastMessageId: "m-compat-trusted-5",
      lastMessagePreview: "visitor text",
      lastMessageSeq: 5,
      lastReadSeq: 0,
      rawUnreadCount: 5,
      scopeKey: testScopeKey,
      threadId: "temp-session-compat-trusted",
      threadType: "temp_session",
      trustedUnread: true,
      unreadCount: 5,
      unreadReason: "compat-inbound-trusted",
    });
    const client = new TestCustomerServiceApiClient({
      activeItems: [
        {
          conversationId: "im-conversation-cs-compat-trusted",
          lastMessagePreview: null as never,
          status: "active",
          threadId: "temp-session-compat-trusted",
          threadType: "temp_session",
          title: "Visitor",
          unreadCount: 0,
        },
      ],
      queueItems: [],
    });

    await expect(client.getWorkbenchThreads()).resolves.toMatchObject({
      activeItems: [
        {
          lastMessageId: "m-compat-trusted-5",
          lastMessagePreview: "visitor text",
          unreadCount: 5,
        },
      ],
    });
  });

  it("does not resurrect a compat unread candidate after the same message was read", async () => {
    rememberCustomerServiceCompatUnreadCandidate({
      conversationId: "im-conversation-cs-read",
      lastMessageId: "m-read",
      lastMessagePreview: "visitor text",
      lastMessageSeq: 5,
      lastReadSeq: 0,
      scopeKey: testScopeKey,
      threadId: "temp-session-read",
      threadType: "temp_session",
      trustedUnread: true,
      unreadCount: 5,
    });
    rememberCustomerServiceConversationIndex({
      compatReadMessageId: "m-read",
      compatReadSeq: 5,
      conversationId: "im-conversation-cs-read",
      overlayUnreadCount: 0,
      scopeKey: testScopeKey,
      threadId: "temp-session-read",
      threadType: "temp_session",
    });
    const client = new TestCustomerServiceApiClient({
      activeItems: [
        {
          conversationId: "im-conversation-cs-read",
          status: "active",
          threadId: "temp-session-read",
          threadType: "temp_session",
          title: "Visitor",
          unreadCount: 0,
        },
      ],
      queueItems: [],
    });

    await expect(client.getWorkbenchThreads()).resolves.toMatchObject({
      activeItems: [{ unreadCount: 0 }],
    });
  });
});
