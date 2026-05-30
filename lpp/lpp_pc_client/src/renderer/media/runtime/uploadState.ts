import type { MessageItemDto } from "../../data/api-client";

export type UploadAction = "pause" | "resume" | "cancel" | "retry";
export type UploadActionHandler = (localTaskId: string, action: UploadAction) => void;

export type LocalUploadStatus =
  | "queued"
  | "uploading"
  | "paused"
  | "failed"
  | "sent"
  | "canceled";

export type LocalUploadState = {
  status?: LocalUploadStatus;
  progress?: number;
  error?: string;
  taskId?: string;
};

export type VideoUploadOverlayIcon = "pause" | "play" | "retry" | "canceled";

export type VideoUploadOverlayState = {
  active: boolean;
  canPlay: boolean;
  action?: UploadAction;
  icon?: VideoUploadOverlayIcon;
  label?: string;
  progress?: number;
  taskId?: string;
};

export function localUploadStateFromMessage(message: MessageItemDto): LocalUploadState {
  const record = message as unknown as Record<string, unknown>;
  const rawStatus = typeof record.status === "string" ? record.status.trim().toLowerCase() : "";
  const status = isLocalUploadStatus(rawStatus) ? rawStatus : undefined;
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
    const reason = uploadState.error ? `：${uploadState.error}` : "";
    return `发送失败${reason}`;
  }
  return undefined;
}

export function uploadStatusLabel(
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

export function videoUploadOverlayState(
  uploadState?: LocalUploadState,
): VideoUploadOverlayState {
  const status = uploadState?.status;
  if (!status || status === "sent") return { active: false, canPlay: true };

  const progress = clampUploadProgress(uploadState.progress);
  const base = {
    active: true,
    canPlay: false,
    label: uploadStatusLabel(status, progress, uploadState.error),
    progress,
    taskId: uploadState.taskId,
  };

  if (status === "paused") return { ...base, action: "resume", icon: "play" };
  if (status === "failed") return { ...base, action: "retry", icon: "retry" };
  if (status === "canceled") return { ...base, action: undefined, icon: "canceled" };
  return { ...base, action: "pause", icon: "pause" };
}

function isLocalUploadStatus(value: string): value is LocalUploadStatus {
  return ["queued", "uploading", "paused", "failed", "sent", "canceled"].includes(value);
}

function clampUploadProgress(value?: number) {
  if (typeof value !== "number" || !Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, Math.round(value)));
}
