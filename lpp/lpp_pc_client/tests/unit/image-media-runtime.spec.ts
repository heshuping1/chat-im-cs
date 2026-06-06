import { describe, expect, it } from "vitest";

import {
  imageMediaCacheKey,
  mediaStableCacheIdentity,
} from "../../src/renderer/data/im-message-normalize";
import { isInstantLocalImageSource } from "../../src/renderer/media/runtime/useCachedImageMediaUrl";

describe("image media runtime", () => {
  it("treats native local image urls as immediately displayable", () => {
    expect(isInstantLocalImageSource("blob:lpp-local-image")).toBe(true);
    expect(isInstantLocalImageSource("data:image/png;base64,AA==")).toBe(true);
    expect(isInstantLocalImageSource("file:///Users/me/Pictures/photo.png")).toBe(true);
  });

  it("keeps remote image urls on the cached loading path", () => {
    expect(isInstantLocalImageSource("https://assets.example/photo.png")).toBe(false);
    expect(isInstantLocalImageSource("/media/photo.png")).toBe(false);
    expect(isInstantLocalImageSource(undefined)).toBe(false);
  });

  it("normalizes signed media urls to the same image cache key", () => {
    expect(imageMediaCacheKey(undefined, "/media/019e-image-id?sig=first")).toBe(
      "image:media:019e-image-id",
    );
    expect(
      imageMediaCacheKey(
        undefined,
        "https://cdn.example/media/019e-image-id?sig=second#view",
      ),
    ).toBe("image:media:019e-image-id");
  });

  it("prefers explicit media identity fields over signed urls", () => {
    expect(
      mediaStableCacheIdentity(
        {
          mediaId: "server-media-id",
          url: "/media/url-media-id?sig=temporary",
        },
        "/media/url-media-id?sig=temporary",
      ),
    ).toBe("server-media-id");
    expect(imageMediaCacheKey({ relativePath: "tenant/a/photo.png" }, "/media/other")).toBe(
      "image:tenant/a/photo.png",
    );
  });
});
