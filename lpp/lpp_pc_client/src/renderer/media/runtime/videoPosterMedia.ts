import type { MediaResourceDto } from "../../data/api-client";
import type { VideoPosterResult } from "../../lib/videoPoster";

type VideoPosterUploadKind = "image" | "file" | "voice" | "video";
const serverMediaUrlFields = new Set(["url", "thumbnailUrl"]);
const serverMediaStringFields = new Set(["fileName", "mimeType"]);
const serverMediaNumberFields = new Set(["sizeBytes", "width", "height", "durationSeconds"]);

export async function uploadVideoPosterForSend({
  kind,
  videoPoster,
  videoPosterPromise,
  uploadPoster,
}: {
  kind: VideoPosterUploadKind;
  videoPoster?: VideoPosterResult;
  videoPosterPromise?: Promise<VideoPosterResult | undefined>;
  uploadPoster: (file: File) => Promise<MediaResourceDto>;
}) {
  if (kind !== "video") return {};
  const settledPoster =
    videoPoster ?? (videoPosterPromise ? await videoPosterPromise.catch(() => undefined) : undefined);
  if (!settledPoster) return {};
  return {
    videoPoster: settledPoster,
    uploadedPoster: await uploadPoster(settledPoster.file),
  };
}

export function withVideoPosterMedia(
  media: MediaResourceDto,
  poster?: VideoPosterResult,
  uploadedPoster?: MediaResourceDto,
): MediaResourceDto {
  if (!poster && !uploadedPoster) return media;

  const uploadedPosterUrl = uploadedPoster?.url;
  const localPosterUrl = poster?.url;
  const posterUrl = uploadedPosterUrl || localPosterUrl;

  return {
    ...media,
    thumbnailUrl: posterUrl || media.thumbnailUrl,
    posterUrl,
    localPosterUrl,
    durationSeconds: media.durationSeconds || poster?.durationSeconds,
    width: media.width || poster?.width,
    height: media.height || poster?.height,
  } as MediaResourceDto;
}

export function localMediaResourceForSend({
  file,
  kind,
  localOpenUrl,
  localPreviewUrl,
  videoPoster,
}: {
  file: File;
  kind: VideoPosterUploadKind;
  localOpenUrl?: string;
  localPreviewUrl?: string;
  videoPoster?: VideoPosterResult;
}): MediaResourceDto {
  const media: MediaResourceDto & {
    localOpenUrl?: string;
    localPreviewUrl?: string;
    localPosterUrl?: string;
    posterUrl?: string;
  } = {
    url: localPreviewUrl || "",
    thumbnailUrl: kind === "image" ? localPreviewUrl : undefined,
    fileName: file.name,
    mimeType: file.type,
    sizeBytes: file.size,
    localOpenUrl,
    localPreviewUrl,
  };
  if (kind !== "video" || !videoPoster) return media;
  return withVideoPosterMedia(media, videoPoster);
}

export function sanitizeVideoSendPayload(media: MediaResourceDto): MediaResourceDto {
  const record = media as Record<string, unknown>;
  const payload: Record<string, unknown> = {};
  for (const key of serverMediaUrlFields) {
    const value = record[key];
    if (typeof value === "string" && value.trim() && !isLocalMediaUrl(value)) {
      payload[key] = value.trim();
    }
  }
  for (const key of serverMediaStringFields) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) payload[key] = value;
  }
  for (const key of serverMediaNumberFields) {
    const value = record[key];
    if (typeof value === "number" && Number.isFinite(value)) {
      payload[key] = Math.max(0, Math.round(value));
    }
  }
  return payload as MediaResourceDto;
}

export function requireVideoSendPayload(media: MediaResourceDto): MediaResourceDto {
  const payload = sanitizeVideoSendPayload(media);
  if (!payload.url) throw new Error("视频上传失败：缺少视频地址");
  if (!payload.thumbnailUrl) throw new Error("视频封面上传失败：缺少封面地址");
  return payload;
}

export function videoSendDiagnosticsContext(media?: MediaResourceDto, error?: unknown) {
  const record = media as Record<string, unknown> | undefined;
  const sanitized = media ? sanitizeVideoSendPayload(media) : undefined;
  const apiError = error as {
    code?: unknown;
    requestId?: unknown;
    status?: unknown;
  } | null;
  return {
    status: typeof apiError?.status === "number" ? apiError.status : undefined,
    code: typeof apiError?.code === "string" ? apiError.code : undefined,
    requestId: typeof apiError?.requestId === "string" ? apiError.requestId : undefined,
    hasVideoUrl: Boolean(sanitized?.url),
    hasThumbnailUrl: Boolean(sanitized?.thumbnailUrl),
    durationSecondsType: typeof record?.durationSeconds,
  };
}

function isLocalMediaUrl(value: string) {
  return /^(blob:|data:|file:|local-)/i.test(value.trim());
}
