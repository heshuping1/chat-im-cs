import { describe, expect, it } from "vitest";
import {
  chatConversationEntityFromCustomerServiceThread,
  chatConversationEntityFromImConversation,
} from "../../src/renderer/data/conversation/conversation-domain";

describe("conversation domain", () => {
  it("maps IM conversation to shared entity with IM extension", () => {
    const entity = chatConversationEntityFromImConversation({
      id: "direct-1",
      type: "direct",
      title: "Alice",
      avatarUrl: "https://example.com/a.png",
      memberAvatarUrls: [],
      memberAvatars: [],
      lastMessage: {
        id: "m1",
        type: "text",
        preview: "hello",
        sentAt: "2026-05-29T10:00:00Z",
        senderDisplayName: "Alice",
      },
      unreadCount: 2,
      lastReadSeq: 5,
      lastMessageSeq: 7,
      peerReadSeq: 6,
      isPinned: true,
    });

    expect(entity).toMatchObject({
      source: "im",
      stableId: "im:direct:direct-1",
      kind: "direct",
      title: "Alice",
      unreadCount: 2,
      lastActivityAt: "2026-05-29T10:00:00Z",
      im: {
        conversationId: "direct-1",
        conversationType: "direct",
        lastReadSeq: 5,
        lastMessageSeq: 7,
        peerReadSeq: 6,
        isPinned: true,
      },
    });
  });

  it("maps customer-service thread to shared entity with thread extension", () => {
    const entity = chatConversationEntityFromCustomerServiceThread({
      threadType: "temp_session",
      threadId: "thread-1",
      conversationId: "conversation-1",
      status: "serving",
      title: "访客",
      avatarUrl: null,
      customerAvatarUrl: "https://example.com/customer.png",
      source: "web",
      sourceChannel: "website",
      isVip: true,
      tags: ["vip"],
      lastMessagePreview: "需要帮助",
      lastMessageAt: "2026-05-29T11:00:00Z",
      unreadCount: 3,
    });

    expect(entity).toMatchObject({
      source: "customer_service",
      stableId: "customer_service:temp_session:thread-1",
      kind: "temp_session",
      title: "访客",
      avatar: {
        avatarUrl: "https://example.com/customer.png",
      },
      lastMessage: {
        preview: "需要帮助",
        sentAt: "2026-05-29T11:00:00Z",
      },
      unreadCount: 3,
      customerService: {
        threadId: "thread-1",
        threadType: "temp_session",
        conversationId: "conversation-1",
        normalizedStatus: "serving",
        isTerminal: false,
        source: "web",
        sourceChannel: "website",
        isVip: true,
        tags: ["vip"],
      },
    });
  });

  it("marks terminal customer-service threads without affecting IM fields", () => {
    const entity = chatConversationEntityFromCustomerServiceThread({
      threadType: "temp_session",
      threadId: "thread-closed",
      conversationId: "thread-closed",
      status: "closed_by_staff",
      title: "历史访客",
    });

    expect(entity.im).toBeUndefined();
    expect(entity.customerService?.isTerminal).toBe(true);
    expect(entity.lastMessage).toBeNull();
  });
});
