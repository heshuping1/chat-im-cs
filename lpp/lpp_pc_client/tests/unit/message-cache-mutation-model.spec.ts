import { QueryClient } from "@tanstack/react-query";
import { describe, expect, it } from "vitest";
import type {
  ConversationListItem,
  MessageItemDto,
} from "../../src/renderer/data/api-client";
import {
  appendLocalMessage,
  applyConversationReadToCache,
  discardLocalFailedOutgoingMessage,
  invalidateMessages,
  localMediaPreviewKeys,
  markLocalOutgoingMessageFailed,
  markMessageRecalledInCache,
  patchLocalMediaMessage,
  removeMessageFromCache,
  replaceLocalMessageInCache,
  replaceLocalOutgoingMessage,
  syncGroupReadReceiptSnapshotToCache,
  removeLocalOutgoingMessage,
  upsertLocalOutgoingMessage,
  withLocalMediaPreviews,
} from "../../src/renderer/messages/models/messageCacheMutationModel";
import { chatMessageRenderKey } from "../../src/renderer/messages/models/messageRenderKey";
import type { ConversationListResponse } from "../../src/renderer/data/api-client";
import type { AuthSession } from "../../src/renderer/data/auth/auth-session";
import {
  getImMessageStore,
  imMessageConversationKey,
  imMessageScopeKey,
} from "../../src/renderer/data/message-store/im-message-store";
import { pcQueryKeys } from "../../src/renderer/data/query-keys";
import {
  createMemorySendOutboxStorage,
  sendOutboxScopeKey,
} from "../../src/renderer/data/send/send-outbox";

describe("messageCacheMutationModel", () => {
  it("keeps a stable render key from local echo through server confirmation", () => {
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
      conversationId: "c-stable-key",
      conversationType: "direct",
      title: "Peer",
    } as ConversationListItem;
    const clientMsgId = "pc-local-text-stable";
    const localMessage = appendLocalMessage(
      queryClient,
      session,
      conversation,
      "text",
      { text: "stable" },
      {
        conversationId: conversation.conversationId,
        messageId: clientMsgId,
        serverTime: "2026-06-07T08:20:15.011Z",
      },
      { clientMsgId, status: "sending" },
    );

    const confirmedMessage = replaceLocalMessageInCache(
      queryClient,
      session,
      conversation,
      clientMsgId,
      "text",
      { text: "stable" },
      {
        conversationId: conversation.conversationId,
        conversationSeq: 12,
        messageId: "server-stable-key",
        serverTime: "2026-06-07T08:20:16.011Z",
      },
    );

    expect(localMessage).toMatchObject({ clientMsgId, messageId: clientMsgId });
    expect(confirmedMessage).toMatchObject({
      clientMsgId,
      messageId: "server-stable-key",
    });
    expect(chatMessageRenderKey(confirmedMessage)).toBe(chatMessageRenderKey(localMessage));
    expect(
      queryClient.getQueryData<MessageItemDto[]>(
        pcQueryKeys.imMessagesForSession(session, "direct", conversation.conversationId),
      )?.[0],
    ).toMatchObject({ clientMsgId, messageId: "server-stable-key" });
  });

  it("invalidates message and conversation queries only inside the current workspace scope", async () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const session = {
      apiBaseUrl: "https://api.example.test",
      platformUserId: "platform-user-1",
      spaceType: 1,
      tenantId: "tenant-1",
      tenantToken: "tenant-token-1",
      userId: "user-1",
    } as AuthSession;
    const currentScope = pcQueryKeys.imMessagesForSession(session, "direct", "c1")[1];
    const otherScope = "workspace|https://api.example.test|personal|tenant-1|other-user|platform-user-2";
    queryClient.setQueryData(pcQueryKeys.imMessagesForSession(session, "direct", "c1"), []);
    queryClient.setQueryData(["pc-im-messages", otherScope, "direct", "c1"], []);
    queryClient.setQueryData(pcQueryKeys.imConversationsForSession(session), { items: [] });
    queryClient.setQueryData(["pc-im-conversations", otherScope, 100], { items: [] });

    await invalidateMessages(queryClient, session);

    expect(queryClient.getQueryCache().find({ queryKey: pcQueryKeys.imMessagesForSession(session, "direct", "c1") })?.state.isInvalidated)
      .toBe(true);
    expect(queryClient.getQueryCache().find({ queryKey: pcQueryKeys.imConversationsForSession(session) })?.state.isInvalidated)
      .toBe(true);
    expect(queryClient.getQueryCache().find({ queryKey: ["pc-im-messages", otherScope, "direct", "c1"] })?.state.isInvalidated)
      .toBe(false);
    expect(queryClient.getQueryCache().find({ queryKey: ["pc-im-conversations", otherScope, 100] })?.state.isInvalidated)
      .toBe(false);
    expect(currentScope).not.toBe(otherScope);
  });

  it("syncs group read receipt snapshots into the scoped message cache", async () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const session = {
      apiBaseUrl: "https://api.example.test",
      displayName: "Me",
      platformUserId: "platform-user-1",
      spaceType: 1,
      tenantId: "tenant-1",
      tenantToken: "tenant-token-1",
      userId: "u-self",
    } as AuthSession;
    const conversation = {
      conversationId: "group-1",
      conversationType: "group",
      title: "Group",
    } as ConversationListItem;
    const scopeKey = imMessageScopeKey(session);
    const store = getImMessageStore();
    await store.clearScope(scopeKey);
    const message = {
      conversationId: "group-1",
      conversationSeq: 8,
      direction: "out",
      isMine: true,
      messageId: "m-target",
      messageType: "text",
      readCount: 0,
      senderUserId: "u-self",
      sentAt: "2026-06-09T09:00:00.000Z",
      status: "sent",
    } as MessageItemDto;
    const queryKey = pcQueryKeys.imMessagesForSession(session, "group", "group-1");
    queryClient.setQueryData<MessageItemDto[]>(queryKey, [message]);
    await store.upsertMessages(scopeKey, "group", "group-1", [message]);

    syncGroupReadReceiptSnapshotToCache(queryClient, {
      conversation,
      messageId: "m-target",
      messageSeq: 8,
      readCount: 2,
      session,
    });

    expect(queryClient.getQueryData<MessageItemDto[]>(queryKey)).toMatchObject([
      { messageId: "m-target", readCount: 2 },
    ]);
    await Promise.resolve();
    expect(
      await store.listMessages(imMessageConversationKey(scopeKey, "group", "group-1"), { limit: 50 }),
    ).toMatchObject([{ messageId: "m-target", readCount: 2 }]);
  });

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

  it("removes local outgoing messages by conversation key", () => {
    const current = {
      "group:g1": [
        { messageId: "local-1" },
        { messageId: "local-2" },
      ] as MessageItemDto[],
    };

    expect(removeLocalOutgoingMessage(current, "group", "g1", "local-1")["group:g1"])
      .toEqual([{ messageId: "local-2" }]);
  });

  it("discards failed local outgoing messages from cache, store, outbox and upload tasks", async () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const session = {
      apiBaseUrl: "https://api.example.test",
      platformUserId: "platform-user-discard",
      spaceType: 1,
      tenantId: "tenant-discard",
      tenantToken: "token-discard",
      userId: "user-discard",
    } as AuthSession;
    const message = {
      body: { text: "@所有人" },
      conversationId: "g-discard",
      direction: "out",
      isMine: true,
      messageId: "pc-local-text-discard",
      messageType: "text",
      preview: "@所有人",
      sentAt: "2026-06-07T00:00:00.000Z",
      status: "failed",
    } as MessageItemDto;
    const storage = createMemorySendOutboxStorage();
    await storage.upsertRecord({
      body: { text: "@所有人" },
      channel: "im",
      clientMsgId: "pc-local-text-discard",
      createdAt: Date.parse("2026-06-07T00:00:00.000Z"),
      localMessageId: "pc-local-text-discard",
      localTaskId: "task-discard",
      messageType: "text",
      scopeKey: sendOutboxScopeKey(session),
      status: "failed",
      targetId: "g-discard",
      targetType: "group",
      updatedAt: Date.parse("2026-06-07T00:00:01.000Z"),
    });
    const scopeKey = imMessageScopeKey(session);
    const store = getImMessageStore();
    await store.clearScope(scopeKey);
    await store.upsertMessages(scopeKey, "group", "g-discard", [message]);
    queryClient.setQueryData<MessageItemDto[]>(
      pcQueryKeys.imMessagesForSession(session, "group", "g-discard"),
      [message],
    );
    let outgoing = {
      "group:g-discard": [message],
    } as Record<string, MessageItemDto[]>;
    const controller = new AbortController();
    const deletedTasks: string[] = [];

    const result = await discardLocalFailedOutgoingMessage({
      conversationId: "g-discard",
      conversationType: "group",
      mediaUploadTasks: {
        deleteTask: (localTaskId) => deletedTasks.push(localTaskId),
        getTask: () => ({ controller }),
      },
      message,
      queryClient,
      session,
      setLocalOutgoingMessagesByConversation: (updater) => {
        outgoing = typeof updater === "function" ? updater(outgoing) : updater;
      },
      storage,
    });

    expect(result).toEqual({ discarded: true, localMessageId: "pc-local-text-discard" });
    expect(await storage.listRecords({ scopeKey: sendOutboxScopeKey(session) })).toEqual([]);
    expect(
      await store.listMessages(imMessageConversationKey(scopeKey, "group", "g-discard"), { limit: 50 }),
    ).toEqual([]);
    expect(queryClient.getQueryData<MessageItemDto[]>(
      pcQueryKeys.imMessagesForSession(session, "group", "g-discard"),
    )).toEqual([]);
    expect(outgoing["group:g-discard"]).toEqual([]);
    expect(controller.signal.aborted).toBe(true);
    expect(deletedTasks).toEqual(["task-discard"]);
  });

  it("does not discard server-usable sent messages as local failures", async () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const session = {
      apiBaseUrl: "https://api.example.test",
      platformUserId: "platform-user-sent",
      spaceType: 1,
      tenantId: "tenant-sent",
      tenantToken: "token-sent",
      userId: "user-sent",
    } as AuthSession;
    const message = {
      conversationId: "c-sent",
      messageId: "server-message-1",
      messageType: "text",
      preview: "sent",
      status: "sent",
    } as MessageItemDto;
    let outgoing = {} as Record<string, MessageItemDto[]>;

    await expect(discardLocalFailedOutgoingMessage({
      conversationId: "c-sent",
      conversationType: "direct",
      message,
      queryClient,
      session,
      setLocalOutgoingMessagesByConversation: (updater) => {
        outgoing = typeof updater === "function" ? updater(outgoing) : updater;
      },
      storage: createMemorySendOutboxStorage(),
    })).resolves.toEqual({ discarded: false });
    expect(outgoing).toEqual({});
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

  it("writes recalled messages into the local message store", async () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const session = {
      apiBaseUrl: "https://api.example.test",
      platformUserId: "platform-user-recall",
      spaceType: 1,
      tenantId: "tenant-recall",
      tenantToken: "token-recall",
      userId: "user-recall",
    } as AuthSession;
    const scopeKey = imMessageScopeKey(session);
    const store = getImMessageStore();
    await store.clearScope(scopeKey);
    await store.upsertMessages(scopeKey, "direct", "c-recall", [
      {
        conversationId: "c-recall",
        conversationSeq: 1,
        messageId: "m-recall",
        messageType: "text",
        preview: "before",
        sentAt: "2026-06-07T00:00:00.000Z",
      } as MessageItemDto,
    ]);
    queryClient.setQueryData<MessageItemDto[]>(
      pcQueryKeys.imMessagesForSession(session, "direct", "c-recall"),
      await store.listMessages(imMessageConversationKey(scopeKey, "direct", "c-recall"), { limit: 50 }),
    );

    markMessageRecalledInCache(queryClient, "m-recall", session);
    await Promise.resolve();

    expect(await store.listMessages(imMessageConversationKey(scopeKey, "direct", "c-recall"), { limit: 50 }))
      .toMatchObject([{ messageId: "m-recall", isRecalled: true, preview: "消息已撤回" }]);
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

  it("deletes removed messages from the local message store", async () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const session = {
      apiBaseUrl: "https://api.example.test",
      platformUserId: "platform-user-delete",
      spaceType: 1,
      tenantId: "tenant-delete",
      tenantToken: "token-delete",
      userId: "user-delete",
    } as AuthSession;
    const scopeKey = imMessageScopeKey(session);
    const store = getImMessageStore();
    await store.clearScope(scopeKey);
    await store.upsertMessages(scopeKey, "direct", "c-delete", [
      {
        conversationId: "c-delete",
        conversationSeq: 1,
        messageId: "m-delete",
        messageType: "text",
        preview: "delete",
        sentAt: "2026-06-07T00:00:00.000Z",
      } as MessageItemDto,
    ]);
    queryClient.setQueryData<MessageItemDto[]>(
      pcQueryKeys.imMessagesForSession(session, "direct", "c-delete"),
      await store.listMessages(imMessageConversationKey(scopeKey, "direct", "c-delete"), { limit: 50 }),
    );

    removeMessageFromCache(queryClient, "m-delete", session);
    await Promise.resolve();

    expect(await store.listMessages(imMessageConversationKey(scopeKey, "direct", "c-delete"), { limit: 50 }))
      .toEqual([]);
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

  it("applies read metadata to the local message store", async () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const session = {
      apiBaseUrl: "https://api.example.test",
      platformUserId: "platform-user-read",
      spaceType: 1,
      tenantId: "tenant-read",
      tenantToken: "token-read",
      userId: "user-read",
    } as AuthSession;
    const scopeKey = imMessageScopeKey(session);
    const store = getImMessageStore();
    await store.clearScope(scopeKey);
    await store.upsertMessages(scopeKey, "direct", "c-read", [
      {
        conversationId: "c-read",
        conversationSeq: 1,
        direction: "out",
        isMine: true,
        isSelf: true,
        messageId: "m-read",
        messageType: "text",
        preview: "read",
        sentAt: "2026-06-07T00:00:00.000Z",
        status: "sent",
      } as MessageItemDto,
    ]);
    queryClient.setQueryData<ConversationListResponse>(pcQueryKeys.imConversationsForSession(session), {
      items: [
        {
          conversationId: "c-read",
          conversationType: "direct",
          title: "Peer",
          lastMessageSeq: 1,
          lastReadSeq: 0,
          unreadCount: 1,
        },
      ],
    });

    applyConversationReadToCache(queryClient, "c-read", 1, session);
    await Promise.resolve();

    expect(await store.listMessages(imMessageConversationKey(scopeKey, "direct", "c-read"), { limit: 50 }))
      .toMatchObject([{ messageId: "m-read", status: "sent" }]);
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

  it("writes server-confirmed sent messages into the local message store", async () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const session = {
      apiBaseUrl: "https://api.example.test",
      platformUserId: "platform-user-1",
      spaceType: 1,
      tenantId: "personal-tenant-store",
      tenantToken: "personal-token",
      userId: "personal-user-store",
    } as AuthSession;
    const conversation = {
      conversationId: "c-store",
      conversationType: "direct",
      title: "Peer",
    } as ConversationListItem;
    const store = getImMessageStore();
    const scopeKey = imMessageScopeKey(session);
    await store.clearScope(scopeKey);

    replaceLocalMessageInCache(
      queryClient,
      session,
      conversation,
      "pc-local-text-store",
      "text",
      { text: "persist me" },
      {
        conversationId: "c-store",
        conversationSeq: 11,
        messageId: "server-store-1",
        serverTime: "2026-06-07T08:20:16.011Z",
      },
    );
    await Promise.resolve();

    expect(
      await store.listMessages(imMessageConversationKey(scopeKey, "direct", "c-store"), { limit: 50 }),
    ).toMatchObject([
      {
        conversationId: "c-store",
        conversationSeq: 11,
        messageId: "server-store-1",
        preview: "persist me",
      },
    ]);
  });
});
