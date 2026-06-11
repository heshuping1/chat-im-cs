import { beforeEach, describe, expect, it, vi } from "vitest";
import type { MessageItemDto } from "../../src/renderer/data/api/types";
import {
  forgetPrefetchedImageFileUrl,
  getPrefetchedImageFileUrl,
} from "../../src/renderer/media/runtime/imagePrecache";
import {
  ensureMaterializedMediaDisplayUrl,
  getMaterializedMediaDisplayUrl,
  getMaterializedMediaFileUrl,
  materializeReceivedMediaMessage,
  mediaMaterializationCacheKey,
  registerSentMediaMaterialization,
  selectMediaMaterializationCandidates,
} from "../../src/renderer/media/runtime/mediaMaterialization";

function mediaMessage(
  kind: "image" | "video" | "file",
  body: Record<string, unknown>,
  messageId = `${kind}-1`,
): MessageItemDto {
  return {
    body,
    conversationId: "direct-1",
    messageId,
    messageType: kind,
  };
}

describe("media materialization", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.defineProperty(globalThis, "window", {
      configurable: true,
      value: {
        desktopApi: {
          cacheMediaFile: vi.fn().mockResolvedValue({
            filePath: "/cache/images/media-1.png",
            fileUrl: "file:///cache/images/media-1.png",
          }),
          localDataGetMediaVariant: vi.fn().mockResolvedValue(null),
          localDataUpsertMedia: vi.fn().mockResolvedValue(undefined),
          readMediaFileAsDataUrl: vi.fn().mockResolvedValue(
            "data:image/png;base64,aW1hZ2U=",
          ),
        },
        localStorage: {
          getItem: vi.fn().mockReturnValue(null),
          setItem: vi.fn(),
        },
      },
    });
    forgetPrefetchedImageFileUrl("image:media:media-1");
    forgetPrefetchedImageFileUrl("video:media:media-1");
    forgetPrefetchedImageFileUrl("file:media:media-1");
  });

  it("selects stable media materialization candidates independent of signed url query", () => {
    const candidates = selectMediaMaterializationCandidates(
      [
        mediaMessage(
          "image",
          {
            image: {
              fileName: "first.png",
              mediaId: "media-1",
              signedUrl: "/media/media-1?sig=first",
            },
          },
          "first",
        ),
        mediaMessage(
          "video",
          {
            video: {
              fileName: "second.mp4",
              mediaId: "media-1",
              signedUrl: "https://cdn.example/media/media-1?sig=second",
            },
          },
          "second",
        ),
        mediaMessage(
          "file",
          {
            file: {
              fileName: "third.zip",
              mediaId: "media-1",
              signedUrl: "/media/media-1?sig=third",
            },
          },
          "third",
        ),
      ],
      "https://api.example.test",
    );

    expect(candidates).toHaveLength(3);
    expect(candidates.map((candidate) => candidate.cacheKey)).toEqual([
      "image:media:media-1",
      "video:media:media-1",
      "file:media:media-1",
    ]);
    expect(candidates.map((candidate) => candidate.cacheIdentity)).toEqual([
      "media:media-1",
      "media:media-1",
      "media:media-1",
    ]);
    expect(candidates.map((candidate) => candidate.kind)).toEqual([
      "image",
      "video",
      "file",
    ]);
    expect(candidates.map((candidate) => candidate.url)).toEqual([
      "https://api.example.test/media/media-1",
      "https://api.example.test/media/media-1",
      "https://api.example.test/media/media-1",
    ]);
  });

  it("builds a stable cache key from media identity even when no remote url is present yet", () => {
    expect(mediaMaterializationCacheKey("image", { mediaId: "media-1" }, undefined)).toBe(
      "image:media:media-1",
    );
    expect(mediaMaterializationCacheKey("video", { mediaId: "media-1" }, undefined)).toBe(
      "video:media:media-1",
    );
    expect(mediaMaterializationCacheKey("file", { mediaId: "media-1" }, undefined)).toBe(
      "file:media:media-1",
    );
  });

  it("materializes a received image message to the desktop disk cache before UI render", async () => {
    await materializeReceivedMediaMessage({
      accountId: "staff-1",
      assetBaseUrl: "https://api.example.test",
      authToken: "tenant-token",
      conversationId: "direct-1",
      message: mediaMessage("image", {
        image: {
          fileName: "photo.png",
          mediaId: "media-1",
          signedUrl: "/media/media-1?sig=one",
        },
      }),
    });

    expect(window.desktopApi?.cacheMediaFile).toHaveBeenCalledWith({
      accountId: "staff-1",
      authToken: "tenant-token",
      cacheIdentity: "media:media-1",
      conversationId: "direct-1",
      fileName: "photo.png",
      kind: "image",
      url: "https://api.example.test/media/media-1",
    });
    expect(getPrefetchedImageFileUrl("image:media:media-1")).toBe(
      "file:///cache/images/media-1.png",
    );
    expect(getMaterializedMediaFileUrl("image:media:media-1")).toBe(
      "file:///cache/images/media-1.png",
    );
    expect(window.desktopApi?.localDataUpsertMedia).toHaveBeenCalledWith(
      expect.objectContaining({
        asset: expect.objectContaining({
          kind: "image",
          mediaIdentity: "media:media-1",
        }),
        messageRefs: [
          {
            mediaIdentity: "media:media-1",
            messageId: "image-1",
            refKind: "image",
          },
        ],
      }),
    );
  });

  it("links received messages to an existing local media variant without refetching", async () => {
    vi.mocked(window.desktopApi?.localDataGetMediaVariant).mockResolvedValueOnce({
      fileUrl: "file:///cache/images/existing.png",
      mediaIdentity: "media:media-1",
      status: "cached",
      updatedAt: Date.now(),
      variantKind: "original",
    });

    await materializeReceivedMediaMessage({
      accountId: "staff-1",
      assetBaseUrl: "https://api.example.test",
      authToken: "tenant-token",
      conversationId: "direct-1",
      message: mediaMessage("image", {
        image: {
          fileName: "photo.png",
          mediaId: "media-1",
          signedUrl: "/media/media-1?sig=cached",
        },
      }, "image-cached"),
    });

    expect(window.desktopApi?.cacheMediaFile).not.toHaveBeenCalled();
    expect(getMaterializedMediaFileUrl("image:media:media-1")).toBe(
      "file:///cache/images/existing.png",
    );
    expect(window.desktopApi?.localDataUpsertMedia).toHaveBeenCalledWith(
      expect.objectContaining({
        messageRefs: [
          {
            mediaIdentity: "media:media-1",
            messageId: "image-cached",
            refKind: "image",
          },
        ],
      }),
    );
  });

  it("converts local materialized image files to renderer-safe display urls", async () => {
    const displayUrl = await ensureMaterializedMediaDisplayUrl({
      accountId: "staff-1",
      authToken: "tenant-token",
      cacheIdentity: "media:media-1",
      cacheKey: "image:media:media-1",
      conversationId: "direct-1",
      fileName: "photo.png",
      fileUrl: "file:///cache/images/media-1.png",
      kind: "image",
    });

    expect(window.desktopApi?.readMediaFileAsDataUrl).toHaveBeenCalledWith({
      accountId: "staff-1",
      authToken: "tenant-token",
      cacheIdentity: "media:media-1",
      conversationId: "direct-1",
      fileName: "photo.png",
      kind: "image",
      url: "file:///cache/images/media-1.png",
    });
    expect(displayUrl).toBe("data:image/png;base64,aW1hZ2U=");
    expect(getMaterializedMediaDisplayUrl("image:media:media-1")).toBe(
      "data:image/png;base64,aW1hZ2U=",
    );
  });

  it("can force authenticated remote poster urls through desktop display materialization", async () => {
    const displayUrl = await ensureMaterializedMediaDisplayUrl({
      accountId: "staff-1",
      authToken: "tenant-token",
      cacheIdentity: "video-poster:media:media-1",
      cacheKey: "video-poster:media:media-1",
      conversationId: "direct-1",
      fileName: "clip-poster.jpg",
      fileUrl: "https://cdn.example.test/media/poster.jpg?sig=one",
      kind: "image",
      preferDesktopRead: true,
    });

    expect(window.desktopApi?.readMediaFileAsDataUrl).toHaveBeenCalledWith({
      accountId: "staff-1",
      authToken: "tenant-token",
      cacheIdentity: "video-poster:media:media-1",
      conversationId: "direct-1",
      fileName: "clip-poster.jpg",
      kind: "image",
      url: "https://cdn.example.test/media/poster.jpg?sig=one",
    });
    expect(displayUrl).toBe("data:image/png;base64,aW1hZ2U=");
  });

  it("throttles expired signed media display urls instead of repeatedly reading them", async () => {
    vi.mocked(window.desktopApi?.readMediaFileAsDataUrl).mockRejectedValueOnce(
      new Error("MEDIA_SIGNATURE_EXPIRED"),
    );

    const payload = {
      accountId: "staff-1",
      authToken: "tenant-token",
      cacheIdentity: "video-poster:expired-media",
      cacheKey: "video-poster:expired-media",
      conversationId: "direct-1",
      fileName: "expired-poster.jpg",
      fileUrl: "https://cdn.example.test/media/expired-poster.jpg?sig=expired",
      kind: "image" as const,
      preferDesktopRead: true,
    };

    await expect(ensureMaterializedMediaDisplayUrl(payload)).resolves.toBeUndefined();
    await expect(ensureMaterializedMediaDisplayUrl(payload)).resolves.toBeUndefined();

    expect(window.desktopApi?.readMediaFileAsDataUrl).toHaveBeenCalledTimes(1);
    expect(getMaterializedMediaDisplayUrl("video-poster:expired-media")).toBeUndefined();
  });

  it("materializes received video and file messages before UI render", async () => {
    await materializeReceivedMediaMessage({
      accountId: "staff-1",
      assetBaseUrl: "https://api.example.test",
      authToken: "tenant-token",
      conversationId: "direct-1",
      message: mediaMessage("video", {
        video: {
          fileName: "clip.mp4",
          mediaId: "media-1",
          signedUrl: "/media/media-1?sig=video",
        },
      }),
    });
    await materializeReceivedMediaMessage({
      accountId: "staff-1",
      assetBaseUrl: "https://api.example.test",
      authToken: "tenant-token",
      conversationId: "direct-1",
      message: mediaMessage("file", {
        file: {
          fileName: "archive.zip",
          mediaId: "media-1",
          signedUrl: "/media/media-1?sig=file",
        },
      }),
    });

    expect(window.desktopApi?.cacheMediaFile).toHaveBeenNthCalledWith(1, {
      accountId: "staff-1",
      authToken: "tenant-token",
      cacheIdentity: "media:media-1",
      conversationId: "direct-1",
      fileName: "clip.mp4",
      kind: "video",
      url: "https://api.example.test/media/media-1",
    });
    expect(window.desktopApi?.cacheMediaFile).toHaveBeenNthCalledWith(2, {
      accountId: "staff-1",
      authToken: "tenant-token",
      cacheIdentity: "media:media-1",
      conversationId: "direct-1",
      fileName: "archive.zip",
      kind: "file",
      url: "https://api.example.test/media/media-1",
    });
    expect(getMaterializedMediaFileUrl("video:media:media-1")).toBe(
      "file:///cache/images/media-1.png",
    );
    expect(getMaterializedMediaFileUrl("file:media:media-1")).toBe(
      "file:///cache/images/media-1.png",
    );
  });

  it("does not refetch media that has already been materialized by stable identity", async () => {
    await materializeReceivedMediaMessage({
      accountId: "staff-1",
      assetBaseUrl: "https://api.example.test",
      authToken: "tenant-token",
      conversationId: "direct-1",
      message: mediaMessage("video", {
        video: {
          fileName: "clip.mp4",
          mediaId: "media-1",
          signedUrl: "/media/media-1?sig=one",
        },
      }),
    });
    await materializeReceivedMediaMessage({
      accountId: "staff-1",
      assetBaseUrl: "https://api.example.test",
      authToken: "tenant-token",
      conversationId: "direct-1",
      message: mediaMessage("video", {
        video: {
          fileName: "clip.mp4",
          mediaId: "media-1",
          signedUrl: "/media/media-1?sig=two",
        },
      }, "video-2"),
    });

    expect(window.desktopApi?.cacheMediaFile).toHaveBeenCalledTimes(1);
  });

  it("registers sent media local files into the same materialized index", () => {
    registerSentMediaMaterialization("image", { mediaId: "media-1" }, "file:///cache/sent.png", "msg-image");
    registerSentMediaMaterialization("video", { mediaId: "media-1" }, "file:///cache/sent.mp4");
    registerSentMediaMaterialization("file", { mediaId: "media-1" }, "file:///cache/sent.zip");

    expect(getMaterializedMediaFileUrl("image:media:media-1")).toBe("file:///cache/sent.png");
    expect(getMaterializedMediaFileUrl("video:media:media-1")).toBe("file:///cache/sent.mp4");
    expect(getMaterializedMediaFileUrl("file:media:media-1")).toBe("file:///cache/sent.zip");
    expect(window.desktopApi?.localDataUpsertMedia).toHaveBeenCalledWith(
      expect.objectContaining({
        messageRefs: [
          {
            mediaIdentity: "media:media-1",
            messageId: "msg-image",
            refKind: "image",
          },
        ],
      }),
    );
  });
});
