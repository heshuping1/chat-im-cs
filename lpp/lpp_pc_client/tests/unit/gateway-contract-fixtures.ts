import type { GatewayRawEventInput } from "../../src/renderer/data/gateway/gateway-event-types";

export interface GatewayContractFixture {
  name: string;
  input: GatewayRawEventInput;
  expected: {
    kind: "im.message.received" | "im.read.received" | "ignored" | "invalid";
    reason?: string;
    contractStatus?: "ok" | "degraded";
    diagnostics?: string[];
  };
}

export const gatewayContractFixtures: GatewayContractFixture[] = [
  {
    name: "plain direct IM message",
    input: {
      eventName: "msg.new",
      receivedAt: 100,
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
    },
    expected: {
      kind: "im.message.received",
      contractStatus: "ok",
    },
  },
  {
    name: "nested group IM message",
    input: {
      eventName: "chat.message.new",
      receivedAt: 101,
      args: [
        {
          payload: {
            groupChatId: "group-1",
            message: {
              conversationSeq: "8",
              sender: {
                platformUserId: "platform-user-3",
              },
              type: "image",
            },
          },
        },
      ],
    },
    expected: {
      kind: "im.message.received",
      contractStatus: "ok",
    },
  },
  {
    name: "degraded IM message with missing sender",
    input: {
      eventName: "msg.new",
      receivedAt: 102,
      args: [
        {
          data: {
            conversationId: "direct-2",
            conversationType: "direct",
            conversationSeq: 9,
            messageType: "text",
          },
        },
      ],
    },
    expected: {
      kind: "im.message.received",
      contractStatus: "degraded",
      diagnostics: ["im.read.missing_sender"],
    },
  },
  {
    name: "invalid IM message with missing sequence",
    input: {
      eventName: "msg.new",
      receivedAt: 103,
      args: [
        {
          data: {
            conversationId: "direct-3",
            conversationType: "direct",
            senderUserId: "user-4",
            messageType: "text",
          },
        },
      ],
    },
    expected: {
      kind: "invalid",
      reason: "blocking_contract",
      diagnostics: ["im.read.missing_seq"],
    },
  },
  {
    name: "customer service message is not plain IM",
    input: {
      eventName: "temp_session.message",
      receivedAt: 104,
      args: [
        {
          threadId: "thread-1",
          conversationType: "temp_session",
          sessionId: "session-1",
          visitorId: "visitor-1",
        },
      ],
    },
    expected: {
      kind: "ignored",
      reason: "customer_service_event",
    },
  },
  {
    name: "unsupported event is ignored",
    input: {
      eventName: "presence.online",
      receivedAt: 105,
      args: [{ userId: "user-5" }],
    },
    expected: {
      kind: "ignored",
      reason: "unsupported_event",
    },
  },
];
