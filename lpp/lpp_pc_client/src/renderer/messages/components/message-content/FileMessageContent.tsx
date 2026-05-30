import { useState } from "react";
import type { MouseEvent } from "react";
import { FileMessageCard } from "../../../media/components/FileMessageCard";
import { UploadControls } from "../../../media/components/UploadControls";
import type { ImMediaItem } from "../../../media/domain/mediaMessage";
import type {
  LocalUploadState,
  UploadActionHandler,
} from "../../../media/runtime/uploadState";
import { getCurrentMediaActionCapabilities } from "../../runtime/mediaActionCapabilities";
import { openCurrentMessageFileMedia } from "../../runtime/messageMediaDesktopActions";

export type MessageMediaCacheContext = {
  accountId?: string;
  conversationId?: string;
};

export function FileMessageContent({
  authToken,
  item,
  mediaCacheContext,
  statusText,
  uploadState,
  onUploadAction,
}: {
  authToken?: string;
  item?: ImMediaItem;
  mediaCacheContext?: MessageMediaCacheContext;
  statusText?: string;
  uploadState?: LocalUploadState;
  onUploadAction?: UploadActionHandler;
}) {
  const media = item?.media;
  const href = item?.sourceUrl;
  const fileName = item?.fileName || "文件消息";
  const [openError, setOpenError] = useState<string | null>(null);
  const { canOpenMediaFile } = getCurrentMediaActionCapabilities();
  const handleFileOpen = async (event: MouseEvent<HTMLButtonElement>) => {
    if (!href) return;
    event.preventDefault();
    setOpenError(null);
    if (sending || failed) return;
    if (canOpenMediaFile && !/^blob:/i.test(href)) {
      try {
        const opened = await openCurrentMessageFileMedia({
          url: href,
          fileName,
          kind: "file",
          authToken,
          accountId: mediaCacheContext?.accountId,
          conversationId: mediaCacheContext?.conversationId,
        });
        if (opened) return;
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
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 5_000);
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

function formatSize(value?: number | null) {
  if (!value || value <= 0) return "未知大小";
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  return `${(value / 1024 / 1024).toFixed(1)} MB`;
}
