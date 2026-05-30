import {
  isScreenshotCancelError,
  screenshotDataUrlToFile,
} from "../../composer/runtime/composerScreenshot";

export async function captureScreenshotFile() {
  if (!window.desktopApi?.captureScreenshot) {
    throw new Error("截图仅在 Electron 客户端可用。");
  }
  const result = await window.desktopApi.captureScreenshot();
  return screenshotDataUrlToFile(result.dataUrl, result.fileName || "截图.png");
}

export function isCaptureScreenshotCancelError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  return isScreenshotCancelError(message);
}
