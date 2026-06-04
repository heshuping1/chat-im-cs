export type ScreenshotPermissionStatus =
  | "not-determined"
  | "granted"
  | "denied"
  | "restricted"
  | "unknown";

export interface ScreenshotDisplayLike {
  id: number | string;
  bounds: Electron.Rectangle;
  size: Electron.Size;
}

export interface ScreenshotSourceLike {
  display_id?: string;
  thumbnail: {
    isEmpty: () => boolean;
    toDataURL: () => string;
  };
}

export const screenshotPermissionErrorMessage =
  "截图失败：请在系统设置中允许 lppchat 录制屏幕后重试。";

export function selectScreenshotSource<T extends ScreenshotSourceLike>(
  sources: readonly T[],
  display: Pick<ScreenshotDisplayLike, "id">,
) {
  return (
    sources.find((source) => source.display_id === String(display.id)) ??
    sources[0]
  );
}

export function createScreenshotCapturePayload(
  source: ScreenshotSourceLike | undefined,
  display: ScreenshotDisplayLike,
) {
  if (!source) {
    throw new Error("no sources");
  }
  if (source.thumbnail.isEmpty()) {
    throw new Error("empty thumbnail");
  }
  return {
    dataUrl: source.thumbnail.toDataURL(),
    displayBounds: display.bounds,
    displaySize: display.size,
  };
}

export function normalizeScreenshotCaptureError(
  error: unknown,
  permissionStatus?: ScreenshotPermissionStatus,
) {
  const message = cleanScreenshotErrorMessage(error);
  if (isScreenshotCanceledMessage(message)) {
    return new Error("已取消截图");
  }
  if (
    message === screenshotPermissionErrorMessage ||
    permissionStatus === "denied" ||
    permissionStatus === "restricted" ||
    permissionStatus === "not-determined" ||
    isScreenshotSourceFailureMessage(message)
  ) {
    return new Error(screenshotPermissionErrorMessage);
  }
  return new Error(message || screenshotPermissionErrorMessage);
}

export function formatScreenshotCaptureError(error: unknown) {
  return normalizeScreenshotCaptureError(error).message;
}

function cleanScreenshotErrorMessage(error: unknown) {
  const raw = error instanceof Error ? error.message : String(error ?? "");
  return raw
    .replace(/^Error invoking remote method 'desktop:capture-screenshot':\s*/i, "")
    .trim();
}

function isScreenshotSourceFailureMessage(message: string) {
  return /failed to get sources|no sources|empty thumbnail|screen recording|screen sharing|permission|权限|屏幕录制|屏幕共享/i.test(
    message,
  );
}

function isScreenshotCanceledMessage(message: string) {
  return /screenshot\s+cancell?ed|capture\s+cancell?ed|已取消截图|取消截图/i.test(
    message,
  );
}
