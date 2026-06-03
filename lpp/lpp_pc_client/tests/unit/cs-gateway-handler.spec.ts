import { describe, expect, it } from "vitest";

import { dispatchGatewayEvent } from "../../src/renderer/data/gateway/gateway-dispatcher";
import {
  createCustomerServiceGatewayDispatchHandlers,
  handleFirstStageCustomerServiceGatewayEvent,
} from "../../src/renderer/data/gateway/cs-gateway-handler";

describe("createCustomerServiceGatewayDispatchHandlers", () => {
  it("binds customer service message and thread callbacks", () => {
    const handled: string[] = [];
    const handlers = createCustomerServiceGatewayDispatchHandlers({
      onMessageReceived: (event) => handled.push(`message:${event.threadId}`),
      onThreadChanged: (event) => handled.push(`thread:${event.changeKind}`),
    });

    dispatchGatewayEvent(
      {
        kind: "cs.message.received",
        eventName: "customer_service.message",
        receivedAt: 1,
        rawPayload: {},
        threadId: "thread-1",
        threadType: "temp_session",
        message: { messageId: "m1", conversationId: "thread-1" },
      },
      handlers,
    );
    dispatchGatewayEvent(
      {
        kind: "cs.thread.changed",
        eventName: "customer_service.queue.created",
        receivedAt: 2,
        rawPayload: {},
        changeKind: "queue_created",
        threadId: "thread-1",
        shouldNotifyQueue: true,
      },
      handlers,
    );

    expect(handled).toEqual(["message:thread-1", "thread:queue_created"]);
  });

  it("adapts and dispatches first-stage customer service gateway events", () => {
    const handled: string[] = [];
    const result = handleFirstStageCustomerServiceGatewayEvent(
      {
        eventName: "customer_service.message.new",
        receivedAt: 1,
        args: [
          {
            threadId: "thread-1",
            threadType: "temp_session",
            messageId: "m1",
            messageType: "text",
            body: { text: "hello" },
          },
        ],
      },
      {
        onMessageReceived: (event) => handled.push(event.threadId),
        onThreadChanged: (event) => handled.push(event.changeKind),
      },
    );

    expect(result).toBe(true);
    expect(handled).toEqual(["thread-1"]);
  });

  it("claims msg.new events when the nested message belongs to a temp session", () => {
    const handled: string[] = [];
    const result = handleFirstStageCustomerServiceGatewayEvent(
      {
        eventName: "msg.new",
        receivedAt: 1,
        args: [
          {
            data: {
              tempSession: {
                sessionId: "thread-2",
              },
              message: {
                conversationId: "thread-2",
                conversationType: "temp_session",
                conversationSeq: 5,
                messageId: "m2",
                messageType: "text",
                body: { text: "hello" },
              },
            },
          },
        ],
      },
      {
        onMessageReceived: (event) => handled.push(`${event.threadType}:${event.threadId}`),
        onThreadChanged: (event) => handled.push(event.changeKind),
      },
    );

    expect(result).toBe(true);
    expect(handled).toEqual(["temp_session:thread-2"]);
  });

  it("claims direct-customer message events as online-service direct threads", () => {
    const handled: string[] = [];
    const result = handleFirstStageCustomerServiceGatewayEvent(
      {
        eventName: "msg.new",
        receivedAt: 1,
        args: [
          {
            data: {
              message: {
                conversationId: "thread-direct-customer",
                conversationType: "direct_customer",
                conversationSeq: 6,
                messageId: "m3",
                messageType: "text",
                senderRole: "visitor",
                body: { text: "hello" },
              },
            },
          },
        ],
      },
      {
        onMessageReceived: (event) => handled.push(`${event.threadType}:${event.threadId}`),
        onThreadChanged: (event) => handled.push(event.changeKind),
      },
    );

    expect(result).toBe(true);
    expect(handled).toEqual(["im_direct:thread-direct-customer"]);
  });

  it("does not claim unsupported non-customer-service events", () => {
    const result = handleFirstStageCustomerServiceGatewayEvent(
      {
        eventName: "msg.read",
        receivedAt: 1,
        args: [{ conversationId: "direct-1", readSeq: 2 }],
      },
      {
        onMessageReceived: () => undefined,
        onThreadChanged: () => undefined,
      },
    );

    expect(result).toBe(false);
  });
});
