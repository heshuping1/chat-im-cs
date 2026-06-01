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
        failureTooltip: "发送失败，点击重试",
        showFailureMarker: true,
        statusText: undefined,
        timeText: "12:00",
      },
      actions: {
        contextMenuEnabled: true,
        failureRetryAction: {
          type: "text",
          content: "hello",
        },
        uploadActionTaskId: undefined,
      },
    });
  });

  it("shows direct read receipts per outgoing message without sent noise", () => {
    const message = {
      body: { text: "hello" },
      direction: "out",
      isMine: true,
      messageId: "m3",
      messageType: "text",
      sentAt: "2026-05-29T12:00:00.000Z",
      status: "sent",
    } as MessageItemDto;

    expect(
      createChatMessageViewModel({
        conversationFallbackName: "Alice",
        conversationType: "direct",
        message,
        mine: true,
        senderFallback: "Alice",
        timeText: "12:00",
      }),
    ).toMatchObject({
      status: {
        receipt: "unread",
        statusText: "未读",
      },
    });

    expect(
      createChatMessageViewModel({
        conversationFallbackName: "Alice",
        conversationType: "direct",
        message: { ...message, isRead: true },
        mine: true,
        senderFallback: "Alice",
        timeText: "12:01",
      }),
    ).toMatchObject({
      status: {
        receipt: "read",
        statusText: "已读",
      },
    });
  });

  it("shows a text sending slot immediately while preserving quiet status text", () => {
    const message = {
      body: { text: "hello" },
      direction: "out",
      isMine: true,
      localSendStartedAt: 1_000,
      messageId: "m-sending",
      messageType: "text",
      sentAt: "2026-05-29T12:00:00.000Z",
      status: "sending",
    } as MessageItemDto;

    expect(
      createChatMessageViewModel({
        conversationFallbackName: "Alice",
        conversationType: "direct",
        message,
        mine: true,
        nowMs: 1_400,
        senderFallback: "Alice",
        timeText: "12:00",
      }),
    ).toMatchObject({
      status: {
        sendStatusSlot: "sending",
        showSendingIndicator: true,
        statusText: undefined,
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
        failureRetryAction: undefined,
        uploadActionTaskId: "task-1",
      },
    });
  });

  it("uses resolved current sender avatar before the message snapshot avatar", () => {
    const message = {
      messageId: "m-avatar",
      senderAvatarUrl: "snapshot.png",
    } as MessageItemDto;

    expect(
      createChatMessageViewModel({
        conversationFallbackName: "Bob",
        message,
        mine: false,
        senderAvatarUrl: "current.png",
        senderFallback: "Bob",
        timeText: "12:00",
      }),
    ).toMatchObject({
      sender: {
        avatarUrl: "current.png",
      },
    });
  });

  it("marks failed media with local task id as retryable upload action", () => {
    const message = {
      messageId: "m4",
      messageType: "video",
      body: { video: { localPreviewUrl: "blob:video" } },
      status: "failed",
      localTaskId: "task-2",
      localError: "network",
    } as MessageItemDto & { localTaskId: string; localError: string };

    expect(
      createChatMessageViewModel({
        conversationFallbackName: "Alice",
        message,
        mine: true,
        senderFallback: "Alice",
        timeText: "12:02",
      }),
    ).toMatchObject({
      status: {
        sendStatusSlot: "none",
        showFailureMarker: false,
      },
      actions: {
        failureRetryAction: {
          type: "upload",
          localTaskId: "task-2",
        },
        uploadActionTaskId: "task-2",
      },
    });
  });

  it("keeps failed file retries on the file card instead of the external marker", () => {
    const message = {
      messageId: "m-file",
      messageType: "file",
      body: { file: { fileName: "report.pdf", localPreviewUrl: "blob:file" } },
      status: "failed",
      localTaskId: "task-file",
      localError: "network",
    } as MessageItemDto & { localTaskId: string; localError: string };

    expect(
      createChatMessageViewModel({
        conversationFallbackName: "Alice",
        message,
        mine: true,
        senderFallback: "Alice",
        timeText: "12:03",
      }),
    ).toMatchObject({
      status: {
        sendStatusSlot: "none",
        showFailureMarker: false,
      },
      actions: {
        failureRetryAction: {
          type: "upload",
          localTaskId: "task-file",
        },
        uploadActionTaskId: "task-file",
      },
    });
  });
});
