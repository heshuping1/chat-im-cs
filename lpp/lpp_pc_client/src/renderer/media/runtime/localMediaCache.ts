import type { CachedMediaFileResult } from "../../../shared/desktop-api";
import type { ComposerMediaKind } from "../../composer/domain/detectComposerMediaKind";

export async function cacheLocalSentMediaForDesktop({
  accountId,
  conversationId,
  file,
  kind,
  localMessageId,
  localPreviewUrl,
}: {
  accountId?: string;
  conversationId?: string;
  file: File;
  kind: ComposerMediaKind;
  localMessageId: string;
  localPreviewUrl?: string;
}): Promise<CachedMediaFileResult | undefined> {
  if (!window.desktopApi?.cacheLocalMediaFile) return undefined;
  const mediaKind = kind === "image" ? "image" : kind === "video" ? "video" : "file";
  return window.desktopApi.cacheLocalMediaFile(
    {
      accountId,
      conversationId,
      fileName: file.name || defaultLocalMediaFileName(mediaKind),
      kind: mediaKind,
      url: localSentMediaCacheKey(mediaKind, localMessageId, localPreviewUrl),
    },
    file,
  );
}

function localSentMediaCacheKey(
  kind: "image" | "video" | "file",
  localMessageId: string,
  localPreviewUrl?: string,
) {
  if (localPreviewUrl?.startsWith(`local-${kind}:`)) return localPreviewUrl;
  return `local-${kind}:${localMessageId}`;
}

function defaultLocalMediaFileName(kind: "image" | "video" | "file") {
  if (kind === "image") return "image.png";
  if (kind === "video") return "video.mp4";
  return "file";
}
