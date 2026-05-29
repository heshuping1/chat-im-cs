import { ImageIcon, X } from "lucide-react";
import type { SyntheticEvent } from "react";

export function ImageMessageFrame({
  altText,
  fileName,
  imageLoaded,
  onClosePreview,
  onImageError,
  onImageLoad,
  onOpenPreview,
  previewOpen,
  src,
  sourceAvailable,
}: {
  altText: string;
  fileName?: string;
  imageLoaded: boolean;
  onClosePreview: () => void;
  onImageError: (event: SyntheticEvent<HTMLImageElement>) => void;
  onImageLoad: () => void;
  onOpenPreview: () => void;
  previewOpen: boolean;
  src?: string;
  sourceAvailable: boolean;
}) {
  return (
    <>
      {sourceAvailable ? (
        <button
          className={`message-image-frame ${imageLoaded ? "loaded" : ""}`}
          type="button"
          aria-label={fileName ? `预览图片 ${fileName}` : "预览图片"}
          onClick={onOpenPreview}
        >
          {!imageLoaded && (
            <span className="message-image-loading" aria-label="图片加载中">
              <ImageIcon size={22} />
              <em>图片加载中</em>
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
          {fileName || "图片消息"}
        </span>
      )}
      {previewOpen && src && (
        <div
          className="message-image-preview"
          role="dialog"
          aria-modal="true"
          aria-label={fileName ? `图片预览 ${fileName}` : "图片预览"}
          onClick={onClosePreview}
        >
          <button
            className="message-image-preview-close"
            type="button"
            aria-label="关闭图片预览"
            onClick={onClosePreview}
          >
            <X size={20} />
          </button>
          <img
            src={src}
            alt={fileName || "图片预览"}
            onClick={(event) => event.stopPropagation()}
          />
        </div>
      )}
    </>
  );
}
