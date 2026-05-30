import { describe, expect, it } from "vitest";
import {
  chatMessageEntityFromDto,
  chatMessageEntityToDto,
  normalizeChatMessageDeliveryState,
  normalizeChatMessageDirection,
  reuseStableMessageItems,
} from "../../src/renderer/data/message/message-domain";
import type { MessageItemDto } from "../../src/renderer/data/api/types";

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
});
