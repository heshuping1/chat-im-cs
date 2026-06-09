import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

import {
  imageMediaCacheKey,
  mediaStableCacheIdentity,
} from "../../src/renderer/data/im-message-normalize";
import {
  clearImageObjectUrlHotCache,
  peekImageObjectUrl,
  rememberImageObjectUrl,
} from "../../src/renderer/media/runtime/imageObjectUrlHotCache";
import {
  getPrefetchedImageFileUrl,
  registerPrefetchedImageFileUrl,
} from "../../src/renderer/media/runtime/imagePrecache";
import { isInstantLocalImageSource } from "../../src/renderer/media/runtime/useCachedImageMediaUrl";
import { imageDisplayReady } from "../../src/renderer/media/runtime/useCachedImageMediaUrl";

describe("image media runtime", () => {
  const mediaCache = readFileSync(
    resolve(process.cwd(), "src/renderer/lib/mediaCache.ts"),
    "utf8",
  );

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

  it("does not let one failed signed image url block fallback urls for the same media", () => {
    expect(mediaCache).toContain("entry?.failedAt && entry.url === url");
    expect(mediaCache).not.toContain("entry?.failedAt && now - entry.failedAt < mediaRetryIntervalMs");
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

  it("keeps a loaded remote image object url available for the next mount", () => {
    clearImageObjectUrlHotCache();
    const blob = new Blob(["image"], { type: "image/png" });

    const firstUrl = rememberImageObjectUrl("image:media:photo-1", blob);

    expect(firstUrl).toBeTruthy();
    expect(peekImageObjectUrl("image:media:photo-1")).toBe(firstUrl);
  });

  it("treats already displayable local image urls as ready without waiting for another load event", () => {
    expect(
      imageDisplayReady({
        cached: false,
        hasUsableLocalFile: false,
        localImage: false,
        src: "blob:lpp-hot-image",
      }),
    ).toBe(true);
    expect(
      imageDisplayReady({
        cached: false,
        hasUsableLocalFile: false,
        localImage: false,
        src: "https://assets.example/protected.png",
      }),
    ).toBe(false);
  });

  it("registers lazily cached desktop image files for the next chat entry", () => {
    const fileUrl = "file:///Users/me/Library/Application%20Support/lppchat/LPP%20Files/a.png";

    registerPrefetchedImageFileUrl("image:media:lazy-photo", fileUrl);

    expect(getPrefetchedImageFileUrl("image:media:lazy-photo")).toBe(fileUrl);
  });
});
