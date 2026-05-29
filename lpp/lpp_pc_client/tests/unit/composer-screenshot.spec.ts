import { describe, expect, it } from "vitest";
import {
  isScreenshotCancelError,
  matchesScreenshotShortcut,
  screenshotDataUrlToFile,
} from "../../src/renderer/composer/runtime/composerScreenshot";

function keyEvent(
  key: string,
  modifiers: Partial<Pick<KeyboardEvent, "altKey" | "ctrlKey" | "metaKey" | "shiftKey">> = {},
) {
  return {
    altKey: false,
    ctrlKey: false,
    key,
    metaKey: false,
    shiftKey: false,
    ...modifiers,
  };
}

describe("composer screenshot runtime", () => {
  it("matches configured screenshot shortcuts exactly", () => {
    expect(matchesScreenshotShortcut(keyEvent("a", { altKey: true }), "Alt+A")).toBe(true);
    expect(matchesScreenshotShortcut(keyEvent("a", { altKey: true, ctrlKey: true }), "Alt+A")).toBe(
      false,
    );
    expect(matchesScreenshotShortcut(keyEvent("A", { altKey: true, ctrlKey: true }), "Ctrl+Alt+A")).toBe(
      true,
    );
    expect(matchesScreenshotShortcut(keyEvent("a", { ctrlKey: true, shiftKey: true }), "Ctrl+Shift+A")).toBe(
      true,
    );
    expect(matchesScreenshotShortcut(keyEvent("a", { altKey: true }), "None")).toBe(false);
  });

  it("recognizes cancellation errors without showing user-facing noise", () => {
    expect(isScreenshotCancelError("Error: Screenshot canceled")).toBe(true);
    expect(isScreenshotCancelError("已取消截图")).toBe(true);
    expect(isScreenshotCancelError("network error")).toBe(false);
  });

  it("converts screenshot data URLs to files", async () => {
    const file = screenshotDataUrlToFile("data:image/png;base64,aGVsbG8=", "截图.png");

    expect(file.name).toBe("截图.png");
    expect(file.type).toBe("image/png");
    await expect(file.text()).resolves.toBe("hello");
  });
});
