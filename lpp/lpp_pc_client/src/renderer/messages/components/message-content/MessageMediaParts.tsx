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
import { UploadControls } from "../../../media/components/UploadControls";
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
import { openDesktopVideoPlayer } from "../../../media/runtime/videoPlayer";
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
import { getCurrentMediaActionCapabilities } from "../../runtime/mediaActionCapabilities";
import { cacheCurrentMessageImageFile } from "../../runtime/messageMediaDesktopActions";
import type { MessageMediaCacheContext } from "./FileMessageContent";

export function ImagePart({
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
  const src = item?.sourceUrl;
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

  const handleImageError = (event: SyntheticEvent<HTMLImageElement>) => {
    const failedSrc = event.currentTarget.currentSrc || event.currentTarget.src || visibleImageSrc;
    if (failedSrc) setBrokenImageSrc(failedSrc);
    setImageLoaded(false);
    if (failedSrc && localFileSrc && sameMediaUrl(failedSrc, localFileSrc)) {
      setLocalFileSrc(null);
    }
    loadCachedMedia();
  };

  return (
    <div className="message-media">
      <ImageMessageFrame
        altText={fileName || "图片消息"}
        fileName={fileName}
        imageLoaded={imageLoaded}
        onClosePreview={() => setPreviewOpen(false)}
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
        previewOpen={previewOpen}
        sourceAvailable={Boolean(src && !failed)}
        src={visibleImageSrc}
      />
      <UploadControls uploadState={uploadState} onUploadAction={onUploadAction} />
    </div>
  );
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
  const poster = item?.posterUrl;
  const { displaySrc, failed, loadAuthenticatedMedia } = useAuthenticatedMediaUrl(
    src,
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
    if (!displaySrc || previewLoading) return;
    setPreviewLoading(true);
    void openDesktopVideoPlayer({
      authToken,
      displaySrc,
      durationSeconds: duration,
      media,
      mediaCacheContext,
      posterSrc,
      remoteSrc,
      videoSize,
    })
      .then((opened) => {
        if (opened) return;
        if (displaySrc) {
          openBrowserVideoFallback(displaySrc);
          return;
        }
        if (canOpenVideoPlayer) setOpenError(true);
      })
      .catch(() => {
        if (displaySrc) {
          openBrowserVideoFallback(displaySrc);
          return;
        }
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
        playing={playing}
        posterSrc={posterSrc}
        src={displaySrc}
        uploadOverlay={uploadOverlay}
        videoRef={videoRef}
      />
      {!uploadOverlay.active && (
        <UploadControls uploadState={uploadState} onUploadAction={onUploadAction} />
      )}
    </div>
  );
}

function openBrowserVideoFallback(fallbackSrc: string) {
  window.open(fallbackSrc, "_blank", "noopener,noreferrer");
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
