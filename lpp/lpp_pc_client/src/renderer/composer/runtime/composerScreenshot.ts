export type ScreenshotShortcut = "Alt+A" | "Ctrl+Alt+A" | "Ctrl+Shift+A" | "None";

export function screenshotDataUrlToFile(dataUrl: string, fileName: string) {
  const [meta = "", data = ""] = dataUrl.split(",");
  const mime = /data:([^;]+);base64/i.exec(meta)?.[1] ?? "image/png";
  const binary = atob(data);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return new File([bytes], fileName, { type: mime });
}

export function matchesScreenshotShortcut(
  event: Pick<KeyboardEvent, "altKey" | "ctrlKey" | "key" | "metaKey" | "shiftKey">,
  shortcut: ScreenshotShortcut,
) {
  const key = event.key.toLowerCase();
  const ctrl = event.ctrlKey || event.metaKey;
  if (shortcut === "Alt+A") {
    return key === "a" && event.altKey && !ctrl && !event.shiftKey;
  }
  if (shortcut === "Ctrl+Alt+A") {
    return key === "a" && ctrl && event.altKey && !event.shiftKey;
  }
  if (shortcut === "Ctrl+Shift+A") {
    return key === "a" && ctrl && event.shiftKey && !event.altKey;
  }
  return false;
}

export function isScreenshotCancelError(message: string) {
  return /screenshot\s+cancell?ed|capture\s+cancell?ed|已取消截图|取消截图/i.test(message);
}

export function formatScreenshotCaptureError(error: unknown) {
  const raw = error instanceof Error ? error.message : String(error ?? "");
  const message = raw
    .replace(/^Error invoking remote method 'desktop:capture-screenshot':\s*/i, "")
    .trim();
  if (isScreenshotCancelError(message)) return "已取消截图";
  if (
    /failed to get sources|no sources|empty thumbnail|screen recording|screen sharing|permission|权限|屏幕录制|屏幕共享/i.test(
      message,
    )
  ) {
    return "截图失败：请在系统设置中允许 LPP 客服客户端录制屏幕后重试。";
  }
  return message || "截图失败：请在系统设置中允许 LPP 客服客户端录制屏幕后重试。";
}
