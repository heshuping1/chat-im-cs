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
import { customerServiceDirectPeerReaderId } from "../../src/renderer/data/customer-service/cs-message-read-status";
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
  readonly requests: Array<{ path: string; admin: boolean; body?: unknown }> = [];
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
    this.requests.push({
      path,
      admin,
      ...(_init.body ? { body: JSON.parse(String(_init.body)) } : {}),
    });
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

  it("keeps live workbench conversations on the client token for owner workspaces", async () => {
    const client = new RecordingCustomerServiceApiClient({
      membershipRole: 4,
      tenantId: "tenant-1",
      response: {
        activeItems: [
        {
          conversationId: "conversation-1",
          lastMessageAt: "2026-06-02T12:00:00.000Z",
          threadId: "session-1",
          threadType: "temp_session",
          status: "closed_timeout",
          visitorName: "访客 A",
        },
        ],
        queueItems: [],
        summary: {
          activeCount: 0,
          allCount: 1,
          queuedCount: 0,
        },
      },
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
        allCount: 1,
        queuedCount: 0,
      },
    });
    expect(client.platformRequests).toEqual([]);
    expect(client.requests).toEqual([
      {
        admin: false,
        path: "/api/client/v1/customer-service/workbench/threads",
      },
    ]);
  });

  it("loads owner temp-session detail through the workbench client endpoint", async () => {
    const client = new RecordingCustomerServiceApiClient({
      membershipRole: 4,
      tenantId: "tenant-1",
      response: {
        conversationId: "conversation-1",
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
        status: "closed_timeout",
        tempSession: {
          readStatus: {
            conversationId: "conversation-1",
            members: [
              { userId: "staff-1", lastReadSeq: 0, lastReadAt: null },
              {
                userId: "visitor-1",
                lastReadSeq: 1,
                lastReadAt: "2026-06-02T12:01:00.000Z",
              },
            ],
            sessionId: "session-1",
            visitorUserId: "visitor-1",
          },
        },
        threadId: "session-1",
        threadType: "temp_session",
        title: "访客 A",
      },
    });

    await expect(
      client.getWorkbenchThreadDetail("temp_session", "session-1"),
    ).resolves.toMatchObject({
      conversationId: "conversation-1",
      messages: [{ messageId: "message-1" }],
      readStatus: {
        conversationId: "conversation-1",
        members: [
          { userId: "staff-1", lastReadSeq: 0, lastReadAt: null },
          {
            userId: "visitor-1",
            lastReadSeq: 1,
            lastReadAt: "2026-06-02T12:01:00.000Z",
          },
        ],
        sessionId: "session-1",
        visitorUserId: "visitor-1",
      },
      status: "closed_timeout",
      threadId: "session-1",
      title: "访客 A",
    });
    expect(client.requests).toEqual([
      {
        admin: false,
        path: "/api/client/v1/customer-service/workbench/threads/temp-session/session-1",
      },
    ]);
  });

  it("normalizes im-direct monitor detail customer read cursor from directChat fields", async () => {
    const client = new RecordingCustomerServiceApiClient({
      membershipRole: 4,
      tenantId: "tenant-1",
      response: {
        directChat: {
          chatId: "direct-1",
          customerLastReadAt: "2026-06-11T11:18:00.000Z",
          customerLastReadSeq: 8,
          messages: [
            {
              body: { text: "staff reply" },
              conversationId: "direct-1",
              conversationSeq: 8,
              direction: "out",
              messageId: "message-8",
              messageType: "text",
              sentAt: "2026-06-11T11:17:00.000Z",
              senderRole: "staff",
            },
          ],
        },
        threadId: "thread-1",
        threadType: "im_direct",
        title: "Direct customer",
      },
    });

    await expect(
      client.getCustomerServiceMonitorThreadDetail("im_direct", "thread-1"),
    ).resolves.toMatchObject({
      accessMode: "management_readonly",
      conversationId: "direct-1",
      messages: [{ messageId: "message-8" }],
      readStatus: {
        conversationId: "direct-1",
        members: [
          {
            userId: customerServiceDirectPeerReaderId,
            lastReadSeq: 8,
            lastReadAt: "2026-06-11T11:18:00.000Z",
          },
        ],
        visitorUserId: customerServiceDirectPeerReaderId,
      },
      threadId: "thread-1",
      threadType: "im_direct",
    });
    expect(client.requests).toEqual([
      {
        admin: true,
        path: "/api/admin/v1/customer-service/center/threads/im_direct/thread-1",
      },
    ]);
  });

  it("loads temp-session stats through the admin API for owner workspaces", async () => {
    const client = new RecordingCustomerServiceApiClient({
      membershipRole: 4,
      tenantId: "tenant-1",
      response: {
        staffPerformance: [],
        totalSessions: 1,
      },
    });

    await expect(client.getTempSessionStats({ from: "2026-06-01", to: "2026-06-10" })).resolves.toMatchObject({
      totalSessions: 1,
    });
    expect(client.requests).toEqual([
      {
        admin: true,
        path: "/api/admin/v1/customer-service/temp-sessions/stats?from=2026-06-01&to=2026-06-10",
      },
    ]);
  });

  it("loads temp-session read status through the client token API", async () => {
    const client = new RecordingCustomerServiceApiClient({
      response: {
        conversation_id: "conversation-1",
        members: [
          {
            user_id: "staff-1",
            last_read_seq: 0,
            last_read_at: null,
          },
          {
            user_id: "visitor-1",
            last_read_seq: 12,
            last_read_at: "2026-06-11T08:17:43.566Z",
          },
        ],
        session_id: "session-1",
        visitor_user_id: "visitor-1",
      },
    });

    await expect(client.getTempSessionReadStatus("session-1")).resolves.toMatchObject({
      conversationId: "conversation-1",
      members: [
        { userId: "staff-1", lastReadSeq: 0, lastReadAt: null },
        {
          userId: "visitor-1",
          lastReadSeq: 12,
          lastReadAt: "2026-06-11T08:17:43.566Z",
        },
      ],
      sessionId: "session-1",
      visitorUserId: "visitor-1",
    });
    expect(client.requests).toEqual([
      {
        admin: false,
        path: "/api/client/v1/customer-service/temp-sessions/session-1/read-status",
      },
    ]);
  });

  it("loads temp-session notes through the client token API and keeps pinned notes first", async () => {
    const client = new RecordingCustomerServiceApiClient({
      response: {
        items: [
          {
            content: "普通备注",
            createdAt: "2026-06-02T12:00:00.000Z",
            isPinned: false,
            noteId: "note-2",
            staffDisplayName: "Agent B",
          },
          {
            content: "置顶备注",
            createdAt: "2026-06-01T12:00:00.000Z",
            isPinned: true,
            noteId: "note-1",
            staffDisplayName: "Agent A",
          },
        ],
      },
    });

    await expect(client.getTempSessionNotes("session-1")).resolves.toMatchObject([
      {
        content: "置顶备注",
        isPinned: true,
        noteId: "note-1",
      },
      {
        content: "普通备注",
        isPinned: false,
        noteId: "note-2",
      },
    ]);
    expect(client.requests).toEqual([
      {
        admin: false,
        path: "/api/client/v1/customer-service/temp-sessions/session-1/notes",
      },
    ]);
  });

  it("creates a temp-session note with trimmed content", async () => {
    const client = new RecordingCustomerServiceApiClient({
      response: {
        content: "VIP 客户，关注退款时效",
        createdAt: "2026-06-02T12:00:00.000Z",
        isPinned: false,
        noteId: "note-1",
        staffDisplayName: "Agent A",
      },
    });

    await expect(
      client.createTempSessionNote("session-1", {
        content: "  VIP 客户，关注退款时效  ",
        isPinned: false,
      }),
    ).resolves.toMatchObject({
      content: "VIP 客户，关注退款时效",
      noteId: "note-1",
    });
    expect(client.requests).toEqual([
      {
        admin: false,
        body: {
          content: "VIP 客户，关注退款时效",
          isPinned: false,
        },
        path: "/api/client/v1/customer-service/temp-sessions/session-1/notes",
      },
    ]);
  });

  it("rejects temp-session note content longer than 2000 characters before posting", () => {
    const client = new RecordingCustomerServiceApiClient();

    expect(() =>
      client.createTempSessionNote("session-1", {
        content: "x".repeat(2001),
        isPinned: false,
      }),
    ).toThrow("2000");
    expect(client.requests).toEqual([]);
  });

  it("updates temp-session note pin state through the client token API", async () => {
    const client = new RecordingCustomerServiceApiClient({
      response: {
        content: "置顶备注",
        createdAt: "2026-06-02T12:00:00.000Z",
        isPinned: true,
        noteId: "note-1",
        staffDisplayName: "Agent A",
      },
    });

    await expect(
      client.setTempSessionNotePinned("session-1", "note-1", true),
    ).resolves.toMatchObject({
      isPinned: true,
      noteId: "note-1",
    });
    expect(client.requests).toEqual([
      {
        admin: false,
        body: { pinned: true },
        path: "/api/client/v1/customer-service/temp-sessions/session-1/notes/note-1/pin",
      },
    ]);
  });

  it("deletes a temp-session note through the client token API", async () => {
    const client = new RecordingCustomerServiceApiClient();

    await client.deleteTempSessionNote("session-1", "note-1");
    expect(client.requests).toEqual([
      {
        admin: false,
        path: "/api/client/v1/customer-service/temp-sessions/session-1/notes/note-1",
      },
    ]);
  });

  it("loads live monitor threads from the admin service center", async () => {
    const client = new RecordingCustomerServiceApiClient({
      membershipRole: 4,
      tenantId: "tenant-1",
      response: {
        items: [
          {
            conversationId: "conversation-queued",
            lastMessagePreview: "waiting",
            status: "queued",
            threadId: "thread-queued",
            threadType: "temp_session",
            title: "Visitor Q",
          },
          {
            conversationId: "conversation-active",
            lastMessagePreview: "active",
            status: "active",
            threadId: "thread-active",
            threadType: "im_direct",
            title: "Customer A",
          },
        ],
        summary: {
          activeCount: 1,
          allCount: 2,
          queuedCount: 1,
          vipCount: 0,
        },
      },
    });

    await expect(
      client.getCustomerServiceMonitorThreads({
        assignedStaffUserId: "staff-1",
        keyword: "refund",
        slaRisk: "true",
        status: "active",
        threadType: "im_direct",
      }),
    ).resolves.toMatchObject({
      items: [
        {
          status: "queued",
          threadId: "thread-queued",
          threadType: "temp_session",
        },
        {
          status: "active",
          threadId: "thread-active",
          threadType: "im_direct",
        },
      ],
      summary: {
        activeCount: 1,
        allCount: 2,
        queuedCount: 1,
      },
    });
    expect(client.requests).toEqual([
      {
        admin: true,
        path: "/api/admin/v1/customer-service/center/threads?page=1&pageSize=50&assignedStaffUserId=staff-1&keyword=refund&slaRisk=true&status=active&threadType=im_direct",
      },
    ]);
  });

  it("loads monitor threads without forcing a default status or thread type", async () => {
    const client = new RecordingCustomerServiceApiClient({
      membershipRole: 4,
      tenantId: "tenant-1",
      response: {
        items: [
          {
            conversationId: "conversation-active",
            lastMessagePreview: "active",
            status: "active",
            threadId: "thread-active",
            threadType: "im_direct",
            title: "Active customer",
          },
          {
            conversationId: "conversation-queued",
            lastMessagePreview: "queued",
            status: "queued",
            threadId: "thread-queued",
            threadType: "temp_session",
            title: "Queued customer",
          },
        ],
      },
    });

    await expect(
      client.getCustomerServiceMonitorThreads(),
    ).resolves.toMatchObject({
      items: [
        {
          status: "queued",
          threadId: "thread-queued",
        },
        {
          status: "active",
          threadId: "thread-active",
          threadType: "im_direct",
        },
      ],
      summary: {
        activeCount: 1,
        allCount: 2,
        queuedCount: 1,
      },
    });
    expect(client.requests).toEqual([
      {
        admin: true,
        path: "/api/admin/v1/customer-service/center/threads?page=1&pageSize=50",
      },
    ]);
  });

  it("splits managed temp sessions into queued and active workbench buckets", async () => {
    const client = new RecordingCustomerServiceApiClient({
      membershipRole: 4,
      tenantId: "tenant-1",
      response: {
        items: [
          {
            conversationId: "conversation-queued",
            lastMessagePreview: "waiting",
            status: "queued",
            sessionId: "thread-queued",
            title: "Visitor Q",
          },
          {
            conversationId: "conversation-pending",
            lastMessagePreview: "pending",
            status: "pending",
            sessionId: "thread-pending",
            title: "Visitor P",
          },
          {
            conversationId: "conversation-active",
            lastMessagePreview: "active",
            status: "serving",
            sessionId: "thread-active",
            title: "Visitor A",
          },
        ],
      },
    });

    const result = await (
      client as unknown as {
        getManagedCustomerServiceThreads: () => Promise<CustomerServiceThreadsResponse>;
      }
    ).getManagedCustomerServiceThreads();

    expect(result.queueItems.map((item) => item.threadId)).toEqual([
      "thread-queued",
      "thread-pending",
    ]);
    expect(result.activeItems.map((item) => item.threadId)).toEqual(["thread-active"]);
    expect(result.summary).toMatchObject({
      activeCount: 1,
      allCount: 3,
      queuedCount: 2,
    });
    expect(client.requests).toEqual([
      {
        admin: true,
        path: "/api/admin/v1/customer-service/temp-sessions?page=1&pageSize=50",
      },
    ]);
  });

  it("normalizes monitor customer and staff avatar snake_case fields", async () => {
    const client = new RecordingCustomerServiceApiClient({
      membershipRole: 4,
      tenantId: "tenant-1",
      response: {
        items: [
          {
            avatar_url: "https://cdn.example/thread.png",
            conversation_id: "conversation-active",
            customer_avatar_url: "https://cdn.example/customer.png",
            last_message_at: "2026-06-11T10:00:00Z",
            staff_avatar_url: "https://cdn.example/staff-inline.png",
            staff_user_id: "staff-1",
            status: "active",
            thread_id: "thread-active",
            thread_type: "temp_session",
            title: "Visitor A",
          },
        ],
      },
    });

    await expect(client.getCustomerServiceMonitorThreads()).resolves.toMatchObject({
      items: [
        {
          avatarUrl: "https://cdn.example/thread.png",
          customerAvatarUrl: "https://cdn.example/customer.png",
          staffAvatarUrl: "https://cdn.example/staff-inline.png",
          staffUserId: "staff-1",
          threadId: "thread-active",
        },
      ],
    });
  });

  it("normalizes monitor staff status avatars from admin payloads", async () => {
    const client = new RecordingCustomerServiceApiClient({
      membershipRole: 4,
      tenantId: "tenant-1",
      response: {
        items: [
          {
            active_session_count: 2,
            avatar_url: "https://cdn.example/staff.png",
            display_name: "Agent A",
            queue_accept_enabled: "true",
            service_status: "online",
            staff_user_id: "staff-1",
          },
        ],
      },
    });

    await expect(client.getCustomerServiceMonitorStaffStatuses()).resolves.toEqual([
      expect.objectContaining({
        activeSessionCount: 2,
        avatarUrl: "https://cdn.example/staff.png",
        displayName: "Agent A",
        queueAcceptEnabled: true,
        serviceStatus: "online",
        staffUserId: "staff-1",
      }),
    ]);
  });

  it("force closes customer service threads through the admin center endpoint", async () => {
    const client = new RecordingCustomerServiceApiClient({
      membershipRole: 4,
      tenantId: "tenant-force-close",
      response: { closed: true, status: "closed_by_staff" },
    });

    await expect(
      client.forceCloseCustomerServiceThread("temp_session", "session-1"),
    ).resolves.toMatchObject({ closed: true });

    expect(client.platformRequests).toEqual([
      {
        body: { tenantId: "tenant-force-close" },
        path: "/api/platform/v1/auth/admin-token",
      },
    ]);
    expect(client.requests).toEqual([
      {
        admin: true,
        path: "/api/admin/v1/customer-service/center/threads/temp_session/session-1/force-close",
      },
    ]);
  });

  it("assigns customer service threads through the admin center endpoint", async () => {
    const client = new RecordingCustomerServiceApiClient({
      membershipRole: 4,
      tenantId: "tenant-assign-thread",
      response: { assignedStaffUserId: "staff-2", status: "active" },
    });

    await expect(
      client.assignCustomerServiceThread("im_direct", "thread-1", { staffUserId: "staff-2" }),
    ).resolves.toMatchObject({ assignedStaffUserId: "staff-2" });

    expect(client.platformRequests).toEqual([
      {
        body: { tenantId: "tenant-assign-thread" },
        path: "/api/platform/v1/auth/admin-token",
      },
    ]);
    expect(client.requests).toEqual([
      {
        admin: true,
        body: { staffUserId: "staff-2" },
        path: "/api/admin/v1/customer-service/center/threads/im_direct/thread-1/assign",
      },
    ]);
  });

  it("freezes and unfreezes customer service threads through admin center endpoints", async () => {
    const client = new RecordingCustomerServiceApiClient({
      membershipRole: 4,
      tenantId: "tenant-freeze-thread",
      response: { frozen: true, status: "active" },
    });

    await expect(
      client.freezeCustomerServiceThread("temp_session", "session-1"),
    ).resolves.toMatchObject({ frozen: true });
    await expect(
      client.unfreezeCustomerServiceThread("temp_session", "session-1"),
    ).resolves.toMatchObject({ frozen: true });

    expect(client.platformRequests).toEqual([
      {
        body: { tenantId: "tenant-freeze-thread" },
        path: "/api/platform/v1/auth/admin-token",
      },
    ]);
    expect(client.requests).toEqual([
      {
        admin: true,
        path: "/api/admin/v1/customer-service/center/threads/temp_session/session-1/freeze",
      },
      {
        admin: true,
        path: "/api/admin/v1/customer-service/center/threads/temp_session/session-1/unfreeze",
      },
    ]);
  });

  it("loads owner closed history from admin unified history sessions instead of realtime center threads", async () => {
    const client = new RecordingCustomerServiceApiClient({
      membershipRole: 4,
      tenantId: "tenant-1",
      response: {
        items: [
          {
            status: "closed",
            threadId: "history-1",
            threadType: "im_direct",
            title: "History customer",
          },
        ],
      },
    });

    await expect(
      client.getCustomerServiceHistoryThreads({
        assignedStaffUserId: "staff-assigned",
        conversationId: "conversation-1",
        customerId: "customer-1",
        customerUserId: "customer-user-1",
        keyword: "refund",
        limit: 50,
        rating: 5,
        senderUserId: "sender-1",
        slaRisk: "true",
        staffUserId: "staff-1",
        status: "closed",
        threadType: "im_direct",
        visitorUserId: "visitor-1",
      }),
    ).resolves.toMatchObject({
      items: [
        {
          status: "closed",
          threadId: "history-1",
          threadType: "im_direct",
        },
      ],
    });
    expect(client.requests).toEqual([
      {
        admin: true,
        path: "/api/admin/v1/customer-service/center/history-sessions?threadType=im_direct&status=closed&limit=50&customerId=customer-1&customerUserId=customer-user-1&visitorUserId=visitor-1&keyword=refund&assignedStaffUserId=staff-assigned&conversationId=conversation-1&senderUserId=sender-1&staffUserId=staff-1&rating=5&slaRisk=true",
      },
    ]);
  });

  it("loads owner all history from admin unified history sessions without a customer or staff scope", async () => {
    const client = new RecordingCustomerServiceApiClient({
      membershipRole: 4,
      tenantId: "tenant-history-all",
      response: {
        items: [
          {
            conversationId: "conversation-1",
            sourceChannel: "temp-chat-widget",
            status: "closed_timeout",
            threadId: "session-1",
            threadType: "temp_session",
            visitorName: "Visitor A",
          },
        ],
        nextCursor: "cursor-2",
        summary: {
          totalSessions: 216,
          avgFirstResponseSeconds: 59,
          sourcePlatformDistribution: [{ label: "Web", value: 216 }],
        },
      },
    });

    await expect(
      client.getCustomerServiceHistoryThreads({
        limit: 50,
      }),
    ).resolves.toMatchObject({
      items: [
        {
          conversationId: "conversation-1",
          sourceChannel: "temp-chat-widget",
          status: "closed_timeout",
          threadId: "session-1",
          threadType: "temp_session",
          title: "Visitor A",
        },
      ],
      nextCursor: "cursor-2",
      summary: {
        totalSessions: 216,
      },
    });
    expect(client.requests).toEqual([
      {
        admin: true,
        path: "/api/admin/v1/customer-service/center/history-sessions?limit=50",
      },
    ]);
    expect(client.platformRequests).toEqual(
      client.platformRequests.length
        ? [
            {
              body: { tenantId: "tenant-history-all" },
              path: "/api/platform/v1/auth/admin-token",
            },
          ]
        : [],
    );
  });

  it("creates customer-service server export tasks with the admin export API", async () => {
    const client = new RecordingCustomerServiceApiClient({
      membershipRole: 4,
      tenantId: "tenant-1",
      response: { taskId: "export-1", status: "pending" },
    });

    await expect(
      client.createCustomerServiceExportTask({
        exportType: "cs_sessions",
        filters: { from: "2026-06-01", to: "2026-06-10" },
      }),
    ).resolves.toMatchObject({ taskId: "export-1" });
    expect(client.requests).toEqual([
      {
        admin: true,
        body: {
          exportType: "cs_sessions",
          filters: { from: "2026-06-01", to: "2026-06-10" },
        },
        path: "/api/admin/v1/export-tasks",
      },
    ]);
  });

  it("lists customer-service export tasks with the admin export API", async () => {
    const client = new RecordingCustomerServiceApiClient({
      membershipRole: 4,
      tenantId: "tenant-1",
      response: [
        {
          exportType: "cs_sessions",
          status: "completed",
          taskId: "export-sessions",
        },
        {
          exportType: "cs_staff_daily_stats",
          status: "completed",
          taskId: "export-staff",
        },
      ],
    });

    await expect(
      client.getCustomerServiceExportTasks({ exportType: "cs_staff_daily_stats" }),
    ).resolves.toEqual([
      {
        exportType: "cs_staff_daily_stats",
        status: "completed",
        taskId: "export-staff",
      },
    ]);
    expect(client.requests).toEqual([
      {
        admin: true,
        path: "/api/admin/v1/export-tasks",
      },
    ]);
  });

  it("uses the silent recall endpoint for customer service message recall", async () => {
    const client = new RecordingCustomerServiceApiClient();

    await client.recallCustomerServiceMessage("message-1");

    expect(client.requests).toEqual([
      {
        admin: false,
        path: "/api/client/v1/messages/message-1/recall-silent",
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

  it("keeps bounded im-list compat unread as display fallback only", async () => {
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
          unreadCount: 0,
        },
      ],
    });
  });

  it("does not let locally bounded im-list compat unread become final customer-service unread", async () => {
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
      activeItems: [{ unreadCount: 0 }],
    });
  });

  it("keeps trusted im-list compat unread as display fallback only", async () => {
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
          unreadCount: 0,
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
