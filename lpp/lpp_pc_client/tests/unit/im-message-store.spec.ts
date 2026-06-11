import { describe, expect, it } from "vitest";

import type { MessageItemDto } from "../../src/renderer/data/api/types";
import type { AuthSession } from "../../src/renderer/data/auth/auth-session";
import {
  createDesktopImMessageStore,
  createMemoryImMessageStore,
  imMessageConversationKey,
  imMessageScopeKey,
  localDataInputsByScopeFromIndexedDbRecords,
  mergeMessagesForLocalStore,
  parseImMessageConversationKey,
  type ImMessageStoreRecord,
} from "../../src/renderer/data/message-store/im-message-store";
import type { DesktopApi } from "../../src/shared/desktop-api";
import { normalizeLocalDataMessage, type LocalDataMessage } from "../../src/shared/local-data-contract";

const session = {
  apiBaseUrl: "https://api.example.test",
  platformUserId: "platform-user-1",
  spaceType: 1,
  tenantId: "tenant-1",
  tenantToken: "tenant-token-1",
  userId: "user-1",
} as AuthSession;

function message(
  id: string,
  seq: number,
  sentAt = `2026-06-07T00:00:0${seq}.000Z`,
): MessageItemDto {
  return {
    conversationId: "c1",
    conversationSeq: seq,
    messageId: id,
    messageType: "text",
    preview: id,
    sentAt,
  };
}

describe("IM local message store", () => {
  it("parses conversation keys from the right so scoped colons stay intact", () => {
    expect(parseImMessageConversationKey("workspace|missing-tenant:abc:direct:c1")).toEqual({
      conversationId: "c1",
      conversationType: "direct",
      scopeKey: "workspace|missing-tenant:abc",
    });
  });

  it("persists successful messages by workspace scope and conversation", async () => {
    const store = createMemoryImMessageStore();
    const scopeKey = imMessageScopeKey(session);
    const conversationKey = imMessageConversationKey(scopeKey, "direct", "c1");

    await store.upsertMessages(scopeKey, "direct", "c1", [message("m1", 1)]);

    expect(await store.listMessages(conversationKey, { limit: 50 })).toEqual([message("m1", 1)]);
  });

  it("preserves self message sender metadata for local history lookup", async () => {
    const store = createMemoryImMessageStore();
    const scopeKey = imMessageScopeKey(session);
    const conversationKey = imMessageConversationKey(scopeKey, "direct", "c1");
    const selfMessage: MessageItemDto = {
      ...message("m-self", 1),
      avatarUrl: "https://cdn.example.test/me-fallback.png",
      body: { text: "我发送的聊天记录" },
      direction: "out",
      isSelf: true,
      preview: "我发送的聊天记录",
      senderAvatarUrl: "https://cdn.example.test/me.png",
      senderDisplayName: "当前账号",
      senderPlatformUserId: "platform-user-1",
      senderUserId: "user-1",
    };

    await store.upsertMessages(scopeKey, "direct", "c1", [selfMessage]);

    expect(await store.listMessages(conversationKey, { limit: 50 })).toMatchObject([
      {
        direction: "out",
        isSelf: true,
        messageId: "m-self",
        senderAvatarUrl: "https://cdn.example.test/me.png",
        senderDisplayName: "当前账号",
        senderPlatformUserId: "platform-user-1",
        senderUserId: "user-1",
      },
    ]);
    expect(await store.searchMessages(scopeKey, "direct", "c1", "当前账号", 20)).toMatchObject([
      { messageId: "m-self", senderDisplayName: "当前账号" },
    ]);
  });

  it("can use desktop LocalDataService as the IM message store backend", async () => {
    let records: LocalDataMessage[] = [];
    const desktopApi = {
      async localDataClearScope(payload) {
        records = records.filter((record) => record.scopeKey !== payload.scopeKey);
      },
      async localDataDeleteMessage(payload) {
        records = records.filter(
          (record) =>
            record.scopeKey !== payload.scopeKey ||
            record.conversationId !== payload.conversationId ||
            record.messageId !== payload.messageId,
        );
      },
      async localDataListMessages(payload) {
        return records
          .filter((record) => record.scopeKey === payload.scopeKey)
          .filter((record) => record.conversationId === payload.conversationId)
          .filter((record) => record.conversationType === payload.conversationType)
          .slice(-payload.limit);
      },
      async localDataSearchMessages(payload) {
        return records
          .filter((record) => record.scopeKey === payload.scopeKey)
          .filter((record) => record.conversationId === payload.conversationId)
          .filter((record) => record.conversationType === payload.conversationType)
          .filter((record) => record.preview.includes(payload.keyword ?? ""))
          .slice(0, payload.limit);
      },
      async localDataUpsertMessages(payload) {
        records = payload.messages.map((item) => normalizeLocalDataMessage(item));
      },
    } satisfies Pick<
      DesktopApi,
      | "localDataClearScope"
      | "localDataDeleteMessage"
      | "localDataListMessages"
      | "localDataSearchMessages"
      | "localDataUpsertMessages"
    >;
    const store = createDesktopImMessageStore(desktopApi);
    const scopeKey = imMessageScopeKey(session);
    const conversationKey = imMessageConversationKey(scopeKey, "direct", "c1");

    await store.upsertMessages(scopeKey, "direct", "c1", [
      {
        ...message("m1", 1),
        direction: "out",
        isSelf: true,
        senderAvatarUrl: "https://cdn.example.test/me.png",
        senderDisplayName: "当前账号",
        senderPlatformUserId: "platform-user-1",
        senderUserId: "user-1",
      },
    ]);

    expect(await store.listMessages(conversationKey, { limit: 50 })).toMatchObject([
      {
        conversationId: "c1",
        direction: "out",
        isSelf: true,
        messageId: "m1",
        senderAvatarUrl: "https://cdn.example.test/me.png",
        senderDisplayName: "当前账号",
        senderPlatformUserId: "platform-user-1",
        senderUserId: "user-1",
      },
    ]);
    expect(records).toMatchObject([
      {
        direction: "out",
        isSelf: true,
        senderDisplayName: "当前账号",
        senderPlatformUserId: "platform-user-1",
      },
    ]);
    expect(
      await store.searchMessages(scopeKey, "direct", "c1", "m1", 20),
    ).toMatchObject([{ messageId: "m1", conversationId: "c1" }]);
  });

  it("paginates desktop LocalData reads within the IPC limit contract", async () => {
    let records: LocalDataMessage[] = Array.from({ length: 501 }, (_, index) =>
      normalizeLocalDataMessage(messageItemToLocalDataInputForTest(
        imMessageScopeKey(session),
        "direct",
        "c1",
        message(`m${index + 1}`, index + 1),
      )),
    );
    const requestedLimits: number[] = [];
    const desktopApi = {
      async localDataClearScope() {},
      async localDataDeleteMessage() {},
      async localDataListMessages(payload) {
        requestedLimits.push(payload.limit);
        if (!Number.isInteger(payload.limit) || payload.limit < 1 || payload.limit > 500) {
          throw new Error("localData.limit must be an integer between 1 and 500");
        }
        return records
          .filter((record) => record.scopeKey === payload.scopeKey)
          .filter((record) => record.conversationId === payload.conversationId)
          .filter((record) => record.conversationType === payload.conversationType)
          .filter((record) =>
            typeof payload.beforeSeq === "number"
              ? (record.conversationSeq ?? Number.MAX_SAFE_INTEGER) < payload.beforeSeq
              : true,
          )
          .sort((left, right) => Number(right.conversationSeq ?? 0) - Number(left.conversationSeq ?? 0))
          .slice(0, payload.limit)
          .reverse();
      },
      async localDataSearchMessages() {
        return [];
      },
      async localDataUpsertMessages(payload) {
        for (const item of payload.messages) {
          const next = normalizeLocalDataMessage(item);
          records = records.filter((record) => record.id !== next.id).concat(next);
        }
      },
    } satisfies Pick<
      DesktopApi,
      | "localDataClearScope"
      | "localDataDeleteMessage"
      | "localDataListMessages"
      | "localDataSearchMessages"
      | "localDataUpsertMessages"
    >;
    const store = createDesktopImMessageStore(desktopApi);
    const scopeKey = imMessageScopeKey(session);

    await store.markMessageRecalled(scopeKey, "direct", "c1", "m1");

    expect(requestedLimits.length).toBeGreaterThan(1);
    expect(requestedLimits.every((limit) => limit >= 1 && limit <= 500)).toBe(true);
    expect(records.find((record) => record.messageId === "m1")?.status).toBe("recalled");
  });

  it("groups legacy IndexedDB records by scope before migrating to LocalDataService", () => {
    const firstScope = imMessageScopeKey(session);
    const secondScope = imMessageScopeKey({ ...session, userId: "user-2" } as AuthSession);
    const records: ImMessageStoreRecord[] = [
      legacyRecord(firstScope, "direct", "c1", message("m1", 1)),
      legacyRecord(secondScope, "direct", "c1", message("m2", 1)),
    ];

    const byScope = localDataInputsByScopeFromIndexedDbRecords(records);

    expect(byScope.get(firstScope)).toMatchObject([{ messageId: "m1", scopeKey: firstScope }]);
    expect(byScope.get(secondScope)).toMatchObject([{ messageId: "m2", scopeKey: secondScope }]);
  });

  it("deduplicates by server messageId and prefers newer sequence metadata", () => {
    expect(
      mergeMessagesForLocalStore([
        message("m1", 1),
        { ...message("m1", 2), preview: "new" },
      ]),
    ).toMatchObject([{ messageId: "m1", conversationSeq: 2, preview: "new" }]);
  });

  it("ignores messages without stable message ids", () => {
    expect(
      mergeMessagesForLocalStore([
        { ...message("m1", 1), messageId: "" },
        message("m2", 2),
      ]),
    ).toMatchObject([{ messageId: "m2" }]);
  });

  it("keeps identical conversation ids isolated across tenants and users", async () => {
    const store = createMemoryImMessageStore();
    const firstScope = imMessageScopeKey(session);
    const secondScope = imMessageScopeKey({
      ...session,
      platformUserId: "platform-user-2",
      tenantId: "tenant-2",
      userId: "user-2",
    } as AuthSession);

    await store.upsertMessages(firstScope, "direct", "c1", [message("m1", 1)]);
    await store.upsertMessages(secondScope, "direct", "c1", [message("m2", 1)]);

    expect(
      await store.listMessages(imMessageConversationKey(firstScope, "direct", "c1"), { limit: 50 }),
    ).toMatchObject([{ messageId: "m1" }]);
    expect(
      await store.listMessages(imMessageConversationKey(secondScope, "direct", "c1"), { limit: 50 }),
    ).toMatchObject([{ messageId: "m2" }]);
  });

  it("lists the latest range in ascending display order", async () => {
    const store = createMemoryImMessageStore();
    const scopeKey = imMessageScopeKey(session);
    const conversationKey = imMessageConversationKey(scopeKey, "direct", "c1");
    await store.upsertMessages(scopeKey, "direct", "c1", [
      message("m1", 1),
      message("m2", 2),
      message("m3", 3),
    ]);

    expect(await store.listMessages(conversationKey, { limit: 2 })).toMatchObject([
      { messageId: "m2" },
      { messageId: "m3" },
    ]);
  });

  it("searches stored messages beyond the currently loaded display range", async () => {
    const store = createMemoryImMessageStore();
    const scopeKey = imMessageScopeKey(session);
    await store.upsertMessages(scopeKey, "direct", "c1", [
      message("m1", 1),
      { ...message("m2", 2), preview: "needle from local database" },
      message("m3", 3),
    ]);

    expect(await store.searchMessages(scopeKey, "direct", "c1", "needle", 20)).toMatchObject([
      { messageId: "m2" },
    ]);
  });

  it("supports beforeSeq pagination", async () => {
    const store = createMemoryImMessageStore();
    const scopeKey = imMessageScopeKey(session);
    const conversationKey = imMessageConversationKey(scopeKey, "direct", "c1");
    await store.upsertMessages(scopeKey, "direct", "c1", [
      message("m1", 1),
      message("m2", 2),
      message("m3", 3),
    ]);

    expect(await store.listMessages(conversationKey, { beforeSeq: 3, limit: 2 })).toMatchObject([
      { messageId: "m1" },
      { messageId: "m2" },
    ]);
  });

  it("replaces one conversation snapshot without touching another conversation", async () => {
    const store = createMemoryImMessageStore();
    const scopeKey = imMessageScopeKey(session);
    await store.upsertMessages(scopeKey, "direct", "c1", [message("m-old", 1)]);
    await store.upsertMessages(scopeKey, "direct", "c2", [
      { ...message("m-other", 1), conversationId: "c2" },
    ]);

    await store.replaceConversationSnapshot(scopeKey, "direct", "c1", [message("m-new", 2)]);

    expect(await store.listMessages(imMessageConversationKey(scopeKey, "direct", "c1"), { limit: 50 }))
      .toMatchObject([{ messageId: "m-new" }]);
    expect(await store.listMessages(imMessageConversationKey(scopeKey, "direct", "c2"), { limit: 50 }))
      .toMatchObject([{ messageId: "m-other" }]);
  });

  it("clears every conversation in a scope without deleting another scope", async () => {
    const store = createMemoryImMessageStore();
    const firstScope = imMessageScopeKey(session);
    const secondScope = imMessageScopeKey({ ...session, userId: "user-2" } as AuthSession);
    await store.upsertMessages(firstScope, "direct", "c1", [message("m1", 1)]);
    await store.upsertMessages(secondScope, "direct", "c1", [message("m2", 1)]);

    await store.clearScope(firstScope);

    expect(await store.listMessages(imMessageConversationKey(firstScope, "direct", "c1"), { limit: 50 }))
      .toEqual([]);
    expect(await store.listMessages(imMessageConversationKey(secondScope, "direct", "c1"), { limit: 50 }))
      .toMatchObject([{ messageId: "m2" }]);
  });

  it("marks a stored message recalled without deleting the record", async () => {
    const store = createMemoryImMessageStore();
    const scopeKey = imMessageScopeKey(session);
    const conversationKey = imMessageConversationKey(scopeKey, "direct", "c1");
    await store.upsertMessages(scopeKey, "direct", "c1", [message("m1", 1)]);

    await store.markMessageRecalled(scopeKey, "direct", "c1", "m1");

    expect(await store.listMessages(conversationKey, { limit: 50 })).toMatchObject([
      {
        isRecalled: true,
        messageId: "m1",
        messageType: "event",
        preview: "消息已撤回",
        status: "recalled",
      },
    ]);
  });

  it("deletes one stored message without deleting another scope", async () => {
    const store = createMemoryImMessageStore();
    const firstScope = imMessageScopeKey(session);
    const secondScope = imMessageScopeKey({ ...session, userId: "user-2" } as AuthSession);
    await store.upsertMessages(firstScope, "direct", "c1", [message("m1", 1)]);
    await store.upsertMessages(secondScope, "direct", "c1", [message("m1", 1)]);

    await store.deleteMessage(firstScope, "direct", "c1", "m1");

    expect(await store.listMessages(imMessageConversationKey(firstScope, "direct", "c1"), { limit: 50 }))
      .toEqual([]);
    expect(await store.listMessages(imMessageConversationKey(secondScope, "direct", "c1"), { limit: 50 }))
      .toMatchObject([{ messageId: "m1" }]);
  });

  it("applies direct peer read metadata to stored outgoing messages", async () => {
    const store = createMemoryImMessageStore();
    const scopeKey = imMessageScopeKey(session);
    await store.upsertMessages(scopeKey, "direct", "c1", [
      {
        ...message("mine-1", 1),
        direction: "out",
        isMine: true,
        isSelf: true,
        status: "sent",
      },
      {
        ...message("mine-2", 2),
        direction: "out",
        isMine: true,
        isSelf: true,
        status: "sent",
      },
    ]);

    await store.applyReadMetadata(scopeKey, "direct", "c1", {
      identity: { userId: "user-1" },
      peerReadSeq: 1,
      readSeq: 2,
    });

    expect(await store.listMessages(imMessageConversationKey(scopeKey, "direct", "c1"), { limit: 50 }))
      .toMatchObject([
        { messageId: "mine-1", status: "read", isRead: true },
        { messageId: "mine-2", status: "sent" },
      ]);
  });
});

function legacyRecord(
  scopeKey: string,
  conversationType: string,
  conversationId: string,
  item: MessageItemDto,
): ImMessageStoreRecord {
  const conversationKey = imMessageConversationKey(scopeKey, conversationType, conversationId);
  return {
    conversationId,
    conversationKey,
    conversationSeq: item.conversationSeq,
    conversationType,
    id: `${conversationKey}:${item.messageId}`,
    message: item,
    messageId: item.messageId,
    scopeKey,
    sentAt: item.sentAt,
    updatedAt: 1,
  };
}

function messageItemToLocalDataInputForTest(
  scopeKey: string,
  conversationType: string,
  conversationId: string,
  item: MessageItemDto,
) {
  const conversationKey = imMessageConversationKey(scopeKey, conversationType, conversationId);
  return {
    bodyJson: item.body,
    clientMsgId: item.clientMsgId,
    conversationId,
    conversationSeq: item.conversationSeq,
    conversationType,
    direction: item.direction,
    isRead: item.isRead,
    messageId: item.messageId,
    messageType: item.messageType,
    preview: item.preview,
    scopeKey,
    senderId: item.senderId,
    sentAt: item.sentAt,
    status: item.status,
    updatedAt: 1,
    conversationKey,
    id: `${conversationKey}:${item.messageId}`,
  };
}
