import type { AuthSession } from "../../data/auth/auth-session";
import type { MediaResourceDto, MessageItemDto } from "../../data/api-client";
import {
  imageMediaCacheKey,
  isBrowserNativeUrl,
  mediaFileName,
  mediaStableCacheIdentity,
  normalizeMessageParts,
  resolveMediaUrl,
} from "../../data/im-message-normalize";
import { refreshCachedMedia } from "../../lib/mediaCache";

export type MaterializedMediaKind = "image" | "video" | "file";

const mediaMaterializationLimit = 24;
const mediaMaterializationRetryMs = 2 * 60 * 1000;
const mediaMaterializationStorageKey = "lpp-pc-materialized-media-files";
const legacyImagePrecacheStorageKey = "lpp-pc-prefetched-image-files";
const mediaMaterializationStorageLimit = 1_200;

type MediaMaterializationReason =
  | "im-gateway-received"
  | "cs-gateway-received"
  | "conversation-snapshot"
  | "ui-visible-fallback";

export type MediaMaterializationOptions = {
  accountId?: string;
  assetBaseUrl?: string;
  authToken?: string;
  conversationId?: string;
  limit?: number;
  messages: MessageItemDto[];
  reason?: MediaMaterializationReason;
};

export type ReceivedMediaMaterializationOptions = Omit<
  MediaMaterializationOptions,
  "limit" | "messages"
> & {
  message: MessageItemDto;
};

export type MediaMaterializationCandidate = {
  cacheIdentity?: string;
  cacheKey: string;
  fileName: string;
  kind: MaterializedMediaKind;
  url: string;
};

export type ImageMaterializationCandidate = MediaMaterializationCandidate & {
  kind: "image";
};
export type ImagePrecacheCandidate = ImageMaterializationCandidate;

const materializedMediaFileUrls = new Map<string, string>();
const materializedMediaDisplayUrls = new Map<string, string>();
const pendingMediaMaterializations = new Map<string, Promise<void>>();
const pendingMediaDisplayUrls = new Map<string, Promise<string | undefined>>();
const failedMediaMaterializations = new Map<string, number>();
const mediaMaterializationSubscribers = new Map<string, Set<(fileUrl: string) => void>>();
const mediaDisplaySubscribers = new Map<string, Set<(displayUrl: string) => void>>();

export function accountIdFromSession(session: AuthSession | null | undefined) {
  return (
    session?.userId ||
    session?.platformUserId ||
    session?.lppId ||
    session?.tenantId ||
    undefined
  );
}

export function mediaMaterializationCacheKey(
  kind: MaterializedMediaKind,
  media: MediaResourceDto | undefined,
  src: string | undefined,
) {
  if (kind === "image") return imageMediaCacheKey(media, src);
  const stableKey = mediaStableCacheIdentity(media, src);
  if (stableKey) return `${kind}:${stableKey}`;
  if (!src || isBrowserNativeUrl(src)) return undefined;
  return `${kind}:${src}`;
}

export function getMaterializedMediaFileUrl(cacheKey: string | undefined) {
  if (!cacheKey) return undefined;
  const cached = materializedMediaFileUrls.get(cacheKey);
  if (cached) return cached;
  const persisted = readPersistedMediaFileUrls().get(cacheKey);
  if (persisted) {
    materializedMediaFileUrls.set(cacheKey, persisted);
    return persisted;
  }
  if (!cacheKey.startsWith("image:")) return undefined;
  const legacy = readPersistedLegacyImageFileUrls().get(cacheKey);
  if (!legacy) return undefined;
  materializedMediaFileUrls.set(cacheKey, legacy);
  registerMaterializedMediaFileUrl(cacheKey, legacy);
  return legacy;
}

export function getPrefetchedImageFileUrl(cacheKey: string | undefined) {
  return getMaterializedMediaFileUrl(cacheKey);
}

export function getMaterializedMediaDisplayUrl(cacheKey: string | undefined) {
  if (!cacheKey) return undefined;
  return materializedMediaDisplayUrls.get(cacheKey);
}

export function subscribeMaterializedMediaDisplayUrl(
  cacheKey: string | undefined,
  callback: (displayUrl: string) => void,
) {
  if (!cacheKey) return () => undefined;
  const subscribers = mediaDisplaySubscribers.get(cacheKey) ?? new Set();
  subscribers.add(callback);
  mediaDisplaySubscribers.set(cacheKey, subscribers);
  return () => {
    subscribers.delete(callback);
    if (subscribers.size === 0) mediaDisplaySubscribers.delete(cacheKey);
  };
}

export function ensureMaterializedMediaDisplayUrl({
  accountId,
  authToken,
  cacheIdentity,
  cacheKey,
  conversationId,
  fileName,
  fileUrl,
  kind,
}: {
  accountId?: string;
  authToken?: string;
  cacheIdentity?: string;
  cacheKey: string | undefined;
  conversationId?: string;
  fileName: string;
  fileUrl: string | undefined;
  kind: MaterializedMediaKind;
}) {
  if (!cacheKey || !fileUrl) return Promise.resolve(undefined);
  const cached = materializedMediaDisplayUrls.get(cacheKey);
  if (cached) return Promise.resolve(cached);
  if (!/^file:/i.test(fileUrl)) {
    registerMaterializedMediaDisplayUrl(cacheKey, fileUrl);
    return Promise.resolve(fileUrl);
  }
  const pending = pendingMediaDisplayUrls.get(cacheKey);
  if (pending) return pending;
  if (!window.desktopApi?.readMediaFileAsDataUrl) return Promise.resolve(undefined);

  const task = window.desktopApi
    .readMediaFileAsDataUrl({
      accountId,
      authToken,
      cacheIdentity,
      conversationId,
      fileName,
      kind,
      url: fileUrl,
    })
    .then((displayUrl) => {
      if (!displayUrl?.startsWith("data:")) return undefined;
      registerMaterializedMediaDisplayUrl(cacheKey, displayUrl);
      return displayUrl;
    })
    .finally(() => {
      pendingMediaDisplayUrls.delete(cacheKey);
    });

  pendingMediaDisplayUrls.set(cacheKey, task);
  return task;
}

export function forgetMaterializedMediaFileUrl(
  cacheKey: string | undefined,
  fileUrl?: string | null,
) {
  if (!cacheKey) return;
  const current = materializedMediaFileUrls.get(cacheKey) ?? readPersistedMediaFileUrls().get(cacheKey);
  if (fileUrl && current && current !== fileUrl) return;
  materializedMediaFileUrls.delete(cacheKey);
  const persisted = readPersistedMediaFileUrls();
  persisted.delete(cacheKey);
  writePersistedMediaFileUrls(persisted);
  if (cacheKey.startsWith("image:")) {
    const legacy = readPersistedLegacyImageFileUrls();
    legacy.delete(cacheKey);
    writePersistedLegacyImageFileUrls(legacy);
  }
}

export function forgetPrefetchedImageFileUrl(cacheKey: string | undefined, fileUrl?: string | null) {
  forgetMaterializedMediaFileUrl(cacheKey, fileUrl);
}

export function subscribeMaterializedMediaFile(
  cacheKey: string | undefined,
  callback: (fileUrl: string) => void,
) {
  if (!cacheKey) return () => undefined;
  const subscribers = mediaMaterializationSubscribers.get(cacheKey) ?? new Set();
  subscribers.add(callback);
  mediaMaterializationSubscribers.set(cacheKey, subscribers);
  return () => {
    subscribers.delete(callback);
    if (subscribers.size === 0) mediaMaterializationSubscribers.delete(cacheKey);
  };
}

export function subscribeImagePrecache(
  cacheKey: string | undefined,
  callback: (fileUrl: string) => void,
) {
  return subscribeMaterializedMediaFile(cacheKey, callback);
}

export function materializeReceivedMediaMessage(options: ReceivedMediaMaterializationOptions) {
  return materializeMediaMessages({
    ...options,
    limit: 1,
    messages: [options.message],
  });
}

export function materializeReceivedImageMessage(options: ReceivedMediaMaterializationOptions) {
  return materializeReceivedMediaMessage(options);
}

export function materializeMediaMessages({
  accountId,
  assetBaseUrl,
  authToken,
  conversationId,
  limit = mediaMaterializationLimit,
  messages,
}: MediaMaterializationOptions) {
  const candidates = selectMediaMaterializationCandidates(messages, assetBaseUrl, { limit });

  candidates.forEach((candidate) => {
    const failedAt = failedMediaMaterializations.get(candidate.cacheKey);
    if (failedAt && Date.now() - failedAt < mediaMaterializationRetryMs) return;
    if (getMaterializedMediaFileUrl(candidate.cacheKey)) return;
    if (pendingMediaMaterializations.has(candidate.cacheKey)) return;

    const task = materializeMediaCandidate({
      accountId,
      authToken,
      candidate,
      conversationId,
    })
      .catch(() => {
        failedMediaMaterializations.set(candidate.cacheKey, Date.now());
      })
      .finally(() => {
        pendingMediaMaterializations.delete(candidate.cacheKey);
      });

    pendingMediaMaterializations.set(candidate.cacheKey, task);
  });
}

export function materializeImageMessages(options: MediaMaterializationOptions) {
  materializeMediaMessages({
    ...options,
    reason: options.reason ?? "conversation-snapshot",
  });
}

export function prefetchImageMessages(options: MediaMaterializationOptions) {
  materializeImageMessages(options);
}

export function selectMediaMaterializationCandidates(
  messages: MessageItemDto[],
  assetBaseUrl?: string,
  options: { limit?: number } = {},
) {
  const limit = options.limit ?? mediaMaterializationLimit;
  const source = limit > 0 ? messages.slice(-limit * 3) : messages;
  const candidates = source
    .map((message) => mediaMaterializationCandidate(message, assetBaseUrl))
    .filter((item): item is MediaMaterializationCandidate => Boolean(item));
  return limit > 0 ? candidates.slice(-limit) : candidates;
}

export function selectImageMaterializationCandidates(
  messages: MessageItemDto[],
  assetBaseUrl?: string,
) {
  return selectMediaMaterializationCandidates(messages, assetBaseUrl)
    .filter((candidate): candidate is ImageMaterializationCandidate => candidate.kind === "image");
}

export function selectImagePrecacheCandidates(
  messages: MessageItemDto[],
  assetBaseUrl?: string,
) {
  return selectImageMaterializationCandidates(messages, assetBaseUrl);
}

function mediaMaterializationCandidate(
  message: MessageItemDto,
  assetBaseUrl?: string,
): MediaMaterializationCandidate | null {
  const materializable = materializableMessageMedia(message);
  if (!materializable) return null;
  const { kind, media } = materializable;
  const url = materializationSourceUrl(kind, media, assetBaseUrl);
  if (!url || isBrowserNativeUrl(url) || !/^https?:\/\//i.test(url)) return null;
  const cacheKey = mediaMaterializationCacheKey(kind, media, url);
  if (!cacheKey) return null;
  const cacheIdentity = mediaStableCacheIdentity(media, url);
  return {
    ...(cacheIdentity ? { cacheIdentity } : {}),
    cacheKey,
    fileName: mediaFileName(media) || defaultMaterializedMediaFileName(kind),
    kind,
    url,
  };
}

function materializableMessageMedia(message: MessageItemDto) {
  for (const part of normalizeMessageParts(message)) {
    if (part.type === "image" || part.type === "video" || part.type === "file") {
      return { kind: part.type, media: part.media };
    }
  }
  return null;
}

function materializationSourceUrl(
  kind: MaterializedMediaKind,
  media: MediaResourceDto | undefined,
  assetBaseUrl?: string,
) {
  if (kind === "image") {
    return resolveMediaUrl(
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
  }
  return resolveMediaUrl(
    media,
    assetBaseUrl,
    "signedUrl",
    "downloadUrl",
    "url",
    "fileUrl",
    "uri",
    "path",
  );
}

async function materializeMediaCandidate({
  accountId,
  authToken,
  candidate,
  conversationId,
}: {
  accountId?: string;
  authToken?: string;
  candidate: MediaMaterializationCandidate;
  conversationId?: string;
}) {
  if (window.desktopApi?.cacheMediaFile) {
    const result = await window.desktopApi.cacheMediaFile({
      accountId,
      authToken,
      cacheIdentity: candidate.cacheIdentity,
      conversationId,
      fileName: candidate.fileName,
      kind: candidate.kind,
      url: candidate.url,
    });
    registerMaterializedMediaFileUrl(candidate.cacheKey, result.fileUrl);
    return;
  }

  if (candidate.kind === "image") {
    await refreshCachedMedia({
      key: candidate.cacheKey,
      token: authToken,
      url: candidate.url,
    });
  }
}

export function registerMaterializedMediaFileUrl(cacheKey: string, fileUrl: string) {
  if (!fileUrl) return;
  failedMediaMaterializations.delete(cacheKey);
  materializedMediaFileUrls.set(cacheKey, fileUrl);
  const persisted = readPersistedMediaFileUrls();
  persisted.set(cacheKey, fileUrl);
  writePersistedMediaFileUrls(persisted);
  if (cacheKey.startsWith("image:")) {
    const legacy = readPersistedLegacyImageFileUrls();
    legacy.set(cacheKey, fileUrl);
    writePersistedLegacyImageFileUrls(legacy);
  }
  mediaMaterializationSubscribers.get(cacheKey)?.forEach((callback) => callback(fileUrl));
}

function registerMaterializedMediaDisplayUrl(cacheKey: string, displayUrl: string) {
  if (!displayUrl) return;
  materializedMediaDisplayUrls.set(cacheKey, displayUrl);
  mediaDisplaySubscribers.get(cacheKey)?.forEach((callback) => callback(displayUrl));
}

export function registerSentMediaMaterialization(
  kind: string,
  media: MediaResourceDto,
  fileUrl: string | undefined,
) {
  if (!fileUrl) return;
  const materializedKind = materializationKindFromValue(kind);
  if (!materializedKind) return;
  const cacheKey = mediaMaterializationCacheKey(
    materializedKind,
    media,
    materializationSourceUrl(materializedKind, media),
  );
  if (cacheKey) registerMaterializedMediaFileUrl(cacheKey, fileUrl);
}

export function registerPrefetchedImageFileUrl(cacheKey: string, fileUrl: string) {
  registerMaterializedMediaFileUrl(cacheKey, fileUrl);
}

function materializationKindFromValue(value: string): MaterializedMediaKind | undefined {
  if (value === "image" || value === "video" || value === "file") return value;
  return undefined;
}

function readPersistedMediaFileUrls() {
  return readPersistedFileUrls(mediaMaterializationStorageKey);
}

function writePersistedMediaFileUrls(entries: Map<string, string>) {
  writePersistedFileUrls(mediaMaterializationStorageKey, entries);
}

function readPersistedLegacyImageFileUrls() {
  return readPersistedFileUrls(legacyImagePrecacheStorageKey);
}

function writePersistedLegacyImageFileUrls(entries: Map<string, string>) {
  writePersistedFileUrls(legacyImagePrecacheStorageKey, entries);
}

function readPersistedFileUrls(storageKey: string) {
  const entries = new Map<string, string>();
  try {
    const raw = window.localStorage?.getItem(storageKey);
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

function writePersistedFileUrls(storageKey: string, entries: Map<string, string>) {
  try {
    const limited = Array.from(entries.entries()).slice(-mediaMaterializationStorageLimit);
    window.localStorage?.setItem(storageKey, JSON.stringify(limited));
  } catch {
    // Local storage is only an optimization; media loading still falls back to cache/download.
  }
}

function defaultMaterializedMediaFileName(kind: MaterializedMediaKind) {
  if (kind === "image") return "image.png";
  if (kind === "video") return "video.mp4";
  return "file";
}
