import {
  type LocalUploadState,
  type UploadActionHandler,
  uploadStatusLabel,
} from "../runtime/uploadState";

export function UploadControls({
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
