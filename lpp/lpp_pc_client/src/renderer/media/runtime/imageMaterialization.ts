import type { AuthSession } from "../../data/auth/auth-session";
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

const imageMaterializationLimit = 24;
const imageMaterializationRetryMs = 2 * 60 * 1000;
const imageMaterializationStorageKey = "lpp-pc-prefetched-image-files";
const imageMaterializationStorageLimit = 800;

type ImageMaterializationReason =
  | "im-gateway-received"
  | "cs-gateway-received"
  | "conversation-snapshot"
  | "ui-visible-fallback";

export type ImageMaterializationOptions = {
  accountId?: string;
  assetBaseUrl?: string;
  authToken?: string;
  conversationId?: string;
  limit?: number;
  messages: MessageItemDto[];
  reason?: ImageMaterializationReason;
};

export type ReceivedImageMaterializationOptions = Omit<
  ImageMaterializationOptions,
  "limit" | "messages"
> & {
  message: MessageItemDto;
};

export type ImageMaterializationCandidate = {
  cacheIdentity?: string;
  cacheKey: string;
  fileName: string;
  url: string;
};

export type ImagePrecacheCandidate = ImageMaterializationCandidate;

const prefetchedImageFileUrls = new Map<string, string>();
const pendingImageMaterializations = new Map<string, Promise<void>>();
const failedImageMaterializations = new Map<string, number>();
const imageMaterializationSubscribers = new Map<string, Set<(fileUrl: string) => void>>();

export function accountIdFromSession(session: AuthSession | null | undefined) {
  return (
    session?.userId ||
    session?.platformUserId ||
    session?.lppId ||
    session?.tenantId ||
    undefined
  );
}

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
  const subscribers = imageMaterializationSubscribers.get(cacheKey) ?? new Set();
  subscribers.add(callback);
  imageMaterializationSubscribers.set(cacheKey, subscribers);
  return () => {
    subscribers.delete(callback);
    if (subscribers.size === 0) imageMaterializationSubscribers.delete(cacheKey);
  };
}

export function materializeReceivedImageMessage(options: ReceivedImageMaterializationOptions) {
  return materializeImageMessages({
    ...options,
    limit: 1,
    messages: [options.message],
  });
}

export function materializeImageMessages({
  accountId,
  assetBaseUrl,
  authToken,
  conversationId,
  limit = imageMaterializationLimit,
  messages,
}: ImageMaterializationOptions) {
  const candidates = selectImageMaterializationCandidates(messages, assetBaseUrl, { limit });

  candidates.forEach((candidate) => {
    const failedAt = failedImageMaterializations.get(candidate.cacheKey);
    if (failedAt && Date.now() - failedAt < imageMaterializationRetryMs) return;
    if (getPrefetchedImageFileUrl(candidate.cacheKey)) return;
    if (pendingImageMaterializations.has(candidate.cacheKey)) return;

    const task = materializeImageCandidate({
      accountId,
      authToken,
      candidate,
      conversationId,
    })
      .catch(() => {
        failedImageMaterializations.set(candidate.cacheKey, Date.now());
      })
      .finally(() => {
        pendingImageMaterializations.delete(candidate.cacheKey);
      });

    pendingImageMaterializations.set(candidate.cacheKey, task);
  });
}

export function prefetchImageMessages(options: ImageMaterializationOptions) {
  materializeImageMessages({
    ...options,
    reason: options.reason ?? "conversation-snapshot",
  });
}

export function selectImageMaterializationCandidates(
  messages: MessageItemDto[],
  assetBaseUrl?: string,
  options: { limit?: number } = {},
) {
  const limit = options.limit ?? imageMaterializationLimit;
  const source = limit > 0 ? messages.slice(-limit * 3) : messages;
  const candidates = source
    .map((message) => imageMaterializationCandidate(message, assetBaseUrl))
    .filter((item): item is ImageMaterializationCandidate => Boolean(item));
  return limit > 0 ? candidates.slice(-limit) : candidates;
}

export function selectImagePrecacheCandidates(
  messages: MessageItemDto[],
  assetBaseUrl?: string,
) {
  return selectImageMaterializationCandidates(messages, assetBaseUrl);
}

function imageMaterializationCandidate(
  message: MessageItemDto,
  assetBaseUrl?: string,
): ImageMaterializationCandidate | null {
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

async function materializeImageCandidate({
  accountId,
  authToken,
  candidate,
  conversationId,
}: {
  accountId?: string;
  authToken?: string;
  candidate: ImageMaterializationCandidate;
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

export function registerPrefetchedImageFileUrl(cacheKey: string, fileUrl: string) {
  if (!fileUrl) return;
  failedImageMaterializations.delete(cacheKey);
  prefetchedImageFileUrls.set(cacheKey, fileUrl);
  const persisted = readPersistedImageFileUrls();
  persisted.set(cacheKey, fileUrl);
  writePersistedImageFileUrls(persisted);
  imageMaterializationSubscribers.get(cacheKey)?.forEach((callback) => callback(fileUrl));
}

function readPersistedImageFileUrls() {
  const entries = new Map<string, string>();
  try {
    const raw = window.localStorage?.getItem(imageMaterializationStorageKey);
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
    const limited = Array.from(entries.entries()).slice(-imageMaterializationStorageLimit);
    window.localStorage?.setItem(imageMaterializationStorageKey, JSON.stringify(limited));
  } catch {
    // Local storage is only an optimization; image loading still falls back to cache/download.
  }
}
