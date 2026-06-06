import type { MessageItemDto } from "../../data/api-client";
import {
  firstMessageMedia,
  imageMediaCacheKey,
  isBrowserNativeUrl,
  mediaFileName,
  mediaStableCacheIdentity,
  normalizeMessageType,
  resolveMediaUrl,
} from "../../data/im-message-normalize";
import { refreshCachedMedia } from "../../lib/mediaCache";

const imagePrecacheLimit = 24;
const imagePrecacheRetryMs = 2 * 60 * 1000;
const imagePrecacheStorageKey = "lpp-pc-prefetched-image-files";
const imagePrecacheStorageLimit = 800;

type ImagePrecacheOptions = {
  accountId?: string;
  assetBaseUrl?: string;
  authToken?: string;
  conversationId?: string;
  messages: MessageItemDto[];
};

export type ImagePrecacheCandidate = {
  cacheIdentity?: string;
  cacheKey: string;
  fileName: string;
  url: string;
};

const prefetchedImageFileUrls = new Map<string, string>();
const pendingImagePrecaches = new Map<string, Promise<void>>();
const failedImagePrecaches = new Map<string, number>();
const imagePrecacheSubscribers = new Map<string, Set<(fileUrl: string) => void>>();

export function getPrefetchedImageFileUrl(cacheKey: string | undefined) {
  if (!cacheKey) return undefined;
  const cached = prefetchedImageFileUrls.get(cacheKey);
  if (cached) return cached;
  const persisted = readPersistedImageFileUrls().get(cacheKey);
  if (!persisted) return undefined;
  prefetchedImageFileUrls.set(cacheKey, persisted);
  return persisted;
}

export function forgetPrefetchedImageFileUrl(cacheKey: string | undefined, fileUrl?: string | null) {
  if (!cacheKey) return;
  const current = prefetchedImageFileUrls.get(cacheKey) ?? readPersistedImageFileUrls().get(cacheKey);
  if (fileUrl && current && current !== fileUrl) return;
  prefetchedImageFileUrls.delete(cacheKey);
  const persisted = readPersistedImageFileUrls();
  persisted.delete(cacheKey);
  writePersistedImageFileUrls(persisted);
}

export function subscribeImagePrecache(
  cacheKey: string | undefined,
  callback: (fileUrl: string) => void,
) {
  if (!cacheKey) return () => undefined;
  const subscribers = imagePrecacheSubscribers.get(cacheKey) ?? new Set();
  subscribers.add(callback);
  imagePrecacheSubscribers.set(cacheKey, subscribers);
  return () => {
    subscribers.delete(callback);
    if (subscribers.size === 0) imagePrecacheSubscribers.delete(cacheKey);
  };
}

export function prefetchImageMessages({
  accountId,
  assetBaseUrl,
  authToken,
  conversationId,
  messages,
}: ImagePrecacheOptions) {
  const candidates = selectImagePrecacheCandidates(messages, assetBaseUrl);

  candidates.forEach((candidate) => {
    const failedAt = failedImagePrecaches.get(candidate.cacheKey);
    if (failedAt && Date.now() - failedAt < imagePrecacheRetryMs) return;
    if (getPrefetchedImageFileUrl(candidate.cacheKey)) return;
    if (pendingImagePrecaches.has(candidate.cacheKey)) return;

    const task = prefetchImageCandidate({
      accountId,
      authToken,
      candidate,
      conversationId,
    })
      .catch(() => {
        failedImagePrecaches.set(candidate.cacheKey, Date.now());
      })
      .finally(() => {
        pendingImagePrecaches.delete(candidate.cacheKey);
      });

    pendingImagePrecaches.set(candidate.cacheKey, task);
  });
}

export function selectImagePrecacheCandidates(
  messages: MessageItemDto[],
  assetBaseUrl?: string,
) {
  return messages
    .slice(-imagePrecacheLimit * 3)
    .map((message) => imagePrecacheCandidate(message, assetBaseUrl))
    .filter((item): item is ImagePrecacheCandidate => Boolean(item))
    .slice(-imagePrecacheLimit);
}

function imagePrecacheCandidate(
  message: MessageItemDto,
  assetBaseUrl?: string,
): ImagePrecacheCandidate | null {
  const type = normalizeMessageType(message);
  if (!type.includes("image")) return null;
  const media = firstMessageMedia(message);
  const url = resolveMediaUrl(
    media,
    assetBaseUrl,
    "signedUrl",
    "downloadUrl",
    "thumbnailUrl",
    "thumbUrl",
    "previewUrl",
    "url",
    "fileUrl",
    "uri",
    "path",
  );
  if (!url || isBrowserNativeUrl(url) || !/^https?:\/\//i.test(url)) return null;
  const cacheKey = imageMediaCacheKey(media, url);
  if (!cacheKey) return null;
  const cacheIdentity = mediaStableCacheIdentity(media, url);
  return {
    ...(cacheIdentity ? { cacheIdentity } : {}),
    cacheKey,
    fileName: mediaFileName(media) || "image.png",
    url,
  };
}

async function prefetchImageCandidate({
  accountId,
  authToken,
  candidate,
  conversationId,
}: {
  accountId?: string;
  authToken?: string;
  candidate: ImagePrecacheCandidate;
  conversationId?: string;
}) {
  if (window.desktopApi?.cacheMediaFile) {
    const result = await window.desktopApi.cacheMediaFile({
      accountId,
      authToken,
      cacheIdentity: candidate.cacheIdentity,
      conversationId,
      fileName: candidate.fileName,
      kind: "image",
      url: candidate.url,
    });
    registerPrefetchedImageFileUrl(candidate.cacheKey, result.fileUrl);
    return;
  }

  await refreshCachedMedia({
    key: candidate.cacheKey,
    token: authToken,
    url: candidate.url,
  });
}

function registerPrefetchedImageFileUrl(cacheKey: string, fileUrl: string) {
  if (!fileUrl) return;
  failedImagePrecaches.delete(cacheKey);
  prefetchedImageFileUrls.set(cacheKey, fileUrl);
  const persisted = readPersistedImageFileUrls();
  persisted.set(cacheKey, fileUrl);
  writePersistedImageFileUrls(persisted);
  imagePrecacheSubscribers.get(cacheKey)?.forEach((callback) => callback(fileUrl));
}

function readPersistedImageFileUrls() {
  const entries = new Map<string, string>();
  try {
    const raw = window.localStorage?.getItem(imagePrecacheStorageKey);
    if (!raw) return entries;
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return entries;
    parsed.forEach((item) => {
      if (!Array.isArray(item) || item.length < 2) return;
      const [key, fileUrl] = item;
      if (typeof key === "string" && typeof fileUrl === "string" && key && fileUrl) {
        entries.set(key, fileUrl);
      }
    });
  } catch {
    return entries;
  }
  return entries;
}

function writePersistedImageFileUrls(entries: Map<string, string>) {
  try {
    const limited = Array.from(entries.entries()).slice(-imagePrecacheStorageLimit);
    window.localStorage?.setItem(imagePrecacheStorageKey, JSON.stringify(limited));
  } catch {
    // Local storage is only an optimization; image loading still falls back to cache/download.
  }
}
