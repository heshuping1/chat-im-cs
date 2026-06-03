import { beforeEach, describe, expect, it } from "vitest";

import {
  rememberCustomerServiceConversationIndex,
  resetCustomerServiceConversationIndexForTest,
} from "../../src/renderer/data/customer-service/cs-conversation-index";
import { resolveConversationOwnership } from "../../src/renderer/data/gateway/conversation-ownership-resolver";

describe("resolveConversationOwnership", () => {
  beforeEach(() => {
    resetCustomerServiceConversationIndexForTest();
  });

  it("routes strict direct and group IM conversation types to IM", () => {
    for (const conversationType of ["direct", "group"]) {
      expect(
        resolveConversationOwnership({
          payload: {
            conversationId: `conversation-${conversationType}`,
            conversationType,
          },
          scopeKey: "scope-a",
          source: "gateway",
        }),
      ).toMatchObject({
        confidence: "explicit",
        owner: "im",
        reason: "explicit-im",
      });
    }
  });

  it("routes explicit temp-session payloads to customer service without indexed lookup", () => {
    const ownership = resolveConversationOwnership({
      payload: {
        conversationId: "conversation-1",
        tempSession: { sessionId: "thread-1" },
      },
      scopeKey: "scope-a",
      source: "gateway",
    });

    expect(ownership).toMatchObject({
      confidence: "explicit",
      conversationId: "conversation-1",
      owner: "customerService",
      reason: "explicit-temp-session",
      threadId: "thread-1",
      threadType: "temp_session",
    });
  });

  it("routes online-service direct-customer types to customer service", () => {
    for (const conversationType of ["direct_customer", "customer_direct", "im_direct"]) {
      const ownership = resolveConversationOwnership({
        payload: {
          conversationId: `conversation-${conversationType}`,
          conversationType,
        },
        scopeKey: "scope-a",
        source: "gateway",
      });

      expect(ownership).toMatchObject({
        confidence: "explicit",
        owner: "customerService",
        reason: "explicit-customer-service-direct",
        threadId: `conversation-${conversationType}`,
        threadType: "im_direct",
      });
    }
  });

  it("routes sourceType widget to customer-service temp sessions", () => {
    const ownership = resolveConversationOwnership({
      payload: {
        conversationId: "conversation-widget",
        sourceType: "widget",
        threadId: "thread-widget",
      },
      scopeKey: "scope-a",
      source: "gateway",
    });

    expect(ownership).toMatchObject({
      confidence: "explicit",
      owner: "customerService",
      reason: "explicit-source-widget",
      threadId: "thread-widget",
      threadType: "temp_session",
    });
  });

  it("routes sourceType im direct messages to IM instead of online-service temp sessions", () => {
    const ownership = resolveConversationOwnership({
      payload: {
        conversationId: "conversation-im-cs",
        conversationType: "direct",
        sourceType: "im",
        threadId: "thread-im-cs",
      },
      scopeKey: "scope-a",
      source: "gateway",
    });

    expect(ownership).toMatchObject({
      confidence: "explicit",
      owner: "im",
      reason: "explicit-im",
    });
  });

  it("routes unmarked messages to customer service only when the same scope indexed them", () => {
    rememberCustomerServiceConversationIndex({
      conversationId: "conversation-indexed",
      scopeKey: "scope-a",
      source: "temp-chat-widget",
      threadId: "thread-indexed",
      threadType: "temp_session",
    });

    expect(
      resolveConversationOwnership({
        payload: { conversationId: "conversation-indexed" },
        scopeKey: "scope-a",
        source: "gateway",
      }),
    ).toMatchObject({
      confidence: "indexed",
      owner: "customerService",
      reason: "indexed-temp-session",
      threadId: "thread-indexed",
    });

    expect(
      resolveConversationOwnership({
        payload: { conversationId: "conversation-indexed" },
        scopeKey: "scope-b",
        source: "gateway",
      }),
    ).toMatchObject({
      confidence: "unknown",
      owner: "unknown",
      reason: "missing-ownership-evidence",
    });
  });

  it("does not default unmarked messages to IM when scope is missing", () => {
    rememberCustomerServiceConversationIndex({
      conversationId: "conversation-indexed",
      scopeKey: "scope-a",
      source: "temp-chat-widget",
      threadId: "thread-indexed",
      threadType: "temp_session",
    });

    expect(
      resolveConversationOwnership({
        payload: { conversationId: "conversation-indexed" },
        scopeKey: "",
        source: "gateway",
      }),
    ).toMatchObject({
      confidence: "unknown",
      owner: "unknown",
      reason: "missing-ownership-evidence",
    });
  });

  it("does not guess customer service ownership from legacy fields, paths or preview text", () => {
    const ownership = resolveConversationOwnership({
      payload: {
        chatId: "legacy-chat",
        conversation_id: "legacy-conversation",
        preview: "visitor temp_session support message",
        temp_session: { sessionId: "legacy-session" },
        thread_id: "legacy-thread",
      },
      scopeKey: "scope-a",
      source: "gateway",
    });

    expect(ownership).toMatchObject({
      confidence: "unknown",
      owner: "unknown",
      reason: "missing-ownership-evidence",
    });
  });
});
