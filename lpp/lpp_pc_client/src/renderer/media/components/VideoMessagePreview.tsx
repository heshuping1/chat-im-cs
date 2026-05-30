import { Pause, Play, Video } from "lucide-react";
import type {
  CSSProperties,
  KeyboardEvent,
  MouseEvent,
  RefObject,
  SyntheticEvent,
} from "react";
import { videoPreviewPreloadMode } from "../runtime/mediaPerformancePolicy";
import type {
  UploadAction,
  VideoUploadOverlayState,
} from "../runtime/uploadState";

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
  onUploadOverlayAction,
  openError,
  aspectRatio,
  playing,
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
  onUploadOverlayAction?: (action: UploadAction) => void;
  openError: boolean;
  aspectRatio?: number;
  playing: boolean;
  posterSrc?: string;
  src?: string;
  uploadOverlay?: VideoUploadOverlayState;
  videoRef: RefObject<HTMLVideoElement>;
}) {
  if (!src || failed) {
    return (
      <div className="message-video-fallback">
        <Video size={24} />
        <span>视频消息</span>
      </div>
    );
  }

  const frameStyle = {
    ...(posterSrc ? { backgroundImage: `url("${cssUrl(posterSrc)}")` } : {}),
    ...(aspectRatio ? { "--video-bubble-aspect": String(aspectRatio) } : {}),
  } as CSSProperties;
  const hasPoster = Boolean(posterSrc);
  const preloadMode = videoPreviewPreloadMode({ hasStarted, playing });
  const uploadActive = Boolean(uploadOverlay?.active);
  const uploadAction = uploadOverlay?.action;
  const uploadProgress = Math.max(0, Math.min(100, uploadOverlay?.progress ?? 0));
  const uploadRingStyle = {
    "--video-upload-progress": `${Math.round((uploadProgress / 100) * 360)}deg`,
  } as CSSProperties;
  const handleFrameClick = () => {
    if (uploadActive) return;
    onClick();
  };
  const handleFrameKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (uploadActive) return;
    onKeyDown(event);
  };
  const handleUploadActionClick = (event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    if (uploadAction) onUploadOverlayAction?.(uploadAction);
  };

  return (
    <div
      className={`message-video-frame ${playing ? "is-playing" : ""} ${
        frameReady ? "is-ready" : "is-loading"
      } ${hasStarted ? "was-played" : ""} ${hasPoster ? "has-poster" : "no-poster"} ${
        uploadActive ? `is-uploading upload-${uploadOverlay?.icon ?? "pause"}` : ""
      }`}
      style={frameStyle}
      role={uploadActive ? undefined : "button"}
      tabIndex={uploadActive ? undefined : 0}
      aria-label={uploadActive ? uploadOverlay?.label || "视频上传中" : "打开视频"}
      aria-disabled={uploadActive && !uploadAction ? true : undefined}
      onClick={handleFrameClick}
      onKeyDown={handleFrameKeyDown}
    >
      <video
        ref={videoRef}
        aria-label="视频消息"
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
      {!hasPoster && !hasStarted && (
        <span className="message-video-placeholder" aria-hidden="true" />
      )}
      {!frameReady && (
        <span className="message-video-loading" aria-hidden="true">
          视频加载中
        </span>
      )}
      {uploadActive ? (
        <span className="message-video-upload-overlay">
          <button
            type="button"
            className="message-video-upload-control"
            disabled={!uploadAction}
            aria-label={uploadOverlay?.label || "视频上传中"}
            onClick={handleUploadActionClick}
          >
            <span className="message-video-upload-ring" style={uploadRingStyle} />
            <span className="message-video-upload-core">
              {uploadOverlay?.icon === "play" ? (
                <Play size={26} fill="currentColor" />
              ) : uploadOverlay?.icon === "retry" ? (
                <span className="message-video-upload-retry">重试</span>
              ) : uploadOverlay?.icon === "canceled" ? (
                <Video size={23} />
              ) : (
                <Pause size={26} fill="currentColor" />
              )}
            </span>
          </button>
          {uploadOverlay?.label && (
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
      {!uploadActive && loading && <span className="message-video-error">正在打开...</span>}
      {!uploadActive && openError && !loading && (
        <span className="message-video-error">打开失败</span>
      )}
      <small>{durationText}</small>
    </div>
  );
}

function cssUrl(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}
