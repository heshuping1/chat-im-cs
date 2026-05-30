import { describe, expect, it, vi } from "vitest";
import {
  resolveVideoPosterSource,
  videoPosterCaptureTime,
  videoPosterFileName,
} from "../../src/renderer/media/runtime/videoPosterRuntime";
import {
  localMediaResourceForSend,
  requireVideoSendPayload,
  sanitizeVideoSendPayload,
  uploadVideoPosterForSend,
  withVideoPosterMedia,
} from "../../src/renderer/media/runtime/videoPosterMedia";

describe("videoPosterRuntime", () => {
  it("builds a stable local poster file name from the video file name", () => {
    expect(videoPosterFileName("clip.mp4")).toBe("clip-poster.jpg");
    expect(videoPosterFileName("archive.video.mov")).toBe("archive.video-poster.jpg");
    expect(videoPosterFileName(".mp4")).toBe("video-poster.jpg");
  });

  it("uses an early but non-zero capture time for chat preview posters", () => {
    expect(videoPosterCaptureTime(Number.NaN)).toBe(0.12);
    expect(videoPosterCaptureTime(1)).toBe(0.08);
    expect(videoPosterCaptureTime(18)).toBe(0.35);
  });

  it("resolves video poster priority in a stable WeChat-like order", () => {
    expect(
      resolveVideoPosterSource({
        explicitPoster: "server-cover.jpg",
        registeredPoster: "registered-cover.jpg",
        cachedPoster: "cached-cover.jpg",
        generatedPoster: "generated-cover.jpg",
      }),
    ).toEqual({ posterSrc: "server-cover.jpg", source: "explicit" });

    expect(
      resolveVideoPosterSource({
        registeredPoster: "registered-cover.jpg",
        cachedPoster: "cached-cover.jpg",
        generatedPoster: "generated-cover.jpg",
      }),
    ).toEqual({ posterSrc: "registered-cover.jpg", source: "registered" });

    expect(
      resolveVideoPosterSource({
        cachedPoster: "cached-cover.jpg",
        generatedPoster: "generated-cover.jpg",
      }),
    ).toEqual({ posterSrc: "cached-cover.jpg", source: "cached" });
  });

  it("uses the uploaded poster image url as the video thumbnail source", () => {
    const media = withVideoPosterMedia(
      {
        url: "video.mp4",
        thumbnailUrl: "video-upload-thumbnail-should-not-win.jpg",
      },
      {
        url: "blob:local-poster",
        file: new File(["poster"], "clip-poster.jpg", { type: "image/jpeg" }),
        width: 720,
        height: 1280,
        durationSeconds: 18,
      },
      {
        url: "https://cdn.example.com/poster.jpg",
        thumbnailUrl: "poster-upload-thumbnail-should-not-win.jpg",
      },
    );

    expect(media.thumbnailUrl).toBe("https://cdn.example.com/poster.jpg");
    expect(media.posterUrl).toBe("https://cdn.example.com/poster.jpg");
    expect(media.localPosterUrl).toBe("blob:local-poster");
    expect(media.width).toBe(720);
    expect(media.height).toBe(1280);
    expect(media.durationSeconds).toBe(18);
  });

  it("waits for a generated video poster before uploading the cover image", async () => {
    vi.useFakeTimers();
    const posterFile = new File(["poster"], "clip-poster.jpg", { type: "image/jpeg" });
    const uploadPoster = vi.fn(async () => ({ url: "https://cdn.example.com/poster.jpg" }));
    const resultPromise = uploadVideoPosterForSend({
      kind: "video",
      videoPosterPromise: new Promise((resolve) => {
        setTimeout(
          () =>
            resolve({
              file: posterFile,
              url: "blob:local-poster",
              dataUrl: "data:image/jpeg;base64,poster",
            }),
          1200,
        );
      }),
      uploadPoster,
    });

    await vi.advanceTimersByTimeAsync(1200);

    await expect(resultPromise).resolves.toEqual({
      videoPoster: {
        file: posterFile,
        url: "blob:local-poster",
        dataUrl: "data:image/jpeg;base64,poster",
      },
      uploadedPoster: { url: "https://cdn.example.com/poster.jpg" },
    });
    expect(uploadPoster).toHaveBeenCalledWith(posterFile);
    vi.useRealTimers();
  });

  it("does not upload a poster for non-video media", async () => {
    const uploadPoster = vi.fn(async () => ({ url: "https://cdn.example.com/poster.jpg" }));

    await expect(
      uploadVideoPosterForSend({
        kind: "image",
        uploadPoster,
      }),
    ).resolves.toEqual({});
    expect(uploadPoster).not.toHaveBeenCalled();
  });

  it("builds local video media with a poster before the optimistic message is shown", () => {
    const media = localMediaResourceForSend({
      file: new File(["video"], "clip.mp4", { type: "video/mp4" }),
      kind: "video",
      localPreviewUrl: "blob:local-video",
      videoPoster: {
        file: new File(["poster"], "clip-poster.jpg", { type: "image/jpeg" }),
        url: "blob:local-poster",
        dataUrl: "data:image/jpeg;base64,poster",
        width: 720.2,
        height: 1280.8,
        durationSeconds: 18.42,
      },
    });

    expect(media).toMatchObject({
      url: "blob:local-video",
      thumbnailUrl: "blob:local-poster",
      posterUrl: "blob:local-poster",
      localPosterUrl: "blob:local-poster",
      fileName: "clip.mp4",
      mimeType: "video/mp4",
      sizeBytes: 5,
      width: 720.2,
      height: 1280.8,
      durationSeconds: 18.42,
    });
  });

  it("sanitizes video send payload to keep server fields only", () => {
    expect(
      sanitizeVideoSendPayload({
        url: "https://cdn.example.com/video.mp4",
        thumbnailUrl: "https://cdn.example.com/poster.jpg",
        posterUrl: "https://cdn.example.com/poster.jpg",
        localPosterUrl: "blob:local-poster",
        localPreviewUrl: "blob:local-video",
        dataUrl: "data:video/mp4;base64,abc",
        fileName: "clip.mp4",
        originalFileName: "clip.mp4",
        mimeType: "video/mp4",
        sizeBytes: 123.4,
        width: 720.2,
        height: 1280.8,
        durationSeconds: 18.42,
      }),
    ).toEqual({
      url: "https://cdn.example.com/video.mp4",
      thumbnailUrl: "https://cdn.example.com/poster.jpg",
      fileName: "clip.mp4",
      mimeType: "video/mp4",
      sizeBytes: 123,
      width: 720,
      height: 1281,
      durationSeconds: 18,
    });
  });

  it("does not send local blob or data urls in the video payload", () => {
    expect(
      sanitizeVideoSendPayload({
        url: "blob:local-video",
        thumbnailUrl: "data:image/jpeg;base64,poster",
        fileName: "clip.mp4",
      }),
    ).toEqual({ fileName: "clip.mp4" });
  });

  it("requires remote video and poster urls before sending video messages", () => {
    expect(() =>
      requireVideoSendPayload({
        url: "https://cdn.example.com/video.mp4",
        thumbnailUrl: "blob:local-poster",
      }),
    ).toThrow("视频封面上传失败");
    expect(
      requireVideoSendPayload({
        url: "https://cdn.example.com/video.mp4",
        thumbnailUrl: "https://cdn.example.com/poster.jpg",
      }),
    ).toEqual({
      url: "https://cdn.example.com/video.mp4",
      thumbnailUrl: "https://cdn.example.com/poster.jpg",
    });
  });
});
