import { describe, expect, it } from "vitest";

import type { MessageItemDto } from "../../src/renderer/data/api/types";
import {
  failedMessageRetryAction,
  resendConfirmPreview,
  sendFailurePresentation,
} from "../../src/renderer/data/message/message-retry-model";

function failedTextMessage(overrides: Partial<MessageItemDto> = {}): MessageItemDto {
  return {
    body: { text: "123123", reply: { messageId: "reply-1" } },
    direction: "out",
    isMine: true,
    messageId: "pc-local-text-1",
    messageType: "text",
    preview: "123123",
    status: "failed",
    ...overrides,
  } as MessageItemDto;
}

describe("message retry model", () => {
  it("creates a text retry action from the failed local message itself", () => {
    expect(failedMessageRetryAction(failedTextMessage())).toEqual({
      type: "text",
      content: "123123",
      replyToMessageId: "reply-1",
    });
  });

  it("routes failed media messages with local task id to upload retry", () => {
    expect(
      failedMessageRetryAction(
        failedTextMessage({
          body: { video: { localPreviewUrl: "blob:video" } },
          localTaskId: "pc-upload-1",
          messageType: "video",
          preview: "[视频]",
        } as Partial<MessageItemDto>),
      ),
    ).toEqual({
      type: "upload",
      localTaskId: "pc-upload-1",
    });
  });

  it("does not offer retry for sent messages or unsupported failed messages", () => {
    expect(failedMessageRetryAction(failedTextMessage({ status: "sent" }))).toBeUndefined();
    expect(
      failedMessageRetryAction(
        failedTextMessage({ body: {}, messageType: "event", preview: "" }),
      ),
    ).toBeUndefined();
  });

  it("uses the original content as resend confirmation preview", () => {
    expect(resendConfirmPreview(failedTextMessage())).toBe("123123");
    expect(resendConfirmPreview(failedTextMessage({ messageType: "event", body: {} }))).toBe(
      "该消息暂时无法重发",
    );
  });

  it("keeps permission failure details out of customer-facing retry copy", () => {
    expect(
      sendFailurePresentation("当前账号没有权限执行此操作"),
    ).toEqual({
      dialogHint: "当前会话暂不可发送",
      kind: "blocked",
      markerTooltip: "发送失败，点击重试",
    });
    expect(sendFailurePresentation("MSG_MEMBER_FORBIDDEN")).toMatchObject({
      dialogHint: "当前会话暂不可发送",
      kind: "blocked",
      markerTooltip: "发送失败，点击重试",
    });
    expect(
      resendConfirmPreview(
        failedTextMessage({ localError: "当前账号没有权限执行此操作" } as Partial<MessageItemDto>),
      ),
    ).toBe("当前会话暂不可发送");
  });

  it("keeps retryable failures actionable without exposing raw diagnostics", () => {
    expect(sendFailurePresentation("network timeout")).toEqual({
      kind: "retryable",
      markerTooltip: "发送失败，点击重试",
    });
    expect(sendFailurePresentation("unexpected")).toEqual({
      kind: "unknown",
      markerTooltip: "发送失败，点击重试",
    });
  });
});
