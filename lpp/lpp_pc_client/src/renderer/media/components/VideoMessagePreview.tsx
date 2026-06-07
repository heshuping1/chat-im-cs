import { AlertCircle, Pause, Play, RotateCcw, Video } from "lucide-react";
import { useEffect, useState } from "react";
import type {
  CSSProperties,
  KeyboardEvent,
  MouseEvent,
  RefObject,
  SyntheticEvent,
} from "react";
import { videoPreviewPreloadMode } from "../runtime/mediaPerformancePolicy";
import {
  initialVideoPosterLoadState,
  markVideoPosterReady,
  readyVideoPosterSrc,
} from "../runtime/videoPosterRuntime";
import type {
  UploadAction,
  VideoUploadOverlayState,
} from "../runtime/uploadState";
import { useI18n } from "../../i18n/useI18n";

export function VideoMessagePreview({
  durationText,
  failed,
  frameReady,
  hasStarted,
  loading,
  onCanPlay,
  onClick,
  onError,
  onKeyDown,
  onLoadedData,
  onLoadedMetadata,
  onPause,
  onPlay,
  onEnded,
  onPosterError,
  onUploadOverlayAction,
  openError,
  openable,
  aspectRatio,
  playing,
  posterKey,
  posterReadyHint,
  posterSrc,
  src,
  uploadOverlay,
  videoRef,
}: {
  durationText: string;
  failed: boolean;
  frameReady: boolean;
  hasStarted: boolean;
  loading: boolean;
  onCanPlay: () => void;
  onClick: () => void;
  onError: () => void;
  onKeyDown: (event: KeyboardEvent<HTMLDivElement>) => void;
  onLoadedData: () => void;
  onLoadedMetadata: (event: SyntheticEvent<HTMLVideoElement>) => void;
  onPause: () => void;
  onPlay: () => void;
  onEnded: () => void;
  onPosterError?: () => void;
  onUploadOverlayAction?: (action: UploadAction) => void;
  openError: boolean;
  openable?: boolean;
  aspectRatio?: number;
  playing: boolean;
  posterKey?: string;
  posterReadyHint?: boolean;
  posterSrc?: string;
  src?: string;
  uploadOverlay?: VideoUploadOverlayState;
  videoRef: RefObject<HTMLVideoElement>;
}) {
  const { t } = useI18n();
  const [posterLoadState, setPosterLoadState] = useState<
    "idle" | "loading" | "ready" | "failed"
  >(() => initialVideoPosterLoadState({ posterKey, posterReadyHint, posterSrc }));
  useEffect(() => {
    setPosterLoadState(
      initialVideoPosterLoadState({ posterKey, posterReadyHint, posterSrc }),
    );
  }, [posterKey, posterReadyHint, posterSrc]);

  const canAttemptOpen = Boolean(openable ?? src);
  if (!src && !posterSrc && !canAttemptOpen) {
    return (
      <div
        className="message-video-fallback"
        role="img"
        aria-label={t("media.video.message")}
      >
        <Video size={24} aria-hidden="true" />
      </div>
    );
  }
  const frameStyle = {
    ...(aspectRatio ? { "--video-bubble-aspect": String(aspectRatio) } : {}),
  } as CSSProperties;
  const hasVisiblePoster = Boolean(posterSrc && posterLoadState === "ready");
  const visiblePosterSrc =
    posterLoadState === "ready" ? readyVideoPosterSrc(posterKey) ?? posterSrc : posterSrc;
  const posterStateClass = !posterSrc
    ? "poster-none"
    : posterLoadState === "ready"
      ? "poster-ready"
      : posterLoadState === "failed"
        ? "poster-failed"
        : "poster-loading";
  const preloadMode = videoPreviewPreloadMode({ hasStarted, playing });
  const uploadActive = Boolean(uploadOverlay?.active);
  const uploadAction = uploadOverlay?.action;
  const showUploadLabel =
    uploadOverlay?.icon === "retry" || uploadOverlay?.icon === "canceled";
  const isDeterminateUpload = uploadOverlay?.progressMode === "determinate";
  const uploadProgress = Math.max(0, Math.min(100, uploadOverlay?.progress ?? 0));
  const showUploadPercent =
    uploadActive && isDeterminateUpload && uploadOverlay?.icon === "pause";
  const uploadPercentText = `${Math.round(uploadProgress)}%`;
  const showFrameLoading = Boolean(src && !failed && !frameReady);
  const uploadRingCircumference = 176;
  const uploadRingStyle = {
    "--video-upload-ring-offset": String(
      uploadRingCircumference - (uploadProgress / 100) * uploadRingCircumference,
    ),
  } as CSSProperties;
  const triggerUploadOverlayAction = (action: UploadAction) => {
    onUploadOverlayAction?.(action);
  };
  const handleFrameClick = () => {
    if (uploadActive && uploadAction) {
      triggerUploadOverlayAction(uploadAction);
      return;
    }
    if (uploadActive || !canAttemptOpen) return;
    onClick();
  };
  const handleFrameKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    if (uploadActive && uploadAction) {
      event.preventDefault();
      triggerUploadOverlayAction(uploadAction);
      return;
    }
    if (uploadActive || !canAttemptOpen) return;
    onKeyDown(event);
  };
  const handleUploadActionClick = (event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    if (uploadAction) triggerUploadOverlayAction(uploadAction);
  };

  return (
    <div
      className={`message-video-frame ${playing ? "is-playing" : ""} ${
        frameReady || hasVisiblePoster || !src ? "is-ready" : "is-loading"
      } ${hasStarted ? "was-played" : ""} ${
        hasVisiblePoster ? "has-poster" : "no-poster"
      } ${posterStateClass} ${canAttemptOpen ? "is-playable" : "is-unplayable"} ${
        uploadActive ? `is-uploading upload-${uploadOverlay?.icon ?? "pause"}` : ""
      }`}
      style={frameStyle}
      role={
        uploadActive && uploadAction
          ? "button"
          : uploadActive || !canAttemptOpen
            ? undefined
            : "button"
      }
      tabIndex={
        uploadActive && uploadAction ? 0 : uploadActive || !canAttemptOpen ? undefined : 0
      }
      aria-label={
        uploadActive
          ? uploadOverlay?.label || t("media.video.uploading")
          : canAttemptOpen
            ? t("media.video.open")
            : t("media.video.unplayable")
      }
      aria-disabled={uploadActive && !uploadAction ? true : undefined}
      onClick={handleFrameClick}
      onKeyDown={handleFrameKeyDown}
    >
      {posterSrc && (
        <img
          alt=""
          aria-hidden="true"
          className="message-video-poster"
          src={visiblePosterSrc}
          onLoad={() => {
            markVideoPosterReady(posterKey, visiblePosterSrc);
            setPosterLoadState("ready");
          }}
          onError={() => {
            setPosterLoadState("failed");
            onPosterError?.();
          }}
        />
      )}
      {src && !failed && (
        <video
          ref={videoRef}
          aria-label={t("media.video.message")}
          className="message-video-player"
          preload={preloadMode}
          playsInline
          poster={posterSrc}
          src={src}
          onPlay={onPlay}
          onPause={onPause}
          onEnded={onEnded}
          onLoadedData={onLoadedData}
          onCanPlay={onCanPlay}
          onLoadedMetadata={onLoadedMetadata}
          onError={onError}
        />
      )}
      {!hasVisiblePoster && !hasStarted && (
        <span className="message-video-placeholder" aria-hidden="true" />
      )}
      {showFrameLoading && (
        <span className="message-video-loading" aria-hidden="true">
          {t("media.video.loading")}
        </span>
      )}
      {uploadActive ? (
        <span className="message-video-upload-overlay">
          <button
            type="button"
            className="message-video-upload-control"
            disabled={!uploadAction}
            aria-label={uploadOverlay?.label || t("media.video.uploading")}
            onClick={handleUploadActionClick}
          >
            <span
              className={`message-video-upload-ring ${
                isDeterminateUpload ? "is-determinate" : "is-pending"
              }`}
              style={uploadRingStyle}
              aria-hidden="true"
            >
              <svg viewBox="0 0 64 64" focusable="false">
                <circle className="message-video-upload-track" cx="32" cy="32" r="28" />
                <circle className="message-video-upload-meter" cx="32" cy="32" r="28" />
              </svg>
            </span>
            <span
              className={`message-video-upload-core ${
                showUploadPercent ? "has-percent" : ""
              }`}
            >
              {uploadOverlay?.icon === "play" ? (
                <Play size={26} fill="currentColor" />
              ) : uploadOverlay?.icon === "retry" ? (
                <RotateCcw size={24} />
              ) : uploadOverlay?.icon === "canceled" ? (
                <AlertCircle size={24} />
              ) : (
                <Pause size={showUploadPercent ? 20 : 26} fill="currentColor" />
              )}
              {showUploadPercent && (
                <span className="message-video-upload-percent">
                  {uploadPercentText}
                </span>
              )}
            </span>
          </button>
          {showUploadLabel && uploadOverlay?.label && (
            <span className="message-video-upload-label">{uploadOverlay.label}</span>
          )}
        </span>
      ) : (
        <span className="message-video-play" aria-hidden="true">
          {playing ? (
            <Pause size={34} fill="currentColor" />
          ) : (
            <Play size={34} fill="currentColor" />
          )}
        </span>
      )}
      {!uploadActive && loading && <span className="message-video-error">{t("media.video.opening")}</span>}
      {!uploadActive && openError && !loading && (
        <span className="message-video-error">{t("media.video.openFailed")}</span>
      )}
      <small>{durationText}</small>
    </div>
  );
}
