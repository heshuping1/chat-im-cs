import { describe, expect, it } from "vitest";
import { dispatchGatewayEvent } from "../../src/renderer/data/gateway/gateway-dispatcher";
import {
  createImGatewayDispatchHandlers,
  handleFirstStageImGatewayEvent,
} from "../../src/renderer/data/gateway/im-gateway-handler";

describe("createImGatewayDispatchHandlers", () => {
  it("binds IM message and read callbacks for dispatcher use", () => {
    const handled: string[] = [];
    const handlers = createImGatewayDispatchHandlers({
      onMessageReceived: (event) => handled.push(event.conversationId),
      onReadReceived: (event) => handled.push(`${event.conversationId}:${event.readSeq}`),
    });

    dispatchGatewayEvent(
      {
        kind: "im.message.received",
        eventName: "msg.new",
        receivedAt: 1,
        rawPayload: {},
        conversationId: "direct-1",
        conversationType: "direct",
        message: { conversationId: "direct-1", conversationSeq: 1 },
      },
      handlers,
    );
    dispatchGatewayEvent(
      {
        kind: "im.read.received",
        eventName: "msg.read",
        receivedAt: 2,
        rawPayload: {},
        conversationId: "direct-1",
        conversationType: "direct",
        readerIdentity: { userId: "user-1" },
        readSeq: 3,
      },
      handlers,
    );

    expect(handled).toEqual(["direct-1", "direct-1:3"]);
  });

  it("adapts and dispatches first-stage IM gateway events", () => {
    const handled: string[] = [];
    const result = handleFirstStageImGatewayEvent(
      {
        eventName: "msg.new",
        receivedAt: 1,
        args: [
          {
            conversationId: "direct-1",
            conversationType: "direct",
            conversationSeq: 1,
            senderUserId: "user-2",
            messageType: "text",
          },
        ],
      },
      {
        onMessageReceived: (event) => handled.push(event.conversationId),
        onReadReceived: (event) => handled.push(`${event.conversationId}:${event.readSeq}`),
      },
    );

    expect(result).toBe(true);
    expect(handled).toEqual(["direct-1"]);
  });
});
