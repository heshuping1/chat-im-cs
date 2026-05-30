import { useState } from "react";
import type { MouseEvent } from "react";
import { appProductName } from "../../../app/appMetadata";
import { FileMessageCard } from "../../../media/components/FileMessageCard";
import type { ImMediaItem } from "../../../media/domain/mediaMessage";
import type {
  LocalUploadState,
  UploadActionHandler,
} from "../../../media/runtime/uploadState";
import { fileMessageCardState } from "../../../media/runtime/uploadState";
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
  const openUrl = item?.localOpenUrl || href;
  const fileName = item?.fileName || "文件消息";
  const [openError, setOpenError] = useState<string | null>(null);
  const { canOpenMediaFile } = getCurrentMediaActionCapabilities();
  const fileCardState = fileMessageCardState(uploadState);
  const handleFileOpen = async (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    setOpenError(null);
    if (uploadBlocked) {
      return;
    }
    if (!openUrl) return;
    if (canOpenMediaFile && !/^blob:/i.test(openUrl)) {
      try {
        const opened = await openCurrentMessageFileMedia({
          url: openUrl,
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
    if (/^(blob:|data:|file:)/i.test(openUrl)) {
      triggerFileDownload(openUrl, fileName);
      return;
    }
    try {
      const response = await fetch(openUrl, {
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
  const handleFileControlClick = (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setOpenError(null);
    if (!uploadState?.taskId || !fileCardState.controlAction) return;
    onUploadAction?.(uploadState.taskId, fileCardState.controlAction);
  };

  const displayStatusText = statusText || fileCardState.metaText;
  const uploadBlocked = Boolean(displayStatusText);
  const sending =
    uploadState?.status === "uploading" ||
    uploadState?.status === "queued" ||
    displayStatusText === "上传中" ||
    Boolean(displayStatusText?.startsWith("上传中 "));
  const failed = Boolean(displayStatusText?.startsWith("发送失败"));
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
        controlLabel={fileCardState.controlLabel}
        controlProgress={fileCardState.controlProgress}
        controlState={fileCardState.controlState}
        fileName={fileName}
        metaText={displayStatusText || formatSize(media?.sizeBytes)}
        onControlClick={fileCardState.controlAction ? handleFileControlClick : undefined}
        sourceLabel={appProductName}
      />
      {openError && <span className="message-file-error">{openError}</span>}
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
