import { describe, expect, it } from "vitest";
import type { MessageItemDto } from "../../src/renderer/data/api/types";
import { selectImagePrecacheCandidates } from "../../src/renderer/media/runtime/imagePrecache";

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
        cacheKey: "image:https://assets.example/a.png",
        fileName: "a.png",
        url: "https://assets.example/a.png",
      },
      {
        cacheKey: "image:https://assets.example/d.png",
        fileName: "d.png",
        url: "https://assets.example/d.png",
      },
    ]);
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
