import type { MediaResourceDto, MessageItemDto } from "../../data/api-client";
import {
  type NormalizedMessagePart,
  firstMessageMedia,
  imageMediaCacheKey,
  mediaFileName,
  normalizeMessageParts,
  normalizeMessageType,
  resolveMediaUrl,
} from "../../data/im-message-normalize";

export type ImMediaKind = "image" | "file" | "voice" | "video";
export type ChatMediaKind = ImMediaKind;

export type ImMediaItem = {
  kind: ImMediaKind;
  media?: MediaResourceDto;
  fileName: string;
  sourceUrl?: string;
  remoteSourceUrl?: string;
  localOpenUrl?: string;
  localPreviewUrl?: string;
  posterUrl?: string;
  imageCacheKey?: string;
};
export type ChatMediaItem = ImMediaItem & { kind: ChatMediaKind };

export type MediaCacheContext = {
  accountId?: string;
  conversationId?: string;
  fileName?: string;
};

export type MessageMediaActionPayload = {
  url: string;
  fileName: string;
  kind: "image" | "video" | "file";
  authToken?: string;
  accountId?: string;
  conversationId?: string;
};

export type MessageVideoPlayerPayload = MessageMediaActionPayload & {
  posterUrl?: string;
  width?: number;
  height?: number;
  durationSeconds?: number;
  sizeBytes?: number;
  title?: string;
};

export function normalizeMediaPart({
  assetBaseUrl,
  fallback,
  part,
}: {
  assetBaseUrl?: string;
  fallback?: string;
  part: NormalizedMessagePart;
}): ImMediaItem | undefined {
  if (
    part.type !== "image" &&
    part.type !== "file" &&
    part.type !== "voice" &&
    part.type !== "video"
  ) {
    return undefined;
  }

  const media = part.media;
  const localPreviewUrl = mediaStringField(media, "localPreviewUrl");
  const localOpenUrl = mediaStringField(media, "localOpenUrl");
  const remoteSourceUrl =
    part.type === "image"
      ? imageActionSourceUrl(media, assetBaseUrl)
      : mediaSourceUrl(part.type, media, assetBaseUrl);
  const sourceUrl =
    part.type === "image"
      ? localPreviewUrl || imageVisualSourceUrl(media, assetBaseUrl) || localOpenUrl
      : localPreviewUrl || remoteSourceUrl;
  const fileName = normalizedMediaFileName(part.type, media, fallback);
  return {
    kind: part.type,
    media,
    fileName,
    sourceUrl,
    remoteSourceUrl,
    localOpenUrl,
    localPreviewUrl,
    posterUrl: part.type === "video"
      ? videoPosterUrl(media, assetBaseUrl, Boolean(localPreviewUrl))
      : undefined,
    imageCacheKey: part.type === "image" ? imageMediaCacheKey(media, sourceUrl) : undefined,
  };
}

export function chatMediaItemsFromMessage({
  assetBaseUrl,
  message,
}: {
  assetBaseUrl?: string;
  message: MessageItemDto;
}): ChatMediaItem[] {
  return normalizeMessageParts(message)
    .map((part) =>
      normalizeMediaPart({
        assetBaseUrl,
        fallback: message.preview,
        part,
      }),
    )
    .filter((item): item is ChatMediaItem => Boolean(item));
}

export function messageMediaFileName(message: MessageItemDto) {
  const media = firstMessageMedia(message);
  return mediaFileName(media) || messageMediaFallbackName(message);
}

export function messageMediaKind(message: MessageItemDto): "image" | "video" | "file" {
  const type = normalizeMessageType(message);
  if (type.includes("image") || message.body?.image) return "image";
  if (type.includes("video") || message.body?.video) return "video";
  return "file";
}

export function hasOpenableMessageMedia(
  message: MessageItemDto,
  assetBaseUrl?: string,
) {
  return Boolean(resolveMessageMediaUrl(message, assetBaseUrl));
}

export function resolveMessageMediaUrl(
  message: MessageItemDto,
  assetBaseUrl?: string,
) {
  const media = firstMessageMedia(message);
  const baseUrl = assetBaseUrl || globalThis.location?.origin;
  const kind = messageMediaKind(message);
  const raw =
    kind === "image"
      ? resolveMediaUrl(
          media,
          baseUrl,
          "localOpenUrl",
          "url",
          "downloadUrl",
          "signedUrl",
          "fileUrl",
          "uri",
          "path",
          "thumbnailUrl",
          "thumbUrl",
          "previewUrl",
        )
      : resolveMediaUrl(
          media,
          baseUrl,
          "localOpenUrl",
          "url",
          "downloadUrl",
          "signedUrl",
          "fileUrl",
          "uri",
          "path",
          "thumbnailUrl",
        );
  if (!raw) return undefined;
  try {
    return new URL(raw, baseUrl).toString();
  } catch {
    return raw;
  }
}

export function messageMediaActionPayload({
  authToken,
  cacheContext,
  message,
  url,
}: {
  authToken?: string;
  cacheContext?: MediaCacheContext;
  message: MessageItemDto;
  url: string;
}): MessageMediaActionPayload {
  return {
    url,
    fileName: cacheContext?.fileName || messageMediaFileName(message),
    kind: messageMediaKind(message),
    authToken,
    accountId: cacheContext?.accountId,
    conversationId: cacheContext?.conversationId,
  };
}

export function messageVideoPlayerPayload({
  authToken,
  cacheContext,
  message,
  url,
}: {
  authToken?: string;
  cacheContext?: MediaCacheContext;
  message: MessageItemDto;
  url: string;
}): MessageVideoPlayerPayload {
  const media = firstMessageMedia(message);
  const posterUrl = resolveMediaUrl(
    media,
    globalThis.location?.origin,
    "thumbnailUrl",
    "posterUrl",
    "thumbUrl",
    "previewUrl",
    "coverUrl",
    "cover",
    "localPosterUrl",
  );
  return {
    ...messageMediaActionPayload({ authToken, cacheContext, message, url }),
    posterUrl,
    width: typeof media?.width === "number" ? media.width : undefined,
    height: typeof media?.height === "number" ? media.height : undefined,
    durationSeconds:
      typeof media?.durationSeconds === "number" ? media.durationSeconds : undefined,
    sizeBytes: typeof media?.sizeBytes === "number" ? media.sizeBytes : undefined,
    title: messageMediaFileName(message),
  };
}

function mediaSourceUrl(
  kind: ImMediaKind,
  media: MediaResourceDto | undefined,
  assetBaseUrl: string | undefined,
) {
  if (kind === "image") {
    return resolveMediaUrl(
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
  }
  return resolveMediaUrl(
    media,
    assetBaseUrl,
    "url",
    "downloadUrl",
    "signedUrl",
    "fileUrl",
    "uri",
    "path",
  );
}

function imageVisualSourceUrl(
  media: MediaResourceDto | undefined,
  assetBaseUrl: string | undefined,
) {
  return resolveMediaUrl(
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
}

function imageActionSourceUrl(
  media: MediaResourceDto | undefined,
  assetBaseUrl: string | undefined,
) {
  return resolveMediaUrl(
    media,
    assetBaseUrl,
    "url",
    "downloadUrl",
    "signedUrl",
    "fileUrl",
    "uri",
    "path",
    "thumbnailUrl",
    "thumbUrl",
    "previewUrl",
  );
}

function videoPosterUrl(
  media: MediaResourceDto | undefined,
  assetBaseUrl: string | undefined,
  hasLocalPreview: boolean,
) {
  const posterKeys = hasLocalPreview
    ? [
        "localPosterUrl",
        "thumbnailUrl",
        "posterUrl",
        "thumbUrl",
        "previewUrl",
        "coverUrl",
        "cover",
      ]
    : [
        "thumbnailUrl",
        "posterUrl",
        "thumbUrl",
        "previewUrl",
        "coverUrl",
        "cover",
        "localPosterUrl",
      ];
  return resolveMediaUrl(media, assetBaseUrl, ...posterKeys);
}

function normalizedMediaFileName(
  kind: ImMediaKind,
  media: MediaResourceDto | undefined,
  fallback: string | undefined,
) {
  const fromMedia = mediaFileName(media);
  if (fromMedia) return fromMedia;
  if (fallback && kind === "file") return fallback;
  if (kind === "image") return "image.png";
  if (kind === "video") return "video.mp4";
  if (kind === "voice") return "voice.mp3";
  return "file";
}

function messageMediaFallbackName(message: MessageItemDto) {
  const type = normalizeMessageType(message);
  if (type.includes("image")) return "lpp-image.jpg";
  if (type.includes("video")) return "lpp-video.mp4";
  if (type.includes("voice") || type.includes("audio")) return "lpp-voice.m4a";
  return "lpp-file";
}

function mediaStringField(media: MediaResourceDto | undefined, key: string) {
  const value = (media as Record<string, unknown> | undefined)?.[key];
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}
