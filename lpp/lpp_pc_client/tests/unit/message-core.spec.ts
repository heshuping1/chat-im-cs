import { describe, expect, it } from "vitest";
import type {
  ConversationListItem,
  MessageItemDto,
} from "../../src/renderer/data/api-client";
import {
  reduceMessageCoreEvent,
  type MessageCoreState,
} from "../../src/renderer/data/message-core/message-core";

const baseConversation: ConversationListItem = {
  conversationId: "direct-1",
  conversationType: "direct",
  title: "Peer",
  unreadCount: 0,
  lastReadSeq: 0,
  lastMessageSeq: 0,
};

function message(overrides: Partial<MessageItemDto> = {}): MessageItemDto {
  return {
    messageId: "m-1",
    conversationId: "direct-1",
    conversationSeq: 1,
    messageType: "text",
    preview: "hello",
    sentAt: "2026-05-30T00:00:00.000Z",
    senderUserId: "peer",
    status: "sent",
    ...overrides,
  };
}

function reduce(
  state: MessageCoreState,
  event: Parameters<typeof reduceMessageCoreEvent>[1],
) {
  return reduceMessageCoreEvent(state, event).state;
}

describe("message core reducer", () => {
  it("deduplicates gateway and polled messages by server message id", () => {
    const gatewayMessage = message({ messageId: "server-1", conversationSeq: 2 });
    const afterGateway = reduce(
      { conversation: baseConversation, messages: [] },
      {
        type: "message.gateway_received",
        conversationId: "direct-1",
        conversationType: "direct",
        message: gatewayMessage,
        unreadCount: 1,
      },
    );

    const afterPoll = reduce(afterGateway, {
      type: "message.polled",
      conversationId: "direct-1",
      conversationType: "direct",
      messages: [gatewayMessage],
    });

    expect(afterPoll.messages).toHaveLength(1);
    expect(afterPoll.conversation?.lastMessage?.messageId).toBe("server-1");
    expect(afterPoll.conversation?.unreadCount).toBe(1);
  });

  it("merges a local message with server confirmation by client id", () => {
    const local = message({
      messageId: "pc-local-1",
      conversationSeq: undefined,
      direction: "out",
      isMine: true,
      isSelf: true,
      status: "sending",
      preview: "local text",
      body: { text: "local text" },
      localTaskId: "client-1",
    } as Partial<MessageItemDto>);
    const confirmed = message({
      messageId: "server-1",
      conversationSeq: 8,
      direction: "out",
      isMine: true,
      isSelf: true,
      preview: "local text",
      body: { text: "local text" },
      localTaskId: "client-1",
    } as Partial<MessageItemDto>);

    const withLocal = reduce(
      { conversation: baseConversation, messages: [] },
      {
        type: "message.local_created",
        conversationId: "direct-1",
        conversationType: "direct",
        message: local,
      },
    );
    const afterConfirm = reduce(withLocal, {
      type: "message.send_confirmed",
      conversationId: "direct-1",
      conversationType: "direct",
      localMessageId: "pc-local-1",
      message: confirmed,
    });

    expect(afterConfirm.messages).toHaveLength(1);
    expect(afterConfirm.messages[0]).toMatchObject({
      messageId: "server-1",
      conversationSeq: 8,
      status: "sent",
    });
    expect(afterConfirm.conversation?.lastReadSeq).toBe(8);
  });

  it("uses content signature only as a fallback for pending local echoes", () => {
    const local = message({
      messageId: "pc-local-1",
      direction: "out",
      isMine: true,
      isSelf: true,
      status: "sending",
      body: { text: "same text" },
      preview: "same text",
    });
    const echoed = message({
      messageId: "server-1",
      conversationSeq: 4,
      direction: "out",
      isMine: true,
      isSelf: true,
      status: "sent",
      body: { text: "same text" },
      preview: "same text",
    });

    const withLocal = reduce(
      { conversation: baseConversation, messages: [] },
      {
        type: "message.local_created",
        conversationId: "direct-1",
        conversationType: "direct",
        message: local,
      },
    );
    const afterPoll = reduce(withLocal, {
      type: "message.polled",
      conversationId: "direct-1",
      conversationType: "direct",
      messages: [echoed],
    });

    expect(afterPoll.messages).toHaveLength(1);
    expect(afterPoll.messages[0].messageId).toBe("server-1");
  });

  it("does not let an older sequence overwrite the conversation preview", () => {
    const current = reduce(
      { conversation: baseConversation, messages: [] },
      {
        type: "message.gateway_received",
        conversationId: "direct-1",
        conversationType: "direct",
        message: message({ messageId: "m-10", conversationSeq: 10, preview: "newest" }),
      },
    );
    const afterOld = reduce(current, {
      type: "message.gateway_received",
      conversationId: "direct-1",
      conversationType: "direct",
      message: message({ messageId: "m-3", conversationSeq: 3, preview: "older" }),
    });

    expect(afterOld.conversation?.lastMessage?.preview).toBe("newest");
    expect(afterOld.conversation?.lastMessageSeq).toBe(10);
  });

  it("recomputes the conversation summary for recall and delete of the last message", () => {
    const withMessages = reduce(
      { conversation: baseConversation, messages: [] },
      {
        type: "message.polled",
        conversationId: "direct-1",
        conversationType: "direct",
        messages: [
          message({ messageId: "m-1", conversationSeq: 1, preview: "first" }),
          message({ messageId: "m-2", conversationSeq: 2, preview: "second" }),
        ],
      },
    );

    const recalled = reduce(withMessages, {
      type: "message.recalled",
      conversationId: "direct-1",
      conversationType: "direct",
      messageId: "m-2",
    });
    expect(recalled.conversation?.lastMessage?.preview).toBe("消息已撤回");

    const deleted = reduce(recalled, {
      type: "message.deleted",
      conversationId: "direct-1",
      conversationType: "direct",
      messageId: "m-2",
    });
    expect(deleted.conversation?.lastMessage?.preview).toBe("first");
    expect(deleted.conversation?.lastMessageSeq).toBe(1);
  });

  it("applies read updates to unread count and outgoing read status", () => {
    const withMessages = reduce(
      {
        conversation: {
          ...baseConversation,
          unreadCount: 2,
          lastMessageSeq: 3,
        },
        messages: [
          message({
            messageId: "mine-1",
            conversationSeq: 2,
            direction: "out",
            isMine: true,
            isSelf: true,
            status: "sent",
          }),
          message({ messageId: "peer-1", conversationSeq: 3, senderUserId: "peer" }),
        ],
      },
      {
        type: "read.updated",
        conversationId: "direct-1",
        conversationType: "direct",
        readSeq: 3,
        peerReadSeq: 2,
        identity: { userId: "me" },
      },
    );

    expect(withMessages.conversation?.unreadCount).toBe(0);
    expect(withMessages.conversation?.lastReadSeq).toBe(3);
    expect(withMessages.messages.find((item) => item.messageId === "mine-1")).toMatchObject({
      isRead: true,
      status: "read",
    });
  });
});
