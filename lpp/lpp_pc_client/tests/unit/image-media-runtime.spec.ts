import { describe, expect, it } from "vitest";

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
});
