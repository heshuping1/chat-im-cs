import { beforeEach, describe, expect, it } from "vitest";

import { adaptCustomerServiceGatewayEvent } from "../../src/renderer/data/gateway/cs-gateway-event-adapter";
import {
  rememberCustomerServiceConversationIndex,
  resetCustomerServiceConversationIndexForTest,
} from "../../src/renderer/data/customer-service/cs-conversation-index";

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
              id: "m2",
              type: "text",
              content: { text: "queued hello" },
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
      source: "temp-chat-widget",
      threadId: "temp-session-1",
      threadType: "temp_session",
    });

    const event = adaptCustomerServiceGatewayEvent({
      eventName: "msg.new",
      receivedAt: 6,
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
});
