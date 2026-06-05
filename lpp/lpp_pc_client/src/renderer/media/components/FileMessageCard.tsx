import type { CSSProperties, MouseEventHandler } from "react";
import { composerFileAttachmentVisual } from "../../composer/presentation/composerAttachmentPresentation";
import { useI18n } from "../../i18n/useI18n";
import type { FileUploadControlState } from "../runtime/uploadState";

export function FileMessageCard({
  ariaLabel,
  className,
  controlLabel,
  controlProgress,
  controlState = "none",
  fileName,
  metaText,
  onClick,
  onControlClick,
  sourceLabel,
}: {
  ariaLabel: string;
  className?: string;
  controlLabel?: string;
  controlProgress?: number;
  controlState?: FileUploadControlState;
  fileName: string;
  metaText?: string;
  onClick?: MouseEventHandler<HTMLButtonElement>;
  onControlClick?: MouseEventHandler<HTMLButtonElement>;
  sourceLabel?: string;
}) {
  const { t } = useI18n();
  const fileIcon = composerFileAttachmentVisual(fileName);
  const resolvedSourceLabel = sourceLabel ?? t("media.file.client");
  const progressValue = typeof controlProgress === "number" && Number.isFinite(controlProgress)
    ? Math.max(0, Math.min(100, Math.round(controlProgress)))
    : controlState === "retry"
      ? 100
      : 0;
  const progressOffset = 100 - progressValue;
  const controlActive = controlState !== "none";
  const control = controlActive ? (
    <span
      className={`message-file-control is-${controlState} is-determinate`}
      aria-hidden="true"
      style={
        {
          "--message-file-control-offset": progressOffset,
        } as CSSProperties
      }
    >
      <span className="message-file-control-ring">
        <svg className="message-file-control-svg" viewBox="0 0 40 40" focusable="false">
          <circle className="message-file-control-track" cx="20" cy="20" r="17" pathLength={100} />
          <circle className="message-file-control-meter" cx="20" cy="20" r="17" pathLength={100} />
        </svg>
      </span>
      <span className="message-file-control-glyph">
        {controlState === "retry" ? "!" : controlState === "paused" ? "▶" : "Ⅱ"}
      </span>
    </span>
  ) : null;
  const icon = (
    <span className={`message-file-icon ${fileIcon.kind}`} aria-hidden="true">
      {!controlActive ? (
        <span className="file-type-glyph">{fileIcon.label}</span>
      ) : (
        <span className="message-file-page-mark" />
      )}
      {control}
    </span>
  );
  return (
    <span className={className}>
      <button type="button" className="message-file-primary" onClick={onClick} aria-label={ariaLabel}>
        <span className="message-file-copy">
          <strong>{fileName}</strong>
          <em>{metaText}</em>
        </span>
      </button>
      {controlActive && onControlClick ? (
        <button
          type="button"
          className="message-file-icon-action"
          onClick={onControlClick}
          aria-label={controlLabel || t("media.file.uploadAction")}
        >
          {icon}
        </button>
      ) : (
        <span className="message-file-icon-action is-static">{icon}</span>
      )}
      <span className="message-file-source">
        <span className="message-file-source-mark" aria-hidden="true">
          ●●
        </span>
        <span>{resolvedSourceLabel}</span>
      </span>
    </span>
  );
}
