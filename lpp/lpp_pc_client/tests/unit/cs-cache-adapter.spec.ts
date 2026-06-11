import { QueryClient } from "@tanstack/react-query";
import { afterEach, describe, expect, it, vi } from "vitest";

import type {
  CustomerServiceThread,
  MessageItemDto,
} from "../../src/renderer/data/api/types";
import {
  appendCustomerServiceLocalMessage,
  applyCustomerServiceGatewayMessageCache,
  markCustomerServiceThreadClaimed,
  markCustomerServiceThreadClosed,
  markCustomerServiceThreadReadInCache,
  markCustomerServiceThreadTransferred,
  mergeLoadedCustomerServiceThreadDetail,
  mergeSentCustomerServiceMessage,
  patchCustomerServiceLocalMessage,
  removeCustomerServiceMessage,
  removeCustomerServiceLocalMessage,
} from "../../src/renderer/data/customer-service/cs-cache-adapter";
import {
  getCustomerServiceThreadIndex,
  rememberCustomerServiceConversationIndex,
  resetCustomerServiceConversationIndexForTest,
} from "../../src/renderer/data/customer-service/cs-conversation-index";
import { shouldRecordCustomerServiceImListCompatDiagnostic } from "../../src/renderer/data/customer-service/cs-compatibility-bridge";
import { resetSilentCustomerServiceRecallForTest } from "../../src/renderer/data/customer-service/cs-silent-recall";

describe("customer service cache adapter", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    resetCustomerServiceConversationIndexForTest();
    resetSilentCustomerServiceRecallForTest();
  });

  it("merges sent messages into detail and thread preview caches", () => {
    const queryClient = createQueryClient();
    seedCaches(queryClient);
    queryClient.setQueryData(["pc-im-conversations"], {
      items: [
        {
          conversationId: "thread-1",
          conversationType: "direct",
          title: "新会话",
          unreadCount: 1,
        },
        {
          conversationId: "direct-2",
          conversationType: "direct",
          title: "Real IM",
          unreadCount: 0,
        },
      ],
    });

    mergeSentCustomerServiceMessage(queryClient, {
      body: { text: "hello" },
      identity: { displayName: "Agent", userId: "staff-1" },
      messageType: "text",
      result: {
        conversationSeq: 2,
        messageId: "m2",
        sentAt: "2026-05-29T12:00:00.000Z",
      },
      thread: thread(),
    });

    expect(detailMessages(queryClient).map((message) => message.messageId)).toEqual(["m2"]);
    expect(workbenchCache(queryClient).queueItems[0]).toMatchObject({
      lastMessagePreview: "hello",
      unreadCount: 1,
    });
    expect(
      queryClient
        .getQueryData<{ items: Array<{ conversationId: string }> }>(["pc-im-conversations"])
        ?.items.map((item) => item.conversationId),
    ).toEqual(["direct-2"]);
  });

  it("only removes customer-service conversations from the current IM workspace scope", () => {
    const queryClient = createQueryClient();
    seedCaches(queryClient);
    queryClient.setQueryData(["pc-im-conversations", "scope-a", 100], {
      items: [
        { conversationId: "thread-1", conversationType: "direct", title: "Dirty A" },
        { conversationId: "direct-a", conversationType: "direct", title: "Real A" },
      ],
    });
    queryClient.setQueryData(["pc-im-conversations", "scope-b", 100], {
      items: [
        { conversationId: "thread-1", conversationType: "direct", title: "Dirty B" },
        { conversationId: "direct-b", conversationType: "direct", title: "Real B" },
      ],
    });

    mergeSentCustomerServiceMessage(queryClient, {
      body: { text: "hello" },
      identity: {
        apiBaseUrl: "https://api.example.test",
        displayName: "Agent",
        scopeKey: "scope-a",
        userId: "staff-1",
      } as never,
      messageType: "text",
      result: { messageId: "m-scope" },
      thread: thread(),
    });

    expect(
      queryClient
        .getQueryData<{ items: Array<{ conversationId: string }> }>([
          "pc-im-conversations",
          "scope-a",
          100,
        ])
        ?.items.map((item) => item.conversationId),
    ).toEqual(["direct-a"]);
    expect(
      queryClient
        .getQueryData<{ items: Array<{ conversationId: string }> }>([
          "pc-im-conversations",
          "scope-b",
          100,
        ])
        ?.items.map((item) => item.conversationId),
    ).toEqual(["thread-1", "direct-b"]);
  });

  it("applies gateway messages and increments unread when not read", () => {
    const queryClient = createQueryClient();
    seedCaches(queryClient);

    applyCustomerServiceGatewayMessageCache(queryClient, {
      message: message({ messageId: "gw1", preview: "visitor", sentAt: "2026-05-29T12:01:00.000Z" }),
      read: false,
      threadId: "thread-1",
      threadType: "temp_session",
    });

    expect(detailMessages(queryClient).map((item) => item.messageId)).toEqual(["gw1"]);
    expect(workbenchCache(queryClient).queueItems[0]).toMatchObject({
      lastMessagePreview: "visitor",
      unreadCount: 2,
    });
    expect(getCustomerServiceThreadIndex("thread-1")).toMatchObject({
      lastMessagePreview: "visitor",
      overlayUnreadCount: 1,
    });
  });

  it("updates workbench preview when gateway message uses the conversation id alias", () => {
    const queryClient = createQueryClient();
    seedCaches(queryClient);
    queryClient.setQueryData(["pc-cs-workbench-threads"], {
      activeItems: [
        thread({
          conversationId: "widget-conversation-1",
          threadId: "server-session-1",
          unreadCount: 0,
        }),
      ],
      queueItems: [],
    });
    rememberCustomerServiceConversationIndex({
      conversationId: "widget-conversation-1",
      overlayUnreadCount: 0,
      threadId: "server-session-1",
      threadType: "temp_session",
    });

    applyCustomerServiceGatewayMessageCache(queryClient, {
      conversationId: "widget-conversation-1",
      message: message({
        conversationId: "widget-conversation-1",
        messageId: "gw-alias",
        preview: "visitor alias",
        sentAt: "2026-05-29T12:02:00.000Z",
      }),
      read: false,
      threadId: "widget-conversation-1",
      threadType: "temp_session",
    });

    expect(workbenchCache(queryClient).activeItems[0]).toMatchObject({
      lastMessagePreview: "visitor alias",
      threadId: "server-session-1",
      unreadCount: 1,
    });
  });

  it("does not increment unread twice for the same gateway message", () => {
    const queryClient = createQueryClient();
    seedCaches(queryClient);
    const gatewayMessage = message({
      messageId: "gw-duplicate",
      preview: "visitor",
      sentAt: "2026-05-29T12:01:00.000Z",
    });

    applyCustomerServiceGatewayMessageCache(queryClient, {
      message: gatewayMessage,
      read: false,
      threadId: "thread-1",
      threadType: "temp_session",
    });
    applyCustomerServiceGatewayMessageCache(queryClient, {
      message: gatewayMessage,
      read: false,
      threadId: "thread-1",
      threadType: "temp_session",
    });

    expect(workbenchCache(queryClient).queueItems[0]).toMatchObject({
      lastMessagePreview: "visitor",
      unreadCount: 2,
    });
    expect(getCustomerServiceThreadIndex("thread-1")).toMatchObject({
      lastMessagePreview: "visitor",
      overlayUnreadCount: 1,
    });
  });

  it("only records imListCompat diagnostics when a temp-session signature changes", () => {
    const key = `thread-diagnostic:${Date.now()}:conversation-diagnostic`;

    expect(shouldRecordCustomerServiceImListCompatDiagnostic(key, "message-1|preview|1|0|0|1")).toBe(true);
    expect(shouldRecordCustomerServiceImListCompatDiagnostic(key, "message-1|preview|1|0|0|1")).toBe(false);
    expect(shouldRecordCustomerServiceImListCompatDiagnostic(key, "message-2|preview|2|0|0|2")).toBe(true);
  });

  it("clears overlay unread when a customer-service thread is read", () => {
    const queryClient = createQueryClient();
    seedCaches(queryClient);
    queryClient.setQueryData(["pc-cs-staff-service-history"], {
      items: [
        {
          status: "closed_by_visitor",
          threadId: "thread-1",
          threadType: "temp_session",
          title: "Visitor",
          unreadCount: 4,
        },
      ],
    });

    applyCustomerServiceGatewayMessageCache(queryClient, {
      message: message({ messageId: "gw-read", preview: "visitor" }),
      read: false,
      threadId: "thread-1",
      threadType: "temp_session",
    });
    markCustomerServiceThreadReadInCache(queryClient, "thread-1");

    expect(workbenchCache(queryClient).queueItems[0]).toMatchObject({ unreadCount: 0 });
    expect(
      queryClient.getQueryData<{ items: Array<{ unreadCount?: number }> }>([
        "pc-cs-staff-service-history",
      ])?.items[0],
    ).toMatchObject({ unreadCount: 0 });
    expect(getCustomerServiceThreadIndex("thread-1")).toMatchObject({
      overlayUnreadCount: 0,
    });
  });

  it("marks a closed thread as history without clearing unread", () => {
    const queryClient = createQueryClient();
    seedCaches(queryClient);

    markCustomerServiceThreadClosed(queryClient, thread({ unreadCount: 3 }), {
      status: "closed_by_visitor",
    });

    expect(workbenchCache(queryClient).queueItems[0]).toMatchObject({
      status: "closed_by_visitor",
      unreadCount: 3,
    });
    expect(queryClient.getQueryData<{ status?: string }>(detailKey())).toMatchObject({
      status: "closed_by_visitor",
    });
  });

  it("moves a claimed queued thread into the active list immediately", () => {
    const queryClient = createQueryClient();
    seedCaches(queryClient, { unreadCount: 2 });

    markCustomerServiceThreadClaimed(queryClient, thread({ unreadCount: 2 }), {
      status: "serving",
    });

    expect(workbenchCache(queryClient).queueItems).toHaveLength(0);
    expect(workbenchCache(queryClient).activeItems[0]).toMatchObject({
      status: "serving",
      threadId: "thread-1",
      unreadCount: 2,
    });
    expect(queryClient.getQueryData<{ status?: string }>(detailKey())).toMatchObject({
      status: "serving",
    });
  });

  it("marks a transferred-away thread as readonly history for the current agent", () => {
    const queryClient = createQueryClient();
    seedCaches(queryClient, { status: "serving", unreadCount: 3 });
    rememberCustomerServiceConversationIndex({
      conversationId: "thread-1",
      lastMessagePreview: "visitor before transfer",
      overlayUnreadCount: 3,
      threadId: "thread-1",
      threadType: "temp_session",
    });

    markCustomerServiceThreadTransferred(queryClient, thread({ status: "serving", unreadCount: 3 }), {
      status: "serving",
      transferred: true,
      transferredAt: "2026-06-10T12:00:00.000Z",
    });

    expect(workbenchCache(queryClient).queueItems[0]).toMatchObject({
      accessMode: "management_readonly",
      status: "transferred",
      unreadCount: 0,
      updatedAt: "2026-06-10T12:00:00.000Z",
    });
    expect(queryClient.getQueryData<{ status?: string }>(detailKey())).toMatchObject({
      status: "transferred",
    });
    expect(getCustomerServiceThreadIndex("thread-1")).toMatchObject({
      overlayUnreadCount: 0,
    });
  });

  it("keeps closed unread in the customer-service overlay index for history refetches", () => {
    const queryClient = createQueryClient();
    seedCaches(queryClient);

    markCustomerServiceThreadClosed(queryClient, thread({ unreadCount: 3 }), {
      status: "closed_by_staff",
    });

    expect(getCustomerServiceThreadIndex("thread-1")).toMatchObject({
      conversationId: "thread-1",
      overlayUnreadCount: 3,
      threadId: "thread-1",
      threadType: "temp_session",
    });
  });

  it("updates sent message overlay preview without creating unread", () => {
    const queryClient = createQueryClient();
    seedCaches(queryClient);

    mergeSentCustomerServiceMessage(queryClient, {
      body: { text: "agent reply" },
      messageType: "text",
      result: {
        conversationSeq: 3,
        messageId: "agent-message",
        sentAt: "2026-05-29T12:03:00.000Z",
      },
      thread: thread(),
    });

    expect(getCustomerServiceThreadIndex("thread-1")).toMatchObject({
      lastMessagePreview: "agent reply",
      localStaffSentSeqs: [3],
      overlayUnreadCount: 0,
    });
    expect(workbenchCache(queryClient).queueItems[0]).toMatchObject({
      lastMessagePreview: "agent reply",
      unreadCount: 1,
    });
  });

  it("remembers loaded detail preview so workbench overlay does not revert to stale text", () => {
    const queryClient = createQueryClient();
    seedCaches(queryClient);
    rememberCustomerServiceConversationIndex({
      conversationId: "thread-1",
      lastMessageAt: "2026-05-29T12:03:00.000Z",
      lastMessageId: "old-message",
      lastMessagePreview: "old preview",
      overlayUnreadCount: 0,
      threadId: "thread-1",
      threadType: "temp_session",
    });

    mergeLoadedCustomerServiceThreadDetail(queryClient, thread(), {
      messages: [
        message({
          messageId: "detail-new",
          preview: "detail latest",
          sentAt: "2026-05-29T12:05:00.000Z",
        }),
      ],
    });

    expect(getCustomerServiceThreadIndex("thread-1")).toMatchObject({
      lastMessageId: "detail-new",
      lastMessagePreview: "detail latest",
      overlayUnreadCount: 0,
    });
    expect(workbenchCache(queryClient).queueItems[0]).toMatchObject({
      lastMessagePreview: "detail latest",
    });
  });

  it("preserves visitor unread when an agent sends a customer-service reply", () => {
    const queryClient = createQueryClient();
    seedCaches(queryClient);

    applyCustomerServiceGatewayMessageCache(queryClient, {
      message: message({ messageId: "visitor-1", preview: "visitor" }),
      read: false,
      threadId: "thread-1",
      threadType: "temp_session",
    });
    mergeSentCustomerServiceMessage(queryClient, {
      body: { text: "agent reply" },
      messageType: "text",
      result: {
        conversationSeq: 4,
        messageId: "agent-reply",
        sentAt: "2026-05-29T12:04:00.000Z",
      },
      thread: thread(),
    });

    expect(workbenchCache(queryClient).queueItems[0]).toMatchObject({
      lastMessagePreview: "agent reply",
      unreadCount: 2,
    });
    expect(getCustomerServiceThreadIndex("thread-1")).toMatchObject({
      lastMessagePreview: "agent reply",
      localStaffSentSeqs: [4],
      overlayUnreadCount: 1,
    });
  });

  it("patches and removes local upload messages", () => {
    const queryClient = createQueryClient();
    seedCaches(queryClient);

    appendCustomerServiceLocalMessage(
      queryClient,
      thread(),
      message({ messageId: "local-1", status: "queued" }),
    );
    patchCustomerServiceLocalMessage(queryClient, thread(), "local-1", {
      body: { video: { thumbnailUrl: "blob:local-poster", url: "blob:local-video" } },
      status: "uploading",
      uploadProgress: 42,
    });

    expect(detailMessages(queryClient)[0]).toMatchObject({
      body: { video: { thumbnailUrl: "blob:local-poster", url: "blob:local-video" } },
      messageId: "local-1",
      status: "uploading",
      uploadProgress: 42,
    });

    removeCustomerServiceLocalMessage(queryClient, thread(), "local-1");
    expect(detailMessages(queryClient)).toEqual([]);
  });

  it("keeps a local customer-service echo at the bottom before server seq arrives", () => {
    const queryClient = createQueryClient();
    seedCaches(queryClient);
    queryClient.setQueryData(detailKey(), {
      messages: [
        message({
          conversationSeq: 1,
          messageId: "welcome",
          preview: "welcome",
          sentAt: "2026-05-29T12:00:00.000Z",
        }),
        message({
          conversationSeq: 2,
          messageId: "queue",
          preview: "queue",
          sentAt: "2026-05-29T12:01:00.000Z",
        }),
      ],
    });

    appendCustomerServiceLocalMessage(
      queryClient,
      thread(),
      message({
        conversationSeq: undefined,
        messageId: "pc-cs-local-text-1",
        preview: "agent local reply",
        sentAt: "2026-05-29T12:02:00.000Z",
        status: "sending",
      }),
    );

    expect(detailMessages(queryClient).map((item) => item.messageId)).toEqual([
      "welcome",
      "queue",
      "pc-cs-local-text-1",
    ]);
  });

  it("uses sentAt to keep mixed seq and seq-less customer-service messages chronological", () => {
    const queryClient = createQueryClient();
    seedCaches(queryClient);

    mergeLoadedCustomerServiceThreadDetail(queryClient, thread(), {
      messages: [
        message({
          conversationSeq: 2,
          messageId: "sequenced",
          preview: "sequenced",
          sentAt: "2026-05-29T12:01:00.000Z",
        }),
        message({
          conversationSeq: undefined,
          messageId: "seq-less-old",
          preview: "seq less old",
          sentAt: "2026-05-29T11:59:00.000Z",
        }),
      ],
    });

    expect(getCustomerServiceThreadIndex("thread-1")).toMatchObject({
      lastMessageId: "sequenced",
      lastMessagePreview: "sequenced",
    });
  });

  it("removes recalled customer-service messages from the agent detail cache", () => {
    const queryClient = createQueryClient();
    seedCaches(queryClient);
    queryClient.setQueryData(detailKey(), {
      messages: [
        message({ messageId: "m1", preview: "keep" }),
        message({ messageId: "m2", preview: "remove me" }),
      ],
    });

    removeCustomerServiceMessage(queryClient, thread(), "m2");

    expect(detailMessages(queryClient).map((item) => item.messageId)).toEqual(["m1"]);
  });

  it("keeps silently recalled customer-service messages removed after gateway replay", () => {
    const queryClient = createQueryClient();
    seedCaches(queryClient);
    queryClient.setQueryData(detailKey(), {
      messages: [
        message({ messageId: "m1", preview: "keep" }),
        message({ messageId: "m2", preview: "remove me" }),
      ],
    });

    removeCustomerServiceMessage(queryClient, thread(), "m2");
    applyCustomerServiceGatewayMessageCache(queryClient, {
      message: message({ messageId: "m2", preview: "replayed recall trace" }),
      read: false,
      threadId: "thread-1",
      threadType: "temp_session",
    });

    expect(detailMessages(queryClient).map((item) => item.messageId)).toEqual(["m1"]);
    expect(workbenchCache(queryClient).queueItems[0]).not.toMatchObject({
      lastMessagePreview: "replayed recall trace",
    });
  });

  it("merges loaded detail, marks read, closes threads and records diagnostics", () => {
    vi.stubGlobal("window", {});
    const queryClient = createQueryClient();
    seedCaches(queryClient);

    mergeLoadedCustomerServiceThreadDetail(queryClient, thread(), {
      avatarUrl: "/avatar.png",
      lastMessageAt: "2026-05-29T12:02:00.000Z",
      messages: [message({ messageId: "m3", preview: "from detail" })],
      title: "Visitor",
    });
    markCustomerServiceThreadReadInCache(queryClient, "thread-1");
    markCustomerServiceThreadClosed(queryClient, thread(), { closed: true });

    expect(workbenchCache(queryClient).queueItems[0]).toMatchObject({
      avatarUrl: "/avatar.png",
      lastMessagePreview: "from detail",
      title: "Visitor",
      unreadCount: 0,
    });
    expect(queryClient.getQueryData<{ status?: string }>(detailKey())).toMatchObject({
      status: "closed_by_staff",
    });
    expect(globalThis.window.__lppCustomerServiceCacheDiagnostics?.length).toBeGreaterThan(0);
  });

  it("preserves local overlay unread when closing a customer-service thread", () => {
    const queryClient = createQueryClient();
    seedCaches(queryClient, { unreadCount: 0 });
    rememberCustomerServiceConversationIndex({
      conversationId: "thread-1",
      lastMessagePreview: "visitor before close",
      overlayUnreadCount: 3,
      threadId: "thread-1",
      threadType: "temp_session",
    });

    markCustomerServiceThreadClosed(queryClient, thread({ unreadCount: 0 }), { closed: true });

    expect(workbenchCache(queryClient).queueItems[0]).toMatchObject({
      status: "closed_by_staff",
      unreadCount: 3,
    });
    expect(getCustomerServiceThreadIndex("thread-1")).toMatchObject({
      lastMessagePreview: "visitor before close",
      overlayUnreadCount: 3,
    });
  });
});

function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });
}

function seedCaches(queryClient: QueryClient, threadOverrides: Partial<CustomerServiceThread> = {}) {
  queryClient.setQueryData(detailKey(), { messages: [] });
  queryClient.setQueryData(["pc-cs-workbench-threads"], {
    activeItems: [],
    queueItems: [thread({ unreadCount: 1, ...threadOverrides })],
  });
}

function detailKey() {
  return ["pc-cs-thread-detail", "tenant", "temp_session", "thread-1"];
}

function detailMessages(queryClient: QueryClient) {
  return queryClient.getQueryData<{ messages: MessageItemDto[] }>(detailKey())?.messages ?? [];
}

function workbenchCache(queryClient: QueryClient) {
  return queryClient.getQueryData<{
    activeItems: CustomerServiceThread[];
    queueItems: CustomerServiceThread[];
  }>(["pc-cs-workbench-threads"])!;
}

function thread(overrides: Partial<CustomerServiceThread> = {}): CustomerServiceThread {
  return {
    conversationId: "thread-1",
    status: "queued",
    threadId: "thread-1",
    threadType: "temp_session",
    title: "Old visitor",
    unreadCount: 0,
    ...overrides,
  };
}

function message(overrides: Partial<MessageItemDto>): MessageItemDto {
  return {
    body: { text: "message" },
    conversationId: "thread-1",
    messageId: "m1",
    messageType: "text",
    preview: "message",
    sentAt: "2026-05-29T12:00:00.000Z",
    ...overrides,
  };
}
