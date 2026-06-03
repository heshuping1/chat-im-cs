import { QueryClient } from "@tanstack/react-query";
import { describe, expect, it } from "vitest";
import type {
  ConversationListItem,
  MessageItemDto,
} from "../../src/renderer/data/api-client";
import {
  applyConversationReadToCache,
  localMediaPreviewKeys,
  markLocalOutgoingMessageFailed,
  markMessageRecalledInCache,
  patchLocalMediaMessage,
  removeMessageFromCache,
  replaceLocalMessageInCache,
  replaceLocalOutgoingMessage,
  upsertLocalOutgoingMessage,
  withLocalMediaPreviews,
} from "../../src/renderer/messages/models/messageCacheMutationModel";
import type { ConversationListResponse } from "../../src/renderer/data/api-client";
import type { AuthSession } from "../../src/renderer/data/auth/auth-session";
import { pcQueryKeys } from "../../src/renderer/data/query-keys";

describe("messageCacheMutationModel", () => {
  it("upserts and replaces local outgoing messages by conversation key", () => {
    const first = { messageId: "local-1", sentAt: "2026-01-01T00:00:00.000Z" } as MessageItemDto;
    const sent = { messageId: "server-1", sentAt: "2026-01-01T00:00:01.000Z" } as MessageItemDto;

    const upserted = upsertLocalOutgoingMessage({}, "direct", "c1", first);
    expect(upserted["direct:c1"]).toEqual([first]);

    const replaced = replaceLocalOutgoingMessage(upserted, "direct", "c1", "local-1", sent);
    expect(replaced["direct:c1"]).toEqual([sent]);
  });

  it("marks local outgoing messages failed without dropping siblings", () => {
    const current = {
      "group:g1": [
        { messageId: "local-1" },
        { messageId: "local-2" },
      ] as MessageItemDto[],
    };

    expect(markLocalOutgoingMessageFailed(current, "group", "g1", "local-2", "network")["group:g1"]).toMatchObject([
      { messageId: "local-1" },
      { messageId: "local-2", status: "failed", localError: "network" },
    ]);
  });

  it("patches local video media body without dropping the failed message", () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const conversation = { conversationId: "c1" } as ConversationListItem;
    let outgoing = {
      "direct:c1": [
        {
          body: { video: { url: "blob:local-video" } },
          messageId: "local-video",
          messageType: "video",
          sentAt: "2026-05-30T00:00:00.000Z",
        },
      ] as MessageItemDto[],
    };

    patchLocalMediaMessage(
      queryClient,
      null,
      conversation,
      "direct",
      "local-video",
      {
        body: {
          video: {
            url: "blob:local-video",
            thumbnailUrl: "blob:local-poster",
          },
        },
        localError: "HTTP 400",
        status: "failed",
      },
      (updater) => {
        outgoing = typeof updater === "function" ? updater(outgoing) : updater;
      },
    );

    expect(outgoing["direct:c1"]).toHaveLength(1);
    expect(outgoing["direct:c1"][0]).toMatchObject({
      body: {
        video: {
          url: "blob:local-video",
          thumbnailUrl: "blob:local-poster",
        },
      },
      localError: "HTTP 400",
      messageId: "local-video",
      status: "failed",
    });
  });

  it("maps local media previews by message and media identity", () => {
    const keys = localMediaPreviewKeys("m1", {
      url: "https://cdn.example.com/a.png",
      fileName: "a.png",
      sizeBytes: 123,
    });

    expect(keys).toContain("message:m1");
    expect(keys).toContain("media:https://cdn.example.com/a.png");
    expect(keys).toContain("file:a.png:123");
  });

  it("applies local previews to image message bodies", () => {
    const messages = [
      {
        messageId: "m1",
        messageType: "image",
        body: { image: { url: "https://cdn.example.com/a.png" } },
      },
    ] as MessageItemDto[];
    const next = withLocalMediaPreviews(messages, new Map([
      ["message:m1", "blob:local-preview"],
    ]));

    expect(next[0].body?.image).toMatchObject({ localPreviewUrl: "blob:local-preview" });
  });

  it("recomputes the conversation preview when recalling the last message", () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    queryClient.setQueryData<MessageItemDto[]>(
      ["pc-im-messages", "base", "token", "direct", "c1"],
      [
        {
          conversationId: "c1",
          conversationSeq: 1,
          messageId: "m1",
          messageType: "text",
          preview: "first",
          sentAt: "2026-05-30T00:00:00.000Z",
        },
        {
          conversationId: "c1",
          conversationSeq: 2,
          messageId: "m2",
          messageType: "text",
          preview: "second",
          sentAt: "2026-05-30T00:00:01.000Z",
        },
      ] as MessageItemDto[],
    );
    queryClient.setQueryData<ConversationListResponse>(["pc-im-conversations"], {
      items: [
        {
          conversationId: "c1",
          conversationType: "direct",
          title: "Peer",
          lastMessage: { messageId: "m2", preview: "second" },
          lastMessageSeq: 2,
          unreadCount: 0,
        },
      ],
    });

    markMessageRecalledInCache(queryClient, "m2");

    expect(
      queryClient.getQueryData<ConversationListResponse>(["pc-im-conversations"])
        ?.items[0].lastMessage,
    ).toMatchObject({ messageId: "m2", preview: "消息已撤回" });
  });

  it("falls back to the previous message when deleting the last message", () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    queryClient.setQueryData<MessageItemDto[]>(
      ["pc-im-messages", "base", "token", "direct", "c1"],
      [
        {
          conversationId: "c1",
          conversationSeq: 1,
          messageId: "m1",
          messageType: "text",
          preview: "first",
          sentAt: "2026-05-30T00:00:00.000Z",
        },
        {
          conversationId: "c1",
          conversationSeq: 2,
          messageId: "m2",
          messageType: "text",
          preview: "second",
          sentAt: "2026-05-30T00:00:01.000Z",
        },
      ] as MessageItemDto[],
    );
    queryClient.setQueryData<ConversationListResponse>(["pc-im-conversations"], {
      items: [
        {
          conversationId: "c1",
          conversationType: "direct",
          title: "Peer",
          lastMessage: { messageId: "m2", preview: "second" },
          lastMessageSeq: 2,
          unreadCount: 0,
        },
      ],
    });

    removeMessageFromCache(queryClient, "m2");

    expect(
      queryClient.getQueryData<ConversationListResponse>(["pc-im-conversations"])
        ?.items[0],
    ).toMatchObject({
      lastMessage: { messageId: "m1", preview: "first" },
      lastMessageSeq: 1,
    });
  });

  it("applies read seq to conversation cache through the message core path", () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    queryClient.setQueryData<ConversationListResponse>(["pc-im-conversations"], {
      items: [
        {
          conversationId: "c1",
          conversationType: "direct",
          title: "Peer",
          lastMessageSeq: 3,
          lastReadSeq: 0,
          unreadCount: 2,
        },
      ],
    });

    applyConversationReadToCache(queryClient, "c1", 3);

    expect(
      queryClient.getQueryData<ConversationListResponse>(["pc-im-conversations"])
        ?.items[0],
    ).toMatchObject({ lastReadSeq: 3, unreadCount: 0 });
  });

  it("replaces sent local messages only in the current workspace conversation cache", () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const session = {
      apiBaseUrl: "https://api.example.test",
      platformUserId: "platform-user-1",
      spaceType: 1,
      tenantId: "personal-tenant",
      tenantToken: "personal-token",
      userId: "personal-user",
    } as AuthSession;
    const conversation = {
      conversationId: "c1",
      conversationType: "direct",
      lastMessage: { messageId: "pc-local-text-1", preview: "old" },
      title: "Peer",
    } as ConversationListItem;
    const currentKey = pcQueryKeys.imConversationsForSession(session);
    const otherKey = ["pc-im-conversations", "workspace|other", 100] as const;
    queryClient.setQueryData<ConversationListResponse>(currentKey, {
      items: [conversation],
    });
    queryClient.setQueryData<ConversationListResponse>(otherKey, {
      items: [{
        ...conversation,
        title: "Other space peer",
      }],
    });

    replaceLocalMessageInCache(
      queryClient,
      session,
      conversation,
      "pc-local-text-1",
      "text",
      { text: "12321323" },
      {
        conversationId: "c1",
        conversationSeq: 9,
        messageId: "server-1",
        serverTime: "2026-06-03T08:20:16.011Z",
      },
    );

    expect(
      queryClient.getQueryData<ConversationListResponse>(currentKey)?.items[0],
    ).toMatchObject({
      lastMessage: { messageId: "server-1", preview: "12321323" },
      lastMessageSeq: 9,
    });
    expect(
      queryClient.getQueryData<ConversationListResponse>(otherKey)?.items[0],
    ).toMatchObject({
      lastMessage: { messageId: "pc-local-text-1", preview: "old" },
      title: "Other space peer",
    });
  });
});
