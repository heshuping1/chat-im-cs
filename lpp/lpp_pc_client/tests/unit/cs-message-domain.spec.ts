import { describe, expect, it } from "vitest";

import type { MessageItemDto } from "../../src/renderer/data/api/types";
import {
  reduceCustomerServiceMessageEvent,
  type CustomerServiceMessageState,
} from "../../src/renderer/data/customer-service/message-domain";

describe("customer service message domain", () => {
  it("confirms a local text message without letting empty ack body or generic preview overwrite it", () => {
    const local = message({
      body: { text: "real reply" },
      clientMsgId: "client-1",
      messageId: "local-1",
      preview: "real reply",
      status: "sending",
    });
    let state = reduceCustomerServiceMessageEvent(emptyState(), {
      type: "cs.message.local_created",
      message: local,
    }).state;

    const result = reduceCustomerServiceMessageEvent(state, {
      type: "cs.message.send_ack_received",
      ack: {
        clientMsgId: "client-1",
        localMessageId: "local-1",
        serverFields: {
          conversationId: "conversation-1",
          conversationSeq: 12,
          messageId: "server-1",
          sentAt: "2026-06-13T10:00:00.000Z",
          status: "sent",
        },
        serverMessage: message({
          body: {},
          clientMsgId: undefined,
          conversationSeq: 12,
          messageId: "server-1",
          preview: "[Message]",
          status: "sent",
        }),
      },
    });

    expect(result.decision).toBe("replace");
    expect(result.matchedBy).toBe("clientMsgId");
    expect(result.messages).toHaveLength(1);
    expect(result.messages[0]).toMatchObject({
      body: { text: "real reply" },
      clientMsgId: "client-1",
      conversationSeq: 12,
      messageId: "server-1",
      preview: "real reply",
      status: "sent",
    });
  });

  it("merges gateway self echo by clientMsgId instead of appending another bubble", () => {
    let state = reduceCustomerServiceMessageEvent(emptyState(), {
      type: "cs.message.local_created",
      message: message({
        body: { text: "333" },
        clientMsgId: "client-2",
        messageId: "local-2",
        preview: "333",
      }),
    }).state;
    state = reduceCustomerServiceMessageEvent(state, {
      type: "cs.message.send_ack_received",
      ack: {
        clientMsgId: "client-2",
        localMessageId: "local-2",
        serverFields: {
          conversationSeq: 2,
          messageId: "server-2",
        },
      },
    }).state;

    const result = reduceCustomerServiceMessageEvent(state, {
      type: "cs.message.gateway_received",
      message: message({
        body: {},
        clientMsgId: "client-2",
        conversationSeq: 2,
        messageId: "server-2",
        preview: "[Message]",
      }),
    });

    expect(result.decision).toBe("replace");
    expect(result.matchedBy).toBe("clientMsgId");
    expect(result.messages).toHaveLength(1);
    expect(result.messages[0]).toMatchObject({
      body: { text: "333" },
      messageId: "server-2",
      preview: "333",
    });
  });

  it("merges detail refetch by conversation seq and keeps existing real content", () => {
    const state: CustomerServiceMessageState = {
      messages: [
        message({
          body: { text: "already visible" },
          clientMsgId: "client-3",
          conversationSeq: 9,
          messageId: "server-3",
          preview: "already visible",
        }),
      ],
    };

    const result = reduceCustomerServiceMessageEvent(state, {
      type: "cs.message.detail_synced",
      messages: [
        message({
          body: {},
          clientMsgId: undefined,
          conversationSeq: 9,
          messageId: "detail-3",
          preview: "[\u6d88\u606f]",
        }),
      ],
    });

    expect(result.messages).toHaveLength(1);
    expect(result.messages[0]).toMatchObject({
      body: { text: "already visible" },
      conversationSeq: 9,
      messageId: "detail-3",
      preview: "already visible",
    });
  });

  it("appends a real incoming visitor message", () => {
    const result = reduceCustomerServiceMessageEvent(emptyState(), {
      type: "cs.message.gateway_received",
      message: message({
        body: { text: "visitor question" },
        direction: "in",
        isSelf: false,
        messageId: "visitor-1",
        preview: "visitor question",
      }),
    });

    expect(result.decision).toBe("append");
    expect(result.matchedBy).toBe("none");
    expect(result.messages).toHaveLength(1);
    expect(result.messages[0].preview).toBe("visitor question");
  });

  it("ignores unmatched empty text placeholders instead of rendering unsupported bubbles", () => {
    const result = reduceCustomerServiceMessageEvent(emptyState(), {
      type: "cs.message.gateway_received",
      message: message({
        body: { messageType: "text" },
        direction: "out",
        isSelf: true,
        messageId: "placeholder-1",
        preview: "",
      }),
    });

    expect(result.decision).toBe("ignored");
    expect(result.matchedBy).toBe("none");
    expect(result.messages).toHaveLength(0);
  });

  it("marks a local message failed without removing its body", () => {
    const state = reduceCustomerServiceMessageEvent(emptyState(), {
      type: "cs.message.local_created",
      message: message({
        body: { text: "will fail" },
        clientMsgId: "client-fail",
        messageId: "local-fail",
        preview: "will fail",
        status: "sending",
      }),
    }).state;

    const result = reduceCustomerServiceMessageEvent(state, {
      type: "cs.message.send_failed",
      failedAt: 1_781_286_400_000,
      localMessageId: "local-fail",
      reason: "network failed",
    });

    expect(result.messages).toHaveLength(1);
    expect(result.messages[0]).toMatchObject({
      body: { text: "will fail" },
      localError: "network failed",
      status: "failed",
    });
  });
});

function emptyState(): CustomerServiceMessageState {
  return { messages: [] };
}

function message(overrides: Partial<MessageItemDto>): MessageItemDto {
  return {
    body: { text: "default" },
    conversationId: "conversation-1",
    direction: "out",
    isSelf: true,
    messageId: "message-1",
    messageType: "text",
    preview: "default",
    sentAt: "2026-06-13T09:59:00.000Z",
    ...overrides,
  };
}
