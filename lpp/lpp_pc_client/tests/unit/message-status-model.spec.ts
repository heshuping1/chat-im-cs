import { describe, expect, it } from "vitest";

import type { MessageItemDto } from "../../src/renderer/data/api/types";
import {
  chatSendStatusFailedRevealDelayMs,
  deriveChatMessageStatus,
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

  it("does not show textual sending or sent status for text messages", () => {
    expect(
      deriveChatMessageStatus({
        conversationType: "direct",
        message: message({ localSendStartedAt: 1_000, status: "sending" } as Partial<MessageItemDto>),
        mine: true,
        nowMs: 1_200,
      }).statusLabel,
    ).toBeUndefined();
    expect(
      deriveChatMessageStatus({
        conversationType: "direct",
        message: message({ status: "sent" }),
        mine: true,
      }).statusLabel,
    ).toBe("未读");
  });

  it("shows a WeChat-like sending slot immediately for text sending", () => {
    expect(
      deriveChatMessageStatus({
        conversationType: "direct",
        message: message({ localSendStartedAt: 1_000, status: "sending" } as Partial<MessageItemDto>),
        mine: true,
        nowMs: 1_010,
      }),
    ).toMatchObject({
      sendStatusSlot: "sending",
      sendState: "sending",
      showFailureMarker: false,
      showSendingIndicator: true,
      statusLabel: undefined,
    });
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

  it("consumes only existing group receipt fields without inventing receipts", () => {
    expect(
      deriveChatMessageStatus({
        conversationType: "group",
        message: message({ readCount: 3 }),
        mine: true,
      }),
    ).toMatchObject({ receiptState: "group_partial", statusLabel: "3人已读" });

    expect(
      deriveChatMessageStatus({
        conversationType: "group",
        message: message({ unreadCount: 2 } as Partial<MessageItemDto>),
        mine: true,
      }),
    ).toMatchObject({ receiptState: "group_partial", statusLabel: "2人未读" });

    expect(
      deriveChatMessageStatus({
        conversationType: "group",
        message: message(),
        mine: true,
      }),
    ).toMatchObject({ receiptState: "group_unknown", statusLabel: undefined });
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
