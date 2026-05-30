import { describe, expect, it } from "vitest";
import type { MessageItemDto } from "../../src/renderer/data/api/types";
import {
  fileMessageInlineStatusText,
  localUploadStateFromMessage,
  uploadStatusLabel,
  videoUploadOverlayState,
} from "../../src/renderer/media/runtime/uploadState";

function message(overrides: Partial<MessageItemDto> & Record<string, unknown>): MessageItemDto {
  return {
    messageId: "m1",
    ...overrides,
  };
}

describe("uploadState", () => {
  it("normalizes local upload task fields from a message", () => {
    expect(
      localUploadStateFromMessage(
        message({
          status: "uploading",
          uploadProgress: 42.4,
          localTaskId: "task-1",
          localError: "network",
        }),
      ),
    ).toEqual({
      status: "uploading",
      progress: 42.4,
      taskId: "task-1",
      error: "network",
    });
  });

  it("formats file inline status text without coupling to file card UI", () => {
    expect(
      fileMessageInlineStatusText(
        message({
          status: "failed",
          localError: "timeout",
        }),
      ),
    ).toBe("发送失败：timeout");
  });

  it("formats upload control labels consistently", () => {
    expect(uploadStatusLabel("queued")).toBe("等待上传");
    expect(uploadStatusLabel("uploading", 75)).toBe("上传中 75%");
    expect(uploadStatusLabel("paused")).toBe("已暂停");
    expect(uploadStatusLabel("failed", undefined, "offline")).toBe("发送失败：offline");
    expect(uploadStatusLabel("canceled")).toBe("已取消");
  });

  it("models WeChat-like video upload overlay actions", () => {
    expect(videoUploadOverlayState({ status: "uploading", progress: 42, taskId: "task-1" }))
      .toMatchObject({
        active: true,
        canPlay: false,
        action: "pause",
        icon: "pause",
        progress: 42,
      });
    expect(videoUploadOverlayState({ status: "paused", progress: 42, taskId: "task-1" }))
      .toMatchObject({
        active: true,
        canPlay: false,
        action: "resume",
        icon: "play",
        progress: 42,
      });
    expect(videoUploadOverlayState({ status: "sent", taskId: "task-1" })).toMatchObject({
      active: false,
      canPlay: true,
    });
  });

  it("keeps failed and canceled video upload states non-playable", () => {
    expect(videoUploadOverlayState({ status: "failed", taskId: "task-1", error: "offline" }))
      .toMatchObject({
        active: true,
        canPlay: false,
        action: "retry",
        icon: "retry",
        label: "发送失败：offline",
      });
    expect(videoUploadOverlayState({ status: "canceled", taskId: "task-1" })).toMatchObject({
      active: true,
      canPlay: false,
      action: undefined,
      icon: "canceled",
    });
  });
});
