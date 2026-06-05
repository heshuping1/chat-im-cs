import {
  formatScreenshotCaptureError,
  isScreenshotCancelError,
  screenshotDataUrlToFile,
} from "../../composer/runtime/composerScreenshot";

export async function captureScreenshotFile() {
  if (!window.desktopApi?.captureScreenshot) {
    throw new Error("Screenshot is only available in the Electron client.");
  }
  try {
    const result = await window.desktopApi.captureScreenshot();
    return screenshotDataUrlToFile(result.dataUrl, result.fileName || "screenshot.png");
  } catch (error) {
    const normalizedError = new Error(formatScreenshotCaptureError(error));
    (normalizedError as Error & { cause?: unknown }).cause = error;
    throw normalizedError;
  }
}

export function isCaptureScreenshotCancelError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  return isScreenshotCancelError(message);
}
