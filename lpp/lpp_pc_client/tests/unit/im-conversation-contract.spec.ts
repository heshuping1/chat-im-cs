import { describe, expect, it } from "vitest";
import {
  imConversationEntityToListItem,
  normalizeImConversationDto,
} from "../../src/renderer/data/im/im-conversation-contract";

describe("im conversation contract", () => {
  it("normalizes a complete direct conversation dto", () => {
    const result = normalizeImConversationDto({
      conversationId: "c1",
      conversationType: "direct",
      title: "张三",
      avatarUrl: "https://example.com/a.png",
      unreadCount: 2,
      lastReadSeq: 3,
      lastMessageSeq: 5,
      peerReadSeq: 4,
      lastMessage: {
        messageId: "m1",
        messageType: "text",
        preview: "hello",
        sentAt: "2026-05-29T00:00:00Z",
        senderUserId: "u1",
      },
    });

    expect(result.status).toBe("ok");
    expect(result.data).toMatchObject({
      id: "c1",
      type: "direct",
      title: "张三",
      unreadCount: 2,
      lastReadSeq: 3,
      lastMessageSeq: 5,
      peerReadSeq: 4,
      lastMessage: {
        id: "m1",
        type: "text",
        preview: "hello",
      },
    });
  });

  it("accepts compatible group fields and maps back to list item shape", () => {
    const result = normalizeImConversationDto({
      conversation_id: "g1",
      type: "group_chat",
      name: "项目群",
      group_avatar_url: "https://example.com/g.png",
      member_avatar_urls: ["a", "b"],
      unread_count: "1",
      last_read_seq: "7",
      last_message_seq: "8",
      last_message: {
        message_id: "m2",
        message_type: "image",
        sent_at: "2026-05-29T00:00:00Z",
      },
    });

    expect(result.status).toBe("ok");
    expect(imConversationEntityToListItem(result.data!)).toMatchObject({
      conversationId: "g1",
      conversationType: "group",
      title: "项目群",
      groupAvatarUrl: "https://example.com/g.png",
      memberAvatarUrls: ["a", "b"],
      unreadCount: 1,
      lastReadSeq: 7,
      lastMessageSeq: 8,
      lastMessage: {
        messageId: "m2",
        messageType: "image",
      },
    });
  });

  it("marks missing id or unsupported type as invalid", () => {
    expect(
      normalizeImConversationDto({
        conversationType: "direct",
        title: "missing id",
      }),
    ).toMatchObject({
      status: "invalid",
      issues: [{ code: "im.conversation.missing_id", level: "error" }],
    });

    expect(
      normalizeImConversationDto({
        conversationId: "t1",
        conversationType: "temp_session",
      }),
    ).toMatchObject({
      status: "invalid",
      issues: [{ code: "im.conversation.unsupported_type", level: "error" }],
    });
  });

  it("degrades when display/read fields are missing", () => {
    const result = normalizeImConversationDto({
      conversationId: "c1",
      conversationType: "direct",
    });

    expect(result.status).toBe("degraded");
    expect(result.data).toMatchObject({
      id: "c1",
      title: "未命名会话",
      unreadCount: 0,
      lastReadSeq: 0,
      lastMessageSeq: 0,
    });
    expect(result.issues.map((issue) => issue.code)).toEqual([
      "im.conversation.missing_title",
      "im.conversation.missing_last_message_seq",
      "im.conversation.missing_last_read_seq",
    ]);
  });
});
