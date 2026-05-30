import { describe, expect, it } from "vitest";
import type {
  GatewayEventKind,
  GatewayIgnoredEvent,
  GatewayImMessageReceivedEvent,
  GatewayImReadReceivedEvent,
  GatewayInvalidEvent,
  GatewayTypedEvent,
} from "../../src/renderer/data/gateway/gateway-event-types";

describe("gateway event types", () => {
  it("models the first-stage gateway event union", () => {
    const messageEvent = {
      kind: "im.message.received",
      eventName: "msg.new",
      receivedAt: 1_700_000_000_000,
      rawPayload: { conversationId: "direct-1" },
      conversationId: "direct-1",
      conversationType: "direct",
      message: {
        messageId: "message-1",
        conversationId: "direct-1",
        conversationSeq: 42,
        senderUserId: "user-2",
        messageType: "text",
      },
    } satisfies GatewayImMessageReceivedEvent;

    const readEvent = {
      kind: "im.read.received",
      eventName: "msg.read",
      receivedAt: 1_700_000_000_001,
      rawPayload: { conversationId: "direct-1", readSeq: 42 },
      conversationId: "direct-1",
      conversationType: "direct",
      readerIdentity: { userId: "user-1", displayName: "客服" },
      readSeq: 42,
    } satisfies GatewayImReadReceivedEvent;

    const ignoredEvent = {
      kind: "ignored",
      eventName: "temp_session.message",
      receivedAt: 1_700_000_000_002,
      rawPayload: { threadId: "thread-1" },
      reason: "unsupported_event",
    } satisfies GatewayIgnoredEvent;

    const invalidEvent = {
      kind: "invalid",
      eventName: "msg.new",
      receivedAt: 1_700_000_000_003,
      rawPayload: { message: {} },
      reason: "missing_conversation_id",
      diagnostics: ["gateway.im.missing_conversation_id"],
    } satisfies GatewayInvalidEvent;

    const events: GatewayTypedEvent[] = [
      messageEvent,
      readEvent,
      ignoredEvent,
      invalidEvent,
    ];
    const kinds: GatewayEventKind[] = events.map((event) => event.kind);

    expect(kinds).toEqual([
      "im.message.received",
      "im.read.received",
      "ignored",
      "invalid",
    ]);
    expect(events.map((event) => eventKindLabel(event))).toEqual([
      "message",
      "read",
      "ignored",
      "invalid",
    ]);
  });
});

function eventKindLabel(event: GatewayTypedEvent) {
  switch (event.kind) {
    case "im.message.received":
      return "message";
    case "im.read.received":
      return "read";
    case "ignored":
      return "ignored";
    case "invalid":
      return "invalid";
    default:
      return assertNever(event);
  }
}

function assertNever(value: never): never {
  throw new Error(`Unexpected gateway event: ${String(value)}`);
}
