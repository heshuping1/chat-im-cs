import { describe, expect, it } from "vitest";

import type { MessageItemDto } from "../../src/renderer/data/api/types";
import type { AuthSession } from "../../src/renderer/data/auth/auth-session";
import {
  createMemoryImMessageStore,
  imMessageConversationKey,
  imMessageScopeKey,
  mergeMessagesForLocalStore,
} from "../../src/renderer/data/message-store/im-message-store";

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
  it("persists successful messages by workspace scope and conversation", async () => {
    const store = createMemoryImMessageStore();
    const scopeKey = imMessageScopeKey(session);
    const conversationKey = imMessageConversationKey(scopeKey, "direct", "c1");

    await store.upsertMessages(scopeKey, "direct", "c1", [message("m1", 1)]);

    expect(await store.listMessages(conversationKey, { limit: 50 })).toEqual([message("m1", 1)]);
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
