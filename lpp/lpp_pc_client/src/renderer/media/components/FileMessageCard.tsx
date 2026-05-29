import type { MouseEventHandler } from "react";
import { composerFileAttachmentVisual } from "../../composer/presentation/composerAttachmentPresentation";

export function FileMessageCard({
  ariaLabel,
  className,
  fileName,
  metaText,
  onClick,
}: {
  ariaLabel: string;
  className?: string;
  fileName: string;
  metaText?: string;
  onClick?: MouseEventHandler<HTMLButtonElement>;
}) {
  const fileIcon = composerFileAttachmentVisual(fileName);
  return (
    <button
      type="button"
      className={className}
      onClick={onClick}
      aria-label={ariaLabel}
    >
      <span className={`message-file-icon ${fileIcon.kind}`} aria-hidden="true">
        <span className="file-type-glyph">{fileIcon.label}</span>
      </span>
      <span className="message-file-copy">
        <strong>{fileName}</strong>
        <em>{metaText}</em>
      </span>
    </button>
  );
}
