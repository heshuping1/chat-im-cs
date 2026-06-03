import { beforeEach, describe, expect, it, vi } from "vitest";

import { CustomerServiceApiClient } from "../../src/renderer/data/api/customer-service-client";
import type { CustomerServiceThreadsResponse } from "../../src/renderer/data/api/types";
import {
  customerServiceIndexScopeKey,
  getCustomerServiceThreadIndex,
  rememberCustomerServiceCompatUnreadCandidate,
  rememberCustomerServiceConversationIndex,
  rememberCustomerServiceStaffSentMessage,
  resetCustomerServiceConversationIndexForTest,
} from "../../src/renderer/data/customer-service/cs-conversation-index";
import { workspaceScopeKeyFromSession } from "../../src/renderer/data/workspace-scope";

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

class RecordingCustomerServiceApiClient extends CustomerServiceApiClient {
  readonly requests: Array<{ path: string; admin: boolean }> = [];
  readonly platformRequests: Array<{ path: string; body?: unknown }> = [];

  constructor(options: {
    membershipRole?: number;
    response?: unknown;
    tenantId?: string;
  } = {}) {
    super({
      baseUrl: "https://api.example.test",
      membershipRole: options.membershipRole,
      platformToken: "platform-token",
      tenantId: options.tenantId,
      tenantToken: "tenant-token",
      traceId: "test-trace",
    });
    this.response = options.response ?? {
      activeItems: [],
      queueItems: [],
    };
  }

  private readonly response: unknown;

  override async request<T>(
    path: string,
    _init: RequestInit = {},
    admin = false,
  ) {
    this.requests.push({ path, admin });
    return this.response as T;
  }

  override async platformRequest<T>(path: string, init: RequestInit = {}) {
    this.platformRequests.push({
      path,
      body: init.body ? JSON.parse(String(init.body)) : undefined,
    });
    return { accessToken: "admin-access-token" } as T;
  }
}

class WorkspaceScopedCustomerServiceApiClient extends CustomerServiceApiClient {
  constructor(private readonly response: CustomerServiceThreadsResponse) {
    super({
      baseUrl: "https://api.example.test",
      platformUserId: "platform-user-1",
      spaceType: 2,
      tenantId: "tenant-1",
      tenantToken: "tenant-token",
      traceId: "test-trace",
      userId: "user-1",
    } as never);
  }

  override async request<T>() {
    return this.response as T;
  }
}

describe("CustomerServiceApiClient", () => {
  beforeEach(() => {
    resetCustomerServiceConversationIndexForTest();
    vi.restoreAllMocks();
    delete (globalThis as { window?: unknown }).window;
  });

  it("queries customer service conversations with an admin token for owner workspaces", async () => {
    const client = new RecordingCustomerServiceApiClient({
      membershipRole: 4,
      tenantId: "tenant-1",
      response: [
        {
          conversationId: "conversation-1",
          lastMessageAt: "2026-06-02T12:00:00.000Z",
          sessionId: "session-1",
          status: "closed_timeout",
          visitorName: "访客 A",
        },
      ],
    });

    await expect(client.getWorkbenchThreads()).resolves.toMatchObject({
      activeItems: [
        {
          conversationId: "conversation-1",
          status: "closed_timeout",
          threadId: "session-1",
          threadType: "temp_session",
          title: "访客 A",
        },
      ],
      queueItems: [],
      summary: {
        activeCount: 0,
        allCount: 0,
        queuedCount: 0,
      },
    });
    expect(client.platformRequests).toEqual([
      {
        body: { tenantId: "tenant-1" },
        path: "/api/platform/v1/auth/admin-token",
      },
    ]);
    expect(client.requests).toEqual([
      {
        admin: true,
        path: "/api/admin/v1/customer-service/temp-sessions?page=1&pageSize=50",
      },
    ]);
  });

  it("loads owner readonly temp-session detail with the admin token", async () => {
    const client = new RecordingCustomerServiceApiClient({
      membershipRole: 4,
      tenantId: "tenant-1",
      response: {
        messages: [
          {
            body: { text: "hello" },
            conversationId: "conversation-1",
            conversationSeq: 1,
            messageId: "message-1",
            messageType: "text",
            sentAt: "2026-06-02T12:00:00.000Z",
          },
        ],
        session: {
          conversationId: "conversation-1",
          lastMessageAt: "2026-06-02T12:00:00.000Z",
          sessionId: "session-1",
          status: "closed_timeout",
          visitorName: "访客 A",
        },
      },
    });

    await expect(
      client.getWorkbenchThreadDetail("temp_session", "session-1"),
    ).resolves.toMatchObject({
      accessMode: "management_readonly",
      conversationId: "conversation-1",
      messages: [{ messageId: "message-1" }],
      status: "closed_timeout",
      threadId: "session-1",
      title: "访客 A",
    });
    expect(client.requests).toEqual([
      {
        admin: true,
        path: "/api/admin/v1/customer-service/temp-sessions/session-1",
      },
    ]);
  });

  it("keeps customer service workbench queries on the tenant token for staff workspaces", async () => {
    const client = new RecordingCustomerServiceApiClient({
      membershipRole: 2,
      tenantId: "tenant-1",
    });

    await expect(client.getWorkbenchThreads()).resolves.toMatchObject({
      activeItems: [],
      queueItems: [],
    });
    expect(client.platformRequests).toEqual([]);
    expect(client.requests).toEqual([
      {
        admin: false,
        path: "/api/client/v1/customer-service/workbench/threads",
      },
    ]);
  });

  it("drops plain IM conversations from customer service workbench snapshots", async () => {
    const client = new TestCustomerServiceApiClient({
      activeItems: [
        {
          conversationId: "direct-1",
          status: "active",
          threadId: "direct-1",
          threadType: "direct" as never,
          title: "Plain IM",
        },
        {
          conversationId: "group-1",
          status: "active",
          threadId: "group-1",
          threadType: "group" as never,
          title: "Plain Group",
        },
        {
          conversationId: "temp-conversation-1",
          status: "active",
          threadId: "temp-thread-1",
          threadType: "temp_session",
          title: "Visitor",
        },
      ],
      queueItems: [
        {
          conversationId: "im-direct-cs-1",
          status: "queued",
          threadId: "im-direct-thread-1",
          threadType: "im_direct",
          title: "Customer Direct",
        },
      ],
    });

    await expect(client.getWorkbenchThreads()).resolves.toMatchObject({
      activeItems: [
        {
          conversationId: "temp-conversation-1",
          threadId: "temp-thread-1",
          threadType: "temp_session",
        },
      ],
      queueItems: [
        {
          conversationId: "im-direct-cs-1",
          threadId: "im-direct-thread-1",
          threadType: "im_direct",
        },
      ],
    });
  });

  it("drops plain IM conversations from customer service history snapshots", async () => {
    class HistoryClient extends CustomerServiceApiClient {
      constructor() {
        super({
          baseUrl: "https://api.example.test",
          tenantToken: "tenant-token",
          traceId: "test-trace",
        });
      }

      override async request<T>() {
        return {
          items: [
            {
              conversationId: "direct-1",
              status: "closed",
              threadId: "direct-1",
              threadType: "direct",
              title: "Plain IM",
            },
            {
              conversationId: "temp-conversation-1",
              status: "closed",
              threadId: "temp-thread-1",
              threadType: "temp_session",
              title: "Visitor",
            },
          ],
        } as T;
      }
    }

    await expect(new HistoryClient().getStaffServiceHistory()).resolves.toMatchObject({
      items: [
        {
          conversationId: "temp-conversation-1",
          threadId: "temp-thread-1",
          threadType: "temp_session",
        },
      ],
    });
  });

  it("uses explicit server-read history snapshots to clear stale local overlay unread", async () => {
    rememberCustomerServiceConversationIndex({
      conversationId: "temp-conversation-closed-unread",
      lastMessagePreview: "visitor unread before close",
      overlayUnreadCount: 4,
      scopeKey: testScopeKey,
      threadId: "temp-thread-closed-unread",
      threadType: "temp_session",
    });
    class HistoryClient extends CustomerServiceApiClient {
      constructor() {
        super({
          baseUrl: "https://api.example.test",
          tenantToken: "tenant-token",
          traceId: "test-trace",
        });
      }

      override async request<T>() {
        return {
          items: [
            {
              conversationId: "temp-conversation-closed-unread",
              lastMessagePreview: "",
              status: "closed_by_staff",
              threadId: "temp-thread-closed-unread",
              threadType: "temp_session",
              title: "Visitor",
              unreadCount: 0,
            },
          ],
        } as T;
      }
    }

    await expect(new HistoryClient().getStaffServiceHistory()).resolves.toMatchObject({
      items: [
        {
          lastMessagePreview: "visitor unread before close",
          threadId: "temp-thread-closed-unread",
          unreadCount: 0,
        },
      ],
    });
  });

  it("restores missing history unread from the local overlay index", async () => {
    rememberCustomerServiceConversationIndex({
      conversationId: "temp-conversation-missing-unread",
      lastMessagePreview: "visitor unread before close",
      overlayUnreadCount: 4,
      scopeKey: testScopeKey,
      threadId: "temp-thread-missing-unread",
      threadType: "temp_session",
    });
    class HistoryClient extends CustomerServiceApiClient {
      constructor() {
        super({
          baseUrl: "https://api.example.test",
          tenantToken: "tenant-token",
          traceId: "test-trace",
        });
      }

      override async request<T>() {
        return {
          items: [
            {
              conversationId: "temp-conversation-missing-unread",
              lastMessagePreview: "",
              status: "closed_by_staff",
              threadId: "temp-thread-missing-unread",
              threadType: "temp_session",
              title: "Visitor",
            },
          ],
        } as T;
      }
    }

    await expect(new HistoryClient().getStaffServiceHistory()).resolves.toMatchObject({
      items: [
        {
          lastMessagePreview: "visitor unread before close",
          threadId: "temp-thread-missing-unread",
          unreadCount: 4,
        },
      ],
    });
  });

  it("links a server session id to a conversation overlay before the session closes", async () => {
    rememberCustomerServiceConversationIndex({
      conversationId: "widget-conversation-before-close",
      lastMessagePreview: "visitor unread before close",
      overlayUnreadCount: 3,
      scopeKey: testScopeKey,
      threadId: "widget-conversation-before-close",
      threadType: "temp_session",
    });
    const client = new TestCustomerServiceApiClient({
      activeItems: [
        {
          conversationId: "widget-conversation-before-close",
          lastMessagePreview: null as never,
          status: "active",
          threadId: "server-session-before-close",
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
          lastMessagePreview: "visitor unread before close",
          threadId: "server-session-before-close",
          unreadCount: 3,
        },
      ],
    });
    expect(
      getCustomerServiceThreadIndex("server-session-before-close", testScopeKey),
    ).toMatchObject({
      conversationId: "widget-conversation-before-close",
      overlayUnreadCount: 3,
      threadId: "server-session-before-close",
    });
  });

  it("records service-history unread diagnostics before and after local overlay", async () => {
    const diagnostics: unknown[] = [];
    const recordCsRoutingDiagnostic = vi.fn((payload: unknown) => {
      diagnostics.push(payload);
      return Promise.resolve();
    });
    (globalThis as { window?: unknown }).window = {
      desktopApi: {
        recordCsRoutingDiagnostic,
        recordMessageReminderDiagnostic: vi.fn(() => Promise.resolve()),
      },
      localStorage: { getItem: () => "1" },
    };
    rememberCustomerServiceConversationIndex({
      conversationId: "temp-conversation-history-diagnostic",
      overlayUnreadCount: 3,
      scopeKey: testScopeKey,
      threadId: "temp-thread-history-diagnostic",
      threadType: "temp_session",
    });
    class HistoryClient extends CustomerServiceApiClient {
      constructor() {
        super({
          baseUrl: "https://api.example.test",
          tenantToken: "tenant-token",
          traceId: "test-trace",
        });
      }

      override async request<T>() {
        return {
          items: [
            {
              closedAt: "2026-06-03T17:53:00.000Z",
              conversationId: "temp-conversation-history-diagnostic",
              lastMessageAt: "2026-06-03T17:52:30.000Z",
              status: "closed_by_staff",
              threadId: "temp-thread-history-diagnostic",
              threadType: "temp_session",
              title: "Visitor",
              unreadCount: 0,
            },
            {
              closedAt: "2026-06-03T17:54:00.000Z",
              conversationId: "temp-conversation-history-missing",
              status: "closed_by_visitor",
              threadId: "temp-thread-history-missing",
              threadType: "temp_session",
              title: "Visitor",
            },
          ],
        } as T;
      }
    }

    await new HistoryClient().getStaffServiceHistory();

    expect(recordCsRoutingDiagnostic).toHaveBeenCalled();
    const snapshot = diagnostics.find(
      (entry) =>
        typeof entry === "object" &&
        entry !== null &&
        (entry as { phase?: string }).phase === "history-snapshot",
    ) as { classification?: Record<string, unknown>; summary?: { items?: unknown[] } };
    expect(snapshot).toBeTruthy();
    expect(snapshot.classification).toMatchObject({
      missingServerUnreadCount: 1,
      overlayUnreadItems: 0,
      serverUnreadItems: 0,
      terminalItems: 2,
      total: 2,
    });
    expect(snapshot.summary?.items).toEqual([
      expect.objectContaining({
        conversationId: "temp-conversation-history-diagnostic",
        overlayUnreadCount: 0,
        serverUnreadCount: 0,
        threadId: "temp-thread-history-diagnostic",
      }),
      expect.objectContaining({
        conversationId: "temp-conversation-history-missing",
        overlayUnreadCount: 0,
        serverUnreadCount: "[undefined]",
        threadId: "temp-thread-history-missing",
      }),
    ]);
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
          lastMessageAt: "2026-06-01T10:00:00.000Z",
          lastMessagePreview: "visitor text",
          unreadCount: 6,
        },
      ],
    });
  });

  it("uses workspace scope to overlay gateway widget messages after workbench refetch", async () => {
    const workspaceScopeKey = workspaceScopeKeyFromSession({
      apiBaseUrl: "https://api.example.test",
      platformUserId: "platform-user-1",
      spaceType: 2,
      tenantId: "tenant-1",
      tenantToken: "tenant-token",
      userId: "user-1",
    });
    rememberCustomerServiceConversationIndex({
      conversationId: "widget-conversation-1",
      lastMessageAt: "2026-06-03T07:51:33.708929Z",
      lastMessageId: "widget-message-1",
      lastMessagePreview: "99998888",
      overlayUnreadCount: 2,
      scopeKey: workspaceScopeKey,
      threadId: "widget-thread-1",
      threadType: "temp_session",
    });
    const client = new WorkspaceScopedCustomerServiceApiClient({
      activeItems: [
        {
          conversationId: "widget-conversation-1",
          lastMessageAt: "2026-06-03T07:51:33.708929Z",
          lastMessagePreview: null as never,
          status: "active",
          threadId: "widget-thread-1",
          threadType: "temp_session",
          title: "访客",
          unreadCount: 0,
        },
      ],
      queueItems: [],
    });

    await expect(client.getWorkbenchThreads()).resolves.toMatchObject({
      activeItems: [
        {
          lastMessagePreview: "99998888",
          unreadCount: 2,
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
          lastMessagePreview: "gateway visitor text",
          unreadCount: 2,
        },
      ],
    });
  });

  it("prefers a newer conversation overlay over a stale server-session alias", async () => {
    rememberCustomerServiceConversationIndex({
      conversationId: "widget-conversation-fresh",
      lastMessageAt: "2026-06-03T19:15:28.000Z",
      lastMessageId: "old-message-3",
      lastMessagePreview: "9",
      lastMessageSeq: 3,
      overlayUnreadCount: 0,
      scopeKey: testScopeKey,
      threadId: "server-session-stale-alias",
      threadType: "temp_session",
    });
    rememberCustomerServiceConversationIndex({
      conversationId: "widget-conversation-fresh",
      lastMessageAt: "2026-06-03T19:15:41.000Z",
      lastMessageId: "gateway-message-5",
      lastMessagePreview: "987654321",
      lastMessageSeq: 5,
      overlayUnreadCount: 1,
      scopeKey: testScopeKey,
      threadId: "widget-conversation-fresh",
      threadType: "temp_session",
    });
    const client = new TestCustomerServiceApiClient({
      activeItems: [
        {
          conversationId: "widget-conversation-fresh",
          lastMessageAt: "2026-06-03T19:15:41.000Z",
          lastMessagePreview: "最近活跃 6/4 03:15",
          status: "active",
          threadId: "server-session-stale-alias",
          threadType: "temp_session",
          title: "Visitor",
          unreadCount: 0,
        } as never,
      ],
      queueItems: [],
    });

    await expect(client.getWorkbenchThreads()).resolves.toMatchObject({
      activeItems: [
        {
          lastMessageId: "gateway-message-5",
          lastMessagePreview: "987654321",
          unreadCount: 1,
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
