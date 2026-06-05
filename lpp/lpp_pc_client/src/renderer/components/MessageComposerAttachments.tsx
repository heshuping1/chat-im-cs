import { X } from "lucide-react";
import type { ChangeEvent, MutableRefObject } from "react";
import type { ComposerMediaKind } from "../composer/domain/detectComposerMediaKind";
import {
  composerFileAttachmentVisual,
  formatComposerFileSize,
} from "../composer/presentation/composerAttachmentPresentation";
import { useI18n } from "../i18n/useI18n";

export interface PendingAttachment {
  id: string;
  file: File;
  kind: ComposerMediaKind;
  previewUrl?: string;
  status?: "ready" | "failed";
  error?: string;
}

export function MessageComposerAttachmentList({
  attachments,
  onRemove,
}: {
  attachments: PendingAttachment[];
  onRemove: (attachment: PendingAttachment) => void;
}) {
  const { t } = useI18n();
  if (attachments.length === 0) return null;
  return (
    <div className="composer-attachments" aria-label={t("composer.attachments.pendingAria")}>
      {attachments.map((item) => {
        const visual = composerFileAttachmentVisual(item.file.name);
        return (
          <article className="composer-attachment" key={item.id}>
            {item.kind === "image" && item.previewUrl ? (
              <img src={item.previewUrl} alt={item.file.name || t("composer.attachments.pendingImage")} />
            ) : (
              <span
                className={`composer-attachment-icon ${visual.kind}`}
                aria-hidden="true"
              >
                <span className="file-type-glyph">{visual.label}</span>
              </span>
            )}
            <span>
              <strong>{item.file.name || t(composerMediaKindLabelKey(item.kind))}</strong>
              <small>{formatComposerFileSize(item.file.size)}</small>
            </span>
            <button
              type="button"
              aria-label={t("composer.attachments.remove", { name: item.file.name || t("composer.attachments.attachment") })}
              onClick={() => onRemove(item)}
            >
              <X size={13} />
            </button>
          </article>
        );
      })}
    </div>
  );
}

export function MessageComposerFileInputs({
  attachmentInputRef,
  imageInputRef,
  fileInputRef,
  onFiles,
}: {
  attachmentInputRef: MutableRefObject<HTMLInputElement | null>;
  imageInputRef: MutableRefObject<HTMLInputElement | null>;
  fileInputRef: MutableRefObject<HTMLInputElement | null>;
  onFiles: (files: File[]) => void;
}) {
  const handleFiles = (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.currentTarget.files ?? []);
    event.currentTarget.value = "";
    if (files.length) onFiles(files);
  };
  return (
    <>
      <input
        ref={attachmentInputRef}
        className="hidden-file-input"
        data-testid="composer-attachment-input"
        type="file"
        multiple
        onChange={handleFiles}
      />
      <input
        ref={imageInputRef}
        className="hidden-file-input"
        data-testid="composer-image-input"
        type="file"
        accept="image/*"
        multiple
        onChange={handleFiles}
      />
      <input
        ref={fileInputRef}
        className="hidden-file-input"
        data-testid="composer-file-input"
        type="file"
        multiple
        onChange={handleFiles}
      />
    </>
  );
}

export function MessageComposerAttachmentPreview({
  attachment,
  onClose,
}: {
  attachment: PendingAttachment | null;
  onClose: () => void;
}) {
  const { t } = useI18n();
  if (!attachment?.previewUrl) return null;
  return (
    <div
      className="composer-attachment-preview"
      role="dialog"
      aria-modal="true"
      aria-label={t("composer.attachments.pendingImagePreview")}
      onClick={onClose}
    >
      <button
        className="composer-attachment-preview-close"
        type="button"
        aria-label={t("composer.attachments.closePendingImagePreview")}
        onClick={onClose}
      >
        <X size={18} />
      </button>
      <img
        src={attachment.previewUrl}
        alt={attachment.file.name || t("composer.attachments.pendingImage")}
        onClick={(event) => event.stopPropagation()}
      />
    </div>
  );
}

function composerMediaKindLabelKey(kind: ComposerMediaKind) {
  if (kind === "image") return "media.message.image";
  if (kind === "video") return "media.message.video";
  return "media.message.file";
}
