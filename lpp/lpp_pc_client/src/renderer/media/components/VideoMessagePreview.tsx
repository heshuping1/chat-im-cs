import { Pause, Play, Video } from "lucide-react";
import type { CSSProperties, KeyboardEvent, RefObject, SyntheticEvent } from "react";

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
  openError,
  playing,
  posterSrc,
  src,
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
  openError: boolean;
  playing: boolean;
  posterSrc?: string;
  src?: string;
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

  const frameStyle: CSSProperties | undefined = posterSrc
    ? { backgroundImage: `url("${cssUrl(posterSrc)}")` }
    : undefined;
  const hasPoster = Boolean(posterSrc);

  return (
    <div
      className={`message-video-frame ${playing ? "is-playing" : ""} ${
        frameReady ? "is-ready" : "is-loading"
      } ${hasStarted ? "was-played" : ""} ${hasPoster ? "has-poster" : "no-poster"}`}
      style={frameStyle}
      role="button"
      tabIndex={0}
      aria-label="打开视频"
      onClick={onClick}
      onKeyDown={onKeyDown}
    >
      <video
        ref={videoRef}
        aria-label="视频消息"
        className="message-video-player"
        preload="auto"
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
      <span className="message-video-play" aria-hidden="true">
        {playing ? (
          <Pause size={34} fill="currentColor" />
        ) : (
          <Play size={34} fill="currentColor" />
        )}
      </span>
      {loading && <span className="message-video-error">正在打开...</span>}
      {openError && !loading && <span className="message-video-error">打开失败</span>}
      <small>{durationText}</small>
    </div>
  );
}

function cssUrl(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}
