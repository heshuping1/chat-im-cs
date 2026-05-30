import { describe, expect, it } from "vitest";
import {
  imMessageEntityToDto,
  normalizeImMessageDto,
} from "../../src/renderer/data/im/im-message-contract";

describe("im message contract", () => {
  it("normalizes a complete text message dto", () => {
    const result = normalizeImMessageDto({
      messageId: "m1",
      conversationId: "c1",
      conversationSeq: 10,
      senderUserId: "u1",
      senderDisplayName: "张三",
      senderAvatarUrl: "https://example.com/a.png",
      messageType: "text",
      body: { text: "hello" },
      sentAt: "2026-05-29T00:00:00Z",
    });

    expect(result.status).toBe("ok");
    expect(result.data).toMatchObject({
      id: "m1",
      source: "im",
      conversationId: "c1",
      conversation: {
        source: "im",
        conversationId: "c1",
        conversationType: "direct",
      },
      conversationSeq: 10,
      type: "text",
      preview: "hello",
      sender: {
        userId: "u1",
        displayName: "张三",
        avatarUrl: "https://example.com/a.png",
      },
    });
  });

  it("accepts compatible snake_case fields and maps back to MessageItemDto", () => {
    const result = normalizeImMessageDto({
      message_id: "m2",
      conversation_id: "c1",
      conversation_seq: "11",
      sender_user_id: "u2",
      sender_display_name: "李四",
      message_type: "image",
      message_body: {
        image: { url: "https://example.com/image.png" },
      },
      sent_at: "2026-05-29T00:00:00Z",
    });

    expect(result.status).toBe("ok");
    expect(imMessageEntityToDto(result.data!)).toMatchObject({
      messageId: "m2",
      conversationId: "c1",
      conversationSeq: 11,
      senderUserId: "u2",
      senderDisplayName: "李四",
      messageType: "image",
      preview: "[图片]",
    });
  });

  it("generates a degraded id from conversation seq when message id is missing", () => {
    const result = normalizeImMessageDto({
      conversationId: "c1",
      conversationSeq: 12,
      messageType: "file",
      body: { file: { fileName: "a.pdf" } },
    });

    expect(result.status).toBe("degraded");
    expect(result.data).toMatchObject({
      id: "seq:c1:12",
      conversationId: "c1",
      conversationSeq: 12,
      type: "file",
    });
    expect(result.issues.map((issue) => issue.code)).toContain("im.message.generated_id");
  });

  it("marks messages without seq and id as invalid", () => {
    const result = normalizeImMessageDto({
      messageType: "text",
      body: { text: "missing identity" },
    });

    expect(result.status).toBe("invalid");
    expect(result.issues.map((issue) => issue.code)).toEqual([
      "im.message.missing_seq",
      "im.message.missing_id",
      "im.message.missing_conversation_id",
    ]);
  });

  it("degrades missing type to text fallback", () => {
    const result = normalizeImMessageDto({
      messageId: "m3",
      conversationId: "c1",
      conversationSeq: 13,
      body: {},
    });

    expect(result.status).toBe("degraded");
    expect(result.data).toMatchObject({
      id: "m3",
      type: "text",
      preview: "[消息]",
    });
    expect(result.issues.map((issue) => issue.code)).toContain("im.message.missing_type");
  });
});
