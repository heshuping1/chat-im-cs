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

  it("protects direct_customer conversations as IM unless tempSession is explicit", () => {
    const ownership = resolveConversationOwnership({
      payload: {
        conversationId: "direct-customer-1",
        conversationType: "direct_customer",
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
      reason: "unknown-default-im",
    });
  });

  it("does not use indexed ownership when scope is missing", () => {
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
      reason: "blocking-missing-scope",
    });
  });
});
