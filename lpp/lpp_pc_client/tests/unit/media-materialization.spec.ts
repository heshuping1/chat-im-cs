import { beforeEach, describe, expect, it, vi } from "vitest";
import type { MessageItemDto } from "../../src/renderer/data/api/types";
import {
  forgetPrefetchedImageFileUrl,
  getPrefetchedImageFileUrl,
} from "../../src/renderer/media/runtime/imagePrecache";
import {
  materializeReceivedImageMessage,
  selectImageMaterializationCandidates,
} from "../../src/renderer/media/runtime/imageMaterialization";

function imageMessage(body: Record<string, unknown>, messageId = "image-1"): MessageItemDto {
  return {
    body,
    conversationId: "direct-1",
    messageId,
    messageType: "image",
  };
}

describe("image media materialization", () => {
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
        },
        localStorage: {
          getItem: vi.fn().mockReturnValue(null),
          setItem: vi.fn(),
        },
      },
    });
    forgetPrefetchedImageFileUrl("image:media:media-1");
  });

  it("selects stable image materialization candidates independent of signed url query", () => {
    const candidates = selectImageMaterializationCandidates(
      [
        imageMessage(
          { image: { fileName: "first.png", signedUrl: "/media/media-1?sig=first" } },
          "first",
        ),
        imageMessage(
          {
            image: {
              fileName: "second.png",
              signedUrl: "https://cdn.example/media/media-1?sig=second",
            },
          },
          "second",
        ),
      ],
      "https://api.example.test",
    );

    expect(candidates).toHaveLength(2);
    expect(candidates.map((candidate) => candidate.cacheKey)).toEqual([
      "image:media:media-1",
      "image:media:media-1",
    ]);
    expect(candidates.map((candidate) => candidate.cacheIdentity)).toEqual([
      "media:media-1",
      "media:media-1",
    ]);
  });

  it("materializes a received image message to the desktop disk cache before UI render", async () => {
    await materializeReceivedImageMessage({
      accountId: "staff-1",
      assetBaseUrl: "https://api.example.test",
      authToken: "tenant-token",
      conversationId: "direct-1",
      message: imageMessage({
        image: {
          fileName: "photo.png",
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
      url: "https://api.example.test/media/media-1?sig=one",
    });
    expect(getPrefetchedImageFileUrl("image:media:media-1")).toBe(
      "file:///cache/images/media-1.png",
    );
  });

  it("does not refetch an image that has already been materialized by stable identity", async () => {
    await materializeReceivedImageMessage({
      accountId: "staff-1",
      assetBaseUrl: "https://api.example.test",
      authToken: "tenant-token",
      conversationId: "direct-1",
      message: imageMessage({
        image: {
          fileName: "photo.png",
          signedUrl: "/media/media-1?sig=one",
        },
      }),
    });
    await materializeReceivedImageMessage({
      accountId: "staff-1",
      assetBaseUrl: "https://api.example.test",
      authToken: "tenant-token",
      conversationId: "direct-1",
      message: imageMessage({
        image: {
          fileName: "photo.png",
          signedUrl: "/media/media-1?sig=two",
        },
      }, "image-2"),
    });

    expect(window.desktopApi?.cacheMediaFile).toHaveBeenCalledTimes(1);
  });
});
