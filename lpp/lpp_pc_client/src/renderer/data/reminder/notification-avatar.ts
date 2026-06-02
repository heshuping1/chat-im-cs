import { getCachedAvatar, refreshCachedAvatar } from "../../lib/avatarCache";

const notificationIconTimeoutMs = 1_200;
const maxNotificationIconDataUrlLength = 512 * 1024;

export async function resolveNotificationIconDataUrl({
  token,
  url,
}: {
  token?: string | null;
  url?: string | null;
}) {
  const normalizedUrl = url?.trim();
  if (!normalizedUrl) return undefined;
  if (/^data:image\//i.test(normalizedUrl)) {
    return normalizedUrl.length <= maxNotificationIconDataUrlLength ? normalizedUrl : undefined;
  }
  if (/^blob:/i.test(normalizedUrl)) return undefined;

  return withTimeout(
    (async () => {
      const cached = await getCachedAvatar(normalizedUrl).catch(() => null);
      const blob = cached?.size
        ? cached
        : await refreshCachedAvatar({ token, url: normalizedUrl }).catch(() => null);
      if (!blob?.size || !blob.type.startsWith("image/")) return undefined;
      const dataUrl = await blobToDataUrl(blob);
      return dataUrl.length <= maxNotificationIconDataUrlLength ? dataUrl : undefined;
    })(),
    notificationIconTimeoutMs,
  );
}

async function blobToDataUrl(blob: Blob) {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  let binary = "";
  const chunkSize = 0x8000;
  for (let index = 0; index < bytes.length; index += chunkSize) {
    const chunk = bytes.subarray(index, index + chunkSize);
    binary += String.fromCharCode(...chunk);
  }
  return `data:${blob.type || "image/png"};base64,${btoa(binary)}`;
}

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number) {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<undefined>((resolve) => {
        timeoutId = setTimeout(() => resolve(undefined), timeoutMs);
      }),
    ]);
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
}
