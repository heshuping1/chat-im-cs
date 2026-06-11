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
        statusText: undefined,
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
        readReceiptText: undefined,
        statusText: undefined,
      },
    });
  });

  it("keeps direct readCount snapshots as non-text receipt state", () => {
    const message = {
      body: { text: "hello" },
      direction: "out",
      isMine: true,
      messageId: "m-direct-read-count",
      messageType: "text",
      readCount: 1,
      sentAt: "2026-05-29T12:00:00.000Z",
      status: "sent",
    } as MessageItemDto;

    expect(
      createChatMessageViewModel({
        conversationFallbackName: "Customer",
        conversationType: "temp_session",
        message,
        mine: true,
        senderFallback: "Customer",
        timeText: "12:00",
      }),
    ).toMatchObject({
      status: {
        receipt: "read",
        readReceiptText: undefined,
        statusText: undefined,
      },
    });
  });

  it("exposes customer-service read time as visible bubble text for outgoing messages", () => {
    const message = {
      body: { text: "hello" },
      direction: "out",
      isMine: true,
      isRead: true,
      messageId: "m-cs-read",
      messageType: "text",
      readAt: "2026-06-11T09:20:00.000Z",
      sentAt: "2026-06-11T09:18:00.000Z",
      status: "sent",
    } as MessageItemDto;

    expect(
      createChatMessageViewModel({
        conversationFallbackName: "Customer",
        conversationType: "temp_session",
        message,
        mine: true,
        readReceiptText: "客户已读 17:20",
        senderFallback: "Customer",
        statusText: "客户已读 17:20",
        timeText: "17:18",
      }),
    ).toMatchObject({
      status: {
        receipt: "read",
        readReceiptText: undefined,
        statusText: "客户已读 17:20",
      },
    });
  });

  it("does not expose incoming read status text in the shared bubble chrome", () => {
    const message = {
      body: { text: "hello" },
      direction: "in",
      isMine: false,
      isRead: false,
      messageId: "m-peer-unread",
      messageType: "text",
      sentAt: "2026-06-11T09:20:00.000Z",
      status: "unread",
    } as MessageItemDto;

    expect(
      createChatMessageViewModel({
        conversationFallbackName: "Visitor",
        conversationType: "temp_session",
        message,
        mine: false,
        senderFallback: "Visitor",
        statusText: "未读",
        timeText: "17:20",
      }),
    ).toMatchObject({
      ownership: "other",
      status: {
        receipt: "none",
        readReceiptText: undefined,
        statusText: undefined,
      },
    });
  });

  it("exposes clickable group read receipt status for sent own group messages", () => {
    const message = {
      body: { text: "hello" },
      conversationSeq: 16,
      direction: "out",
      isMine: true,
      messageId: "m-group-read",
      messageType: "text",
      readCount: 2,
      sentAt: "2026-05-29T12:00:00.000Z",
      status: "sent",
    } as MessageItemDto;

    expect(
      createChatMessageViewModel({
        conversationFallbackName: "群聊",
        conversationType: "group",
        groupReadReceiptTotal: 3,
        message: { ...message, readCount: 1 },
        mine: true,
        senderFallback: "群聊",
        timeText: "12:00",
      }),
    ).toMatchObject({
      status: {
        groupReadReceipt: { readCount: 1, totalCount: 3, ratio: 1 / 3 },
        groupReadReceiptClickable: true,
        receipt: "group_partial",
        statusText: undefined,
      },
    });

    expect(
      createChatMessageViewModel({
        conversationFallbackName: "群聊",
        conversationType: "group",
        groupReadReceiptTotal: 4,
        message: { ...message, readCount: 0 },
        mine: true,
        senderFallback: "群聊",
        timeText: "12:00",
      }),
    ).toMatchObject({
      status: {
        groupReadReceipt: { readCount: 0, totalCount: 4, ratio: 0 },
        groupReadReceiptClickable: true,
        receipt: "group_unread",
        statusText: undefined,
      },
    });

    expect(
      createChatMessageViewModel({
        conversationFallbackName: "缇よ亰",
        conversationType: "group",
        groupReadReceiptTotal: 4,
        message: { ...message, readCount: undefined },
        mine: true,
        senderFallback: "缇よ亰",
        timeText: "12:00",
      }),
    ).toMatchObject({
      status: {
        groupReadReceipt: { readCount: 0, totalCount: 4, ratio: 0 },
        groupReadReceiptClickable: true,
        receipt: "group_unread",
        statusText: undefined,
      },
    });
  });

  it("does not expose group read receipt actions for peer, direct or local messages", () => {
    const message = {
      body: { text: "hello" },
      conversationSeq: 16,
      direction: "out",
      isMine: true,
      messageId: "m-group-hidden",
      messageType: "text",
      readCount: 2,
      sentAt: "2026-05-29T12:00:00.000Z",
      status: "sent",
    } as MessageItemDto;

    expect(
      createChatMessageViewModel({
        conversationFallbackName: "缇よ亰",
        conversationType: "group",
        message,
        mine: false,
        senderFallback: "Alice",
        timeText: "12:00",
      }).status.groupReadReceiptClickable,
    ).toBe(false);

    expect(
      createChatMessageViewModel({
        conversationFallbackName: "Alice",
        conversationType: "direct",
        message,
        mine: true,
        senderFallback: "Alice",
        timeText: "12:00",
      }).status.groupReadReceiptClickable,
    ).toBe(false);

    expect(
      createChatMessageViewModel({
        conversationFallbackName: "缇よ亰",
        conversationType: "group",
        message: { ...message, conversationSeq: undefined },
        mine: true,
        senderFallback: "缇よ亰",
        timeText: "12:00",
      }).status.groupReadReceiptClickable,
    ).toBe(false);
  });

  it("keeps text sending optimistic without external sending feedback", () => {
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
        receipt: "unread",
        sendStatusSlot: "none",
        showSendingIndicator: false,
        statusText: undefined,
        timeText: "12:00",
      },
    });

    expect(
      createChatMessageViewModel({
        conversationFallbackName: "Alice",
        conversationType: "direct",
        message,
        mine: true,
        nowMs: 4_000,
        senderFallback: "Alice",
        timeText: "12:00",
      }),
    ).toMatchObject({
      status: {
        receipt: "unread",
        sendStatusSlot: "none",
        showSendingIndicator: false,
        statusText: undefined,
        timeText: "12:00",
      },
    });
  });

  it("keeps text read receipts separate from local sending state", () => {
    const baseMessage = {
      body: { text: "123" },
      direction: "out",
      isMine: true,
      messageId: "m-text-status",
      messageType: "text",
      sentAt: "2026-05-29T12:00:00.000Z",
    } as MessageItemDto;

    expect(
      createChatMessageViewModel({
        conversationFallbackName: "Alice",
        conversationType: "direct",
        message: { ...baseMessage, status: "sent" },
        mine: true,
        senderFallback: "Alice",
        timeText: "12:00",
      }),
    ).toMatchObject({
      status: {
        receipt: "unread",
        sendStatusSlot: "none",
        statusText: undefined,
        timeText: "12:00",
      },
    });

    expect(
      createChatMessageViewModel({
        conversationFallbackName: "Alice",
        conversationType: "direct",
        message: { ...baseMessage, status: "seen" },
        mine: true,
        senderFallback: "Alice",
        timeText: "12:01",
      }),
    ).toMatchObject({
      status: {
        receipt: "read",
        sendStatusSlot: "none",
        statusText: undefined,
        timeText: "12:01",
      },
    });

    expect(
      createChatMessageViewModel({
        conversationFallbackName: "Alice",
        conversationType: "direct",
        message: {
          ...baseMessage,
          readAt: "2026-05-29T12:02:00.000Z",
          status: "sent",
        },
        mine: true,
        senderFallback: "Alice",
        timeText: "12:02",
      }),
    ).toMatchObject({
      status: {
        receipt: "read",
        sendStatusSlot: "none",
        statusText: undefined,
        timeText: "12:02",
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
