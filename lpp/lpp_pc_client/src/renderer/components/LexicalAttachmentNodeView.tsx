import type { ComposerAttachmentPayload } from "../composer/domain/composerDocument";
import {
  composerFileAttachmentVisual,
  composerMediaKindLabel,
  formatComposerFileSize,
} from "../composer/presentation/composerAttachmentPresentation";

export function LexicalAttachmentNodeView({
  payload,
}: {
  payload: ComposerAttachmentPayload;
}) {
  const failed = payload.status === "failed";
  const fileIcon = composerFileAttachmentVisual(payload.fileName);
  return (
    <span
      className={`composer-attachment-card ${payload.kind} ${failed ? "failed" : ""}`}
      data-composer-part="attachment"
      data-attachment-id={payload.id}
      role="group"
      aria-label={`待发送${composerMediaKindLabel(payload.kind)} ${payload.fileName}`}
    >
      {payload.kind === "image" && payload.previewUrl ? (
        <span
          className="composer-attachment-thumb"
          tabIndex={-1}
          aria-label={`预览待发送图片 ${payload.fileName}`}
          role="button"
          onDoubleClick={() => dispatchAttachmentEvent("preview", payload.id)}
        >
          <img src={payload.previewUrl} alt={payload.fileName} />
        </span>
      ) : (
        <>
          <span className="composer-attachment-copy">
            <strong>{payload.fileName || "文件"}</strong>
            <small>{payload.error || formatComposerFileSize(payload.size) || "待发送"}</small>
          </span>
          <span
            className={`composer-attachment-file-icon ${fileIcon.kind}`}
            aria-hidden="true"
          >
            <span className="file-type-glyph">{fileIcon.label}</span>
          </span>
        </>
      )}
    </span>
  );
}

function dispatchAttachmentEvent(action: "preview" | "remove", attachmentId: string) {
  window.dispatchEvent(
    new CustomEvent("pc-im-composer-attachment", {
      detail: { action, attachmentId },
    }),
  );
}
