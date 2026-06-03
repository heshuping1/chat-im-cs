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
          userId: "user-3",
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

  it("ignores direct-customer messages so the customer-service adapter owns them", () => {
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

    expect(event.kind).toBe("ignored");
    if (event.kind !== "ignored") return;
    expect(event.reason).toBe("customer_service_event");
  });

  it("adapts sourceType im messages as IM instead of online-service events", () => {
    const event = adaptGatewayEvent({
      eventName: "msg.new",
      receivedAt: 6,
      args: [
        {
          data: {
            conversationId: "im-customer-service-direct",
            conversationType: "direct",
            conversationSeq: 12,
            sourceType: "im",
            messageId: "m-im-source",
            messageType: "text",
            senderUserId: "user-2",
          },
        },
      ],
    });

    expect(event.kind).toBe("im.message.received");
    if (event.kind !== "im.message.received") return;
    expect(event.conversationId).toBe("im-customer-service-direct");
    expect(event.conversationType).toBe("direct");
    expect(event.message.messageId).toBe("m-im-source");
  });

  it("ignores sourceType widget messages so online-service temp-session owns them", () => {
    const event = adaptGatewayEvent({
      eventName: "msg.new",
      receivedAt: 6,
      args: [
        {
          data: {
            conversationId: "widget-session",
            conversationType: "direct",
            sourceType: "widget",
            threadId: "thread-widget",
            messageId: "m-widget",
            messageType: "text",
          },
        },
      ],
    });

    expect(event.kind).toBe("ignored");
    if (event.kind !== "ignored") return;
    expect(event.reason).toBe("customer_service_event");
  });

  it("does not guess direct IM ownership from message events that only carry a conversationId", () => {
    const event = adaptGatewayEvent({
      eventName: "msg.new",
      receivedAt: 7,
      args: [
        {
          data: {
            conversationId: "ambiguous-conversation",
            conversationSeq: 11,
            messageId: "m-ambiguous",
            messageType: "text",
          },
        },
      ],
    });

    expect(event.kind).toBe("invalid");
    if (event.kind !== "invalid") return;
    expect(event.reason).toBe("missing_conversation_type");
  });

  it("rejects non-standard IM alias fields instead of guessing PC-side compatibility", () => {
    const event = adaptGatewayEvent({
      eventName: "msg.new",
      receivedAt: 8,
      args: [
        {
          data: {
            conversation_id: "legacy-direct-1",
            conversation_type: "direct",
            conversation_seq: 10,
            fromUserId: "legacy-user",
            message_id: "legacy-message",
            message_type: "text",
          },
        },
      ],
    });

    expect(event.kind).toBe("invalid");
    if (event.kind !== "invalid") return;
    expect(event.reason).toBe("missing_conversation_id");
  });

  it("does not accept read receipt alias fields", () => {
    const event = adaptGatewayEvent({
      eventName: "msg.read",
      receivedAt: 9,
      args: [
        {
          chatId: "legacy-group-1",
          conversation_type: "group",
          read_seq: 11,
          readerUserId: "user-3",
        },
      ],
    });

    expect(event.kind).toBe("invalid");
    if (event.kind !== "invalid") return;
    expect(event.reason).toBe("missing_conversation_id");
  });

  it("does not default read receipts without an IM conversation type to direct", () => {
    const event = adaptGatewayEvent({
      eventName: "msg.read",
      receivedAt: 10,
      args: [
        {
          conversationId: "ambiguous-read",
          readSeq: 12,
          userId: "user-3",
        },
      ],
    });

    expect(event.kind).toBe("invalid");
    if (event.kind !== "invalid") return;
    expect(event.reason).toBe("missing_conversation_type");
  });
});
