import type { MediaResourceDto } from "../../data/api-client";
import { mediaFileName } from "../../data/im-message-normalize";

export type MediaCacheContext = {
  accountId?: string;
  conversationId?: string;
};

export type VideoPlayerOpenDiagnostic =
  | {
      event: "open.prepare";
      hasLocalOpenUrl: boolean;
      openedWithInitialFileUrl: boolean;
      prepareElapsedMs: number;
      sourceKind: MediaUrlKind;
    }
  | {
      event: "poster.resolve_failed";
      posterKind: MediaUrlKind;
      reason: string;
      sourceKind: MediaUrlKind;
    };

export type MediaUrlKind = "blob" | "data" | "file" | "http" | "relative" | "unknown";

export async function openDesktopVideoPlayer({
  authToken,
  displaySrc,
  durationSeconds,
  localOpenSrc,
  media,
  mediaCacheContext,
  onDiagnostic,
  posterSrc,
  remoteSrc,
  videoSize,
}: {
  authToken?: string;
  displaySrc?: string;
  durationSeconds?: number;
  localOpenSrc?: string;
  media?: MediaResourceDto;
  mediaCacheContext?: MediaCacheContext;
  onDiagnostic?: (diagnostic: VideoPlayerOpenDiagnostic) => void;
  posterSrc?: string;
  remoteSrc?: string;
  videoSize?: { width: number; height: number } | null;
}) {
  const prepareStartedAt = Date.now();
  const desktopVideoUrl =
    desktopLocalVideoUrl(localOpenSrc) ??
    desktopLocalVideoUrl(displaySrc) ??
    desktopReachableVideoUrl(remoteSrc) ??
    desktopReachableVideoUrl(displaySrc);
  if (!window.desktopApi?.openVideoPlayer || !desktopVideoUrl) return false;

  const sourceKind = mediaUrlKind(desktopVideoUrl);
  const desktopPosterUrl = await resolveDesktopVideoPosterUrl(posterSrc).catch((error) => {
    onDiagnostic?.({
      event: "poster.resolve_failed",
      posterKind: mediaUrlKind(posterSrc),
      reason: videoOpenErrorSummary(error),
      sourceKind,
    });
    return undefined;
  });
  onDiagnostic?.({
    event: "open.prepare",
    hasLocalOpenUrl: Boolean(desktopLocalVideoUrl(localOpenSrc)),
    openedWithInitialFileUrl: sourceKind === "file",
    prepareElapsedMs: Math.max(0, Date.now() - prepareStartedAt),
    sourceKind,
  });
  await window.desktopApi.openVideoPlayer({
    url: absolutizeDesktopMediaUrl(desktopVideoUrl),
    fileName: mediaFileName(media) || "video.mp4",
    kind: "video",
    authToken,
    accountId: mediaCacheContext?.accountId,
    conversationId: mediaCacheContext?.conversationId,
    ...(desktopPosterUrl ? { posterUrl: absolutizeDesktopMediaUrl(desktopPosterUrl) } : {}),
    width: videoSize?.width ?? media?.width,
    height: videoSize?.height ?? media?.height,
    durationSeconds,
    sizeBytes: media?.sizeBytes,
    title: "Original video",
  });
  return true;
}

export function inlineVideoPreviewSrc(
  url?: string,
  options: { allowDesktopFile?: boolean } = {},
) {
  if (!url) return undefined;
  if (/^file:/i.test(url)) return options.allowDesktopFile ? url : undefined;
  if (/^https?:/i.test(url)) return undefined;
  return url;
}

function desktopReachableVideoUrl(url?: string) {
  if (!url || /^blob:/i.test(url)) return undefined;
  return url;
}

function desktopLocalVideoUrl(url?: string) {
  if (!url || !/^file:/i.test(url)) return undefined;
  return url;
}

function absolutizeDesktopMediaUrl(url: string) {
  if (/^(data:|https?:|file:)/i.test(url)) return url;
  const baseUrl = window.location?.origin;
  if (!baseUrl) return url;
  try {
    return new URL(url, baseUrl).toString();
  } catch {
    return url;
  }
}

export function mediaUrlKind(url?: string): MediaUrlKind {
  if (!url) return "unknown";
  if (/^blob:/i.test(url)) return "blob";
  if (/^data:/i.test(url)) return "data";
  if (/^file:/i.test(url)) return "file";
  if (/^https?:/i.test(url)) return "http";
  if (/^[a-z][a-z0-9+.-]*:/i.test(url)) return "unknown";
  return "relative";
}

export function videoOpenErrorSummary(error: unknown) {
  const raw = error instanceof Error ? error.message : String(error);
  return raw
    .replace(/file:\/\/\S+/gi, "file://[local-path]")
    .replace(/https?:\/\/\S+/gi, "https://[remote-url]")
    .slice(0, 180);
}

async function resolveDesktopVideoPosterUrl(posterUrl?: string) {
  if (posterUrl && /^data:/i.test(posterUrl)) return undefined;
  if (!posterUrl || !/^blob:/i.test(posterUrl)) return posterUrl;
  const response = await fetch(posterUrl);
  const blob = await response.blob();
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(reader.error || new Error("Failed to read video poster"));
    reader.readAsDataURL(blob);
  });
}
