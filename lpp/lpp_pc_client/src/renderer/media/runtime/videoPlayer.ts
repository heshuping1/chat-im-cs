import type { MediaResourceDto } from "../../data/api-client";
import { isBrowserNativeUrl, mediaFileName } from "../../data/im-message-normalize";

export type MediaCacheContext = {
  accountId?: string;
  conversationId?: string;
};

export async function openDesktopVideoPlayer({
  authToken,
  displaySrc,
  durationSeconds,
  media,
  mediaCacheContext,
  posterSrc,
  remoteSrc,
  videoSize,
}: {
  authToken?: string;
  displaySrc?: string;
  durationSeconds?: number;
  media?: MediaResourceDto;
  mediaCacheContext?: MediaCacheContext;
  posterSrc?: string;
  remoteSrc?: string;
  videoSize?: { width: number; height: number } | null;
}) {
  const desktopVideoUrl = remoteSrc && !isBrowserNativeUrl(remoteSrc)
    ? remoteSrc
    : displaySrc && !isBrowserNativeUrl(displaySrc)
      ? displaySrc
      : undefined;
  if (!window.desktopApi?.openVideoPlayer || !desktopVideoUrl) return false;

  const desktopPosterUrl = await resolveDesktopVideoPosterUrl(posterSrc);
  await window.desktopApi.openVideoPlayer({
    url: desktopVideoUrl,
    fileName: mediaFileName(media) || "video.mp4",
    kind: "video",
    authToken,
    accountId: mediaCacheContext?.accountId,
    conversationId: mediaCacheContext?.conversationId,
    posterUrl: desktopPosterUrl,
    width: videoSize?.width ?? media?.width,
    height: videoSize?.height ?? media?.height,
    durationSeconds,
    sizeBytes: media?.sizeBytes,
    title: "原视频",
  });
  return true;
}

async function resolveDesktopVideoPosterUrl(posterUrl?: string) {
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
