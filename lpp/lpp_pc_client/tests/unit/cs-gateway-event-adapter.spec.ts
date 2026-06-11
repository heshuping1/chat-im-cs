import { beforeEach, describe, expect, it } from "vitest";

import { adaptCustomerServiceGatewayEvent } from "../../src/renderer/data/gateway/cs-gateway-event-adapter";
import {
  customerServiceIndexScopeKey,
  rememberCustomerServiceConversationIndex,
  resetCustomerServiceConversationIndexForTest,
} from "../../src/renderer/data/customer-service/cs-conversation-index";

const testScopeKey = customerServiceIndexScopeKey({
  apiBaseUrl: "https://api.example.test",
  tenantToken: "tenant-token",
});

describe("adaptCustomerServiceGatewayEvent", () => {
  beforeEach(() => {
    resetCustomerServiceConversationIndexForTest();
  });

  it("adapts explicit customer service message events", () => {
    const event = adaptCustomerServiceGatewayEvent({
      eventName: "customer_service.message.new",
      receivedAt: 1,
      args: [
        {
          threadId: "thread-1",
          threadType: "temp_session",
          messageId: "m1",
          messageType: "text",
          body: { text: "hello" },
          senderUserId: "customer-1",
        },
      ],
    });

    expect(event.kind).toBe("cs.message.received");
    if (event.kind !== "cs.message.received") return;
    expect(event.threadId).toBe("thread-1");
    expect(event.threadType).toBe("temp_session");
    expect(event.message.messageId).toBe("m1");
    expect(event.message.preview).toBe("hello");
  });

  it("adapts generic message events when payload is a customer service thread", () => {
    const event = adaptCustomerServiceGatewayEvent({
      eventName: "message.new",
      receivedAt: 2,
      args: [
        {
          data: {
            thread: { threadId: "thread-2", threadType: "temp_session" },
            message: {
              messageId: "m2",
              messageType: "text",
              body: { text: "queued hello" },
            },
          },
        },
      ],
    });

    expect(event.kind).toBe("cs.message.received");
    if (event.kind !== "cs.message.received") return;
    expect(event.threadId).toBe("thread-2");
    expect(event.message.messageId).toBe("m2");
  });

  it("adapts queue and status events as thread changes", () => {
    const queueEvent = adaptCustomerServiceGatewayEvent({
      eventName: "customer_service.queue.created",
      receivedAt: 3,
      args: [{ threadId: "thread-3", status: "queued" }],
    });
    expect(queueEvent.kind).toBe("cs.thread.changed");
    if (queueEvent.kind !== "cs.thread.changed") return;
    expect(queueEvent.changeKind).toBe("queue_created");
    expect(queueEvent.shouldNotifyQueue).toBe(true);

    const statusEvent = adaptCustomerServiceGatewayEvent({
      eventName: "customer_service.staff.status_changed",
      receivedAt: 4,
      args: [{ serviceStatus: "busy" }],
    });
    expect(statusEvent.kind).toBe("cs.thread.changed");
    if (statusEvent.kind !== "cs.thread.changed") return;
    expect(statusEvent.changeKind).toBe("staff_status_changed");
    expect(statusEvent.serviceStatus).toBe("busy");
  });

  it("adapts temp-session close events with a root session id", () => {
    const event = adaptCustomerServiceGatewayEvent({
      eventName: "temp_session.closed",
      receivedAt: 7,
      args: [
        {
          closedAt: "2026-06-04T01:53:00.000Z",
          sessionId: "temp-session-closed-1",
          status: "closed_by_visitor",
        },
      ],
    });

    expect(event.kind).toBe("cs.thread.changed");
    if (event.kind !== "cs.thread.changed") return;
    expect(event.changeKind).toBe("thread_closed");
    expect(event.threadId).toBe("temp-session-closed-1");
    expect(event.threadStatus).toBe("closed_by_visitor");
  });

  it("adapts temp-session typing events as customer preview state", () => {
    const event = adaptCustomerServiceGatewayEvent({
      eventName: "temp_session.typing",
      receivedAt: 12,
      args: [
        {
          sessionId: "temp-session-typing-1",
          isTyping: true,
          content: "I need help with my order",
          senderRole: "visitor",
        },
      ],
    });

    expect(event.kind).toBe("cs.typing.preview");
    if (event.kind !== "cs.typing.preview") return;
    expect(event.threadId).toBe("temp-session-typing-1");
    expect(event.threadType).toBe("temp_session");
    expect(event.isTyping).toBe(true);
    expect(event.previewText).toBe("I need help with my order");
    expect(event.senderRole).toBe("visitor");
  });

  it("adapts direct-customer msg.typing events as online-service direct preview state", () => {
    const event = adaptCustomerServiceGatewayEvent({
      eventName: "msg.typing",
      receivedAt: 13,
      args: [
        {
          conversationId: "thread-direct-typing",
          conversationType: "direct_customer",
          content: "direct draft",
          isTyping: "true",
          senderType: "customer",
        },
      ],
    });

    expect(event.kind).toBe("cs.typing.preview");
    if (event.kind !== "cs.typing.preview") return;
    expect(event.threadId).toBe("thread-direct-typing");
    expect(event.threadType).toBe("im_direct");
    expect(event.previewText).toBe("direct draft");
  });

  it("returns invalid for customer service messages without a thread id", () => {
    const event = adaptCustomerServiceGatewayEvent({
      eventName: "customer_service.message",
      receivedAt: 5,
      args: [{ messageId: "m5", messageType: "text" }],
    });

    expect(event.kind).toBe("invalid");
    if (event.kind !== "invalid") return;
    expect(event.reason).toBe("missing_thread_id");
  });

  it("adapts unmarked msg.new messages when the conversation is indexed as temp-session", () => {
    rememberCustomerServiceConversationIndex({
      conversationId: "im-conversation-cs-1",
      scopeKey: testScopeKey,
      source: "temp-chat-widget",
      threadId: "temp-session-1",
      threadType: "temp_session",
    });

    const event = adaptCustomerServiceGatewayEvent({
      eventName: "msg.new",
      receivedAt: 6,
      scopeKey: testScopeKey,
      args: [
        {
          conversationId: "im-conversation-cs-1",
          conversationSeq: 4,
          messageId: "m-indexed",
          messageType: "text",
          senderUserId: "visitor-1",
          body: { text: "codex-test" },
        },
      ],
    });

    expect(event.kind).toBe("cs.message.received");
    if (event.kind !== "cs.message.received") return;
    expect(event.threadId).toBe("temp-session-1");
    expect(event.threadType).toBe("temp_session");
    expect(event.message.messageId).toBe("m-indexed");
  });

  it("adapts sourceType widget messages as temp-session customer service events", () => {
    const event = adaptCustomerServiceGatewayEvent({
      eventName: "msg.new",
      receivedAt: 10,
      args: [
        {
          conversationId: "conversation-widget",
          sourceType: "widget",
          threadId: "thread-widget",
          messageId: "m-widget",
          messageType: "text",
          senderUserId: "visitor-1",
          body: { text: "widget hello" },
        },
      ],
    });

    expect(event.kind).toBe("cs.message.received");
    if (event.kind !== "cs.message.received") return;
    expect(event.threadId).toBe("thread-widget");
    expect(event.threadType).toBe("temp_session");
    expect(event.message.messageId).toBe("m-widget");
  });

  it("does not adapt sourceType im generic messages as online-service events", () => {
    const event = adaptCustomerServiceGatewayEvent({
      eventName: "msg.new",
      receivedAt: 11,
      args: [
        {
          conversationId: "conversation-im-cs",
          conversationType: "direct",
          sourceType: "im",
          threadId: "thread-im-cs",
          messageId: "m-im-cs",
          messageType: "text",
          senderUserId: "staff-1",
          body: { text: "im customer service hello" },
        },
      ],
    });

    expect(event.kind).toBe("ignored");
    if (event.kind !== "ignored") return;
    expect(event.reason).toBe("non_cs_event");
  });

  it("does not adapt unmarked indexed messages without a matching scope", () => {
    rememberCustomerServiceConversationIndex({
      conversationId: "im-conversation-cs-1",
      scopeKey: testScopeKey,
      source: "temp-chat-widget",
      threadId: "temp-session-1",
      threadType: "temp_session",
    });

    const event = adaptCustomerServiceGatewayEvent({
      eventName: "msg.new",
      receivedAt: 7,
      args: [
        {
          conversationId: "im-conversation-cs-1",
          conversationSeq: 4,
          messageId: "m-indexed",
          messageType: "text",
          senderUserId: "visitor-1",
          body: { text: "codex-test" },
        },
      ],
    });

    expect(event.kind).toBe("ignored");
  });

  it("accepts customer service messages through the ownership thread-id resolver", () => {
    const event = adaptCustomerServiceGatewayEvent({
      eventName: "customer_service.message.new",
      receivedAt: 8,
      args: [
        {
          sessionId: "legacy-session-1",
          thread_id: "legacy-thread-1",
          messageId: "m-legacy",
          messageType: "text",
          body: { text: "legacy" },
        },
      ],
    });

    expect(event.kind).toBe("cs.message.received");
    if (event.kind !== "cs.message.received") return;
    expect(event.threadId).toBe("legacy-thread-1");
    expect(event.threadType).toBe("temp_session");
  });

  it("does not read legacy message id aliases as a valid customer service message id", () => {
    const event = adaptCustomerServiceGatewayEvent({
      eventName: "customer_service.message.new",
      receivedAt: 9,
      args: [
        {
          threadId: "thread-legacy-message",
          threadType: "temp_session",
          id: "legacy-id",
          type: "text",
          content: { text: "legacy" },
          senderUserId: "visitor-1",
        },
      ],
    });

    expect(event.kind).toBe("cs.message.received");
    if (event.kind !== "cs.message.received") return;
    expect(event.contractStatus).toBe("degraded");
    expect(event.diagnostics).toContain("cs.message.generated_id");
    expect(event.message.messageId).not.toBe("legacy-id");
  });
});
