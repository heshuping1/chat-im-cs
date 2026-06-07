import { Mic } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import type { CSSProperties, SyntheticEvent } from "react";

import type { MediaResourceDto } from "../../../data/api-client";
import {
  imageMediaCacheKey,
  isBrowserNativeUrl,
  mediaStableCacheIdentity,
  resolveMediaUrl,
} from "../../../data/im-message-normalize";
import { ImageMessageFrame } from "../../../media/components/ImageMessageFrame";
import { VideoMessagePreview } from "../../../media/components/VideoMessagePreview";
import type { ImMediaItem } from "../../../media/domain/mediaMessage";
import {
  imagePreviewPresentation,
  videoPreviewPresentation,
  type MediaPreviewDisplayState,
} from "../../../media/domain/mediaPreviewPresentation";
import {
  forgetPrefetchedImageFileUrl,
  getPrefetchedImageFileUrl,
  registerPrefetchedImageFileUrl,
  subscribeImagePrecache,
} from "../../../media/runtime/imagePrecache";
import {
  ensureMaterializedMediaDisplayUrl,
  getMaterializedMediaDisplayUrl,
  getMaterializedMediaFileUrl,
  mediaMaterializationCacheKey,
  subscribeMaterializedMediaDisplayUrl,
  subscribeMaterializedMediaFile,
} from "../../../media/runtime/mediaMaterialization";
import {
  imageDisplayReady,
  imageVisibleSource,
  isInstantLocalImageSource,
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
  initialVideoDurationSeconds,
  rememberVideoDurationSeconds,
} from "../../../media/runtime/videoMetadataRuntime";
import {
  isVideoPosterReady,
  isVideoSourceReady,
  markVideoSourceReady,
  useVideoPosterSource,
  videoPosterFileName,
  videoPosterRenderKey,
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
import { useI18n } from "../../../i18n/useI18n";

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
  const { t } = useI18n();
  const media = item?.media;
  const initialSrc = item?.sourceUrl;
  const imageSourceUrls =
    item?.imageSourceUrls?.length
      ? item.imageSourceUrls
      : initialSrc
        ? [initialSrc]
        : [];
  const imageSourceKey = imageSourceUrls.join("\n");
  const [activeImageSourceIndex, setActiveImageSourceIndex] = useState(0);
  const src = imageSourceUrls[activeImageSourceIndex] ?? imageSourceUrls[0];
  const hasNextImageSource = activeImageSourceIndex < imageSourceUrls.length - 1;
  const imageActionSrc =
    item?.localOpenUrl ||
    item?.remoteSourceUrl ||
    (src && !isTransientImageUrl(src) ? src : undefined);
  const fileName = item?.fileName;
  const localImage = isInstantLocalImageSource(src);
  const cacheKey = item?.imageCacheKey ?? imageMediaCacheKey(media, src);
  const cacheIdentity = mediaStableCacheIdentity(media, src);
  const [localFileSrc, setLocalFileSrc] = useState<string | null>(
    () => getPrefetchedImageFileUrl(cacheKey) ?? null,
  );
  const [localDisplaySrc, setLocalDisplaySrc] = useState<string | null>(
    () => getMaterializedMediaDisplayUrl(cacheKey) ?? null,
  );
  const [brokenImageSrc, setBrokenImageSrc] = useState<string | null>(null);
  const hasMaterializedLocalFile = Boolean(
    localFileSrc && !sameMediaUrl(localFileSrc, brokenImageSrc),
  );
  const hasUsableLocalFile = Boolean(
    localDisplaySrc && !sameMediaUrl(localDisplaySrc, brokenImageSrc),
  );
  const { cached, displaySrc, failed, loadCachedMedia } = useCachedImageMediaUrl(
    hasMaterializedLocalFile || hasUsableLocalFile ? undefined : src,
    authToken,
    cacheKey,
  );
  const imageSrc = localImage ? src : displaySrc;
  const [imageLoaded, setImageLoaded] = useState(localImage);
  const [imageActionBusy, setImageActionBusy] = useState(false);
  const [imageActionNotice, setImageActionNotice] = useState<string | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const { canCacheMediaFile } = getCurrentMediaActionCapabilities();
  const advanceToNextImageSource = useCallback(() => {
    setActiveImageSourceIndex((current) =>
      current < imageSourceUrls.length - 1 ? current + 1 : current,
    );
  }, [imageSourceUrls.length]);

  useEffect(() => {
    setActiveImageSourceIndex(0);
  }, [imageSourceKey]);

  useEffect(() => {
    const prefetched = getPrefetchedImageFileUrl(cacheKey);
    const display = getMaterializedMediaDisplayUrl(cacheKey);
    setLocalFileSrc(prefetched ?? null);
    setLocalDisplaySrc(display ?? null);
    if (!cacheKey) return undefined;
    const unsubscribeFile = subscribeImagePrecache(cacheKey, (fileUrl) => {
      setBrokenImageSrc((current) => (current && sameMediaUrl(current, fileUrl) ? null : current));
      setLocalFileSrc(fileUrl);
    });
    const unsubscribeDisplay = subscribeMaterializedMediaDisplayUrl(cacheKey, (displayUrl) => {
      setBrokenImageSrc((current) =>
        current && sameMediaUrl(current, displayUrl) ? null : current,
      );
      setLocalDisplaySrc(displayUrl);
    });
    return () => {
      unsubscribeFile();
      unsubscribeDisplay();
    };
  }, [cacheKey]);

  useEffect(() => {
    let disposed = false;
    const display = getMaterializedMediaDisplayUrl(cacheKey);
    if (display) {
      setLocalDisplaySrc(display);
      return undefined;
    }
    if (!localFileSrc || !cacheKey) {
      setLocalDisplaySrc(null);
      return undefined;
    }
    void ensureMaterializedMediaDisplayUrl({
      accountId: mediaCacheContext?.accountId,
      authToken,
      cacheIdentity,
      cacheKey,
      conversationId: mediaCacheContext?.conversationId,
      fileName: fileName || "image.png",
      fileUrl: localFileSrc,
      kind: "image",
    })
      .then((displayUrl) => {
        if (!disposed && displayUrl) setLocalDisplaySrc(displayUrl);
      })
      .catch(() => {
        if (!disposed) {
          setLocalDisplaySrc(null);
          setLocalFileSrc(null);
          forgetPrefetchedImageFileUrl(cacheKey, localFileSrc);
        }
      });
    return () => {
      disposed = true;
    };
  }, [
    authToken,
    cacheIdentity,
    cacheKey,
    fileName,
    localFileSrc,
    mediaCacheContext?.accountId,
    mediaCacheContext?.conversationId,
  ]);

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
      cacheIdentity,
      accountId: mediaCacheContext?.accountId,
      conversationId: mediaCacheContext?.conversationId,
    })
      .then((result) => {
        if (!disposed && result) {
          if (cacheKey) registerPrefetchedImageFileUrl(cacheKey, result.fileUrl);
          setLocalFileSrc(result.fileUrl);
        }
      })
      .catch(() => {
        if (!disposed && hasNextImageSource) advanceToNextImageSource();
      });
    return () => {
      disposed = true;
    };
  }, [
    authToken,
    canCacheMediaFile,
    cacheIdentity,
    fileName,
    localImage,
    mediaCacheContext?.accountId,
    mediaCacheContext?.conversationId,
    cacheKey,
    hasNextImageSource,
    src,
    advanceToNextImageSource,
  ]);

  useEffect(() => {
    const nextVisibleImageSrc = imageVisibleSource(localDisplaySrc, imageSrc, brokenImageSrc);
    setImageLoaded(localImage || Boolean(nextVisibleImageSrc && cached));
  }, [brokenImageSrc, cached, imageSrc, localDisplaySrc, localImage]);

  const visibleImageSrc = imageVisibleSource(localDisplaySrc, imageSrc, brokenImageSrc);
  const imageReady =
    imageLoaded ||
    imageDisplayReady({
      cached,
      hasUsableLocalFile,
      localImage,
      src: sameMediaUrl(visibleImageSrc, brokenImageSrc) ? undefined : visibleImageSrc,
    });
  const imageDisplayState: MediaPreviewDisplayState = !visibleImageSrc
    ? "empty"
    : imageReady
      ? "ready"
      : failed
        ? "failed"
        : "loading";
  const imagePresentation = {
    ...(item?.previewPresentation?.previewKind === "image"
      ? item.previewPresentation
      : imagePreviewPresentation()),
    displayState: imageDisplayState,
  };
  useEffect(() => {
    if (failed && hasNextImageSource) advanceToNextImageSource();
  }, [advanceToNextImageSource, failed, hasNextImageSource]);

  const imageActionPayload = imageActionSrc
    ? {
        url: imageActionSrc,
        fileName: fileName || "image.png",
        kind: "image" as const,
        authToken,
        cacheIdentity,
        accountId: mediaCacheContext?.accountId,
        conversationId: mediaCacheContext?.conversationId,
      }
    : undefined;

  const handleImageError = (event: SyntheticEvent<HTMLImageElement>) => {
    const failedSrc = event.currentTarget.currentSrc || event.currentTarget.src || visibleImageSrc;
    if (failedSrc) setBrokenImageSrc(failedSrc);
    setImageLoaded(false);
    if (
      failedSrc &&
      localDisplaySrc &&
      sameMediaUrl(failedSrc, localDisplaySrc)
    ) {
      setLocalDisplaySrc(null);
      setLocalFileSrc(null);
      if (localFileSrc) forgetPrefetchedImageFileUrl(cacheKey, localFileSrc);
    } else if (failedSrc && localFileSrc && sameMediaUrl(failedSrc, localFileSrc)) {
      setLocalFileSrc(null);
      forgetPrefetchedImageFileUrl(cacheKey, localFileSrc);
    }
    loadCachedMedia();
    if (hasNextImageSource) advanceToNextImageSource();
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
        altText={fileName || t("messages.mediaContent.imageMessage")}
        actionBusy={imageActionBusy}
        actionNotice={imageActionNotice}
        fileName={fileName}
        imageLoaded={imageReady}
        onClosePreview={() => setPreviewOpen(false)}
        onCopyImage={
          imageActionPayload
            ? () =>
                runImageAction(
                  () => copyCurrentMessageImage(imageActionPayload),
                  t("messages.mediaContent.imageCopied"),
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
          if (imageReady && visibleImageSrc) setPreviewOpen(true);
        }}
        onRevealImage={
          imageActionPayload
            ? () =>
                runImageAction(
                  () => revealCurrentMessageImageInFolder(imageActionPayload),
                  t("messages.mediaContent.revealedInFolder"),
                )
            : undefined
        }
        onSaveImageAs={
          imageActionPayload
            ? () =>
                runImageAction(
                  () => saveCurrentMessageImageAs(imageActionPayload),
                  t("messages.mediaContent.imageSaved"),
                )
            : undefined
        }
        previewOpen={previewOpen}
        presentation={imagePresentation}
        sourceAvailable={Boolean(visibleImageSrc)}
        src={visibleImageSrc}
      />
    </div>
  );
}

function isTransientImageUrl(value: string) {
  return /^(blob:|data:)/i.test(value);
}

function videoPosterDisplayCacheIdentity(
  media: MediaResourceDto | undefined,
  poster: string | undefined,
) {
  if (!poster || isBrowserNativeUrl(poster)) return undefined;
  const stableIdentity = mediaStableCacheIdentity(media, poster);
  return `video-poster:${stableIdentity || poster}`;
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
  const { t } = useI18n();
  const src = resolveMediaUrl(
    media,
    assetBaseUrl,
    "signedUrl",
    "downloadUrl",
    "url",
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
        <strong>{t("messages.mediaContent.voiceMessage")}</strong>
        <em>{formatDuration(media?.durationSeconds, t)}</em>
      </div>
      {displaySrc && !failed ? (
        <audio
          aria-label={t("messages.mediaContent.voicePlayer")}
          controls
          preload="metadata"
          src={displaySrc}
          onError={loadAuthenticatedMedia}
        />
      ) : (
        <span className="message-media-unavailable">{t("messages.mediaContent.noAudio")}</span>
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
  const { t } = useI18n();
  const media = item?.media;
  const remoteSrc = item?.remoteSourceUrl;
  const src = item?.sourceUrl;
  const videoCacheKey = mediaMaterializationCacheKey("video", media, remoteSrc || src);
  const [localVideoSrc, setLocalVideoSrc] = useState<string | null>(
    () => getMaterializedMediaFileUrl(videoCacheKey) ?? null,
  );
  const [localVideoDisplaySrc, setLocalVideoDisplaySrc] = useState<string | null>(
    () => getMaterializedMediaDisplayUrl(videoCacheKey) ?? null,
  );
  const localVideoOpenSrc = localVideoSrc || item?.localOpenUrl;
  const openSrc = localVideoOpenSrc || remoteSrc || src;
  const {
    canOpenVideoPlayer,
    canReadMediaFileAsDataUrl,
  } = getCurrentMediaActionCapabilities();
  const previewSource = localVideoDisplaySrc || item?.localOpenUrl;
  const previewSrc = inlineVideoPreviewSrc(previewSource, {
    allowDesktopFile: canOpenVideoPlayer || canReadMediaFileAsDataUrl,
  });
  const poster = item?.posterUrl;
  const posterCacheIdentity = videoPosterDisplayCacheIdentity(media, poster);
  const posterCacheKey = posterCacheIdentity;
  const directPosterSrc =
    poster && (isBrowserNativeUrl(poster) || !canReadMediaFileAsDataUrl)
      ? poster
      : undefined;
  const [posterDisplaySrc, setPosterDisplaySrc] = useState<string | null>(
    () => getMaterializedMediaDisplayUrl(posterCacheKey) ?? null,
  );
  const [explicitPosterFailed, setExplicitPosterFailed] = useState(false);
  const { displaySrc, failed, loadAuthenticatedMedia } = useAuthenticatedMediaUrl(
    previewSrc,
    authToken,
  );
  const [playing, setPlaying] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [openError, setOpenError] = useState(false);
  const [duration, setDuration] = useState<number | undefined>(() =>
    initialVideoDurationSeconds(videoCacheKey, media?.durationSeconds),
  );
  const [frameReady, setFrameReady] = useState(() =>
    isVideoSourceReady(displaySrc),
  );
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const uploadOverlay = videoUploadOverlayState(uploadState);
  const videoPresentation =
    item?.previewPresentation?.previewKind === "video"
      ? item.previewPresentation
      : videoPreviewPresentation();
  const videoAspectRatio =
    videoPresentation.previewBox.width / videoPresentation.previewBox.height;
  const videoCardStyle = {
    "--media-preview-video-width": `${videoPresentation.previewBox.width}px`,
    "--media-preview-video-height": `${videoPresentation.previewBox.height}px`,
    "--video-bubble-aspect": String(videoAspectRatio),
  } as CSSProperties;
  useEffect(() => {
    const materialized = getMaterializedMediaFileUrl(videoCacheKey);
    const display = getMaterializedMediaDisplayUrl(videoCacheKey);
    setLocalVideoSrc(materialized ?? null);
    setLocalVideoDisplaySrc(display ?? null);
    const unsubscribeFile = subscribeMaterializedMediaFile(videoCacheKey, setLocalVideoSrc);
    const unsubscribeDisplay = subscribeMaterializedMediaDisplayUrl(
      videoCacheKey,
      setLocalVideoDisplaySrc,
    );
    return () => {
      unsubscribeFile();
      unsubscribeDisplay();
    };
  }, [videoCacheKey]);
  useEffect(() => {
    let disposed = false;
    const display = getMaterializedMediaDisplayUrl(videoCacheKey);
    if (display) {
      setLocalVideoDisplaySrc(display);
      return undefined;
    }
    if (!localVideoSrc || !videoCacheKey) {
      setLocalVideoDisplaySrc(null);
      return undefined;
    }
    void ensureMaterializedMediaDisplayUrl({
      accountId: mediaCacheContext?.accountId,
      authToken,
      cacheIdentity: mediaStableCacheIdentity(media, remoteSrc || src),
      cacheKey: videoCacheKey,
      conversationId: mediaCacheContext?.conversationId,
      fileName: item?.fileName || "video.mp4",
      fileUrl: localVideoSrc,
      kind: "video",
    })
      .then((displayUrl) => {
        if (!disposed && displayUrl) setLocalVideoDisplaySrc(displayUrl);
      })
      .catch(() => {
        if (!disposed) setLocalVideoDisplaySrc(null);
      });
    return () => {
      disposed = true;
    };
  }, [
    authToken,
    item?.fileName,
    localVideoSrc,
    media,
    mediaCacheContext?.accountId,
    mediaCacheContext?.conversationId,
    remoteSrc,
    src,
    videoCacheKey,
  ]);
  useEffect(() => {
    setExplicitPosterFailed(false);
  }, [poster, posterCacheKey]);
  useEffect(() => {
    const display = getMaterializedMediaDisplayUrl(posterCacheKey);
    setPosterDisplaySrc(display ?? null);
    if (!posterCacheKey) return undefined;
    return subscribeMaterializedMediaDisplayUrl(posterCacheKey, setPosterDisplaySrc);
  }, [posterCacheKey]);
  useEffect(() => {
    let disposed = false;
    const display = getMaterializedMediaDisplayUrl(posterCacheKey);
    if (display) {
      setPosterDisplaySrc(display);
      return undefined;
    }
    if (!poster || !posterCacheKey) {
      setPosterDisplaySrc(null);
      return undefined;
    }
    if (isBrowserNativeUrl(poster)) {
      setPosterDisplaySrc(poster);
      return undefined;
    }
    if (!canReadMediaFileAsDataUrl) {
      setPosterDisplaySrc(null);
      return undefined;
    }
    void ensureMaterializedMediaDisplayUrl({
      accountId: mediaCacheContext?.accountId,
      authToken,
      cacheIdentity: posterCacheIdentity,
      cacheKey: posterCacheKey,
      conversationId: mediaCacheContext?.conversationId,
      fileName: videoPosterFileName(item?.fileName || "video.mp4"),
      fileUrl: poster,
      kind: "image",
      preferDesktopRead: true,
    })
      .then((displayUrl) => {
        if (!disposed) setPosterDisplaySrc(displayUrl ?? null);
      })
      .catch(() => {
        if (!disposed) setPosterDisplaySrc(null);
      });
    return () => {
      disposed = true;
    };
  }, [
    authToken,
    item?.fileName,
    mediaCacheContext?.accountId,
    mediaCacheContext?.conversationId,
    poster,
    posterCacheIdentity,
    posterCacheKey,
    canReadMediaFileAsDataUrl,
  ]);
  useEffect(() => {
    setFrameReady(isVideoSourceReady(displaySrc));
  }, [displaySrc]);
  useEffect(() => {
    const nextDuration = initialVideoDurationSeconds(videoCacheKey, media?.durationSeconds);
    setDuration(nextDuration);
    rememberVideoDurationSeconds(videoCacheKey, media?.durationSeconds);
  }, [media?.durationSeconds, videoCacheKey]);
  const handlePosterReady = useCallback(() => setFrameReady(true), []);
  const explicitPosterSrc = explicitPosterFailed
    ? undefined
    : posterDisplaySrc || directPosterSrc;
  const { posterSrc } = useVideoPosterSource({
    authToken,
    displaySrc,
    explicitPoster: explicitPosterSrc,
    media,
    mediaCacheContext,
    onPosterReady: handlePosterReady,
  });
  const posterKey = videoPosterRenderKey(media, posterSrc, displaySrc);
  const posterReadyHint = isVideoPosterReady(posterKey);
  const markFrameReady = () => {
    markVideoSourceReady(displaySrc);
    setFrameReady(true);
  };
  const openWechatVideoPlayer = () => {
    videoRef.current?.pause();
    setOpenError(false);
    if (!uploadOverlay.canPlay) return;
    if (!openSrc || previewLoading) return;
    const hasLocalOpenUrl = Boolean(localVideoOpenSrc);
    logVideoOpenDiagnostic("video.open_attempt", "ok", {
      hasLocalOpenUrl,
      openSrc,
      posterSrc,
      remoteSrc,
    });
    setPreviewLoading(true);
    void openDesktopVideoPlayer({
      authToken,
      displaySrc: openSrc,
      durationSeconds: duration,
      localOpenSrc: localVideoOpenSrc,
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
    })
      .then((opened) => {
        if (opened) {
          logVideoOpenDiagnostic("video.open_success", "ok", {
            hasLocalOpenUrl,
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
          hasLocalOpenUrl,
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
          hasLocalOpenUrl,
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
        durationText={formatVideoDuration(duration, t)}
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
            rememberVideoDurationSeconds(videoCacheKey, nextDuration);
            setDuration(nextDuration);
          }
        }}
        onPause={() => setPlaying(false)}
        onPlay={() => {
          setHasStarted(true);
          setPlaying(true);
        }}
        onPosterError={() => setExplicitPosterFailed(true)}
        onUploadOverlayAction={(action) => {
          if (uploadOverlay.taskId) onUploadAction?.(uploadOverlay.taskId, action);
        }}
        openError={openError}
        openable={Boolean(openSrc)}
        playing={playing}
        posterKey={posterKey}
        posterReadyHint={posterReadyHint}
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

function formatDuration(value: number | null | undefined, t: ReturnType<typeof useI18n>["t"]) {
  if (!value || value <= 0) return t("messages.mediaContent.unknownDuration");
  const seconds = Math.round(value);
  if (seconds < 60) return t("messages.mediaContent.durationSeconds", { seconds });
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}

function formatVideoDuration(value: number | null | undefined, t: ReturnType<typeof useI18n>["t"]) {
  if (!value || value <= 0) return t("messages.mediaContent.unknownDuration");
  const seconds = Math.round(value);
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
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
