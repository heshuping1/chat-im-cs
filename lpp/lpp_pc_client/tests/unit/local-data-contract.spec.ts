import { describe, expect, it } from "vitest";

import {
  buildLocalConversationProjection,
  buildLocalReminderProjection,
  localDataConversationKey,
  localDataMessageKey,
  normalizeLocalDataMessage,
  searchLocalDataMessages,
  upsertLocalDataMessages,
  type LocalDataMessage,
} from "../../src/shared/local-data-contract";
import { mediaIdentityFromResource } from "../../src/shared/local-media-identity";

function message(
  messageId: string,
  conversationSeq: number,
  preview = messageId,
): LocalDataMessage {
  return normalizeLocalDataMessage({
    bodyJson: { text: preview },
    conversationId: "c1",
    conversationSeq,
    conversationType: "direct",
    messageId,
    messageType: "text",
    preview,
    scopeKey: "scope-a",
    sentAt: `2026-06-07T00:00:0${conversationSeq}.000Z`,
    senderUserId: conversationSeq % 2 === 0 ? "peer" : "me",
    status: "sent",
  });
}

describe("local data contract", () => {
  it("builds stable scope, conversation and message keys", () => {
    expect(localDataConversationKey("scope-a", "direct", "c1")).toBe("scope-a:direct:c1");
    expect(localDataMessageKey("scope-a", "direct", "c1", "m1")).toBe(
      "scope-a:direct:c1:m1",
    );
  });

  it("upserts messages by messageId and prefers newer sequence metadata", () => {
    const merged = upsertLocalDataMessages(
      [message("m1", 1), message("m2", 2)],
      [{ ...message("m1", 3, "new preview"), status: "read" }],
    );

    expect(merged).toMatchObject([
      { messageId: "m2", conversationSeq: 2 },
      { messageId: "m1", conversationSeq: 3, preview: "new preview", status: "read" },
    ]);
  });

  it("merges local echo by clientMsgId when server messageId arrives", () => {
    const merged = upsertLocalDataMessages(
      [
        normalizeLocalDataMessage({
          ...message("local-temp", 1, "sending"),
          clientMsgId: "client-1",
          messageId: "local-temp",
          status: "sending",
        }),
      ],
      [
        normalizeLocalDataMessage({
          ...message("server-1", 2, "sent"),
          clientMsgId: "client-1",
          status: "sent",
        }),
      ],
    );

    expect(merged).toMatchObject([
      { clientMsgId: "client-1", messageId: "server-1", status: "sent" },
    ]);
  });

  it("searches only local indexed messages and returns conversation context", () => {
    const results = searchLocalDataMessages(
      [message("m1", 1, "hello local sqlite"), message("m2", 2, "another message")],
      { keyword: "sqlite", limit: 10, scopeKey: "scope-a" },
    );

    expect(results).toMatchObject([
      {
        conversationId: "c1",
        conversationType: "direct",
        messageId: "m1",
        preview: "hello local sqlite",
      },
    ]);
  });

  it("uses one projection source for conversations and reminders", () => {
    const messages = [{ ...message("m1", 1), isRead: true }, { ...message("m2", 2), isRead: false }];
    const conversation = buildLocalConversationProjection({
      conversationId: "c1",
      conversationType: "direct",
      messages,
      scopeKey: "scope-a",
    });
    const reminder = buildLocalReminderProjection(conversation);

    expect(conversation.lastMessage?.messageId).toBe("m2");
    expect(reminder).toEqual({
      conversationId: "c1",
      conversationType: "direct",
      shouldNotify: true,
      unreadCount: 1,
    });
  });

  it("derives media identity without relying on signed URL first", () => {
    expect(
      mediaIdentityFromResource({
        fileName: "photo.png",
        mediaId: "media-1",
        signedUrl: "https://assets.example/photo.png?sig=temporary",
      }),
    ).toEqual({
      source: "mediaId",
      value: "media:media-1",
    });

    expect(
      mediaIdentityFromResource({
        fileName: "photo.png",
        signedUrl: "https://assets.example/media/media-from-path?sig=temporary",
      }),
    ).toEqual({
      source: "urlPath",
      value: "media:media-from-path",
    });

    expect(
      mediaIdentityFromResource({
        fileName: "photo.png",
        signedUrl: "https://assets.example/photo.png?sig=temporary",
      }),
    ).toEqual({
      source: "urlHash",
      value: expect.stringMatching(/^url:[a-f0-9]{40}$/),
    });
  });
});
