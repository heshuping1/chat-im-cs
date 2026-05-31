import { describe, expect, it } from "vitest";

import {
  formatScreenshotCaptureError,
  normalizeScreenshotCaptureError,
  screenshotPermissionErrorMessage,
  selectScreenshotSource,
} from "../../src/main/screenshot-capture";

function source(
  id: string,
  displayId: string,
  empty = false,
) {
  return {
    id,
    display_id: displayId,
    thumbnail: {
      isEmpty: () => empty,
      toDataURL: () => `data:image/png;base64,${id}`,
    },
  };
}

describe("screenshot capture runtime", () => {
  it("normalizes desktopCapturer source failures to a customer-readable permission error", () => {
    expect(
      normalizeScreenshotCaptureError(
        new Error("Failed to get sources"),
        "denied",
      ).message,
    ).toBe(screenshotPermissionErrorMessage);
    expect(
      normalizeScreenshotCaptureError(
        new Error("Failed to get sources"),
        "granted",
      ).message,
    ).toBe(screenshotPermissionErrorMessage);
  });

  it("normalizes empty source states without exposing electron internals", () => {
    expect(normalizeScreenshotCaptureError(new Error("no sources")).message).toBe(
      screenshotPermissionErrorMessage,
    );
    expect(normalizeScreenshotCaptureError(new Error("empty thumbnail")).message).toBe(
      screenshotPermissionErrorMessage,
    );
  });

  it("selects the current display and falls back to the first source", () => {
    const sources = [source("first", "2"), source("current", "7")];
    expect(selectScreenshotSource(sources, { id: 7 })).toBe(sources[1]);
    expect(selectScreenshotSource(sources, { id: 99 })).toBe(sources[0]);
  });

  it("cleans renderer ipc wrappers while preserving cancel semantics", () => {
    expect(
      formatScreenshotCaptureError(
        new Error(
          "Error invoking remote method 'desktop:capture-screenshot': Failed to get sources.",
        ),
      ),
    ).toBe(screenshotPermissionErrorMessage);
    expect(
      formatScreenshotCaptureError(
        new Error("Error invoking remote method 'desktop:capture-screenshot': 已取消截图"),
      ),
    ).toBe("已取消截图");
  });
});
