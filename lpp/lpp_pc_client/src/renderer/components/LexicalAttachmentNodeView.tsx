import type { ComposerAttachmentPayload } from "../composer/domain/composerDocument";
import {
  composerFileAttachmentVisual,
  formatComposerFileSize,
} from "../composer/presentation/composerAttachmentPresentation";
import { useI18n } from "../i18n/useI18n";

export function LexicalAttachmentNodeView({
  payload,
}: {
  payload: ComposerAttachmentPayload;
}) {
  const { t } = useI18n();
  const failed = payload.status === "failed";
  const fileIcon = composerFileAttachmentVisual(payload.fileName);
  const kindLabel = t(composerMediaKindLabelKey(payload.kind));
  return (
    <span
      className={`composer-attachment-card ${payload.kind} ${failed ? "failed" : ""}`}
      data-composer-part="attachment"
      data-attachment-id={payload.id}
      role="group"
      aria-label={t("composer.attachments.pendingNamed", { kind: kindLabel, name: payload.fileName })}
    >
      {payload.kind === "image" && payload.previewUrl ? (
        <span
          className="composer-attachment-thumb"
          tabIndex={-1}
          aria-label={t("composer.attachments.previewPendingImageNamed", { name: payload.fileName })}
          role="button"
          onDoubleClick={() => dispatchAttachmentEvent("preview", payload.id)}
        >
          <img src={payload.previewUrl} alt={payload.fileName} />
        </span>
      ) : (
        <>
          <span className="composer-attachment-copy">
            <strong>{payload.fileName || t("media.message.file")}</strong>
            <small>{payload.error || formatComposerFileSize(payload.size) || t("composer.attachments.pending")}</small>
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

function composerMediaKindLabelKey(kind: ComposerAttachmentPayload["kind"]) {
  if (kind === "image") return "media.message.image";
  if (kind === "video") return "media.message.video";
  return "media.message.file";
}

function dispatchAttachmentEvent(action: "preview" | "remove", attachmentId: string) {
  window.dispatchEvent(
    new CustomEvent("pc-im-composer-attachment", {
      detail: { action, attachmentId },
    }),
  );
}
