import { beforeEach, describe, expect, it } from "vitest";

import { MessagesApiClient } from "../../src/renderer/data/api/messages-client";
import type { ConversationListResponse } from "../../src/renderer/data/api/types";
import {
  customerServiceIndexScopeKey,
  getCustomerServiceConversationIndex,
  resetCustomerServiceConversationIndexForTest,
} from "../../src/renderer/data/customer-service/cs-conversation-index";

const testScopeKey = customerServiceIndexScopeKey({
  apiBaseUrl: "https://api.example.test",
  tenantToken: "tenant-token",
});

class TestMessagesApiClient extends MessagesApiClient {
  constructor(private readonly page: ConversationListResponse) {
    super({
      baseUrl: "https://api.example.test",
      tenantToken: "tenant-token",
      traceId: "test-trace",
    });
  }

  override async request<T>() {
    return this.page as T;
  }
}

describe("MessagesApiClient", () => {
  beforeEach(() => {
    resetCustomerServiceConversationIndexForTest();
  });

  it("keeps plain IM compatibility conversations in the IM list", async () => {
    const client = new TestMessagesApiClient({
      items: [
        {
          conversationId: "direct-1",
          conversationType: "direct",
          title: "Alice",
          unreadCount: 1,
          lastReadSeq: 1,
          lastMessageSeq: 2,
        },
        {
          conversationId: "thread-direct-customer",
          conversationType: "direct_customer",
          title: "Visitor",
          unreadCount: 1,
          lastReadSeq: 1,
          lastMessageSeq: 2,
        },
        {
          conversationId: "thread-source-customer-service",
          conversationType: "direct",
          source: "customer_service",
          title: "Visitor",
          unreadCount: 1,
          lastReadSeq: 1,
          lastMessageSeq: 2,
        } as never,
      ],
    });

    await expect(client.getConversations()).resolves.toMatchObject({
      items: [
        { conversationId: "direct-1", conversationType: "direct" },
        { conversationId: "thread-direct-customer" },
        { conversationId: "thread-source-customer-service", conversationType: "direct" },
      ],
    });
  });

  it("indexes temp-session conversations filtered from the IM list with bounded unknown compat unread", async () => {
    const client = new TestMessagesApiClient({
      items: [
        {
          conversationId: "im-conversation-cs-1",
          conversationType: "temp_session",
          title: "Visitor",
          unreadCount: 4,
          lastReadSeq: 0,
          lastMessageSeq: 4,
          lastMessage: {
            messageId: "m-temp-1",
            messageType: "text",
            preview: "visitor text",
            sentAt: "2026-06-01T10:00:00.000Z",
          },
          tempSession: {
            sessionId: "temp-session-1",
            sourceChannel: "temp-chat-widget",
          },
        } as never,
      ],
    });

    await expect(client.getConversations()).resolves.toMatchObject({ items: [] });
    expect(getCustomerServiceConversationIndex("im-conversation-cs-1", testScopeKey)).toMatchObject({
      compatLastMessageId: "m-temp-1",
      compatLastMessageSeq: 4,
      compatLastReadSeq: 0,
      compatRawUnreadCount: 4,
      compatUnreadCandidate: 4,
      compatUnreadReason: "compat-unknown-bounded",
      conversationId: "im-conversation-cs-1",
      lastMessageAt: "2026-06-01T10:00:00.000Z",
      lastMessageId: "m-temp-1",
      lastMessagePreview: "visitor text",
      source: "temp-chat-widget",
      threadId: "temp-session-1",
      threadType: "temp_session",
    });
    expect(
      getCustomerServiceConversationIndex("im-conversation-cs-1", testScopeKey)
        ?.overlayUnreadCount,
    ).toBeUndefined();
  });

  it("creates a trusted compat unread candidate only for explicit inbound temp-session messages", async () => {
    const client = new TestMessagesApiClient({
      items: [
        {
          conversationId: "im-conversation-cs-inbound",
          conversationType: "temp_session",
          title: "Visitor",
          unreadCount: 3,
          lastReadSeq: 0,
          lastMessageSeq: 3,
          lastMessage: {
            direction: "incoming",
            messageId: "m-temp-inbound",
            messageType: "text",
            preview: "visitor text",
            sentAt: "2026-06-01T10:00:00.000Z",
          },
          tempSession: {
            sessionId: "temp-session-inbound",
            sourceChannel: "temp-chat-widget",
          },
        } as never,
      ],
    });

    await expect(client.getConversations()).resolves.toMatchObject({ items: [] });
    expect(
      getCustomerServiceConversationIndex("im-conversation-cs-inbound", testScopeKey),
    ).toMatchObject({
      compatRawUnreadCount: 3,
      compatUnreadCandidate: 3,
      compatUnreadReason: "compat-inbound-trusted",
      lastMessagePreview: "visitor text",
      threadId: "temp-session-inbound",
    });
  });

  it("does not create a compat unread candidate for explicit self temp-session last messages", async () => {
    const client = new TestMessagesApiClient({
      items: [
        {
          conversationId: "im-conversation-cs-self",
          conversationType: "temp_session",
          title: "Visitor",
          unreadCount: 4,
          lastReadSeq: 0,
          lastMessageSeq: 4,
          lastMessage: {
            direction: "out",
            messageId: "m-temp-self",
            messageType: "text",
            preview: "agent reply",
            sentAt: "2026-06-01T10:00:00.000Z",
          },
          tempSession: {
            sessionId: "temp-session-self",
            sourceChannel: "temp-chat-widget",
          },
        } as never,
      ],
    });

    await expect(client.getConversations()).resolves.toMatchObject({ items: [] });
    expect(
      getCustomerServiceConversationIndex("im-conversation-cs-self", testScopeKey),
    ).toMatchObject({
      compatRawUnreadCount: 4,
      compatUnreadCandidate: 0,
      compatUnreadReason: "self-message-suppressed",
      lastMessagePreview: "agent reply",
      threadId: "temp-session-self",
    });
  });
});
