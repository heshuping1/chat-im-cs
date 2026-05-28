import {
  ChevronLeft,
  ChevronRight,
  Download,
  ImageIcon,
  MapPin,
  Mic,
  Pause,
  PhoneCall,
  Play,
  UserRound,
  Video,
  X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { MouseEvent } from "react";
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
import { getCachedMedia, refreshCachedMedia } from "../lib/mediaCache";
import { handleExternalLinkClick } from "../lib/openExternal";
import {
  registerVideoPosterForMedia,
  resolveRegisteredVideoPoster,
} from "../lib/videoPoster";
import { renderWechatEmojiText } from "../lib/wechatEmoji";

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

const readyVideoSourceCache = new Set<string>();
const videoPosterCache = new Map<string, string>();
const videoPosterPromiseCache = new Map<string, Promise<string | undefined>>();

export type UploadAction = "pause" | "resume" | "cancel" | "retry";
export type UploadActionHandler = (localTaskId: string, action: UploadAction) => void;

type LocalUploadStatus = "queued" | "uploading" | "paused" | "failed" | "sent" | "canceled";

type LocalUploadState = {
  status?: LocalUploadStatus;
  progress?: number;
  error?: string;
  taskId?: string;
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
    return (
      <ImagePart
        assetBaseUrl={assetBaseUrl}
        authToken={authToken}
        mediaCacheContext={mediaCacheContext}
        media={part.media}
        uploadState={localUploadStateFromMessage(message)}
        onUploadAction={onUploadAction}
      />
    );
  }
  if (part.type === "file") {
    return (
      <FilePart
        assetBaseUrl={assetBaseUrl}
        authToken={authToken}
        mediaCacheContext={mediaCacheContext}
        media={part.media}
        fallback={fallback}
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
    return (
      <VideoPart
        assetBaseUrl={assetBaseUrl}
        authToken={authToken}
        mediaCacheContext={mediaCacheContext}
        media={part.media}
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
  assetBaseUrl,
  authToken,
  mediaCacheContext,
  media,
  uploadState,
  onUploadAction,
}: {
  assetBaseUrl?: string;
  authToken?: string;
  mediaCacheContext?: MediaCacheContext;
  media?: MediaResourceDto;
  uploadState?: LocalUploadState;
  onUploadAction?: UploadActionHandler;
}) {
  const localPreviewUrl = (media as (MediaResourceDto & { localPreviewUrl?: string }) | undefined)
    ?.localPreviewUrl;
  const src = localPreviewUrl || resolveMediaUrl(
    media,
    assetBaseUrl,
    "localPreviewUrl",
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
  const fileName = mediaFileName(media);
  const localImage = Boolean(
    typeof src === "string" && (src.startsWith("blob:") || src.startsWith("data:")),
  );
  const cacheKey = imageMediaCacheKey(media, src);
  const { cached, displaySrc, failed, loadCachedMedia } = useCachedImageMediaUrl(
    src,
    authToken,
    cacheKey,
  );
  const imageSrc = localImage ? src : displaySrc;
  const [localFileSrc, setLocalFileSrc] = useState<string | null>(null);
  const [imageLoaded, setImageLoaded] = useState(localImage);
  const [previewOpen, setPreviewOpen] = useState(false);

  useEffect(() => {
    let disposed = false;
    setLocalFileSrc(null);
    if (!src || localImage || !window.desktopApi?.cacheMediaFile) return undefined;
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
    src,
  ]);

  useEffect(() => {
    setImageLoaded(Boolean(localFileSrc) || localImage || cached);
  }, [cached, displaySrc, localFileSrc, localImage]);

  const visibleImageSrc = localFileSrc || imageSrc;

  return (
    <div className="message-media">
      {src && !failed ? (
        <button
          className={`message-image-frame ${imageLoaded ? "loaded" : ""}`}
          type="button"
          aria-label={fileName ? `预览图片 ${fileName}` : "预览图片"}
          onClick={() => {
            if (imageLoaded && visibleImageSrc) setPreviewOpen(true);
          }}
        >
          {!imageLoaded && (
            <span className="message-image-loading" aria-label="图片加载中">
              <ImageIcon size={22} />
              <em>图片加载中</em>
            </span>
          )}
          {visibleImageSrc && (
            <img
              className="message-image"
              src={visibleImageSrc}
              alt={fileName || "图片消息"}
              onLoad={() => setImageLoaded(true)}
              onError={loadCachedMedia}
            />
          )}
        </button>
      ) : (
        <span className="message-media-empty">
          <ImageIcon size={18} />
          {fileName || "图片消息"}
        </span>
      )}
      <UploadControls uploadState={uploadState} onUploadAction={onUploadAction} />
      {previewOpen && visibleImageSrc && (
        <div
          className="message-image-preview"
          role="dialog"
          aria-modal="true"
          aria-label={fileName ? `图片预览 ${fileName}` : "图片预览"}
          onClick={() => setPreviewOpen(false)}
        >
          <button
            className="message-image-preview-close"
            type="button"
            aria-label="关闭图片预览"
            onClick={() => setPreviewOpen(false)}
          >
            <X size={20} />
          </button>
          <img
            src={visibleImageSrc}
            alt={fileName || "图片预览"}
            onClick={(event) => event.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}

function FilePart({
  assetBaseUrl,
  authToken,
  mediaCacheContext,
  media,
  fallback,
  statusText,
  uploadState,
  onUploadAction,
}: {
  assetBaseUrl?: string;
  authToken?: string;
  mediaCacheContext?: MediaCacheContext;
  media?: MediaResourceDto;
  fallback?: string;
  statusText?: string;
  uploadState?: LocalUploadState;
  onUploadAction?: UploadActionHandler;
}) {
  const href = resolveMediaUrl(
    media,
    assetBaseUrl,
    "url",
    "downloadUrl",
    "signedUrl",
    "fileUrl",
    "uri",
    "path",
  );
  const fileName = mediaFileName(media) || fallback || "文件消息";
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
  const fileIcon = fileAttachmentVisual(fileName);

  return (
    <span className="message-file-wrap">
      <button
        type="button"
        className={`message-file-card${sending ? " sending" : ""}${failed ? " failed" : ""}${
          paused ? " paused" : ""
        }${canceled ? " canceled" : ""}`}
        onClick={handleFileOpen}
        aria-label={`文件消息 ${fileName}`}
      >
        <span className={`message-file-icon ${fileIcon.kind}`} aria-hidden="true">
          <span className="file-type-glyph">{fileIcon.label}</span>
        </span>
        <span className="message-file-copy">
          <strong>{fileName}</strong>
          <em>{statusText || formatSize(media?.sizeBytes)}</em>
        </span>
      </button>
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

function UploadControls({
  uploadState,
  onUploadAction,
}: {
  uploadState?: LocalUploadState;
  onUploadAction?: UploadActionHandler;
}) {
  const status = uploadState?.status;
  const taskId = uploadState?.taskId;
  if (!status || status === "sent" || !taskId) return null;
  const progress = typeof uploadState.progress === "number"
    ? Math.min(100, Math.max(0, Math.round(uploadState.progress)))
    : undefined;
  const showBar = status === "uploading" || status === "queued" || status === "paused";
  const label = uploadStatusLabel(status, progress, uploadState.error);
  return (
    <span className={`message-upload-meta ${status}`}>
      {showBar && (
        <span className="message-upload-progress" aria-hidden="true">
          <span style={{ width: `${progress ?? 0}%` }} />
        </span>
      )}
      <span className="message-upload-row">
        <em>{label}</em>
      <span className="message-upload-actions">
        {(status === "uploading" || status === "queued") && (
          <button type="button" onClick={() => onUploadAction?.(taskId, "pause")}>
            暂停
          </button>
        )}
        {status === "paused" && (
          <button type="button" onClick={() => onUploadAction?.(taskId, "resume")}>
            继续
          </button>
        )}
        {status === "failed" && (
          <button type="button" onClick={() => onUploadAction?.(taskId, "retry")}>
            重试
          </button>
        )}
        {status !== "canceled" && (
          <button type="button" onClick={() => onUploadAction?.(taskId, "cancel")}>
            取消
          </button>
        )}
      </span>
      </span>
    </span>
  );
}

function uploadStatusLabel(
  status: LocalUploadStatus,
  progress?: number,
  error?: string,
) {
  if (status === "queued") return "等待上传";
  if (status === "uploading") return `上传中${typeof progress === "number" ? ` ${progress}%` : ""}`;
  if (status === "paused") return "已暂停";
  if (status === "failed") return error ? `发送失败：${error}` : "发送失败";
  if (status === "canceled") return "已取消";
  return "";
}

function triggerFileDownload(url: string, fileName: string) {
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
}

function fileAttachmentVisual(fileName: string) {
  const extension = fileName.split(".").pop()?.toLowerCase() ?? "";
  if (["zip", "rar", "7z", "tar", "gz"].includes(extension)) {
    return { kind: "archive", label: "ZIP" };
  }
  if (["xls", "xlsx", "csv"].includes(extension)) return { kind: "sheet", label: "X" };
  if (extension === "pdf") return { kind: "pdf", label: "PDF" };
  if (["doc", "docx"].includes(extension)) return { kind: "word", label: "W" };
  if (["ppt", "pptx"].includes(extension)) return { kind: "slide", label: "P" };
  if (["txt", "log", "md"].includes(extension)) return { kind: "document", label: "TXT" };
  return { kind: "document", label: extension ? extension.slice(0, 3).toUpperCase() : "DOC" };
}

export function fileMessageInlineStatusText(message: MessageItemDto) {
  const uploadState = localUploadStateFromMessage(message);
  const status = uploadState.status || String(message.status ?? "").trim().toLowerCase();
  if (status === "queued") return "等待上传";
  if (status === "uploading" || status === "sending") {
    return typeof uploadState.progress === "number"
      ? `上传中 ${Math.round(uploadState.progress)}%`
      : "上传中";
  }
  if (status === "paused") return "已暂停";
  if (status === "canceled") return "已取消";
  if (status === "failed") {
    const reason = uploadState.error
      ? `：${uploadState.error}`
      : "";
    return `发送失败${reason}`;
  }
  return undefined;
}

function localUploadStateFromMessage(message: MessageItemDto): LocalUploadState {
  const record = message as unknown as Record<string, unknown>;
  const rawStatus = typeof record.status === "string" ? record.status.trim().toLowerCase() : "";
  const status = ["queued", "uploading", "paused", "failed", "sent", "canceled"].includes(rawStatus)
    ? (rawStatus as LocalUploadStatus)
    : undefined;
  const rawProgress = record.uploadProgress;
  const progress = typeof rawProgress === "number" && Number.isFinite(rawProgress)
    ? rawProgress
    : undefined;
  const error = typeof record.localError === "string" && record.localError.trim()
    ? record.localError.trim()
    : undefined;
  const taskId = typeof record.localTaskId === "string" && record.localTaskId.trim()
    ? record.localTaskId.trim()
    : undefined;
  return { status, progress, error, taskId };
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
  assetBaseUrl,
  authToken,
  mediaCacheContext,
  media,
}: {
  assetBaseUrl?: string;
  authToken?: string;
  mediaCacheContext?: MediaCacheContext;
  media?: MediaResourceDto;
}) {
  const localPreviewUrl = (media as (MediaResourceDto & { localPreviewUrl?: string }) | undefined)
    ?.localPreviewUrl;
  const src = localPreviewUrl || resolveMediaUrl(
    media,
    assetBaseUrl,
    "localPreviewUrl",
    "url",
    "downloadUrl",
    "signedUrl",
    "fileUrl",
    "uri",
    "path",
  );
  const posterKeys = localPreviewUrl
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
  const poster = resolveMediaUrl(
    media,
    assetBaseUrl,
    ...posterKeys,
  );
  const { displaySrc, failed, loadAuthenticatedMedia } = useAuthenticatedMediaUrl(
    src,
    authToken,
  );
  const explicitPoster = poster;
  const registeredPoster = explicitPoster
    ? undefined
    : resolveRegisteredVideoPoster(media as Record<string, unknown> | undefined);
  const cachedPoster =
    !explicitPoster && !registeredPoster && displaySrc ? videoPosterCache.get(displaySrc) : undefined;
  const [generatedPoster, setGeneratedPoster] = useState(cachedPoster);
  const posterSrc = explicitPoster || registeredPoster || generatedPoster;
  const [playing, setPlaying] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [duration, setDuration] = useState<number | undefined>(media?.durationSeconds);
  const [frameReady, setFrameReady] = useState(() =>
    Boolean(displaySrc && readyVideoSourceCache.has(displaySrc)),
  );
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const previewVideoRef = useRef<HTMLVideoElement | null>(null);
  useEffect(() => {
    setFrameReady(Boolean(displaySrc && readyVideoSourceCache.has(displaySrc)));
  }, [displaySrc]);
  useEffect(() => {
    if (!previewOpen) return undefined;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setPreviewOpen(false);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [previewOpen]);
  useEffect(() => {
    if (explicitPoster || registeredPoster) {
      setGeneratedPoster(undefined);
      return undefined;
    }
    setGeneratedPoster(displaySrc ? videoPosterCache.get(displaySrc) : undefined);
    return undefined;
  }, [displaySrc, explicitPoster, registeredPoster]);
  useEffect(() => {
    if (!displaySrc || explicitPoster || registeredPoster || generatedPoster) return undefined;
    let canceled = false;
    void ensureLocalVideoPoster({
      src: displaySrc,
      media,
      authToken,
      mediaCacheContext,
    }).then((nextPoster) => {
      if (!canceled && nextPoster) {
        setGeneratedPoster(nextPoster);
        setFrameReady(true);
      }
    });
    return () => {
      canceled = true;
    };
  }, [authToken, displaySrc, explicitPoster, generatedPoster, media, mediaCacheContext, registeredPoster]);
  const markFrameReady = () => {
    if (displaySrc) readyVideoSourceCache.add(displaySrc);
    setFrameReady(true);
    const video = videoRef.current;
    if (!video || !displaySrc || videoPosterCache.has(displaySrc)) return;
    const nextPoster = captureVideoFramePoster(video);
    if (nextPoster) videoPosterCache.set(displaySrc, nextPoster);
  };
  const openPreview = () => {
    videoRef.current?.pause();
    setPreviewOpen(true);
  };
  const closePreview = () => {
    previewVideoRef.current?.pause();
    setPreviewOpen(false);
  };
  const saveVideoAs = async () => {
    if (!displaySrc) return;
    const fileName = mediaFileName(media) || "video.mp4";
    if (window.desktopApi?.saveMediaAs && !/^blob:/i.test(displaySrc)) {
      await window.desktopApi.saveMediaAs({
        url: displaySrc,
        fileName,
        kind: "video",
        authToken,
        accountId: mediaCacheContext?.accountId,
        conversationId: mediaCacheContext?.conversationId,
      });
      return;
    }
    const link = document.createElement("a");
    link.href = displaySrc;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  return (
    <div className="message-video-card wechat-video-card">
      {displaySrc && !failed ? (
        <div
          className={`message-video-frame ${playing ? "is-playing" : ""} ${
            frameReady ? "is-ready" : "is-loading"
          } ${hasStarted ? "was-played" : ""} ${posterSrc ? "has-poster" : ""}`}
          style={posterSrc ? { backgroundImage: `url("${cssUrl(posterSrc)}")` } : undefined}
          role="button"
          tabIndex={0}
          aria-label="打开视频预览"
          onClick={openPreview}
          onKeyDown={(event) => {
            if (event.key !== "Enter" && event.key !== " ") return;
            event.preventDefault();
            openPreview();
          }}
        >
          <video
            ref={videoRef}
            aria-label="视频消息播放器"
            className="message-video-player"
            preload="auto"
            playsInline
            poster={posterSrc}
            src={displaySrc}
            onPlay={() => {
              setHasStarted(true);
              setPlaying(true);
            }}
            onPause={() => setPlaying(false)}
            onEnded={() => setPlaying(false)}
            onLoadedData={markFrameReady}
            onCanPlay={markFrameReady}
            onLoadedMetadata={(event) => {
              const nextDuration = event.currentTarget.duration;
              if (Number.isFinite(nextDuration) && nextDuration > 0) {
                setDuration(nextDuration);
              }
            }}
            onError={loadAuthenticatedMedia}
          />
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
          <small>{formatVideoDuration(duration)}</small>
        </div>
      ) : (
        <div className="message-video-fallback">
          <Video size={24} />
          <span>视频消息</span>
        </div>
      )}
      {previewOpen && displaySrc && !failed && (
        <div
          className="wechat-video-preview"
          onClick={closePreview}
          role="dialog"
          aria-modal="true"
          aria-label="视频预览"
        >
          <div className="wechat-video-preview-window" onClick={(event) => event.stopPropagation()}>
            <header className="wechat-video-preview-toolbar">
              <div className="wechat-video-preview-dots" aria-hidden="true">
                <button
                  className="close"
                  type="button"
                  aria-label="关闭视频预览"
                  onClick={closePreview}
                />
                <span className="minimize" />
                <span className="maximize" />
              </div>
              <div className="wechat-video-preview-actions">
                <button type="button" disabled aria-label="上一条">
                  <ChevronLeft size={28} />
                </button>
                <button type="button" disabled aria-label="下一条">
                  <ChevronRight size={28} />
                </button>
                <span aria-hidden="true" />
                <button
                  type="button"
                  aria-label="下载视频"
                  onClick={() => void saveVideoAs()}
                >
                  <Download size={26} />
                </button>
              </div>
            </header>
            <div className="wechat-video-preview-stage">
              <video
                ref={previewVideoRef}
                className="wechat-video-preview-player"
                src={displaySrc}
                poster={posterSrc}
                controls
                autoPlay
                playsInline
                onLoadedMetadata={(event) => {
                  const nextDuration = event.currentTarget.duration;
                  if (Number.isFinite(nextDuration) && nextDuration > 0) {
                    setDuration(nextDuration);
                  }
                }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function captureVideoFramePoster(video: HTMLVideoElement) {
  try {
    if (!video.videoWidth || !video.videoHeight) return undefined;
    const maxWidth = 360;
    const scale = Math.min(1, maxWidth / video.videoWidth);
    const width = Math.max(1, Math.round(video.videoWidth * scale));
    const height = Math.max(1, Math.round(video.videoHeight * scale));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    if (!context) return undefined;
    context.drawImage(video, 0, 0, width, height);
    return canvas.toDataURL("image/jpeg", 0.82);
  } catch {
    return undefined;
  }
}

function ensureVideoPoster(src: string) {
  const cached = videoPosterCache.get(src);
  if (cached) return Promise.resolve(cached);
  const pending = videoPosterPromiseCache.get(src);
  if (pending) return pending;
  const promise = captureVideoPosterFromSource(src).finally(() => {
    videoPosterPromiseCache.delete(src);
  });
  videoPosterPromiseCache.set(src, promise);
  return promise;
}

async function ensureLocalVideoPoster({
  src,
  media,
  authToken,
  mediaCacheContext,
}: {
  src: string;
  media?: MediaResourceDto;
  authToken?: string;
  mediaCacheContext?: MediaCacheContext;
}) {
  const mediaRecord = media as Record<string, unknown> | undefined;
  const fileName = mediaFileName(media) || "video.mp4";
  const posterFromMemory = await ensureVideoPoster(src);
  if (!posterFromMemory) return undefined;
  if (!window.desktopApi?.cacheMediaPoster) {
    registerVideoPosterForMedia(mediaRecord, posterFromMemory);
    return posterFromMemory;
  }
  try {
    const shouldCacheVideo = !/^blob:/i.test(src);
    const cachedVideo = shouldCacheVideo && window.desktopApi.cacheMediaFile
      ? await window.desktopApi.cacheMediaFile({
          url: src,
          fileName,
          kind: "video",
          authToken,
          accountId: mediaCacheContext?.accountId,
          conversationId: mediaCacheContext?.conversationId,
        })
      : undefined;
    const cachedPoster = await window.desktopApi.cacheMediaPoster({
      url: cachedVideo?.fileUrl || src,
      fileName: `${fileName.replace(/\.[^.]+$/, "") || "video"}-poster.jpg`,
      kind: "video",
      dataUrl: posterFromMemory,
      authToken,
      accountId: mediaCacheContext?.accountId,
      conversationId: mediaCacheContext?.conversationId,
    });
    registerVideoPosterForMedia(mediaRecord, cachedPoster.fileUrl);
    videoPosterCache.set(src, cachedPoster.fileUrl);
    return cachedPoster.fileUrl;
  } catch {
    registerVideoPosterForMedia(mediaRecord, posterFromMemory);
    videoPosterCache.set(src, posterFromMemory);
    return posterFromMemory;
  }
}

function captureVideoPosterFromSource(src: string) {
  return new Promise<string | undefined>((resolve) => {
    const video = document.createElement("video");
    let settled = false;
    const finish = (poster?: string) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timeout);
      video.removeAttribute("src");
      video.load();
      if (poster) {
        videoPosterCache.set(src, poster);
        readyVideoSourceCache.add(src);
      }
      resolve(poster);
    };
    const timeout = window.setTimeout(() => finish(), 2500);
    video.crossOrigin = "anonymous";
    video.muted = true;
    video.playsInline = true;
    video.preload = "auto";
    video.addEventListener("error", () => finish(), { once: true });
    video.addEventListener(
      "loadedmetadata",
      () => {
        const targetTime = Number.isFinite(video.duration)
          ? Math.min(Math.max(video.duration * 0.02, 0.08), 0.35)
          : 0.12;
        try {
          video.currentTime = targetTime;
        } catch {
          finish(captureVideoFramePoster(video));
        }
      },
      { once: true },
    );
    video.addEventListener(
      "seeked",
      () => {
        finish(captureVideoFramePoster(video));
      },
      { once: true },
    );
    video.addEventListener(
      "loadeddata",
      () => {
        if (!Number.isFinite(video.duration) || video.duration <= 0.2) {
          finish(captureVideoFramePoster(video));
        }
      },
      { once: true },
    );
    video.src = src;
    video.load();
  });
}

function cssUrl(value: string) {
  return value.replace(/["\\\n\r]/g, (char) => `\\${char}`);
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

function useCachedImageMediaUrl(
  src: string | undefined,
  authToken: string | undefined,
  cacheKey: string | undefined,
) {
  const [cached, setCached] = useState(false);
  const [checkedCache, setCheckedCache] = useState(false);
  const [failed, setFailed] = useState(false);
  const [blobSrc, setBlobSrc] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const objectUrls: string[] = [];

    const showBlob = (blob: Blob | null, fromCache: boolean) => {
      if (!blob?.size) return;
      const objectUrl = URL.createObjectURL(blob);
      objectUrls.push(objectUrl);
      if (!active) return;
      setBlobSrc(objectUrl);
      setCached(fromCache);
      setFailed(false);
    };

    setBlobSrc(null);
    setCached(false);
    setCheckedCache(!src || isBrowserNativeUrl(src) || !cacheKey);
    setFailed(false);

    if (!src || isBrowserNativeUrl(src) || !cacheKey) {
      return () => {
        active = false;
        objectUrls.forEach((objectUrl) => URL.revokeObjectURL(objectUrl));
      };
    }

    getCachedMedia(cacheKey)
      .then((blob) => {
        if (!active) return;
        showBlob(blob, true);
      })
      .finally(() => {
        if (active) setCheckedCache(true);
      });

    refreshCachedMedia({ key: cacheKey, token: authToken, url: src })
      .then((blob) => {
        if (!active) return;
        showBlob(blob, false);
      })
      .catch(() => undefined);

    return () => {
      active = false;
      objectUrls.forEach((objectUrl) => URL.revokeObjectURL(objectUrl));
    };
  }, [authToken, cacheKey, src]);

  const loadCachedMedia = () => {
    if (!src) {
      setFailed(true);
      return;
    }
    if (!cacheKey || isBrowserNativeUrl(src)) {
      setFailed(true);
      return;
    }
    void refreshCachedMedia({ key: cacheKey, token: authToken, url: src })
      .then((blob) => {
        if (!blob?.size) {
          setFailed(true);
          return;
        }
        setBlobSrc((current) => {
          if (current) URL.revokeObjectURL(current);
          return URL.createObjectURL(blob);
        });
        setCached(false);
        setFailed(false);
      })
      .catch(() => setFailed(true));
  };

  return {
    cached,
    displaySrc: blobSrc ?? (checkedCache ? src : ""),
    failed,
    loadCachedMedia,
  };
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
