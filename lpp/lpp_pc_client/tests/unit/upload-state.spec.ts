import { afterEach, describe, expect, it, vi } from "vitest";
import type { MessageItemDto } from "../../src/renderer/data/api/types";
import {
  composeMediaUploadProgress,
  createVideoUploadDisplayProgressTicker,
  fileMessageCardState,
  fileMessageInlineStatusText,
  localUploadStateFromMessage,
  mediaUploadProgressPercent,
  uploadStatusLabel,
  videoUploadDisplayProgressTarget,
  videoUploadOverlayState,
} from "../../src/renderer/media/runtime/uploadState";

function message(overrides: Partial<MessageItemDto> & Record<string, unknown>): MessageItemDto {
  return {
    messageId: "m1",
    ...overrides,
  };
}

describe("uploadState", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("normalizes local upload task fields from a message", () => {
    expect(
      localUploadStateFromMessage(
        message({
          status: "uploading",
          uploadPhase: "uploading_media",
          uploadProgress: 42.4,
          localTaskId: "task-1",
          localError: "network",
        }),
      ),
    ).toEqual({
      status: "uploading",
      phase: "uploading_media",
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
    ).toBe("发送失败，点击重试");
  });

  it("formats upload control labels consistently", () => {
    expect(uploadStatusLabel("queued")).toBe("等待上传");
    expect(uploadStatusLabel("uploading", 75)).toBe("上传中 75%");
    expect(uploadStatusLabel("paused")).toBe("已暂停");
    expect(uploadStatusLabel("sending")).toBe("发送中");
    expect(uploadStatusLabel("failed", undefined, "offline")).toBe("发送失败，点击重试");
    expect(uploadStatusLabel("canceled")).toBe("已取消");
  });

  it("models WeChat-like video upload overlay actions", () => {
    expect(videoUploadOverlayState({ status: "uploading", phase: "uploading_media", progress: 50, taskId: "task-1" }))
      .toMatchObject({
        active: true,
        canPlay: false,
        action: "pause",
        icon: "pause",
        label: "上传中 50%",
        progressMode: "determinate",
        progress: 50,
      });
    expect(videoUploadOverlayState({ status: "uploading", phase: "uploading_media", taskId: "task-1" }))
      .toMatchObject({
        active: true,
        canPlay: false,
        action: "pause",
        icon: "pause",
        label: "上传中 0%",
        progress: 0,
        progressMode: "determinate",
      });
    expect(videoUploadOverlayState({ status: "uploading", taskId: "task-1" }))
      .toMatchObject({
        active: true,
        canPlay: false,
        action: "pause",
        icon: "pause",
        label: "上传中 0%",
        progress: 0,
        progressMode: "determinate",
      });
    expect(videoUploadOverlayState({ status: "uploading", progress: 100, taskId: "task-1" }))
      .toMatchObject({
        label: "上传中 78%",
        progress: 78,
        progressMode: "determinate",
      });
    expect(videoUploadOverlayState({ status: "paused", progress: 42, taskId: "task-1" }))
      .toMatchObject({
        active: true,
        canPlay: false,
        action: "resume",
        icon: "play",
        progress: 42,
        progressMode: "determinate",
      });
    expect(videoUploadOverlayState({ status: "sent", taskId: "task-1" })).toMatchObject({
      active: false,
      canPlay: true,
    });
    expect(videoUploadOverlayState({ status: "sending", progress: 100, taskId: "task-1" }))
      .toMatchObject({
        active: true,
        canPlay: false,
        action: undefined,
        icon: "pause",
        label: "发送中",
        progress: 95,
        progressMode: "determinate",
      });
    expect(videoUploadOverlayState({ status: "queued", taskId: "task-1" }))
      .toMatchObject({
        active: true,
        canPlay: false,
        action: undefined,
        icon: "pause",
        label: "等待上传",
        progress: 0,
        progressMode: "determinate",
      });
  });

  it("maps upload display stages without showing 100 before send confirmation", () => {
    expect(composeMediaUploadProgress("file", "uploading_media", 50)).toBe(45);
    expect(composeMediaUploadProgress("file", "sending", 100)).toBe(95);
    expect(composeMediaUploadProgress("video", "uploading_media", 50)).toBe(50);
    expect(composeMediaUploadProgress("video", "uploading_media", 100)).toBe(78);
    expect(composeMediaUploadProgress("video", "uploading_poster", 50)).toBe(78);
    expect(composeMediaUploadProgress("video", "uploading_poster", 100)).toBe(88);
    expect(composeMediaUploadProgress("video", "sending", 100)).toBe(95);
    expect(composeMediaUploadProgress("video", "uploading_media")).toBe(0);
    expect(composeMediaUploadProgress("video", "uploading_poster")).toBe(78);
  });

  it("creates visible video display progress when browser upload progress is sparse", () => {
    expect(videoUploadDisplayProgressTarget({ phase: "uploading_media", elapsedMs: 0 })).toBe(0);
    const localClockProgress = videoUploadDisplayProgressTarget({
      phase: "uploading_media",
      elapsedMs: 600,
    });
    expect(localClockProgress).toBeGreaterThan(0);
    expect(localClockProgress).toBeLessThanOrEqual(72);
    expect(videoUploadDisplayProgressTarget({ phase: "uploading_media", rawProgress: 100 }))
      .toBe(78);
    expect(videoUploadDisplayProgressTarget({ phase: "uploading_poster", elapsedMs: 0 }))
      .toBe(78);
    expect(videoUploadDisplayProgressTarget({ phase: "uploading_poster", rawProgress: 100 }))
      .toBe(88);
    expect(videoUploadDisplayProgressTarget({ phase: "sending", rawProgress: 100 })).toBe(95);
  });

  it("ticks video display progress monotonically and freezes when stopped", () => {
    vi.useFakeTimers();
    const events: Array<{ phase: string; progress: number }> = [];
    const ticker = createVideoUploadDisplayProgressTicker((event) => {
      events.push(event);
    }, { intervalMs: 150 });

    ticker.start("uploading_media");
    expect(events).toHaveLength(0);

    vi.advanceTimersByTime(450);
    expect(events.length).toBeGreaterThan(0);
    expect(events.at(-1)?.progress).toBeGreaterThan(0);
    expect(events.at(-1)?.progress).toBeLessThanOrEqual(72);

    ticker.setRawProgress("uploading_media", 100);
    expect(events.at(-1)).toMatchObject({ phase: "uploading_media", progress: 78 });

    ticker.setPhase("uploading_poster");
    expect(events.at(-1)?.progress).toBeGreaterThanOrEqual(78);

    ticker.setPhase("sending");
    expect(events.at(-1)).toMatchObject({ phase: "sending", progress: 95 });

    ticker.stop();
    const frozenEventCount = events.length;
    vi.advanceTimersByTime(1_000);
    expect(events).toHaveLength(frozenEventCount);
  });

  it("derives determinate upload progress from loaded bytes when XHR percent is missing", () => {
    expect(mediaUploadProgressPercent({ loaded: 512, total: undefined, percent: undefined }, 1024))
      .toBe(50);
    expect(mediaUploadProgressPercent({ loaded: 3, total: 4, percent: undefined }, 1024))
      .toBe(75);
    expect(mediaUploadProgressPercent({ loaded: 10, total: 0, percent: undefined }, 0))
      .toBeUndefined();
    expect(mediaUploadProgressPercent({ loaded: 10, total: 100, percent: 33 }, 1024))
      .toBe(33);
  });

  it("keeps failed and canceled video upload states non-playable", () => {
    expect(videoUploadOverlayState({ status: "failed", taskId: "task-1", error: "offline" }))
      .toMatchObject({
        active: true,
        canPlay: false,
        action: "retry",
        icon: "retry",
        label: "发送失败，点击重试",
      });
    expect(videoUploadOverlayState({ status: "canceled", taskId: "task-1" })).toMatchObject({
      active: true,
      canPlay: false,
      action: undefined,
      icon: "canceled",
    });
  });

  it("keeps queued video upload state non-playable without faking progress", () => {
    expect(videoUploadOverlayState({ status: "queued", taskId: "task-1" })).toMatchObject({
      active: true,
      canPlay: false,
      action: undefined,
      icon: "pause",
      label: "等待上传",
      progress: 0,
      progressMode: "determinate",
    });
  });

  it("keeps file upload controls inside the file icon", () => {
    expect(
      fileMessageCardState({
        status: "uploading",
        phase: "preparing",
        progress: 0,
        taskId: "task-1",
      }),
    ).toMatchObject({
      controlProgress: 0,
      controlState: "progress",
      metaText: "等待上传",
    });

    expect(
      fileMessageCardState({
        status: "uploading",
        phase: "uploading_media",
        progress: 50,
        taskId: "task-1",
      }),
    ).toMatchObject({
      controlAction: "pause",
      controlProgress: 45,
      controlState: "progress",
      metaText: "上传中",
    });

    expect(
      fileMessageCardState({
        status: "uploading",
        phase: "uploading_media",
        taskId: "task-1",
      }),
    ).toMatchObject({
      controlAction: "pause",
      controlProgress: 0,
      controlState: "progress",
      metaText: "上传中",
    });

    expect(fileMessageCardState({ status: "paused", progress: 60, taskId: "task-1" })).toMatchObject({
      controlAction: "resume",
      controlProgress: 60,
      controlState: "paused",
      metaText: "已暂停",
    });

    expect(fileMessageCardState({ status: "paused", taskId: "task-1" })).toMatchObject({
      controlAction: "resume",
      controlProgress: 0,
      controlState: "paused",
      metaText: "已暂停",
    });

    expect(fileMessageCardState({ status: "failed", taskId: "task-1" })).toMatchObject({
      controlAction: "retry",
      controlState: "retry",
      metaText: "发送失败，点击重试",
    });

    expect(fileMessageCardState({ status: "sending", progress: 100, taskId: "task-1" })).toMatchObject({
      controlProgress: 95,
      controlState: "progress",
      metaText: "发送中",
    });

    expect(fileMessageCardState({ status: "sent" })).toEqual({ controlState: "none" });
  });
});
