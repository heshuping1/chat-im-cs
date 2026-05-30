import type { MessageItemDto } from "../../data/api-client";

export type UploadAction = "pause" | "resume" | "cancel" | "retry";
export type UploadActionHandler = (localTaskId: string, action: UploadAction) => void;

export type LocalUploadStatus =
  | "queued"
  | "uploading"
  | "paused"
  | "sending"
  | "failed"
  | "sent"
  | "canceled";

export type LocalUploadPhase =
  | "preparing"
  | "uploading_media"
  | "uploading_poster"
  | "sending"
  | "failed"
  | "sent";

export type LocalUploadState = {
  status?: LocalUploadStatus;
  phase?: LocalUploadPhase;
  progress?: number;
  error?: string;
  taskId?: string;
};

export type MediaUploadProgressEvent = {
  loaded?: number;
  total?: number;
  percent?: number;
};

export type VideoUploadDisplayProgressEvent = {
  phase: Extract<LocalUploadPhase, "uploading_media" | "uploading_poster" | "sending">;
  progress: number;
};

export type VideoUploadDisplayProgressTicker = {
  current: () => number;
  setPhase: (phase: VideoUploadDisplayProgressEvent["phase"]) => void;
  setRawProgress: (phase: VideoUploadDisplayProgressEvent["phase"], rawProgress?: number) => void;
  start: (phase?: VideoUploadDisplayProgressEvent["phase"]) => void;
  stop: () => void;
};

export type FileUploadControlState = "none" | "progress" | "paused" | "retry";

export type FileMessageCardState = {
  controlAction?: UploadAction;
  controlLabel?: string;
  controlProgress?: number;
  controlState: FileUploadControlState;
  metaText?: string;
};

export type VideoUploadOverlayIcon = "pause" | "play" | "retry" | "canceled";
export type VideoUploadProgressMode = "determinate" | "indeterminate";

export type VideoUploadOverlayState = {
  active: boolean;
  canPlay: boolean;
  action?: UploadAction;
  icon?: VideoUploadOverlayIcon;
  label?: string;
  progress?: number;
  progressMode?: VideoUploadProgressMode;
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
  const rawPhase = typeof record.uploadPhase === "string"
    ? record.uploadPhase.trim().toLowerCase()
    : "";
  const phase = isLocalUploadPhase(rawPhase) ? rawPhase : undefined;
  const error = typeof record.localError === "string" && record.localError.trim()
    ? record.localError.trim()
    : undefined;
  const taskId = typeof record.localTaskId === "string" && record.localTaskId.trim()
    ? record.localTaskId.trim()
    : undefined;
  return { status, phase, progress, error, taskId };
}

export function fileMessageInlineStatusText(message: MessageItemDto) {
  return fileMessageCardState(localUploadStateFromMessage(message)).metaText;
}

export function fileMessageCardState(uploadState?: LocalUploadState): FileMessageCardState {
  const status = uploadState?.status;
  if (!status || status === "sent") return { controlState: "none" };
  if (status === "queued") {
    return { controlLabel: "等待上传", controlProgress: 0, controlState: "progress", metaText: "等待上传" };
  }
  if (status === "uploading" || status === "sending") {
    if (uploadState.phase === "preparing") {
      return { controlLabel: "等待上传", controlProgress: 0, controlState: "progress", metaText: "等待上传" };
    }
    if (status === "sending") {
      return {
        controlLabel: "发送中",
        controlProgress: 95,
        controlState: "progress",
        metaText: "发送中",
      };
    }
    const displayProgress = composeMediaUploadProgress("file", uploadState.phase, uploadState.progress);
    return {
      controlAction: uploadState.taskId ? "pause" : undefined,
      controlLabel: "暂停上传",
      controlProgress: displayProgress ?? 0,
      controlState: "progress",
      metaText: "上传中",
    };
  }
  if (status === "paused") {
    return {
      controlAction: uploadState.taskId ? "resume" : undefined,
      controlLabel: "继续上传",
      controlProgress: composeMediaUploadProgress("file", uploadState.phase, uploadState.progress) ?? 0,
      controlState: "paused",
      metaText: "已暂停",
    };
  }
  if (status === "canceled") {
    return { controlLabel: "已取消", controlState: "none", metaText: "已取消" };
  }
  if (status === "failed") {
    return {
      controlAction: uploadState.taskId ? "retry" : undefined,
      controlLabel: "重新发送",
      controlState: "retry",
      metaText: "发送失败，点击重试",
    };
  }
  return { controlState: "none" };
}

export function uploadStatusLabel(
  status: LocalUploadStatus,
  progress?: number,
  _error?: string,
) {
  if (status === "queued") return "等待上传";
  if (status === "uploading") return `上传中${typeof progress === "number" ? ` ${progress}%` : ""}`;
  if (status === "paused") return "已暂停";
  if (status === "sending") return "发送中";
  if (status === "failed") return "发送失败，点击重试";
  if (status === "canceled") return "已取消";
  return "";
}

export function videoUploadOverlayLabel(
  status: LocalUploadStatus,
  progress?: number,
) {
  if (status === "queued") return "等待上传";
  if (status === "uploading") return typeof progress === "number" ? `上传中 ${progress}%` : "上传中";
  if (status === "paused") return "已暂停";
  if (status === "sending") return "发送中";
  if (status === "failed") return "发送失败，点击重试";
  if (status === "canceled") return "已取消";
  return "";
}

export function videoUploadOverlayState(
  uploadState?: LocalUploadState,
): VideoUploadOverlayState {
  const status = uploadState?.status;
  if (!status || status === "sent") return { active: false, canPlay: true };

  const phase = uploadState.phase ?? fallbackVideoUploadPhase(status);
  let progress = composeMediaUploadProgress("video", phase, uploadState.progress);
  if ((status === "queued" || status === "uploading") && typeof progress !== "number") {
    progress = 0;
  }
  const progressMode = videoUploadProgressMode(status, uploadState.phase);
  const base = {
    active: true,
    canPlay: false,
    label: videoUploadOverlayLabel(status, progress),
    progress,
    progressMode,
    taskId: uploadState.taskId,
  };

  if (status === "paused") return { ...base, action: "resume", icon: "play" };
  if (status === "failed") return { ...base, action: "retry", icon: "retry" };
  if (status === "canceled") return { ...base, action: undefined, icon: "canceled" };
  if (status === "sending") return { ...base, action: undefined, icon: "pause", progress: progress ?? 95 };
  if (status === "queued") return { ...base, action: undefined, icon: "pause" };
  return { ...base, action: "pause", icon: "pause" };
}

export function composeMediaUploadProgress(
  kind: "file" | "video",
  phase?: LocalUploadPhase,
  rawProgress?: number,
) {
  const progress = optionalUploadProgress(rawProgress);
  if (phase === "sending") return 95;
  if (phase === "sent") return 100;
  if (phase === "preparing") return undefined;
  if (kind === "file") {
    if (phase === "uploading_media") {
      return typeof progress === "number" ? Math.min(90, Math.round(progress * 0.9)) : undefined;
    }
    return progress;
  }
  if (phase === "uploading_media") {
    return typeof progress === "number" ? Math.min(78, progress) : 0;
  }
  if (phase === "uploading_poster") {
    return typeof progress === "number" ? Math.min(88, Math.max(78, progress)) : 78;
  }
  return progress;
}

export function videoUploadDisplayProgressTarget({
  elapsedMs = 0,
  phase,
  rawProgress,
}: {
  elapsedMs?: number;
  phase: LocalUploadPhase;
  rawProgress?: number;
}) {
  const raw = optionalUploadProgress(rawProgress);
  const safeElapsedMs = Math.max(0, Math.round(elapsedMs));
  if (phase === "preparing") return 0;
  if (phase === "uploading_media") {
    const clockProgress = Math.min(72, Math.floor(safeElapsedMs / 150) * 4);
    const rawProgressTarget =
      typeof raw === "number" ? Math.min(78, Math.round(raw * 0.78)) : 0;
    return Math.max(clockProgress, rawProgressTarget);
  }
  if (phase === "uploading_poster") {
    const clockProgress = 78 + Math.min(8, Math.floor(safeElapsedMs / 150) * 2);
    const rawProgressTarget =
      typeof raw === "number" ? 78 + Math.min(10, Math.round(raw * 0.1)) : 78;
    return Math.max(clockProgress, rawProgressTarget);
  }
  if (phase === "sending") return 95;
  if (phase === "sent") return 100;
  return 0;
}

export function createVideoUploadDisplayProgressTicker(
  onProgress: (event: VideoUploadDisplayProgressEvent) => void,
  options: {
    intervalMs?: number;
    now?: () => number;
  } = {},
): VideoUploadDisplayProgressTicker {
  const intervalMs = options.intervalMs ?? 150;
  const now = options.now ?? (() => Date.now());
  let phase: VideoUploadDisplayProgressEvent["phase"] = "uploading_media";
  let phaseStartedAt = now();
  let rawProgress: number | undefined;
  let displayProgress = 0;
  let stopped = true;
  let timer: ReturnType<typeof globalThis.setInterval> | undefined;

  const clearTimer = () => {
    if (timer === undefined) return;
    globalThis.clearInterval(timer);
    timer = undefined;
  };
  const emit = () => {
    if (stopped) return;
    const target = videoUploadDisplayProgressTarget({
      elapsedMs: now() - phaseStartedAt,
      phase,
      rawProgress,
    });
    const nextProgress = Math.max(displayProgress, target);
    if (nextProgress <= displayProgress) return;
    displayProgress = nextProgress;
    onProgress({ phase, progress: displayProgress });
  };
  const ensureTimer = () => {
    if (timer !== undefined) return;
    timer = globalThis.setInterval(emit, intervalMs);
  };

  return {
    current: () => displayProgress,
    setPhase: (nextPhase) => {
      if (stopped) return;
      if (phase !== nextPhase) {
        phase = nextPhase;
        phaseStartedAt = now();
        rawProgress = undefined;
      }
      emit();
    },
    setRawProgress: (nextPhase, nextRawProgress) => {
      if (stopped) return;
      if (phase !== nextPhase) {
        phase = nextPhase;
        phaseStartedAt = now();
      }
      rawProgress = nextRawProgress;
      emit();
    },
    start: (nextPhase = "uploading_media") => {
      stopped = false;
      phase = nextPhase;
      phaseStartedAt = now();
      rawProgress = undefined;
      displayProgress = 0;
      ensureTimer();
      emit();
    },
    stop: () => {
      stopped = true;
      clearTimer();
    },
  };
}

function fallbackVideoUploadPhase(status: LocalUploadStatus): LocalUploadPhase | undefined {
  if (status === "sending") return "sending";
  if (status === "uploading" || status === "paused") return "uploading_media";
  return undefined;
}

function videoUploadProgressMode(
  status: LocalUploadStatus,
  phase?: LocalUploadPhase,
): VideoUploadProgressMode | undefined {
  if (status === "sent") return undefined;
  if (
    status === "queued" ||
    status === "uploading" ||
    status === "paused" ||
    status === "sending" ||
    status === "failed" ||
    status === "canceled" ||
    phase === "preparing" ||
    phase === "uploading_media" ||
    phase === "uploading_poster" ||
    phase === "sending"
  ) {
    return "determinate";
  }
  return "determinate";
}

export function mediaUploadProgressPercent(
  progress: MediaUploadProgressEvent,
  fallbackTotal?: number,
) {
  if (typeof progress.percent === "number" && Number.isFinite(progress.percent)) {
    return optionalUploadProgress(progress.percent);
  }
  const total =
    typeof progress.total === "number" && Number.isFinite(progress.total) && progress.total > 0
      ? progress.total
      : fallbackTotal;
  if (
    typeof progress.loaded !== "number" ||
    !Number.isFinite(progress.loaded) ||
    typeof total !== "number" ||
    !Number.isFinite(total) ||
    total <= 0
  ) {
    return undefined;
  }
  return optionalUploadProgress((progress.loaded / total) * 100);
}

function isLocalUploadStatus(value: string): value is LocalUploadStatus {
  return ["queued", "uploading", "paused", "sending", "failed", "sent", "canceled"].includes(value);
}

function isLocalUploadPhase(value: string): value is LocalUploadPhase {
  return [
    "preparing",
    "uploading_media",
    "uploading_poster",
    "sending",
    "failed",
    "sent",
  ].includes(value);
}

function optionalUploadProgress(value?: number) {
  if (typeof value !== "number" || !Number.isFinite(value)) return undefined;
  return Math.max(0, Math.min(100, Math.round(value)));
}
