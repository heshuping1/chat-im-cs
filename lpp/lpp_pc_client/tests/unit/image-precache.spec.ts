import { describe, expect, it } from "vitest";
import type { MessageItemDto } from "../../src/renderer/data/api/types";
import {
  forgetPrefetchedImageFileUrl,
  getPrefetchedImageFileUrl,
  selectImagePrecacheCandidates,
} from "../../src/renderer/media/runtime/imagePrecache";

function message(
  messageType: string,
  body: Record<string, unknown>,
  messageId = Math.random().toString(16).slice(2),
): MessageItemDto {
  return {
    body,
    messageId,
    messageType,
  };
}

describe("selectImagePrecacheCandidates", () => {
  it("selects only real remote image urls and skips native/local sources", () => {
    const candidates = selectImagePrecacheCandidates(
      [
        message("image", { image: { fileName: "a.png", url: "/a.png" } }, "relative"),
        message("image", { image: { fileName: "b.png", url: "blob:local" } }, "blob"),
        message("file", { file: { fileName: "c.png", url: "https://assets.example/c.png" } }, "file"),
        message("image", { image: { fileName: "d.png", url: "https://assets.example/d.png" } }, "remote"),
      ],
      "https://assets.example",
    );

    expect(candidates).toEqual([
      {
        cacheIdentity: expect.stringMatching(/^url:[a-f0-9]{40}$/),
        cacheKey: expect.stringMatching(/^image:url:[a-f0-9]{40}$/),
        fileName: "a.png",
        url: "https://assets.example/a.png",
      },
      {
        cacheIdentity: expect.stringMatching(/^url:[a-f0-9]{40}$/),
        cacheKey: expect.stringMatching(/^image:url:[a-f0-9]{40}$/),
        fileName: "d.png",
        url: "https://assets.example/d.png",
      },
    ]);
  });

  it("prefers signed image urls for protected media precache", () => {
    const candidates = selectImagePrecacheCandidates(
      [
        message(
          "image",
          {
            image: {
              fileName: "signed.png",
              signedUrl: "/media/signed-photo?sig=ok",
              thumbnailUrl: "/media/signed-photo-thumb",
              url: "/media/signed-photo",
            },
          },
          "signed",
        ),
      ],
      "https://assets.example",
    );

    expect(candidates).toEqual([
      {
        cacheIdentity: "media:signed-photo",
        cacheKey: "image:media:signed-photo",
        fileName: "signed.png",
        url: "https://assets.example/media/signed-photo?sig=ok",
      },
    ]);
  });

  it("uses stable media identity for signed media urls", () => {
    const candidates = selectImagePrecacheCandidates(
      [
        message(
          "image",
          { image: { fileName: "first.png", signedUrl: "/media/019e-image-id?sig=first" } },
          "first",
        ),
        message(
          "image",
          {
            image: {
              fileName: "second.png",
              signedUrl: "https://cdn.example/media/019e-image-id?sig=second#view",
            },
          },
          "second",
        ),
      ],
      "https://assets.example",
    );

    expect(candidates.map((candidate) => candidate.cacheKey)).toEqual([
      "image:media:019e-image-id",
      "image:media:019e-image-id",
    ]);
    expect(candidates.map((candidate) => candidate.cacheIdentity)).toEqual([
      "media:019e-image-id",
      "media:019e-image-id",
    ]);
  });

  it("restores prefetched local image file urls from persistent storage", () => {
    const store = new Map<string, string>();
    Object.defineProperty(globalThis, "window", {
      configurable: true,
      value: {
        localStorage: {
          getItem: (key: string) => store.get(key) ?? null,
          setItem: (key: string, value: string) => {
            store.set(key, value);
          },
        },
      },
    });
    window.localStorage.setItem(
      "lpp-pc-prefetched-image-files",
      JSON.stringify([["image:/media/persisted", "file:///app-cache/persisted.png"]]),
    );

    expect(getPrefetchedImageFileUrl("image:/media/persisted")).toBe(
      "file:///app-cache/persisted.png",
    );

    forgetPrefetchedImageFileUrl("image:/media/persisted", "file:///app-cache/persisted.png");
    expect(getPrefetchedImageFileUrl("image:/media/persisted")).toBeUndefined();
  });

  it("keeps only the latest image candidates to control bandwidth", () => {
    const messages = Array.from({ length: 30 }, (_, index) =>
      message(
        "image",
        { image: { fileName: `${index}.png`, url: `https://assets.example/${index}.png` } },
        String(index),
      ),
    );

    const candidates = selectImagePrecacheCandidates(messages);

    expect(candidates).toHaveLength(24);
    expect(candidates[0].fileName).toBe("6.png");
    expect(candidates.at(-1)?.fileName).toBe("29.png");
  });
});
