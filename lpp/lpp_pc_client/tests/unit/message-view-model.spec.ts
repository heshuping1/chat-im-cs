import { describe, expect, it } from "vitest";

import { createChatMessageViewModel } from "../../src/renderer/data/message/message-view-model";
import type { MessageItemDto } from "../../src/renderer/data/api/types";

describe("message view model", () => {
  it("builds sender, content, status and actions for an outgoing failed message", () => {
    const message: MessageItemDto = {
      messageId: "m1",
      messageType: "text",
      body: { text: "hello" },
      preview: "hello",
      status: "failed",
      localError: "network error",
      direction: "out",
      sentAt: "2026-05-29T12:00:00.000Z",
    } as MessageItemDto;

    expect(
      createChatMessageViewModel({
        conversationFallbackName: "Alice",
        message,
        mine: true,
        senderFallback: "Alice",
        timeText: "12:00",
      }),
    ).toMatchObject({
      id: "m1",
      ownership: "mine",
      sender: {
        name: "我",
        mine: true,
      },
      content: {
        type: "text",
        preview: "hello",
      },
      status: {
        delivery: "failed",
        statusText: "发送失败",
        timeText: "12:00",
      },
      actions: {
        contextMenuEnabled: true,
        uploadActionTaskId: undefined,
      },
    });
  });

  it("normalizes reply preview and upload action capability", () => {
    const message = {
      messageId: "m2",
      messageType: "image",
      body: {
        image: { localPreviewUrl: "blob:preview" },
        reply: { sender: "Bob", preview: "quoted text" },
      },
      status: "uploading",
      localTaskId: "task-1",
      uploadProgress: 48,
      sentAt: "2026-05-29T12:00:00.000Z",
    } as MessageItemDto & { localTaskId: string; uploadProgress: number };

    expect(
      createChatMessageViewModel({
        conversationFallbackName: "Bob",
        message,
        mine: false,
        senderAvatarUrl: "https://avatar.example/b.png",
        senderFallback: "Bob",
        timeText: "12:00",
      }),
    ).toMatchObject({
      ownership: "other",
      sender: {
        name: "Bob",
        avatarUrl: "https://avatar.example/b.png",
      },
      bubble: {
        reply: {
          sender: "Bob",
          preview: "quoted text",
        },
      },
      status: {
        delivery: "uploading",
      },
      actions: {
        uploadActionTaskId: "task-1",
      },
    });
  });
});
