import { X } from "lucide-react";
import type { ChangeEvent, MutableRefObject } from "react";
import type { ComposerMediaKind } from "../composer/domain/detectComposerMediaKind";
import {
  composerFileAttachmentVisual,
  composerMediaKindLabel,
  formatComposerFileSize,
} from "../composer/presentation/composerAttachmentPresentation";

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
  if (attachments.length === 0) return null;
  return (
    <div className="composer-attachments" aria-label="待发送附件">
      {attachments.map((item) => {
        const visual = composerFileAttachmentVisual(item.file.name);
        return (
          <article className="composer-attachment" key={item.id}>
            {item.kind === "image" && item.previewUrl ? (
              <img src={item.previewUrl} alt={item.file.name || "待发送图片"} />
            ) : (
              <span
                className={`composer-attachment-icon ${visual.kind}`}
                aria-hidden="true"
              >
                <span className="file-type-glyph">{visual.label}</span>
              </span>
            )}
            <span>
              <strong>{item.file.name || composerMediaKindLabel(item.kind)}</strong>
              <small>{formatComposerFileSize(item.file.size)}</small>
            </span>
            <button
              type="button"
              aria-label={`移除 ${item.file.name || "附件"}`}
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
  if (!attachment?.previewUrl) return null;
  return (
    <div
      className="composer-attachment-preview"
      role="dialog"
      aria-modal="true"
      aria-label="待发送图片预览"
      onClick={onClose}
    >
      <button
        className="composer-attachment-preview-close"
        type="button"
        aria-label="关闭待发送图片预览"
        onClick={onClose}
      >
        <X size={18} />
      </button>
      <img
        src={attachment.previewUrl}
        alt={attachment.file.name || "待发送图片"}
        onClick={(event) => event.stopPropagation()}
      />
    </div>
  );
}
