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
