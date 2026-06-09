import type { MediaResourceDto } from "../../data/api-client";
import { useEffect, useState } from "react";
import { mediaFileName, mediaStableCacheIdentity } from "../../data/im-message-normalize";
import {
  registerVideoPosterForMedia,
  resolveRegisteredVideoPoster,
} from "../../lib/videoPoster";
import type { MediaCacheContext } from "./videoPlayer";

const readyVideoSourceCache = new Set<string>();
const readyVideoPosterSources = new Map<string, string | undefined>();
const videoPosterCache = new Map<string, string>();
const videoPosterPromiseCache = new Map<string, Promise<string | undefined>>();
const maxVideoPosterCacheEntries = 120;
const maxVideoPosterReadyEntries = 180;

export function cachedGeneratedVideoPoster(src: string | undefined) {
  return src ? videoPosterCache.get(src) : undefined;
}

export function isVideoSourceReady(src: string | undefined) {
  return Boolean(src && readyVideoSourceCache.has(src));
}

export function markVideoSourceReady(src: string | undefined) {
  if (src) readyVideoSourceCache.add(src);
}

export type VideoPosterLoadState = "idle" | "loading" | "ready" | "failed";
export type VideoPosterSource = "explicit" | "registered" | "cached" | "generated" | "none";

export function videoPosterRenderKey(
  media: MediaResourceDto | undefined,
  posterSrc: string | undefined,
  displaySrc: string | undefined,
) {
  const mediaKey = mediaStrongRenderKey(media);
  if (mediaKey) return mediaKey;
  const posterKey = stableUrlRenderKey(posterSrc);
  if (posterKey) return `poster:${posterKey}`;
  const sourceKey = stableUrlRenderKey(displaySrc);
  return sourceKey ? `source:${sourceKey}` : undefined;
}

export function isVideoPosterReady(key: string | undefined) {
  return Boolean(key && readyVideoPosterSources.has(key));
}

export function readyVideoPosterSrc(key: string | undefined) {
  return key ? readyVideoPosterSources.get(key) : undefined;
}

export function markVideoPosterReady(key: string | undefined, posterSrc?: string) {
  rememberVideoPosterReadyKey(key, posterSrc);
  const posterKey = stableUrlRenderKey(posterSrc);
  if (posterKey) rememberVideoPosterReadyKey(`poster:${posterKey}`, posterSrc);
}

export function initialVideoPosterLoadState({
  posterKey,
  posterReadyHint,
  posterSrc,
}: {
  posterKey?: string;
  posterReadyHint?: boolean;
  posterSrc?: string;
}): VideoPosterLoadState {
  if (!posterSrc) return "idle";
  return posterReadyHint || isVideoPosterReady(posterKey) ? "ready" : "loading";
}

export function resolveVideoPosterSource({
  cachedPoster,
  explicitPoster,
  generatedPoster,
  registeredPoster,
}: {
  cachedPoster?: string;
  explicitPoster?: string;
  generatedPoster?: string;
  registeredPoster?: string;
}): { posterSrc?: string; source: VideoPosterSource } {
  if (explicitPoster) return { posterSrc: explicitPoster, source: "explicit" };
  if (registeredPoster) return { posterSrc: registeredPoster, source: "registered" };
  if (cachedPoster) return { posterSrc: cachedPoster, source: "cached" };
  if (generatedPoster) return { posterSrc: generatedPoster, source: "generated" };
  return { source: "none" };
}

export function useVideoPosterSource({
  authToken,
  displaySrc,
  explicitPoster,
  media,
  mediaCacheContext,
  onPosterReady,
}: {
  authToken?: string;
  displaySrc?: string;
  explicitPoster?: string;
  media?: MediaResourceDto;
  mediaCacheContext?: MediaCacheContext;
  onPosterReady?: () => void;
}) {
  const registeredPoster = explicitPoster
    ? undefined
    : resolveRegisteredVideoPoster(media as Record<string, unknown> | undefined);
  const cachedPoster =
    !explicitPoster && !registeredPoster ? cachedGeneratedVideoPoster(displaySrc) : undefined;
  const [generatedPoster, setGeneratedPoster] = useState(cachedPoster);

  useEffect(() => {
    if (explicitPoster || registeredPoster) {
      setGeneratedPoster(undefined);
      return undefined;
    }
    setGeneratedPoster(cachedGeneratedVideoPoster(displaySrc));
    return undefined;
  }, [displaySrc, explicitPoster, registeredPoster]);

  useEffect(() => {
    if (!displaySrc || explicitPoster || registeredPoster || generatedPoster) return undefined;
    let canceled = false;
    void ensureLocalVideoPoster({
      src: displaySrc,
      media,
      authToken,
      mediaCacheContext,
    }).then((nextPoster) => {
      if (!canceled && nextPoster) {
        setGeneratedPoster(nextPoster);
        onPosterReady?.();
      }
    });
    return () => {
      canceled = true;
    };
  }, [
    authToken,
    displaySrc,
    explicitPoster,
    generatedPoster,
    media,
    mediaCacheContext,
    onPosterReady,
    registeredPoster,
  ]);

  return resolveVideoPosterSource({
    cachedPoster,
    explicitPoster,
    generatedPoster,
    registeredPoster,
  });
}

export async function ensureLocalVideoPoster({
  src,
  media,
  authToken,
  mediaCacheContext,
}: {
  src: string;
  media?: MediaResourceDto;
  authToken?: string;
  mediaCacheContext?: MediaCacheContext;
}) {
  const mediaRecord = media as Record<string, unknown> | undefined;
  const fileName = mediaFileName(media) || "video.mp4";
  const posterFromMemory = await ensureVideoPoster(src);
  if (!posterFromMemory) return undefined;
  if (!window.desktopApi?.cacheMediaPoster) {
    registerVideoPosterForMedia(mediaRecord, posterFromMemory);
    return posterFromMemory;
  }
  try {
    const shouldCacheVideo = !/^blob:/i.test(src);
    const cachedVideo = shouldCacheVideo && window.desktopApi.cacheMediaFile
      ? await window.desktopApi.cacheMediaFile({
          url: src,
          fileName,
          kind: "video",
          authToken,
          cacheIdentity: mediaStableCacheIdentity(media, src),
          accountId: mediaCacheContext?.accountId,
          conversationId: mediaCacheContext?.conversationId,
        })
      : undefined;
    const cachedPoster = await window.desktopApi.cacheMediaPoster({
      url: cachedVideo?.fileUrl || src,
      fileName: videoPosterFileName(fileName),
      kind: "video",
      dataUrl: posterFromMemory,
      authToken,
      cacheIdentity: `video-poster:${mediaStableCacheIdentity(media, cachedVideo?.fileUrl || src) || cachedVideo?.fileUrl || src}`,
      accountId: mediaCacheContext?.accountId,
      conversationId: mediaCacheContext?.conversationId,
    });
    registerVideoPosterForMedia(mediaRecord, cachedPoster.fileUrl);
    rememberVideoPoster(src, cachedPoster.fileUrl);
    return cachedPoster.fileUrl;
  } catch {
    registerVideoPosterForMedia(mediaRecord, posterFromMemory);
    rememberVideoPoster(src, posterFromMemory);
    return posterFromMemory;
  }
}

export function videoPosterFileName(fileName: string) {
  return `${fileName.replace(/\.[^.]+$/, "") || "video"}-poster.jpg`;
}

function ensureVideoPoster(src: string) {
  const cached = videoPosterCache.get(src);
  if (cached) return Promise.resolve(cached);
  const pending = videoPosterPromiseCache.get(src);
  if (pending) return pending;
  const promise = captureVideoPosterFromSource(src).finally(() => {
    videoPosterPromiseCache.delete(src);
  });
  videoPosterPromiseCache.set(src, promise);
  return promise;
}

function captureVideoPosterFromSource(src: string) {
  return new Promise<string | undefined>((resolve) => {
    const video = document.createElement("video");
    let settled = false;
    const finish = (poster?: string) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timeout);
      video.removeAttribute("src");
      video.load();
      if (poster) {
        rememberVideoPoster(src, poster);
        readyVideoSourceCache.add(src);
      }
      resolve(poster);
    };
    const timeout = window.setTimeout(() => finish(), 2500);
    const seekFallbackFrame = () => {
      const targetTime = videoPosterCaptureTime(video.duration);
      try {
        video.currentTime = targetTime;
      } catch {
        finish(captureVideoFramePoster(video));
      }
    };
    video.crossOrigin = "anonymous";
    video.muted = true;
    video.playsInline = true;
    video.preload = "auto";
    video.addEventListener("error", () => finish(), { once: true });
    video.addEventListener(
      "loadedmetadata",
      () => {
        if (!Number.isFinite(video.duration) || video.duration <= 0.2) {
          const poster = captureVideoFramePoster(video);
          if (poster) finish(poster);
        }
      },
      { once: true },
    );
    video.addEventListener(
      "seeked",
      () => {
        finish(captureVideoFramePoster(video));
      },
      { once: true },
    );
    video.addEventListener(
      "loadeddata",
      () => {
        seekFallbackFrame();
      },
      { once: true },
    );
    video.src = src;
    video.load();
  });
}

function rememberVideoPoster(src: string, poster: string) {
  videoPosterCache.delete(src);
  videoPosterCache.set(src, poster);
  while (videoPosterCache.size > maxVideoPosterCacheEntries) {
    const oldestKey = videoPosterCache.keys().next().value;
    if (!oldestKey) break;
    videoPosterCache.delete(oldestKey);
  }
}

function rememberVideoPosterReadyKey(key: string | undefined, posterSrc?: string) {
  if (!key) return;
  const previousPosterSrc = readyVideoPosterSources.get(key);
  readyVideoPosterSources.delete(key);
  readyVideoPosterSources.set(key, posterSrc || previousPosterSrc);
  while (readyVideoPosterSources.size > maxVideoPosterReadyEntries) {
    const oldestKey = readyVideoPosterSources.keys().next().value;
    if (!oldestKey) break;
    readyVideoPosterSources.delete(oldestKey);
  }
}

function mediaStrongRenderKey(media: MediaResourceDto | undefined) {
  const record = media as Record<string, unknown> | undefined;
  if (!record) return undefined;
  const value = [
    record.id,
    record.mediaId,
    record.resourceId,
    record.fileId,
    record.objectKey,
    record.storageKey,
  ].map(stableScalarValue).find(Boolean);
  return value ? `media:${value}` : undefined;
}

function stableUrlRenderKey(value: string | undefined) {
  if (!value?.trim()) return undefined;
  const raw = value.trim();
  if (/^(blob:|data:|file:)/i.test(raw)) return raw;
  try {
    const base =
      typeof globalThis.location?.origin === "string"
        ? globalThis.location.origin
        : "http://lpp.local";
    const url = new URL(raw, base);
    url.search = "";
    url.hash = "";
    return url.toString();
  } catch {
    return raw.split(/[?#]/, 1)[0] || raw;
  }
}

function stableScalarValue(value: unknown) {
  if (typeof value === "string") return value.trim() || undefined;
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return undefined;
}

export function videoPosterCaptureTime(duration: number) {
  if (!Number.isFinite(duration)) return 0.12;
  return Math.min(Math.max(duration * 0.02, 0.08), 0.35);
}

function captureVideoFramePoster(video: HTMLVideoElement) {
  try {
    if (!video.videoWidth || !video.videoHeight) return undefined;
    const maxWidth = 360;
    const scale = Math.min(1, maxWidth / video.videoWidth);
    const width = Math.max(1, Math.round(video.videoWidth * scale));
    const height = Math.max(1, Math.round(video.videoHeight * scale));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    if (!context) return undefined;
    context.drawImage(video, 0, 0, width, height);
    return canvas.toDataURL("image/jpeg", 0.82);
  } catch {
    return undefined;
  }
}
