import { describe, expect, it } from "vitest";

import type { MessageItemDto } from "../../src/renderer/data/api/types";
import {
  chatSendStatusFailedRevealDelayMs,
  deriveChatMessageStatus,
  nextChatMessageStatusRefreshDelay,
} from "../../src/renderer/data/message/message-status-model";

function message(overrides: Partial<MessageItemDto> = {}): MessageItemDto {
  return {
    body: { text: "hello" },
    direction: "out",
    isMine: true,
    messageId: "m1",
    messageType: "text",
    sentAt: "2026-05-30T10:00:00.000Z",
    status: "sent",
    ...overrides,
  } as MessageItemDto;
}

describe("message status model", () => {
  it("prioritizes failed state and exposes an external retry marker", () => {
    expect(
      deriveChatMessageStatus({
        conversationType: "direct",
        message: message({ localError: "HTTP 403", status: "failed" }),
        mine: true,
      }),
    ).toMatchObject({
      failureReason: "当前会话暂不可发送",
      failureTooltip: "发送失败，点击重试",
      receiptState: "none",
      sendStatusSlot: "failed",
      sendState: "failed",
      showFailureMarker: true,
      showSendingIndicator: false,
      statusLabel: undefined,
    });
  });

  it("treats direct text sending as optimistic unread by default", () => {
    expect(
      deriveChatMessageStatus({
        conversationType: "direct",
        message: message({ localSendStartedAt: 1_000, status: "sending" } as Partial<MessageItemDto>),
        mine: true,
        nowMs: 1_200,
      }).statusLabel,
    ).toBe("未读");
    expect(
      deriveChatMessageStatus({
        conversationType: "direct",
        message: message({ status: "sent" }),
        mine: true,
      }).statusLabel,
    ).toBe("未读");
  });

  it("keeps text sending optimistic without an external sending slot", () => {
    for (const nowMs of [1_000, 1_700, 4_000]) {
      expect(
        deriveChatMessageStatus({
          conversationType: "direct",
          message: message({ localSendStartedAt: 1_000, status: "sending" } as Partial<MessageItemDto>),
          mine: true,
          nowMs,
        }),
      ).toMatchObject({
        receiptState: "unread",
        sendStatusSlot: "none",
        sendState: "sending",
        showFailureMarker: false,
        showSendingIndicator: false,
        statusLabel: "未读",
      });
    }
  });

  it("does not schedule text sending indicator refreshes", () => {
    expect(
      nextChatMessageStatusRefreshDelay({
        message: message({ localSendStartedAt: 1_000, status: "sending" } as Partial<MessageItemDto>),
        nowMs: 1_200,
      }),
    ).toBeUndefined();
  });

  it("keeps fast failures in the sending slot before revealing the failed marker", () => {
    expect(
      deriveChatMessageStatus({
        conversationType: "direct",
        message: message({
          localFailedAt: 1_100,
          localSendStartedAt: 1_000,
          status: "failed",
        } as Partial<MessageItemDto>),
        mine: true,
        nowMs: 1_200,
      }),
    ).toMatchObject({
      sendStatusSlot: "sending",
      sendState: "failed",
      showFailureMarker: false,
      showSendingIndicator: true,
      statusLabel: undefined,
    });

    expect(
      deriveChatMessageStatus({
        conversationType: "direct",
        message: message({
          localFailedAt: 1_100,
          localSendStartedAt: 1_000,
          status: "failed",
        } as Partial<MessageItemDto>),
        mine: true,
        nowMs: 1_000 + chatSendStatusFailedRevealDelayMs,
      }),
    ).toMatchObject({
      sendStatusSlot: "failed",
      sendState: "failed",
      showFailureMarker: true,
      showSendingIndicator: false,
      statusLabel: undefined,
    });
  });

  it("shows restored failed messages immediately without replaying sending", () => {
    expect(
      deriveChatMessageStatus({
        conversationType: "direct",
        message: message({ status: "failed" }),
        mine: true,
        nowMs: 1_000,
      }),
    ).toMatchObject({
      sendStatusSlot: "failed",
      sendState: "failed",
      showFailureMarker: true,
      showSendingIndicator: false,
    });
  });

  it("shows per-message direct read and unread receipts for outgoing messages", () => {
    expect(
      deriveChatMessageStatus({
        conversationType: "direct",
        message: message({ isRead: true, readAt: "2026-05-30T10:01:00.000Z" }),
        mine: true,
      }),
    ).toMatchObject({ receiptState: "read", statusLabel: "已读" });

    expect(
      deriveChatMessageStatus({
        conversationType: "direct",
        message: message(),
        mine: true,
      }),
    ).toMatchObject({ receiptState: "unread", statusLabel: "未读" });
  });

  it("treats direct readCount snapshots as read receipts", () => {
    expect(
      deriveChatMessageStatus({
        conversationType: "temp_session",
        message: message({ readCount: 1 }),
        mine: true,
      }),
    ).toMatchObject({ receiptState: "read" });
  });

  it("shows group read receipts only from server readCount", () => {
    expect(
      deriveChatMessageStatus({
        conversationType: "group",
        groupReadReceiptTotal: 3,
        message: message({ conversationSeq: 9, readCount: 3 }),
        mine: true,
      }),
    ).toMatchObject({
      groupReadReceipt: { readCount: 3, totalCount: 3, ratio: 1 },
      groupReadReceiptClickable: true,
      receiptState: "group_all",
      statusLabel: undefined,
    });

    expect(
      deriveChatMessageStatus({
        conversationType: "group",
        groupReadReceiptTotal: 3,
        message: message({ conversationSeq: 9, readCount: 1 }),
        mine: true,
      }),
    ).toMatchObject({
      groupReadReceipt: { readCount: 1, totalCount: 3, ratio: 1 / 3 },
      groupReadReceiptClickable: true,
      receiptState: "group_partial",
      statusLabel: undefined,
    });

    expect(
      deriveChatMessageStatus({
        conversationType: "group",
        groupReadReceiptTotal: 3,
        message: message({ conversationSeq: 9, readCount: 0 }),
        mine: true,
      }),
    ).toMatchObject({
      groupReadReceipt: { readCount: 0, totalCount: 3, ratio: 0 },
      groupReadReceiptClickable: true,
      receiptState: "group_unread",
      statusLabel: undefined,
    });

    expect(
      deriveChatMessageStatus({
        conversationType: "group",
        message: message({ conversationSeq: 9, unreadCount: 2 } as Partial<MessageItemDto>),
        mine: true,
      }),
    ).toMatchObject({
      groupReadReceipt: { readCount: 0 },
      groupReadReceiptClickable: true,
      receiptState: "group_unread",
      statusLabel: undefined,
    });
  });

  it("hides group read receipts for unsent, failed, recalled and seq-less messages", () => {
    expect(
      deriveChatMessageStatus({
        conversationType: "group",
        message: message({ conversationSeq: 9, readCount: 3, status: "sending" }),
        mine: true,
      }),
    ).toMatchObject({
      groupReadReceiptClickable: false,
      sendStatusSlot: "none",
      statusLabel: undefined,
    });

    for (const item of [
      message({ conversationSeq: 9, readCount: 3, status: "failed" }),
      message({ conversationSeq: 9, isRecalled: true, readCount: 3, status: "recalled" }),
      message({ readCount: 3 }),
    ]) {
      expect(
        deriveChatMessageStatus({
          conversationType: "group",
          message: item,
          mine: true,
        }),
      ).toMatchObject({
        groupReadReceiptClickable: false,
        statusLabel: undefined,
      });
    }
  });

  it("keeps the external sending slot for image uploads only", () => {
    expect(
      deriveChatMessageStatus({
        conversationType: "direct",
        message: message({ localSendStartedAt: 1_000, messageType: "image", status: "uploading" } as Partial<MessageItemDto>),
        mine: true,
        nowMs: 1_100,
      }),
    ).toMatchObject({
      sendState: "uploading",
      sendStatusSlot: "sending",
      showSendingIndicator: true,
      statusLabel: "上传中",
    });
  });

  it("lets the file card own local upload and failed states", () => {
    expect(
      deriveChatMessageStatus({
        conversationType: "direct",
        message: message({ localSendStartedAt: 1_000, messageType: "file", status: "uploading" } as Partial<MessageItemDto>),
        mine: true,
        nowMs: 1_100,
      }),
    ).toMatchObject({
      sendState: "uploading",
      sendStatusSlot: "none",
      showFailureMarker: false,
      showSendingIndicator: false,
      statusLabel: undefined,
    });
    expect(
      deriveChatMessageStatus({
        conversationType: "direct",
        message: message({ localError: "network", localTaskId: "task-file", messageType: "file", status: "failed" } as Partial<MessageItemDto>),
        mine: true,
      }),
    ).toMatchObject({
      sendState: "failed",
      sendStatusSlot: "none",
      showFailureMarker: false,
      showSendingIndicator: false,
      statusLabel: undefined,
    });
  });

  it("lets the video card own local upload and failed states", () => {
    expect(
      deriveChatMessageStatus({
        conversationType: "direct",
        message: message({ localSendStartedAt: 1_000, messageType: "video", status: "uploading" } as Partial<MessageItemDto>),
        mine: true,
        nowMs: 1_100,
      }),
    ).toMatchObject({
      sendState: "uploading",
      sendStatusSlot: "none",
      showFailureMarker: false,
      showSendingIndicator: false,
      statusLabel: undefined,
    });
    expect(
      deriveChatMessageStatus({
        conversationType: "direct",
        message: message({ localError: "network", localTaskId: "task-1", messageType: "video", status: "failed" } as Partial<MessageItemDto>),
        mine: true,
      }),
    ).toMatchObject({
      sendState: "failed",
      sendStatusSlot: "none",
      showFailureMarker: false,
      showSendingIndicator: false,
      statusLabel: undefined,
    });
  });
});
