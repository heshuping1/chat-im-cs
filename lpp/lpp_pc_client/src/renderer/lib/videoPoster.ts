export type VideoPosterResult = {
  file: File;
  url: string;
  dataUrl: string;
  durationSeconds?: number;
  width?: number;
  height?: number;
};

const mediaPosterRegistry = new Map<string, string>();

export async function createVideoPoster(file: File): Promise<VideoPosterResult | undefined> {
  if (!file.type.startsWith("video/")) return undefined;
  const objectUrl = URL.createObjectURL(file);
  try {
    return await capturePosterFromUrl(objectUrl, file.name);
  } catch {
    return undefined;
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

export function registerVideoPosterForMedia(
  media: Record<string, unknown> | undefined,
  posterUrl: string | undefined,
) {
  if (!posterUrl) return;
  videoPosterStrongKeys(media).forEach((key) => mediaPosterRegistry.set(key, posterUrl));
}

export function resolveRegisteredVideoPoster(media: Record<string, unknown> | undefined) {
  return videoPosterStrongKeys(media)
    .map((key) => mediaPosterRegistry.get(key))
    .find(Boolean);
}

function videoPosterStrongKeys(media: Record<string, unknown> | undefined) {
  if (!media) return [];
  const keys = new Set<string>();
  [
    media.id,
    media.mediaId,
    media.resourceId,
    media.fileId,
    media.objectKey,
    media.storageKey,
    media.url,
    media.resourceUrl,
    media.mediaUrl,
    media.objectUrl,
    media.downloadUrl,
    media.signedUrl,
    media.fileUrl,
    media.filePath,
    media.uri,
    media.path,
  ].forEach((value) => {
    if (typeof value === "string" && value.trim()) keys.add(`media:${value.trim()}`);
    if (typeof value === "number" && Number.isFinite(value)) keys.add(`media:${value}`);
  });
  return Array.from(keys);
}

function capturePosterFromUrl(src: string, fileName: string) {
  return new Promise<VideoPosterResult | undefined>((resolve) => {
    const video = document.createElement("video");
    let settled = false;
    const finish = (result?: VideoPosterResult) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timeout);
      video.removeAttribute("src");
      video.load();
      resolve(result);
    };
    const timeout = window.setTimeout(() => finish(), 3000);
    video.muted = true;
    video.playsInline = true;
    video.preload = "auto";
    video.addEventListener("error", () => finish(), { once: true });
    video.addEventListener(
      "loadedmetadata",
      () => {
        const targetTime = Number.isFinite(video.duration)
          ? Math.min(Math.max(video.duration * 0.02, 0.12), 0.5)
          : 0.18;
        try {
          video.currentTime = targetTime;
        } catch {
          void finishFromFrame(video, fileName).then(finish);
        }
      },
      { once: true },
    );
    video.addEventListener(
      "seeked",
      () => {
        void finishFromFrame(video, fileName).then(finish);
      },
      { once: true },
    );
    video.addEventListener(
      "loadeddata",
      () => {
        if (!Number.isFinite(video.duration) || video.duration <= 0.2) {
          void finishFromFrame(video, fileName).then(finish);
        }
      },
      { once: true },
    );
    video.src = src;
    video.load();
  });
}

async function finishFromFrame(video: HTMLVideoElement, fileName: string) {
  if (!video.videoWidth || !video.videoHeight) return undefined;
  const maxWidth = 720;
  const scale = Math.min(1, maxWidth / video.videoWidth);
  const width = Math.max(1, Math.round(video.videoWidth * scale));
  const height = Math.max(1, Math.round(video.videoHeight * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) return undefined;
  context.drawImage(video, 0, 0, width, height);
  const dataUrl = canvas.toDataURL("image/jpeg", 0.84);
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.84));
  if (!blob) return undefined;
  const name = `${fileName.replace(/\.[^.]+$/, "") || "video"}-poster.jpg`;
  const posterFile = new File([blob], name, { type: "image/jpeg" });
  return {
    file: posterFile,
    url: URL.createObjectURL(blob),
    dataUrl,
    durationSeconds: Number.isFinite(video.duration) ? video.duration : undefined,
    width: video.videoWidth,
    height: video.videoHeight,
  };
}
