import { Mic } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import type { CSSProperties, SyntheticEvent } from "react";

import type { MediaResourceDto } from "../../../data/api-client";
import {
  imageMediaCacheKey,
  isBrowserNativeUrl,
  resolveMediaUrl,
} from "../../../data/im-message-normalize";
import { ImageMessageFrame } from "../../../media/components/ImageMessageFrame";
import { VideoMessagePreview } from "../../../media/components/VideoMessagePreview";
import type { ImMediaItem } from "../../../media/domain/mediaMessage";
import {
  getPrefetchedImageFileUrl,
  subscribeImagePrecache,
} from "../../../media/runtime/imagePrecache";
import {
  imageVisibleSource,
  sameMediaUrl,
  useCachedImageMediaUrl,
} from "../../../media/runtime/useCachedImageMediaUrl";
import {
  inlineVideoPreviewSrc,
  mediaUrlKind,
  openDesktopVideoPlayer,
  videoOpenErrorSummary,
  type VideoPlayerOpenDiagnostic,
} from "../../../media/runtime/videoPlayer";
import {
  isVideoSourceReady,
  markVideoSourceReady,
  useVideoPosterSource,
} from "../../../media/runtime/videoPosterRuntime";
import {
  videoUploadOverlayState,
  type LocalUploadState,
  type UploadActionHandler,
} from "../../../media/runtime/uploadState";
import { logMessageCenterDiagnostic } from "../../diagnostics/message-center-diagnostics";
import { getCurrentMediaActionCapabilities } from "../../runtime/mediaActionCapabilities";
import {
  cacheCurrentMessageImageFile,
  copyCurrentMessageImage,
  revealCurrentMessageImageInFolder,
  saveCurrentMessageImageAs,
} from "../../runtime/messageMediaDesktopActions";
import type { MessageMediaCacheContext } from "./FileMessageContent";
import { formatError } from "../../../lib/format";

export function ImagePart({
  authToken,
  item,
  mediaCacheContext,
}: {
  authToken?: string;
  item?: ImMediaItem;
  mediaCacheContext?: MessageMediaCacheContext;
  uploadState?: LocalUploadState;
  onUploadAction?: UploadActionHandler;
}) {
  const media = item?.media;
  const src = item?.sourceUrl;
  const imageActionSrc =
    item?.localOpenUrl ||
    item?.remoteSourceUrl ||
    (src && !isTransientImageUrl(src) ? src : undefined);
  const fileName = item?.fileName;
  const localImage = Boolean(
    typeof src === "string" && (src.startsWith("blob:") || src.startsWith("data:")),
  );
  const cacheKey = item?.imageCacheKey ?? imageMediaCacheKey(media, src);
  const { cached, displaySrc, failed, loadCachedMedia } = useCachedImageMediaUrl(
    src,
    authToken,
    cacheKey,
  );
  const imageSrc = localImage ? src : displaySrc;
  const [localFileSrc, setLocalFileSrc] = useState<string | null>(
    () => getPrefetchedImageFileUrl(cacheKey) ?? null,
  );
  const [brokenImageSrc, setBrokenImageSrc] = useState<string | null>(null);
  const [imageLoaded, setImageLoaded] = useState(localImage);
  const [imageActionBusy, setImageActionBusy] = useState(false);
  const [imageActionNotice, setImageActionNotice] = useState<string | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const { canCacheMediaFile } = getCurrentMediaActionCapabilities();

  useEffect(() => {
    const prefetched = getPrefetchedImageFileUrl(cacheKey);
    setLocalFileSrc(prefetched ?? null);
    if (!cacheKey) return undefined;
    return subscribeImagePrecache(cacheKey, (fileUrl) => {
      setBrokenImageSrc((current) => (current && sameMediaUrl(current, fileUrl) ? null : current));
      setLocalFileSrc(fileUrl);
    });
  }, [cacheKey]);

  useEffect(() => {
    let disposed = false;
    setBrokenImageSrc(null);
    if (
      !src ||
      localImage ||
      !canCacheMediaFile ||
      (cacheKey && getPrefetchedImageFileUrl(cacheKey))
    ) {
      return undefined;
    }
    void cacheCurrentMessageImageFile({
      url: src,
      fileName: fileName || "image.png",
      kind: "image",
      authToken,
      accountId: mediaCacheContext?.accountId,
      conversationId: mediaCacheContext?.conversationId,
    })
      .then((result) => {
        if (!disposed && result) setLocalFileSrc(result.fileUrl);
      })
      .catch(() => undefined);
    return () => {
      disposed = true;
    };
  }, [
    authToken,
    canCacheMediaFile,
    fileName,
    localImage,
    mediaCacheContext?.accountId,
    mediaCacheContext?.conversationId,
    cacheKey,
    src,
  ]);

  useEffect(() => {
    const nextVisibleImageSrc = imageVisibleSource(localFileSrc, imageSrc, brokenImageSrc);
    setImageLoaded(localImage || Boolean(nextVisibleImageSrc && cached));
  }, [brokenImageSrc, cached, imageSrc, localFileSrc, localImage]);

  const visibleImageSrc = imageVisibleSource(localFileSrc, imageSrc, brokenImageSrc);
  const imageActionPayload = imageActionSrc
    ? {
        url: imageActionSrc,
        fileName: fileName || "image.png",
        kind: "image" as const,
        authToken,
        accountId: mediaCacheContext?.accountId,
        conversationId: mediaCacheContext?.conversationId,
      }
    : undefined;

  const handleImageError = (event: SyntheticEvent<HTMLImageElement>) => {
    const failedSrc = event.currentTarget.currentSrc || event.currentTarget.src || visibleImageSrc;
    if (failedSrc) setBrokenImageSrc(failedSrc);
    setImageLoaded(false);
    if (failedSrc && localFileSrc && sameMediaUrl(failedSrc, localFileSrc)) {
      setLocalFileSrc(null);
    }
    loadCachedMedia();
  };
  const runImageAction = useCallback(
    async (action: () => Promise<unknown>, successText: string) => {
      setImageActionBusy(true);
      setImageActionNotice(null);
      try {
        await action();
        setImageActionNotice(successText);
        window.setTimeout(() => setImageActionNotice(null), 1800);
      } catch (error) {
        setImageActionNotice(formatError(error));
      } finally {
        setImageActionBusy(false);
      }
    },
    [],
  );

  return (
    <div className="message-media">
      <ImageMessageFrame
        altText={fileName || "图片消息"}
        actionBusy={imageActionBusy}
        actionNotice={imageActionNotice}
        fileName={fileName}
        imageLoaded={imageLoaded}
        onClosePreview={() => setPreviewOpen(false)}
        onCopyImage={
          imageActionPayload
            ? () =>
                runImageAction(
                  () => copyCurrentMessageImage(imageActionPayload),
                  "图片已复制",
                )
            : undefined
        }
        onImageError={handleImageError}
        onImageLoad={() => {
          setImageLoaded(true);
          setBrokenImageSrc((current) =>
            current && sameMediaUrl(current, visibleImageSrc) ? null : current,
          );
        }}
        onOpenPreview={() => {
          if (imageLoaded && visibleImageSrc) setPreviewOpen(true);
        }}
        onRetryImage={() => {
          setBrokenImageSrc(null);
          setImageLoaded(localImage);
          loadCachedMedia();
        }}
        onRevealImage={
          imageActionPayload
            ? () =>
                runImageAction(
                  () => revealCurrentMessageImageInFolder(imageActionPayload),
                  "已打开文件位置",
                )
            : undefined
        }
        onSaveImageAs={
          imageActionPayload
            ? () =>
                runImageAction(
                  () => saveCurrentMessageImageAs(imageActionPayload),
                  "已另存图片",
                )
            : undefined
        }
        previewOpen={previewOpen}
        sourceAvailable={Boolean(visibleImageSrc || (src && !failed))}
        src={visibleImageSrc}
      />
    </div>
  );
}

function isTransientImageUrl(value: string) {
  return /^(blob:|data:)/i.test(value);
}

export function VoicePart({
  assetBaseUrl,
  authToken,
  media,
}: {
  assetBaseUrl?: string;
  authToken?: string;
  media?: MediaResourceDto;
}) {
  const src = resolveMediaUrl(
    media,
    assetBaseUrl,
    "url",
    "downloadUrl",
    "signedUrl",
    "fileUrl",
    "uri",
    "path",
  );
  const { displaySrc, failed, loadAuthenticatedMedia } = useAuthenticatedMediaUrl(
    src,
    authToken,
  );

  return (
    <div className="message-audio-card">
      <Mic size={20} />
      <div>
        <strong>语音消息</strong>
        <em>{formatDuration(media?.durationSeconds)}</em>
      </div>
      {displaySrc && !failed ? (
        <audio
          aria-label="语音消息播放器"
          controls
          preload="metadata"
          src={displaySrc}
          onError={loadAuthenticatedMedia}
        />
      ) : (
        <span className="message-media-unavailable">暂无音频地址</span>
      )}
    </div>
  );
}

export function VideoPart({
  authToken,
  item,
  mediaCacheContext,
  uploadState,
  onUploadAction,
}: {
  authToken?: string;
  item?: ImMediaItem;
  mediaCacheContext?: MessageMediaCacheContext;
  uploadState?: LocalUploadState;
  onUploadAction?: UploadActionHandler;
}) {
  const media = item?.media;
  const remoteSrc = item?.remoteSourceUrl;
  const src = item?.sourceUrl;
  const openSrc = item?.localOpenUrl || src;
  const previewSrc = inlineVideoPreviewSrc(src);
  const poster = item?.posterUrl;
  const { displaySrc, failed, loadAuthenticatedMedia } = useAuthenticatedMediaUrl(
    previewSrc,
    authToken,
  );
  const [playing, setPlaying] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [openError, setOpenError] = useState(false);
  const [duration, setDuration] = useState<number | undefined>(media?.durationSeconds);
  const [videoSize, setVideoSize] = useState<{ width: number; height: number } | null>(
    typeof media?.width === "number" && typeof media?.height === "number"
      ? { width: media.width, height: media.height }
      : null,
  );
  const [frameReady, setFrameReady] = useState(() =>
    isVideoSourceReady(displaySrc),
  );
  const { canOpenVideoPlayer } = getCurrentMediaActionCapabilities();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const uploadOverlay = videoUploadOverlayState(uploadState);
  const videoAspectRatio = videoBubbleAspectRatio(videoSize, media);
  const videoCardStyle = videoAspectRatio
    ? ({ "--video-bubble-aspect": String(videoAspectRatio) } as CSSProperties)
    : undefined;
  useEffect(() => {
    setFrameReady(isVideoSourceReady(displaySrc));
  }, [displaySrc]);
  const handlePosterReady = useCallback(() => setFrameReady(true), []);
  const { posterSrc } = useVideoPosterSource({
    authToken,
    displaySrc,
    explicitPoster: poster,
    media,
    mediaCacheContext,
    onPosterReady: handlePosterReady,
  });
  const markFrameReady = () => {
    markVideoSourceReady(displaySrc);
    setFrameReady(true);
  };
  const openWechatVideoPlayer = () => {
    videoRef.current?.pause();
    setOpenError(false);
    if (!uploadOverlay.canPlay) return;
    if (!openSrc || previewLoading) return;
    logVideoOpenDiagnostic("video.open_attempt", "ok", {
      hasLocalOpenUrl: Boolean(item?.localOpenUrl),
      openSrc,
      posterSrc,
      remoteSrc,
    });
    setPreviewLoading(true);
    void openDesktopVideoPlayer({
      authToken,
      displaySrc: openSrc,
      durationSeconds: duration,
      localOpenSrc: item?.localOpenUrl,
      media,
      mediaCacheContext,
      onDiagnostic: (diagnostic) =>
        logVideoOpenRuntimeDiagnostic(diagnostic, {
          openSrc,
          posterSrc,
          remoteSrc,
        }),
      posterSrc,
      remoteSrc,
      videoSize,
    })
      .then((opened) => {
        if (opened) {
          logVideoOpenDiagnostic("video.open_success", "ok", {
            hasLocalOpenUrl: Boolean(item?.localOpenUrl),
            openSrc,
            posterSrc,
            remoteSrc,
          });
          return;
        }
        if (!canOpenVideoPlayer && openSrc) {
          openBrowserVideoFallback(openSrc);
          return;
        }
        logVideoOpenDiagnostic("video.open_failed", "failed", {
          hasLocalOpenUrl: Boolean(item?.localOpenUrl),
          openSrc,
          posterSrc,
          reason: "no_desktop_player",
          remoteSrc,
        });
        setOpenError(true);
      })
      .catch((error) => {
        if (!canOpenVideoPlayer && openSrc) {
          openBrowserVideoFallback(openSrc);
          return;
        }
        logVideoOpenDiagnostic("video.open_failed", "failed", {
          hasLocalOpenUrl: Boolean(item?.localOpenUrl),
          openSrc,
          posterSrc,
          reason: videoOpenErrorSummary(error),
          remoteSrc,
        });
        setOpenError(true);
      })
      .finally(() => setPreviewLoading(false));
  };

  return (
    <div className="message-video-card wechat-video-card" style={videoCardStyle}>
      <VideoMessagePreview
        aspectRatio={videoAspectRatio}
        durationText={formatVideoDuration(duration)}
        failed={failed}
        frameReady={frameReady}
        hasStarted={hasStarted}
        loading={previewLoading}
        onCanPlay={markFrameReady}
        onClick={openWechatVideoPlayer}
        onEnded={() => setPlaying(false)}
        onError={loadAuthenticatedMedia}
        onKeyDown={(event) => {
          if (event.key !== "Enter" && event.key !== " ") return;
          event.preventDefault();
          openWechatVideoPlayer();
        }}
        onLoadedData={markFrameReady}
        onLoadedMetadata={(event) => {
          const nextDuration = event.currentTarget.duration;
          if (Number.isFinite(nextDuration) && nextDuration > 0) {
            setDuration(nextDuration);
          }
          const { videoWidth, videoHeight } = event.currentTarget;
          if (videoWidth > 0 && videoHeight > 0) {
            setVideoSize({ width: videoWidth, height: videoHeight });
          }
        }}
        onPause={() => setPlaying(false)}
        onPlay={() => {
          setHasStarted(true);
          setPlaying(true);
        }}
        onUploadOverlayAction={(action) => {
          if (uploadOverlay.taskId) onUploadAction?.(uploadOverlay.taskId, action);
        }}
        openError={openError}
        openable={Boolean(openSrc)}
        playing={playing}
        posterSrc={posterSrc}
        src={displaySrc}
        uploadOverlay={uploadOverlay}
        videoRef={videoRef}
      />
    </div>
  );
}

function openBrowserVideoFallback(fallbackSrc: string) {
  window.open(fallbackSrc, "_blank", "noopener,noreferrer");
}

function logVideoOpenRuntimeDiagnostic(
  diagnostic: VideoPlayerOpenDiagnostic,
  context: {
    openSrc?: string;
    posterSrc?: string;
    remoteSrc?: string;
  },
) {
  if (diagnostic.event === "open.prepare") {
    logVideoOpenDiagnostic("video.open_prepare", "ok", {
      ...context,
      hasLocalOpenUrl: diagnostic.hasLocalOpenUrl,
      openedWithInitialFileUrl: diagnostic.openedWithInitialFileUrl,
      prepareElapsedMs: diagnostic.prepareElapsedMs,
      sourceKind: diagnostic.sourceKind,
    });
    return;
  }
  logVideoOpenDiagnostic("video.poster_ignored", "ignored", {
    ...context,
    posterKind: diagnostic.posterKind,
    reason: diagnostic.reason,
    sourceKind: diagnostic.sourceKind,
  });
}

function logVideoOpenDiagnostic(
  event: "video.open_attempt" | "video.open_failed" | "video.open_prepare" | "video.open_success" | "video.poster_ignored",
  result: "ok" | "ignored" | "failed",
  {
    hasLocalOpenUrl,
    openSrc,
    openedWithInitialFileUrl,
    posterKind,
    posterSrc,
    prepareElapsedMs,
    reason,
    remoteSrc,
    sourceKind,
  }: {
    hasLocalOpenUrl?: boolean;
    openSrc?: string;
    openedWithInitialFileUrl?: boolean;
    posterKind?: string;
    posterSrc?: string;
    prepareElapsedMs?: number;
    reason?: string;
    remoteSrc?: string;
    sourceKind?: string;
  },
) {
  logMessageCenterDiagnostic({
    event,
    phase: "media",
    result,
    reason,
    context: {
      hasLocalCache: mediaUrlKind(openSrc) === "file",
      hasLocalOpenUrl: hasLocalOpenUrl ?? mediaUrlKind(openSrc) === "file",
      hasRemoteSource: Boolean(remoteSrc),
      openedWithInitialFileUrl,
      posterKind: posterKind ?? mediaUrlKind(posterSrc),
      prepareElapsedMs,
      sourceKind: sourceKind ?? mediaUrlKind(openSrc),
    },
  });
}

function formatDuration(value?: number | null) {
  if (!value || value <= 0) return "未知时长";
  const seconds = Math.round(value);
  if (seconds < 60) return `${seconds} 秒`;
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}

function formatVideoDuration(value?: number | null) {
  if (!value || value <= 0) return "未知时长";
  const seconds = Math.round(value);
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}

function videoBubbleAspectRatio(
  videoSize: { width: number; height: number } | null,
  media?: MediaResourceDto,
) {
  const width = videoSize?.width ?? media?.width;
  const height = videoSize?.height ?? media?.height;
  if (!width || !height || width <= 0 || height <= 0) return undefined;
  return Math.max(0.5625, Math.min(1.7778, width / height));
}

function useAuthenticatedMediaUrl(src: string | undefined, authToken: string | undefined) {
  const [failed, setFailed] = useState(false);
  const [blobSrc, setBlobSrc] = useState<string | null>(null);

  useEffect(() => {
    setFailed(false);
    setBlobSrc(null);
  }, [src]);

  useEffect(() => {
    return () => {
      if (blobSrc) URL.revokeObjectURL(blobSrc);
    };
  }, [blobSrc]);

  const loadAuthenticatedMedia = () => {
    if (!src || !authToken || isBrowserNativeUrl(src) || blobSrc) {
      setFailed(true);
      return;
    }
    void fetch(src, {
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
    })
      .then((response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return response.blob();
      })
      .then((blob) => {
        setBlobSrc((current) => {
          if (current) URL.revokeObjectURL(current);
          return URL.createObjectURL(blob);
        });
      })
      .catch(() => {
        setFailed(true);
      });
  };

  return { displaySrc: blobSrc ?? src, failed, loadAuthenticatedMedia };
}
