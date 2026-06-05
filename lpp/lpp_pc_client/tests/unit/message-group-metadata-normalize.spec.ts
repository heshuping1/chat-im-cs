import { describe, expect, it } from "vitest";

import type { MessageItemDto } from "../../src/renderer/data/api/types";
import { normalizeMessageItem } from "../../src/renderer/data/im-message-normalize";

describe("group message metadata normalize", () => {
  it("normalizes top-level group reply and mentions into the message body", () => {
    const normalized = normalizeMessageItem({
      body: { text: "replying" },
      mentions: [{ id: "u1", nickname: "Alice" }],
      messageId: "m-1",
      messageType: "text",
      reply: {
        content: "source text",
        id: "source-1",
        senderDisplayName: "Bob",
      },
    } as unknown as MessageItemDto);

    expect(normalized.body).toMatchObject({
      mentions: [{ userId: "u1", displayName: "Alice" }],
      reply: {
        messageId: "source-1",
        preview: "source text",
        sender: "Bob",
      },
      replyToMessageId: "source-1",
    });
  });

  it("normalizes reply aliases from body fields", () => {
    const normalized = normalizeMessageItem({
      body: {
        mentionedUsers: [{ platformUserId: "p2", displayName: "Carol" }],
        quote: {
          body: { text: "quoted body" },
          messageId: "quoted-1",
          name: "Dan",
        },
        text: "hello",
      },
      messageId: "m-2",
      messageType: "text",
    } as MessageItemDto);

    expect(normalized.body).toMatchObject({
      mentions: [{ userId: "p2", displayName: "Carol" }],
      reply: {
        messageId: "quoted-1",
        preview: "quoted body",
        sender: "Dan",
      },
      replyToMessageId: "quoted-1",
    });
  });
});
