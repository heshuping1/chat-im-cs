import { describe, expect, it } from "vitest";
import {
  messageMediaActionPayload,
  messageMediaFileName,
  messageVideoPlayerPayload,
  normalizeMediaPart,
  resolveMessageMediaUrl,
} from "../../src/renderer/media/domain/mediaMessage";
import type { NormalizedMessagePart } from "../../src/renderer/data/im-message-normalize";
import type { MediaResourceDto } from "../../src/renderer/data/api/types";

describe("normalizeMediaPart", () => {
  it("keeps image source and cache key decisions in one media model", () => {
    const part: NormalizedMessagePart = {
      type: "image",
      media: {
        fileName: "photo.jpg",
        thumbnailUrl: "/thumbs/photo.jpg",
        url: "/files/photo.jpg",
      },
    };

    expect(normalizeMediaPart({ assetBaseUrl: "https://assets.example", part })).toMatchObject({
      kind: "image",
      fileName: "photo.jpg",
      sourceUrl: "https://assets.example/thumbs/photo.jpg",
      imageCacheKey: "image:https://assets.example/thumbs/photo.jpg",
    });
  });

  it("uses local video preview while preserving the remote source for player/cache actions", () => {
    const part: NormalizedMessagePart = {
      type: "video",
      media: {
        fileName: "clip.mp4",
        url: "/files/clip.mp4",
        thumbnailUrl: "/covers/clip.jpg",
        localPreviewUrl: "blob:local-video",
        localPosterUrl: "blob:local-poster",
      } as MediaResourceDto & { localPreviewUrl: string; localPosterUrl: string },
    };

    expect(normalizeMediaPart({ assetBaseUrl: "https://assets.example", part })).toMatchObject({
      kind: "video",
      fileName: "clip.mp4",
      sourceUrl: "blob:local-video",
      remoteSourceUrl: "https://assets.example/files/clip.mp4",
      posterUrl: "blob:local-poster",
    });
  });

  it("falls back to the message preview only for file cards", () => {
    const part: NormalizedMessagePart = {
      type: "file",
      media: { url: "/download" },
    };

    expect(
      normalizeMediaPart({
        assetBaseUrl: "https://assets.example",
        fallback: "README.md",
        part,
      }),
    ).toMatchObject({
      kind: "file",
      fileName: "README.md",
      sourceUrl: "https://assets.example/download",
    });
  });
});

describe("message media action model", () => {
  it("builds one desktop action payload from a message", () => {
    const message = {
      messageId: "m1",
      conversationId: "c1",
      messageType: "file",
      body: {
        file: {
          url: "/download/report.xlsx",
          fileName: "report.xlsx",
          sizeBytes: 1200,
        },
      },
    } as never;

    expect(messageMediaFileName(message)).toBe("report.xlsx");
    expect(resolveMessageMediaUrl(message, "https://assets.example")).toBe(
      "https://assets.example/download/report.xlsx",
    );
    expect(
      messageMediaActionPayload({
        message,
        url: "https://assets.example/download/report.xlsx",
        authToken: "token",
        cacheContext: { accountId: "u1", conversationId: "c1" },
      }),
    ).toEqual({
      url: "https://assets.example/download/report.xlsx",
      fileName: "report.xlsx",
      kind: "file",
      authToken: "token",
      accountId: "u1",
      conversationId: "c1",
    });
  });

  it("keeps video player metadata in the same media action model", () => {
    const message = {
      messageId: "m2",
      conversationId: "c1",
      messageType: "video",
      body: {
        video: {
          url: "/video/clip.mp4",
          fileName: "clip.mp4",
          thumbnailUrl: "/covers/clip.jpg",
          width: 720,
          height: 1280,
          durationSeconds: 18,
          sizeBytes: 3456,
        },
      },
    } as never;

    expect(
      messageVideoPlayerPayload({
        message,
        url: "https://assets.example/video/clip.mp4",
        cacheContext: { accountId: "u1", conversationId: "c1" },
      }),
    ).toMatchObject({
      url: "https://assets.example/video/clip.mp4",
      fileName: "clip.mp4",
      kind: "video",
      accountId: "u1",
      conversationId: "c1",
      posterUrl: "/covers/clip.jpg",
      width: 720,
      height: 1280,
      durationSeconds: 18,
      sizeBytes: 3456,
      title: "clip.mp4",
    });
  });
});
