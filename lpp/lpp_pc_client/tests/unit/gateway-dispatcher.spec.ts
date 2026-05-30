import { describe, expect, it } from "vitest";
import { dispatchGatewayEvent } from "../../src/renderer/data/gateway/gateway-dispatcher";
import type { GatewayTypedEvent } from "../../src/renderer/data/gateway/gateway-event-types";

describe("dispatchGatewayEvent", () => {
  it("dispatches message and read events to matching handlers", () => {
    const called: string[] = [];
    const messageEvent: GatewayTypedEvent = {
      kind: "im.message.received",
      eventName: "msg.new",
      receivedAt: 1,
      rawPayload: {},
      conversationId: "direct-1",
      conversationType: "direct",
      message: { conversationId: "direct-1", conversationSeq: 1 },
    };
    const readEvent: GatewayTypedEvent = {
      kind: "im.read.received",
      eventName: "msg.read",
      receivedAt: 2,
      rawPayload: {},
      conversationId: "direct-1",
      conversationType: "direct",
      readerIdentity: { userId: "user-1" },
      readSeq: 1,
    };

    expect(
      dispatchGatewayEvent(messageEvent, {
        onImMessageReceived: () => called.push("message"),
        onImReadReceived: () => called.push("read"),
      }).handled,
    ).toBe(true);
    expect(
      dispatchGatewayEvent(readEvent, {
        onImMessageReceived: () => called.push("message"),
        onImReadReceived: () => called.push("read"),
      }).handled,
    ).toBe(true);
    expect(called).toEqual(["message", "read"]);
  });

  it("isolates handler errors", () => {
    const errors: unknown[] = [];
    const event: GatewayTypedEvent = {
      kind: "im.message.received",
      eventName: "msg.new",
      receivedAt: 1,
      rawPayload: {},
      conversationId: "direct-1",
      conversationType: "direct",
      message: { conversationId: "direct-1", conversationSeq: 1 },
    };

    const result = dispatchGatewayEvent(event, {
      onImMessageReceived: () => {
        throw new Error("boom");
      },
      onHandlerError: (error) => errors.push(error),
    });

    expect(result.handled).toBe(false);
    expect(errors).toHaveLength(1);
  });
});
