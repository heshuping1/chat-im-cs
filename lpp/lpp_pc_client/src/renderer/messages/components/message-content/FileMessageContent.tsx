import { useEffect, useState } from "react";
import type { MouseEvent } from "react";
import { appProductName } from "../../../app/appMetadata";
import { FileMessageCard } from "../../../media/components/FileMessageCard";
import type { ImMediaItem } from "../../../media/domain/mediaMessage";
import {
  getMaterializedMediaFileUrl,
  mediaMaterializationCacheKey,
  subscribeMaterializedMediaFile,
} from "../../../media/runtime/mediaMaterialization";
import type {
  LocalUploadState,
  UploadAction,
  UploadActionHandler,
} from "../../../media/runtime/uploadState";
import { fileMessageCardState } from "../../../media/runtime/uploadState";
import { useI18n } from "../../../i18n/useI18n";
import { getCurrentMediaActionCapabilities } from "../../runtime/mediaActionCapabilities";
import { openCurrentMessageFileMedia } from "../../runtime/messageMediaDesktopActions";

export type MessageMediaCacheContext = {
  accountId?: string;
  conversationId?: string;
};

type Translate = ReturnType<typeof useI18n>["t"];

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
  const { t } = useI18n();
  const media = item?.media;
  const href = item?.sourceUrl;
  const cacheKey = mediaMaterializationCacheKey("file", media, item?.remoteSourceUrl || href);
  const [localFileSrc, setLocalFileSrc] = useState<string | null>(
    () => getMaterializedMediaFileUrl(cacheKey) ?? null,
  );
  const openUrl = localFileSrc || item?.localOpenUrl || href;
  const fileName = item?.fileName || t("messages.fileContent.fileMessage");
  const [openError, setOpenError] = useState<string | null>(null);
  const { canOpenMediaFile } = getCurrentMediaActionCapabilities();
  const fileCardState = fileMessageCardState(uploadState);
  const translatedStatusText = uploadStatusText(uploadState, t);
  const displayStatusText = translatedStatusText || statusText || "";
  const uploadBlocked = Boolean(displayStatusText);

  useEffect(() => {
    const materialized = getMaterializedMediaFileUrl(cacheKey);
    setLocalFileSrc(materialized ?? null);
    return subscribeMaterializedMediaFile(cacheKey, setLocalFileSrc);
  }, [cacheKey]);

  const handleFileOpen = async (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    setOpenError(null);
    if (uploadBlocked) return;
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
        setOpenError(t("messages.fileContent.openFailed", { error: formatInlineError(error, t) }));
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
      setOpenError(t("messages.fileContent.openFailed", { error: formatInlineError(error, t) }));
    }
  };
  const handleFileControlClick = (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setOpenError(null);
    if (!uploadState?.taskId || !fileCardState.controlAction) return;
    onUploadAction?.(uploadState.taskId, fileCardState.controlAction);
  };

  const sending =
    uploadState?.status === "uploading" ||
    uploadState?.status === "queued" ||
    uploadState?.status === "sending";
  const failed = uploadState?.status === "failed";
  const paused = uploadState?.status === "paused";
  const canceled = uploadState?.status === "canceled";

  return (
    <span className="message-file-wrap">
      <FileMessageCard
        className={`message-file-card${sending ? " sending" : ""}${failed ? " failed" : ""}${
          paused ? " paused" : ""
        }${canceled ? " canceled" : ""}`}
        onClick={handleFileOpen}
        ariaLabel={t("messages.fileContent.aria", { name: fileName })}
        controlLabel={uploadControlLabel(fileCardState.controlAction, uploadState, t)}
        controlProgress={fileCardState.controlProgress}
        controlState={fileCardState.controlState}
        fileName={fileName}
        metaText={displayStatusText || formatSize(media?.sizeBytes, t)}
        onControlClick={fileCardState.controlAction ? handleFileControlClick : undefined}
        sourceLabel={appProductName}
      />
      {openError && <span className="message-file-error">{openError}</span>}
    </span>
  );
}

function uploadControlLabel(action: UploadAction | undefined, uploadState: LocalUploadState | undefined, t: Translate) {
  if (action === "pause") return t("messages.fileContent.pauseUpload");
  if (action === "resume") return t("messages.fileContent.resumeUpload");
  if (action === "retry") return t("messages.fileContent.retryUpload");
  if (uploadState?.status === "queued" || uploadState?.phase === "preparing") {
    return t("messages.fileContent.waitingUpload");
  }
  if (uploadState?.status === "sending") return t("messages.fileContent.sending");
  return undefined;
}

function uploadStatusText(uploadState: LocalUploadState | undefined, t: Translate) {
  if (!uploadState?.status || uploadState.status === "sent") return "";
  if (uploadState.status === "queued") return t("messages.fileContent.waitingUpload");
  if (uploadState.status === "uploading") return t("messages.fileContent.uploading");
  if (uploadState.status === "paused") return t("messages.fileContent.paused");
  if (uploadState.status === "sending") return t("messages.fileContent.sending");
  if (uploadState.status === "failed") return t("messages.fileContent.failed");
  if (uploadState.status === "canceled") return t("messages.fileContent.canceled");
  return "";
}

function formatInlineError(error: unknown, t: Translate) {
  if (error instanceof Error && error.message.trim()) return error.message.trim();
  if (typeof error === "string" && error.trim()) return error.trim();
  return t("messages.fileContent.tryAgain");
}

function triggerFileDownload(url: string, fileName: string) {
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
}

function formatSize(value: number | null | undefined, t: Translate) {
  if (!value || value <= 0) return t("messages.fileContent.unknownSize");
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  return `${(value / 1024 / 1024).toFixed(1)} MB`;
}
