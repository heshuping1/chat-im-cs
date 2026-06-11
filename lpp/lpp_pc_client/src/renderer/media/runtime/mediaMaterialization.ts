import type { AuthSession } from "../../data/auth/auth-session";
import type { MediaResourceDto, MessageItemDto } from "../../data/api-client";
import { mediaIdentityFromResource } from "../../../shared/local-media-identity";
import {
  isBrowserNativeUrl,
  mediaFileName,
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
  messageId?: string;
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
const failedMediaDisplayUrls = new Map<string, { failedAt: number; url: string }>();
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
  const identity = mediaMaterializationIdentity(media, src);
  return identity ? `${kind}:${identity}` : undefined;
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
  preferDesktopRead,
}: {
  accountId?: string;
  authToken?: string;
  cacheIdentity?: string;
  cacheKey: string | undefined;
  conversationId?: string;
  fileName: string;
  fileUrl: string | undefined;
  kind: MaterializedMediaKind;
  preferDesktopRead?: boolean;
}) {
  if (!cacheKey || !fileUrl) return Promise.resolve(undefined);
  const shouldReadThroughDesktop = preferDesktopRead || /^file:/i.test(fileUrl);
  const cached = materializedMediaDisplayUrls.get(cacheKey);
  if (cached && (!shouldReadThroughDesktop || isBrowserNativeUrl(cached))) {
    return Promise.resolve(cached);
  }
  if (!shouldReadThroughDesktop) {
    registerMaterializedMediaDisplayUrl(cacheKey, fileUrl);
    return Promise.resolve(fileUrl);
  }
  const failedDisplay = failedMediaDisplayUrls.get(cacheKey);
  if (
    failedDisplay?.url === fileUrl &&
    Date.now() - failedDisplay.failedAt < mediaMaterializationRetryMs
  ) {
    return Promise.resolve(undefined);
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
    .catch((error) => {
      failedMediaDisplayUrls.set(cacheKey, { failedAt: Date.now(), url: fileUrl });
      if (isRecoverableMediaAccessError(error)) {
        materializedMediaDisplayUrls.delete(cacheKey);
        forgetMaterializedMediaFileUrl(cacheKey, fileUrl);
      }
      return undefined;
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

  const tasks: Promise<void>[] = [];
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
    tasks.push(task);
  });
  return Promise.allSettled(tasks).then(() => undefined);
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
  const cacheIdentity = mediaMaterializationIdentity(media, url);
  return {
    ...(cacheIdentity ? { cacheIdentity } : {}),
    cacheKey,
    fileName: mediaFileName(media) || defaultMaterializedMediaFileName(kind),
    kind,
    messageId: message.messageId,
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
      "url",
      "fileUrl",
      "uri",
      "path",
      "downloadUrl",
      "signedUrl",
      "thumbnailUrl",
      "thumbUrl",
      "previewUrl",
    );
  }
  return resolveMediaUrl(
    media,
    assetBaseUrl,
    "url",
    "fileUrl",
    "uri",
    "path",
    "downloadUrl",
    "signedUrl",
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
    const mediaIdentity = candidate.cacheIdentity ?? candidate.cacheKey;
    const localVariant = await window.desktopApi.localDataGetMediaVariant?.({
      mediaIdentity,
      variantKind: "original",
    });
    if (localVariant?.status === "cached" && localVariant.fileUrl) {
      registerMaterializedMediaFileUrl(candidate.cacheKey, localVariant.fileUrl);
      void window.desktopApi.localDataUpsertMedia?.({
        asset: {
          fileName: candidate.fileName,
          identitySource: "materialization",
          kind: candidate.kind,
          mediaIdentity,
          serverUrl: candidate.url,
        },
        messageRefs: candidate.messageId
          ? [
              {
                mediaIdentity,
                messageId: candidate.messageId,
                refKind: candidate.kind,
              },
            ]
          : undefined,
      });
      return;
    }
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
    void window.desktopApi.localDataUpsertMedia?.({
      asset: {
        fileName: candidate.fileName,
        identitySource: "materialization",
        kind: candidate.kind,
        mediaIdentity,
        serverUrl: candidate.url,
      },
      messageRefs: candidate.messageId
        ? [
            {
              mediaIdentity,
              messageId: candidate.messageId,
              refKind: candidate.kind,
            },
          ]
        : undefined,
      variants: [
        {
          localUrl: result.fileUrl,
          mediaIdentity,
          serverUrl: candidate.url,
          status: "cached",
          variantKind: "original",
        },
      ],
    });
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
  failedMediaDisplayUrls.delete(cacheKey);
  materializedMediaFileUrls.set(cacheKey, fileUrl);
  if (window.desktopApi?.localDataUpsertMedia) {
    mediaMaterializationSubscribers.get(cacheKey)?.forEach((callback) => callback(fileUrl));
    return;
  }
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
  messageId?: string,
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
  const identity = mediaMaterializationIdentity(media, materializationSourceUrl(materializedKind, media));
  if (identity) {
    void window.desktopApi?.localDataUpsertMedia?.({
      asset: {
        fileName: mediaFileName(media) || defaultMaterializedMediaFileName(materializedKind),
        identitySource: "local-send",
        kind: materializedKind,
        mediaIdentity: identity,
      },
      messageRefs: messageId
        ? [
            {
              mediaIdentity: identity,
              messageId,
              refKind: materializedKind,
            },
          ]
        : undefined,
      variants: [
        {
          localUrl: fileUrl,
          mediaIdentity: identity,
          status: "cached",
          variantKind: "original",
        },
      ],
    });
  }
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

function isRecoverableMediaAccessError(error: unknown) {
  const message = errorMessageText(error).toLowerCase();
  return (
    message.includes("signature has expired") ||
    message.includes("auth_required") ||
    message.includes("html") ||
    message.includes("json") ||
    message.includes("login") ||
    message.includes("unauthorized") ||
    message.includes("forbidden") ||
    message.includes("401") ||
    message.includes("403")
  );
}

function errorMessageText(error: unknown) {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  try {
    return JSON.stringify(error);
  } catch {
    return "";
  }
}

function mediaMaterializationIdentity(
  media: MediaResourceDto | undefined,
  src: string | undefined,
) {
  if (!media && (!src || isBrowserNativeUrl(src))) return undefined;
  const record = media as Record<string, unknown> | undefined;
  return mediaIdentityFromResource({
    downloadUrl: stringValue(record?.downloadUrl) ?? stringValue(record?.download_url),
    fileId: stringValue(record?.fileId) ?? stringValue(record?.file_id),
    fileName: mediaFileName(media),
    mediaId: stringValue(record?.mediaId) ?? stringValue(record?.media_id),
    objectKey: stringValue(record?.objectKey) ?? stringValue(record?.object_key),
    relativePath: stringValue(record?.relativePath) ?? stringValue(record?.relative_path),
    resourceId: stringValue(record?.resourceId) ?? stringValue(record?.resource_id),
    signedUrl: stringValue(record?.signedUrl) ?? stringValue(record?.signed_url),
    storageKey: stringValue(record?.storageKey) ?? stringValue(record?.storage_key),
    url: src ?? stringValue(record?.url) ?? stringValue(record?.fileUrl),
  }).value;
}

function stringValue(value: unknown) {
  return typeof value === "string" ? value : undefined;
}
