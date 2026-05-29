import {
  ChevronRight,
  MapPin,
  Mic,
  PhoneCall,
  UserRound,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import type { MouseEvent, SyntheticEvent } from "react";
import type { MediaResourceDto, MessageItemDto } from "../data/api-client";
import {
  type NormalizedMessagePart,
  imageMediaCacheKey,
  isBrowserNativeUrl,
  mediaFileName,
  normalizeMessageType,
  normalizeMessageParts,
  normalizeType,
  numberValue,
  resolveMediaUrl,
  stringValue,
} from "../data/im-message-normalize";
import { handleExternalLinkClick } from "../lib/openExternal";
import {
  getPrefetchedImageFileUrl,
  subscribeImagePrecache,
} from "../media/runtime/imagePrecache";
import { renderWechatEmojiText } from "../lib/wechatEmoji";
import {
  type ImMediaItem,
  normalizeMediaPart,
} from "../media/domain/mediaMessage";
import { FileMessageCard } from "../media/components/FileMessageCard";
import { ImageMessageFrame } from "../media/components/ImageMessageFrame";
import { UploadControls } from "../media/components/UploadControls";
import { VideoMessagePreview } from "../media/components/VideoMessagePreview";
import {
  imageVisibleSource,
  sameMediaUrl,
  useCachedImageMediaUrl,
} from "../media/runtime/useCachedImageMediaUrl";
import { openDesktopVideoPlayer } from "../media/runtime/videoPlayer";
import {
  isVideoSourceReady,
  markVideoSourceReady,
  useVideoPosterSource,
} from "../media/runtime/videoPosterRuntime";
import {
  type LocalUploadState,
  type UploadActionHandler,
  fileMessageInlineStatusText,
  localUploadStateFromMessage,
} from "../media/runtime/uploadState";

export type { UploadAction, UploadActionHandler } from "../media/runtime/uploadState";

export function MessageBodyView({
  assetBaseUrl,
  authToken,
  mediaCacheContext,
  message,
  onContactClick,
  onUploadAction,
}: {
  assetBaseUrl?: string;
  authToken?: string;
  mediaCacheContext?: MediaCacheContext;
  message: MessageItemDto;
  onContactClick?: (event: MouseEvent<HTMLElement>, value: Record<string, unknown>) => void;
  onUploadAction?: UploadActionHandler;
}) {
  if (message.isRecalled || message.status === "recalled") {
    return <p className="message-recalled-text">消息已撤回</p>;
  }
  const parts = normalizeMessageParts(message);

  if (parts.length === 0 && message.preview) {
    return <p>{renderWechatEmojiText(message.preview)}</p>;
  }

  return (
    <div className="message-body-stack">
      {parts.map((part, index) => (
        <MessagePartView
          assetBaseUrl={assetBaseUrl}
          authToken={authToken}
          mediaCacheContext={mediaCacheContext}
          key={`${part.type}-${index}`}
          message={message}
          part={part}
          fallback={message.preview}
          onContactClick={onContactClick}
          onUploadAction={onUploadAction}
        />
      ))}
      {parts.length === 0 && <UnsupportedPart message={message} />}
    </div>
  );
}

type MediaCacheContext = {
  accountId?: string;
  conversationId?: string;
};

function UnsupportedPart({ message }: { message: MessageItemDto }) {
  const type = normalizeMessageType(message) || message.messageType || "";
  const text = message.preview
    ? renderWechatEmojiText(message.preview)
    : `暂不支持的消息类型${type ? `：${type}` : ""}`;
  return <p>{text}</p>;
}

function MessagePartView({
  assetBaseUrl,
  authToken,
  mediaCacheContext,
  message,
  part,
  fallback,
  onContactClick,
  onUploadAction,
}: {
  assetBaseUrl?: string;
  authToken?: string;
  mediaCacheContext?: MediaCacheContext;
  message: MessageItemDto;
  part: NormalizedMessagePart;
  fallback?: string;
  onContactClick?: (event: MouseEvent<HTMLElement>, value: Record<string, unknown>) => void;
  onUploadAction?: UploadActionHandler;
}) {
  if (part.type === "text") return <p>{renderWechatEmojiText(part.text)}</p>;
  if (part.type === "markdown") return <MarkdownPart text={part.text} />;
  if (part.type === "event") return <div className="message-event-text">{part.text}</div>;
  if (part.type === "image") {
    const mediaItem = normalizeMediaPart({ assetBaseUrl, fallback, part });
    return (
      <ImagePart
        authToken={authToken}
        item={mediaItem}
        mediaCacheContext={mediaCacheContext}
        uploadState={localUploadStateFromMessage(message)}
        onUploadAction={onUploadAction}
      />
    );
  }
  if (part.type === "file") {
    const mediaItem = normalizeMediaPart({ assetBaseUrl, fallback, part });
    return (
      <FilePart
        authToken={authToken}
        item={mediaItem}
        mediaCacheContext={mediaCacheContext}
        statusText={fileMessageInlineStatusText(message)}
        uploadState={localUploadStateFromMessage(message)}
        onUploadAction={onUploadAction}
      />
    );
  }
  if (part.type === "voice") {
    return (
      <VoicePart
        assetBaseUrl={assetBaseUrl}
        authToken={authToken}
        media={part.media}
      />
    );
  }
  if (part.type === "video") {
    const mediaItem = normalizeMediaPart({ assetBaseUrl, fallback, part });
    return (
      <VideoPart
        authToken={authToken}
        item={mediaItem}
        mediaCacheContext={mediaCacheContext}
        uploadState={localUploadStateFromMessage(message)}
        onUploadAction={onUploadAction}
      />
    );
  }
  if (part.type === "location") {
    return <LocationPart value={part.value} />;
  }
  if (part.type === "contact") {
    return <ContactPart onContactClick={onContactClick} value={part.value} />;
  }
  return <CallPart value={part.value} />;
}

function ImagePart({
  authToken,
  item,
  mediaCacheContext,
  uploadState,
  onUploadAction,
}: {
  authToken?: string;
  item?: ImMediaItem;
  mediaCacheContext?: MediaCacheContext;
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
      !window.desktopApi?.cacheMediaFile ||
      (cacheKey && getPrefetchedImageFileUrl(cacheKey))
    ) {
      return undefined;
    }
    void window.desktopApi
      .cacheMediaFile({
        url: src,
        fileName: fileName || "image.png",
        kind: "image",
        authToken,
        accountId: mediaCacheContext?.accountId,
        conversationId: mediaCacheContext?.conversationId,
      })
      .then((result) => {
        if (!disposed) setLocalFileSrc(result.fileUrl);
      })
      .catch(() => undefined);
    return () => {
      disposed = true;
    };
  }, [
    authToken,
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

function FilePart({
  authToken,
  item,
  mediaCacheContext,
  statusText,
  uploadState,
  onUploadAction,
}: {
  authToken?: string;
  item?: ImMediaItem;
  mediaCacheContext?: MediaCacheContext;
  statusText?: string;
  uploadState?: LocalUploadState;
  onUploadAction?: UploadActionHandler;
}) {
  const media = item?.media;
  const href = item?.sourceUrl;
  const fileName = item?.fileName || "文件消息";
  const [openError, setOpenError] = useState<string | null>(null);
  const handleFileOpen = async (event: MouseEvent<HTMLButtonElement>) => {
    if (!href) return;
    event.preventDefault();
    setOpenError(null);
    if (sending || failed) return;
    if (window.desktopApi?.openMediaFile && !/^blob:/i.test(href)) {
      try {
        await window.desktopApi.openMediaFile({
          url: href,
          fileName,
          kind: "file",
          authToken,
          accountId: mediaCacheContext?.accountId,
          conversationId: mediaCacheContext?.conversationId,
        });
        return;
      } catch (error) {
        setOpenError(`文件打开失败：${formatInlineError(error)}`);
        return;
      }
    }
    if (/^(blob:|data:|file:)/i.test(href)) {
      triggerFileDownload(href, fileName);
      return;
    }
    try {
      const response = await fetch(href, {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      triggerFileDownload(objectUrl, fileName);
      URL.revokeObjectURL(objectUrl);
    } catch (error) {
      setOpenError(`文件打开失败：${formatInlineError(error)}`);
    }
  };

  const sending = uploadState?.status === "uploading" || uploadState?.status === "queued";
  const failed = Boolean(statusText?.startsWith("发送失败"));
  const paused = uploadState?.status === "paused";
  const canceled = uploadState?.status === "canceled";
  return (
    <span className="message-file-wrap">
      <FileMessageCard
        className={`message-file-card${sending ? " sending" : ""}${failed ? " failed" : ""}${
          paused ? " paused" : ""
        }${canceled ? " canceled" : ""}`}
        onClick={handleFileOpen}
        ariaLabel={`文件消息 ${fileName}`}
        fileName={fileName}
        metaText={statusText || formatSize(media?.sizeBytes)}
      />
      {openError && <span className="message-file-error">{openError}</span>}
      <UploadControls uploadState={uploadState} onUploadAction={onUploadAction} />
    </span>
  );
}

function formatInlineError(error: unknown) {
  if (error instanceof Error && error.message.trim()) return error.message.trim();
  if (typeof error === "string" && error.trim()) return error.trim();
  return "请稍后重试";
}

function triggerFileDownload(url: string, fileName: string) {
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
}

function MarkdownPart({ text }: { text: string }) {
  return (
    <div className="message-markdown">
      {text.split(/\n+/).map((line, index) => {
        const trimmed = line.trim();
        if (!trimmed) return null;
        if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
          return (
            <div className="message-markdown-list-item" key={`${trimmed}-${index}`}>
              <span>•</span>
              <p>{renderInlineMarkdown(trimmed.slice(2))}</p>
            </div>
          );
        }
        return <p key={`${trimmed}-${index}`}>{renderInlineMarkdown(trimmed)}</p>;
      })}
    </div>
  );
}

function renderInlineMarkdown(text: string) {
  return text.split(/(\*\*[^*]+\*\*)/g).map((segment, index) => {
    if (segment.startsWith("**") && segment.endsWith("**")) {
      return <strong key={`${segment}-${index}`}>{segment.slice(2, -2)}</strong>;
    }
    return segment;
  });
}

function VoicePart({
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

function VideoPart({
  authToken,
  item,
  mediaCacheContext,
  uploadState,
  onUploadAction,
}: {
  authToken?: string;
  item?: ImMediaItem;
  mediaCacheContext?: MediaCacheContext;
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
  const videoRef = useRef<HTMLVideoElement | null>(null);
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
        if (uploadState?.status && uploadState.status !== "sent") return;
        if (window.desktopApi?.openVideoPlayer) {
          setOpenError(true);
          return;
        }
        openBrowserVideoFallback(displaySrc);
      })
      .catch(() => setOpenError(true))
      .finally(() => setPreviewLoading(false));
  };

  return (
    <div className="message-video-card wechat-video-card">
      <VideoMessagePreview
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
        openError={openError}
        playing={playing}
        posterSrc={posterSrc}
        src={displaySrc}
        videoRef={videoRef}
      />
      <UploadControls uploadState={uploadState} onUploadAction={onUploadAction} />
    </div>
  );
}

function openBrowserVideoFallback(fallbackSrc: string) {
  window.open(fallbackSrc, "_blank", "noopener,noreferrer");
}
function LocationPart({ value }: { value: Record<string, unknown> }) {
  const name = stringValue(value.name) || stringValue(value.title) || "位置消息";
  const address =
    stringValue(value.address) ||
    stringValue(value.detailAddress) ||
    stringValue(value.description) ||
    "--";
  const latitude = numberValue(value.latitude) ?? numberValue(value.lat);
  const longitude =
    numberValue(value.longitude) ?? numberValue(value.lng) ?? numberValue(value.lon);
  const href =
    latitude != null && longitude != null
      ? `https://maps.apple.com/?q=${latitude},${longitude}`
      : undefined;
  const content = (
    <>
      <MapPin size={22} />
      <span>
        <strong>{name}</strong>
        <em>{address}</em>
      </span>
    </>
  );

  if (!href) {
    return <div className="message-file-card static">{content}</div>;
  }
  return (
    <a
      className="message-file-card"
      href={href}
      onClick={(event) => handleExternalLinkClick(event, href)}
      target="_blank"
      rel="noreferrer"
    >
      {content}
    </a>
  );
}

function ContactPart({
  onContactClick,
  value,
}: {
  onContactClick?: (event: MouseEvent<HTMLElement>, value: Record<string, unknown>) => void;
  value: Record<string, unknown>;
}) {
  const name =
    stringValue(value.displayName) ||
    stringValue(value.display_name) ||
    stringValue(value.name) ||
    stringValue(value.userName) ||
    stringValue(value.user_name) ||
    stringValue(value.realName) ||
    stringValue(value.real_name) ||
    stringValue(value.nickname) ||
    stringValue(value.nickName) ||
    stringValue(value.nick_name) ||
    "联系人名片";
  const subtitle =
    stringValue(value.lppId) ||
    stringValue(value.lpp_id) ||
    stringValue(value.userNo) ||
    stringValue(value.mobile) ||
    stringValue(value.phone) ||
    stringValue(value.email);
  return (
    <button
      className="message-contact-card"
      type="button"
      aria-label={`查看名片 ${name}`}
      onClick={(event) => onContactClick?.(event, value)}
    >
      <AvatarThumb value={value} />
      <span className="message-contact-main">
        <strong>{name}</strong>
        {subtitle && <em>{subtitle}</em>}
      </span>
      <ChevronRight className="message-contact-chevron" size={17} />
      <small>个人名片</small>
    </button>
  );
}

function CallPart({ value }: { value: Record<string, unknown> }) {
  const mediaMode =
    normalizeType(stringValue(value.mediaMode) || stringValue(value.media_mode)) || "";
  const endReason =
    normalizeType(stringValue(value.endReason) || stringValue(value.end_reason)) || "";
  const title =
    stringValue(value.title) ||
    callTitle(mediaMode, endReason) ||
    stringValue(value.callType) ||
    "通话记录";
  const duration = numberValue(value.durationSeconds) ?? numberValue(value.duration);
  const detail =
    stringValue(value.durationText) ||
    (duration ? formatDuration(duration) : undefined) ||
    stringValue(value.status) ||
    "--";
  return (
    <div className="message-file-card static">
      <PhoneCall size={22} />
      <span>
        <strong>{title}</strong>
        <em>{detail}</em>
      </span>
    </div>
  );
}

function AvatarThumb({ value }: { value: Record<string, unknown> }) {
  const [failed, setFailed] = useState(false);
  const name =
    stringValue(value.displayName) ||
    stringValue(value.display_name) ||
    stringValue(value.name) ||
    stringValue(value.nickname) ||
    stringValue(value.nickName) ||
    stringValue(value.nick_name) ||
    "名";
  const avatarUrl =
    stringValue(value.avatarUrl) ||
    stringValue(value.avatar_url) ||
    stringValue(value.avatar) ||
    stringValue(value.photoUrl);
  if (avatarUrl && !failed) {
    return (
      <img
        className="message-contact-avatar"
        src={avatarUrl}
        alt={name}
        onError={() => setFailed(true)}
      />
    );
  }
  return (
    <span className="message-contact-avatar">
      {name === "联系人名片" ? <UserRound size={18} /> : name.slice(0, 1)}
    </span>
  );
}

function formatSize(value?: number | null) {
  if (!value || value <= 0) return "未知大小";
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  return `${(value / 1024 / 1024).toFixed(1)} MB`;
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

function callTitle(mediaMode: string, endReason: string) {
  if (endReason === "missed") return "未接来电";
  if (endReason === "cancelled") return "已取消通话";
  if (endReason === "rejected") return "已拒绝通话";
  if (mediaMode === "video" || mediaMode === "audio_video" || mediaMode === "audiovideo") {
    return "视频通话";
  }
  if (mediaMode === "audio" || mediaMode === "voice") return "语音通话";
  return "";
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
