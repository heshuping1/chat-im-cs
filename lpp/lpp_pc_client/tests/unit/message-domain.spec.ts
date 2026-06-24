import { describe, expect, it } from "vitest";
import {
  chatMessageEntityFromDto,
  chatMessageEntityToDto,
  mergeStableMessagePage,
  normalizeChatMessageDeliveryState,
  normalizeChatMessageDirection,
  reuseStableMessageItems,
} from "../../src/renderer/data/message/message-domain";
import type { MessageItemDto } from "../../src/renderer/data/api/types";
import { chatMessageRenderKey } from "../../src/renderer/messages/models/messageRenderKey";

describe("message domain", () => {
  it("maps IM message dto to shared entity", () => {
    const entity = chatMessageEntityFromDto(
      {
        messageId: "m1",
        conversationId: "direct-1",
        conversationSeq: 7,
        senderUserId: "user-2",
        senderDisplayName: "Alice",
        messageType: "text",
        body: { text: "hello" },
        direction: "incoming",
        sentAt: "2026-05-29T10:00:00Z",
      },
      {
        source: "im",
        conversationType: "direct",
      },
    );

    expect(entity).toMatchObject({
      id: "m1",
      source: "im",
      conversation: {
        source: "im",
        conversationId: "direct-1",
        conversationType: "direct",
      },
      conversationSeq: 7,
      sender: {
        userId: "user-2",
        displayName: "Alice",
      },
      type: "text",
      preview: "hello",
      direction: "incoming",
      delivery: "idle",
      recalled: false,
    });
  });

  it("keeps customer-service context and local upload state as extension", () => {
    const entity = chatMessageEntityFromDto(
      {
        messageId: "local-1",
        body: { image: { localPreviewUrl: "blob:preview" } },
        messageType: "image",
        senderPlatformUserId: "platform-me",
        isSelf: true,
        status: "uploading",
        localTaskId: "task-1",
        uploadPhase: "uploading_media",
        uploadProgress: 42,
      } as MessageItemDto,
      {
        source: "customer_service",
        conversationId: "thread-conversation-1",
        conversationType: "temp_session",
        threadId: "thread-1",
        threadType: "temp_session",
      },
    );

    expect(entity).toMatchObject({
      source: "customer_service",
      conversation: {
        conversationId: "thread-conversation-1",
        conversationType: "temp_session",
        threadId: "thread-1",
      },
      sender: {
        platformUserId: "platform-me",
      },
      type: "image",
      preview: "[图片]",
      direction: "outgoing",
      delivery: "uploading",
      local: {
        localTaskId: "task-1",
        uploadPhase: "uploading_media",
        uploadProgress: 42,
        optimistic: true,
      },
    });
  });

  it("normalizes delivery and direction states", () => {
    expect(normalizeChatMessageDeliveryState("failed")).toBe("failed");
    expect(normalizeChatMessageDeliveryState("unknown")).toBe("idle");
    expect(normalizeChatMessageDeliveryState("sent", true)).toBe("recalled");
    expect(
      normalizeChatMessageDirection({
        messageId: "m2",
        messageType: "event",
        body: { eventText: "消息已撤回" },
      }),
    ).toBe("system");
  });

  it("converts shared entity back to compatible dto", () => {
    const entity = chatMessageEntityFromDto(
      {
        messageId: "m3",
        conversationId: "group-1",
        conversationSeq: 11,
        senderLppId: "lpp-1",
        messageType: "file",
        body: { file: { fileName: "a.pdf", sizeBytes: 10 } },
        status: "sent",
      },
      {
        source: "im",
        conversationType: "group",
      },
    );

    expect(chatMessageEntityToDto(entity)).toMatchObject({
      messageId: "m3",
      conversationId: "group-1",
      conversationSeq: 11,
      senderLppId: "lpp-1",
      lppId: "lpp-1",
      messageType: "file",
      preview: "[文件]",
      status: "sent",
    });
  });

  it("reuses unchanged polled message items to avoid media card refresh", () => {
    const previousVideo = {
      messageId: "m-video",
      conversationSeq: 12,
      messageType: "video",
      body: {
        video: {
          url: "https://cdn.example.test/video.mp4",
          thumbnailUrl: "https://cdn.example.test/poster.jpg",
          durationSeconds: 18,
        },
      },
      preview: "[视频]",
      status: "sent",
      sentAt: "2026-05-30T10:00:00Z",
      isSelf: true,
    } satisfies MessageItemDto;
    const previousText = {
      messageId: "m-text",
      conversationSeq: 13,
      messageType: "text",
      body: { text: "hello" },
      preview: "hello",
      status: "sent",
    } satisfies MessageItemDto;

    const result = reuseStableMessageItems([previousVideo, previousText], [
      {
        ...previousVideo,
        body: { video: { ...(previousVideo.body?.video as object) } },
      },
      { ...previousText, body: { text: "hello" } },
    ]);

    expect(result).toBeInstanceOf(Array);
    expect(result).toBeDefined();
    expect(result?.[0]).toBe(previousVideo);
    expect(result?.[1]).toBe(previousText);
  });

  it("keeps changed polled messages as new objects", () => {
    const previous = {
      messageId: "m-video",
      conversationSeq: 12,
      messageType: "video",
      body: {
        video: {
          url: "https://cdn.example.test/video.mp4",
          thumbnailUrl: "https://cdn.example.test/poster-old.jpg",
        },
      },
      status: "sent",
    } satisfies MessageItemDto;
    const next = {
      ...previous,
      body: {
        video: {
          url: "https://cdn.example.test/video.mp4",
          thumbnailUrl: "https://cdn.example.test/poster-new.jpg",
        },
      },
    } satisfies MessageItemDto;

    const result = reuseStableMessageItems([previous], [next]);

    expect(result?.[0]).toBe(next);
  });

  it("preserves client identity when a server refresh updates the same message", () => {
    const previous = message({
      clientMsgId: "pc-local-text-1",
      conversationSeq: 12,
      messageId: "server-1",
      readCount: 0,
      status: "sent",
    });
    const next = message({
      conversationSeq: 12,
      messageId: "server-1",
      readCount: 2,
      status: "read",
    });

    const result = mergeStableMessagePage([previous], [next]);

    expect(result?.[0]).not.toBe(previous);
    expect(result?.[0]).toMatchObject({
      clientMsgId: "pc-local-text-1",
      messageId: "server-1",
      readCount: 2,
      status: "read",
    });
    expect(chatMessageRenderKey(result![0])).toBe(chatMessageRenderKey(previous));
  });

  it("does not override client identity returned by the refreshed server message", () => {
    const previous = message({
      clientMsgId: "pc-local-old",
      conversationSeq: 12,
      messageId: "server-1",
      readCount: 0,
    });
    const next = message({
      clientMsgId: "pc-local-current",
      conversationSeq: 12,
      messageId: "server-1",
      readCount: 1,
    });

    const result = mergeStableMessagePage([previous], [next]);

    expect(result?.[0]).toMatchObject({
      clientMsgId: "pc-local-current",
      messageId: "server-1",
      readCount: 1,
    });
  });

  it("keeps previously loaded older messages when the latest server page shifts", () => {
    const previous = Array.from({ length: 51 }, (_, index) =>
      message({
        conversationSeq: 520 + index,
        messageId: `m-${520 + index}`,
        sentAt: `2026-06-09T10:${String(index).padStart(2, "0")}:00.000Z`,
      }),
    );
    const next = Array.from({ length: 50 }, (_, index) =>
      message({
        conversationSeq: 521 + index,
        messageId: `m-${521 + index}`,
        sentAt: `2026-06-09T10:${String(index + 1).padStart(2, "0")}:00.000Z`,
      }),
    );

    const result = mergeStableMessagePage(previous, next);

    expect(result?.map((item) => item.messageId)).toEqual(
      Array.from({ length: 51 }, (_, index) => `m-${520 + index}`),
    );
    expect(result?.[0]).toBe(previous[0]);
  });

  it("still lets messages disappear inside the returned server page range", () => {
    const previous = [
      message({ conversationSeq: 10, messageId: "m-10" }),
      message({ conversationSeq: 11, messageId: "m-11" }),
      message({ conversationSeq: 12, messageId: "m-12" }),
    ];
    const next = [
      message({ conversationSeq: 10, messageId: "m-10" }),
      message({ conversationSeq: 12, messageId: "m-12" }),
    ];

    const result = mergeStableMessagePage(previous, next);

    expect(result?.map((item) => item.messageId)).toEqual(["m-10", "m-12"]);
  });
});

function message(overrides: Partial<MessageItemDto>): MessageItemDto {
  return {
    body: { text: overrides.messageId ?? "message" },
    conversationId: "c1",
    direction: "out",
    isMine: true,
    messageId: "m1",
    messageType: "text",
    preview: "message",
    sentAt: "2026-06-09T10:00:00.000Z",
    status: "sent",
    ...overrides,
  };
}
