import { QueryClient } from "@tanstack/react-query";
import { describe, expect, it } from "vitest";
import {
  applyImGatewayMessageCache,
  applyImGatewayReadCache,
} from "../../src/renderer/data/gateway/im-gateway-cache";
import type {
  ConversationListResponse,
  MessageItemDto,
} from "../../src/renderer/data/api-client";

describe("im gateway cache adapter", () => {
  it("updates cached message and conversation lists", () => {
    const queryClient = new QueryClient();
    const message: MessageItemDto = {
      messageId: "m-1",
      conversationId: "direct-1",
      conversationSeq: 1,
      messageType: "text",
      preview: "hello",
      sentAt: "2026-05-29T00:00:00.000Z",
      senderUserId: "user-2",
    };
    queryClient.setQueryData<MessageItemDto[]>(
      ["pc-im-messages", "base", "token", "direct", "direct-1"],
      [],
    );
    queryClient.setQueryData<ConversationListResponse>(
      ["pc-im-conversations"],
      {
        items: [
          {
            conversationId: "direct-1",
            conversationType: "direct",
            title: "用户",
            unreadCount: 0,
            lastReadSeq: 0,
            lastMessageSeq: 0,
          },
        ],
      },
    );

    applyImGatewayMessageCache(queryClient, {
      conversationId: "direct-1",
      conversationType: "direct",
      message,
      payload: {},
      unreadCount: 1,
    });

    expect(
      queryClient.getQueryData<MessageItemDto[]>([
        "pc-im-messages",
        "base",
        "token",
        "direct",
        "direct-1",
      ]),
    ).toMatchObject([message]);
    expect(
      queryClient.getQueryData<ConversationListResponse>(["pc-im-conversations"])
        ?.items[0]?.unreadCount,
    ).toBe(1);
  });

  it("updates read receipts in cached conversation list", () => {
    const queryClient = new QueryClient();
    queryClient.setQueryData<ConversationListResponse>(
      ["pc-im-conversations"],
      {
        items: [
          {
            conversationId: "direct-1",
            conversationType: "direct",
            title: "用户",
            unreadCount: 3,
            lastReadSeq: 0,
            lastMessageSeq: 3,
          },
        ],
      },
    );

    applyImGatewayReadCache(queryClient, {
      conversationId: "direct-1",
      readerIsCurrentUser: true,
      myReadSeq: 3,
      peerReadSeq: 0,
      previousPeerReadSeq: 0,
      identity: null,
      view: {
        conversationKey: "direct:direct-1",
        conversationId: "direct-1",
        conversationType: "direct",
        unreadCount: 0,
        hasUnread: false,
        titleUnreadText: "",
        showNewMessageJump: false,
      },
    });

    const item = queryClient.getQueryData<ConversationListResponse>([
      "pc-im-conversations",
    ])?.items[0];
    expect(item?.unreadCount).toBe(0);
    expect(item?.lastReadSeq).toBe(3);
  });
});
