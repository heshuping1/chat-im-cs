import { Copy, Download, FolderOpen, ImageIcon, X } from "lucide-react";
import { useEffect } from "react";
import type { SyntheticEvent } from "react";
import { useI18n } from "../../i18n/useI18n";

export function ImageMessageFrame({
  altText,
  fileName,
  imageLoaded,
  actionBusy = false,
  actionNotice,
  onClosePreview,
  onCopyImage,
  onImageError,
  onImageLoad,
  onOpenPreview,
  onRetryImage,
  onRevealImage,
  onSaveImageAs,
  previewOpen,
  src,
  sourceAvailable,
}: {
  altText: string;
  fileName?: string;
  imageLoaded: boolean;
  actionBusy?: boolean;
  actionNotice?: string | null;
  onClosePreview: () => void;
  onCopyImage?: () => void;
  onImageError: (event: SyntheticEvent<HTMLImageElement>) => void;
  onImageLoad: () => void;
  onOpenPreview: () => void;
  onRetryImage?: () => void;
  onRevealImage?: () => void;
  onSaveImageAs?: () => void;
  previewOpen: boolean;
  src?: string;
  sourceAvailable: boolean;
}) {
  const { t } = useI18n();
  const canRenderImage = sourceAvailable && Boolean(src);
  useEffect(() => {
    if (!previewOpen) return undefined;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClosePreview();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClosePreview, previewOpen]);

  return (
    <>
      {canRenderImage ? (
        <button
          className={`message-image-frame ${imageLoaded ? "loaded" : ""}`}
          type="button"
          aria-label={fileName ? t("media.image.previewNamed", { name: fileName }) : t("media.image.preview")}
          onClick={onOpenPreview}
        >
          {!imageLoaded && (
            <span className="message-image-loading" aria-label={t("media.image.loading")}>
              <ImageIcon size={22} />
              <em>{t("media.image.loading")}</em>
            </span>
          )}
          {src && (
            <img
              className="message-image"
              src={src}
              alt={altText}
              onLoad={onImageLoad}
              onError={onImageError}
            />
          )}
        </button>
      ) : (
        <span className="message-media-empty">
          <ImageIcon size={18} />
          <em>{fileName || t("media.image.message")}</em>
          {onRetryImage && (
            <button className="message-image-retry" type="button" onClick={onRetryImage}>
              {t("media.image.reload")}
            </button>
          )}
        </span>
      )}
      {previewOpen && src && (
        <div
          className="message-image-preview"
          role="dialog"
          aria-modal="true"
          aria-label={fileName ? t("media.image.viewerNamed", { name: fileName }) : t("media.image.viewer")}
          onClick={onClosePreview}
        >
          <button
            className="message-image-preview-close"
            type="button"
            aria-label={t("media.image.closePreview")}
            onClick={onClosePreview}
          >
            <X size={20} />
          </button>
          <div
            className="message-image-viewer-toolbar"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              disabled={actionBusy || !onCopyImage}
              onClick={onCopyImage}
              type="button"
            >
              <Copy size={16} />
              {t("media.image.copy")}
            </button>
            <button
              disabled={actionBusy || !onSaveImageAs}
              onClick={onSaveImageAs}
              type="button"
            >
              <Download size={16} />
              {t("media.image.saveAs")}
            </button>
            <button
              disabled={actionBusy || !onRevealImage}
              onClick={onRevealImage}
              type="button"
            >
              <FolderOpen size={16} />
              {t("media.image.reveal")}
            </button>
          </div>
          {actionNotice && (
            <div
              className="message-image-viewer-notice"
              onClick={(event) => event.stopPropagation()}
            >
              {actionNotice}
            </div>
          )}
          <img
            src={src}
            alt={fileName || t("media.image.viewer")}
            onClick={(event) => event.stopPropagation()}
          />
        </div>
      )}
    </>
  );
}
