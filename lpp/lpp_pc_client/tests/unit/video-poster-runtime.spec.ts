import { describe, expect, it } from "vitest";
import {
  resolveVideoPosterSource,
  videoPosterCaptureTime,
  videoPosterFileName,
} from "../../src/renderer/media/runtime/videoPosterRuntime";
import { withVideoPosterMedia } from "../../src/renderer/media/runtime/videoPosterMedia";

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
});
