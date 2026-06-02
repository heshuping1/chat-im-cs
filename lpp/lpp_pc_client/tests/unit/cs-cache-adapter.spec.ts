import { QueryClient } from "@tanstack/react-query";
import { afterEach, describe, expect, it, vi } from "vitest";

import type {
  CustomerServiceThread,
  MessageItemDto,
} from "../../src/renderer/data/api/types";
import {
  appendCustomerServiceLocalMessage,
  applyCustomerServiceGatewayMessageCache,
  markCustomerServiceThreadClosed,
  markCustomerServiceThreadReadInCache,
  mergeLoadedCustomerServiceThreadDetail,
  mergeSentCustomerServiceMessage,
  patchCustomerServiceLocalMessage,
  removeCustomerServiceLocalMessage,
} from "../../src/renderer/data/customer-service/cs-cache-adapter";
import {
  getCustomerServiceThreadIndex,
  resetCustomerServiceConversationIndexForTest,
} from "../../src/renderer/data/customer-service/cs-conversation-index";
import { shouldRecordCustomerServiceImListCompatDiagnostic } from "../../src/renderer/data/customer-service/cs-compatibility-bridge";

describe("customer service cache adapter", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    resetCustomerServiceConversationIndexForTest();
  });

  it("merges sent messages into detail and thread preview caches", () => {
    const queryClient = createQueryClient();
    seedCaches(queryClient);

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

    applyCustomerServiceGatewayMessageCache(queryClient, {
      message: message({ messageId: "gw-read", preview: "visitor" }),
      read: false,
      threadId: "thread-1",
      threadType: "temp_session",
    });
    markCustomerServiceThreadReadInCache(queryClient, "thread-1");

    expect(workbenchCache(queryClient).queueItems[0]).toMatchObject({ unreadCount: 0 });
    expect(getCustomerServiceThreadIndex("thread-1")).toMatchObject({
      overlayUnreadCount: 0,
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
});

function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });
}

function seedCaches(queryClient: QueryClient) {
  queryClient.setQueryData(detailKey(), { messages: [] });
  queryClient.setQueryData(["pc-cs-workbench-threads"], {
    activeItems: [],
    queueItems: [thread({ unreadCount: 1 })],
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
