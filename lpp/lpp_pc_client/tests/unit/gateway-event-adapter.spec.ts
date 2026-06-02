import { describe, expect, it } from "vitest";
import { adaptGatewayEvent } from "../../src/renderer/data/gateway/gateway-event-adapter";

describe("adaptGatewayEvent", () => {
  it("adapts plain IM message events", () => {
    const event = adaptGatewayEvent({
      eventName: "msg.new",
      receivedAt: 1,
      args: [
        {
          data: {
            conversationId: "direct-1",
            conversationType: "direct",
            conversationSeq: 7,
            senderUserId: "user-2",
            messageType: "text",
          },
        },
      ],
    });

    expect(event.kind).toBe("im.message.received");
    if (event.kind !== "im.message.received") return;
    expect(event.conversationId).toBe("direct-1");
    expect(event.conversationType).toBe("direct");
    expect(event.message.conversationSeq).toBe(7);
  });

  it("adapts read events", () => {
    const event = adaptGatewayEvent({
      eventName: "msg.read",
      receivedAt: 2,
      args: [
        {
          conversationId: "group-1",
          conversationType: "group",
          readSeq: 11,
          readerUserId: "user-3",
        },
      ],
    });

    expect(event.kind).toBe("im.read.received");
    if (event.kind !== "im.read.received") return;
    expect(event.conversationType).toBe("group");
    expect(event.readSeq).toBe(11);
    expect(event.readerIdentity.userId).toBe("user-3");
  });

  it("does not classify customer service messages as plain IM", () => {
    const event = adaptGatewayEvent({
      eventName: "temp_session.message",
      receivedAt: 3,
      args: [{ threadId: "thread-1", conversationType: "temp_session" }],
    });

    expect(event.kind).toBe("ignored");
    if (event.kind !== "ignored") return;
    expect(event.reason).toBe("customer_service_event");
  });

  it("does not classify msg.new customer-service payloads nested in message as plain IM", () => {
    const event = adaptGatewayEvent({
      eventName: "msg.new",
      receivedAt: 4,
      args: [
        {
          data: {
            message: {
              threadId: "thread-2",
              conversationId: "thread-2",
              conversationType: "temp_session",
              conversationSeq: 8,
              senderUserId: "visitor-1",
              messageType: "text",
            },
          },
        },
      ],
    });

    expect(event.kind).toBe("ignored");
    if (event.kind !== "ignored") return;
    expect(event.reason).toBe("customer_service_event");
  });

  it("classifies direct-customer compatibility messages as plain IM unless temp-session evidence exists", () => {
    const event = adaptGatewayEvent({
      eventName: "msg.new",
      receivedAt: 5,
      args: [
        {
          data: {
            message: {
              conversationId: "thread-direct-customer",
              conversationType: "direct_customer",
              conversationSeq: 9,
              senderRole: "visitor",
              messageType: "text",
            },
          },
        },
      ],
    });

    expect(event.kind).toBe("im.message.received");
    if (event.kind !== "im.message.received") return;
    expect(event.conversationId).toBe("thread-direct-customer");
    expect(event.conversationType).toBe("direct");
  });
});
