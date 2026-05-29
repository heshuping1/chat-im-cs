import type { MessageItemDto } from "../../data/api-client";
import {
  firstMessageMedia,
  imageMediaCacheKey,
  isBrowserNativeUrl,
  mediaFileName,
  normalizeMessageType,
  resolveMediaUrl,
} from "../../data/im-message-normalize";
import { refreshCachedMedia } from "../../lib/mediaCache";

const imagePrecacheLimit = 24;
const imagePrecacheRetryMs = 2 * 60 * 1000;

type ImagePrecacheOptions = {
  accountId?: string;
  assetBaseUrl?: string;
  authToken?: string;
  conversationId?: string;
  messages: MessageItemDto[];
};

export type ImagePrecacheCandidate = {
  cacheKey: string;
  fileName: string;
  url: string;
};

const prefetchedImageFileUrls = new Map<string, string>();
const pendingImagePrecaches = new Map<string, Promise<void>>();
const failedImagePrecaches = new Map<string, number>();
const imagePrecacheSubscribers = new Map<string, Set<(fileUrl: string) => void>>();

export function getPrefetchedImageFileUrl(cacheKey: string | undefined) {
  return cacheKey ? prefetchedImageFileUrls.get(cacheKey) : undefined;
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
    if (prefetchedImageFileUrls.has(candidate.cacheKey)) return;
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
    "thumbnailUrl",
    "thumbUrl",
    "previewUrl",
    "url",
    "downloadUrl",
    "signedUrl",
    "fileUrl",
    "uri",
    "path",
  );
  if (!url || isBrowserNativeUrl(url) || !/^https?:\/\//i.test(url)) return null;
  const cacheKey = imageMediaCacheKey(media, url);
  if (!cacheKey) return null;
  return {
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
  imagePrecacheSubscribers.get(cacheKey)?.forEach((callback) => callback(fileUrl));
}
