import {
  Copy,
  Download,
  FolderOpen,
  ImageIcon,
  RotateCw,
  Scan,
  X,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import type {
  CSSProperties,
  MouseEvent,
  PointerEvent as ReactPointerEvent,
  ReactNode,
  SyntheticEvent,
  WheelEvent,
} from "react";
import { useI18n } from "../../i18n/useI18n";
import type { MediaPreviewPresentation } from "../domain/mediaPreviewPresentation";

const minViewerScale = 0.25;
const maxViewerScale = 4;
const scaleStep = 0.25;

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
  onRevealImage,
  onSaveImageAs,
  previewOpen,
  presentation,
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
  onRevealImage?: () => void;
  onSaveImageAs?: () => void;
  previewOpen: boolean;
  presentation?: MediaPreviewPresentation;
  src?: string;
  sourceAvailable: boolean;
}) {
  const { t } = useI18n();
  const canRenderImage = sourceAvailable && Boolean(src);
  const effectivePreviewBox = presentation?.previewBox;
  const mediaPreviewFrameStyle = effectivePreviewBox
      ? ({
          "--media-preview-width": `${effectivePreviewBox.width}px`,
          "--media-preview-height": `${effectivePreviewBox.height}px`,
          "--media-preview-aspect-ratio": `${effectivePreviewBox.width} / ${effectivePreviewBox.height}`,
        } as CSSProperties)
    : undefined;
  const presentationClassName = effectivePreviewBox?.className ?? "";

  const handleInlineImageLoad = () => {
    onImageLoad();
  };

  return (
    <>
      {canRenderImage ? (
        <button
          className={`message-image-frame ${presentationClassName} ${imageLoaded ? "loaded" : ""}`}
          style={mediaPreviewFrameStyle}
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
              onLoad={handleInlineImageLoad}
              onError={onImageError}
            />
          )}
        </button>
      ) : (
        <span
          className={`message-image-frame message-image-empty ${presentationClassName}`}
          style={mediaPreviewFrameStyle}
          role="img"
          aria-label={t("media.image.message")}
        >
          <span className="message-image-loading" aria-hidden="true">
            <ImageIcon size={22} />
          </span>
        </span>
      )}
      {previewOpen && src && (
        <ImagePreviewViewer
          actionBusy={actionBusy}
          actionNotice={actionNotice}
          fileName={fileName}
          onClosePreview={onClosePreview}
          onCopyImage={onCopyImage}
          onRevealImage={onRevealImage}
          onSaveImageAs={onSaveImageAs}
          src={src}
        />
      )}
    </>
  );
}

export function ImagePreviewViewer({
  actionBusy = false,
  actionNotice,
  fileName,
  onClosePreview,
  onCopyImage,
  onRevealImage,
  onSaveImageAs,
  src,
}: {
  actionBusy?: boolean;
  actionNotice?: string | null;
  fileName?: string;
  onClosePreview: () => void;
  onCopyImage?: () => void;
  onRevealImage?: () => void;
  onSaveImageAs?: () => void;
  src: string;
}) {
  const { t } = useI18n();
  const [viewerScale, setViewerScale] = useState(1);
  const [viewerRotation, setViewerRotation] = useState(0);
  const [viewerOffset, setViewerOffset] = useState({ x: 0, y: 0 });
  const dragRef = useRef<{
    pointerId: number;
    startClientX: number;
    startClientY: number;
    startOffsetX: number;
    startOffsetY: number;
    moved: boolean;
  } | null>(null);
  const resetViewer = useCallback(() => {
    setViewerScale(1);
    setViewerRotation(0);
    setViewerOffset({ x: 0, y: 0 });
    dragRef.current = null;
  }, []);
  const updateViewerScale = useCallback((nextScale: number | ((current: number) => number)) => {
    setViewerScale((current) => clampScale(typeof nextScale === "function" ? nextScale(current) : nextScale));
  }, []);
  const zoomIn = useCallback(() => updateViewerScale((current) => current + scaleStep), [updateViewerScale]);
  const zoomOut = useCallback(() => {
    updateViewerScale((current) => {
      const next = current - scaleStep;
      if (next <= 1) setViewerOffset({ x: 0, y: 0 });
      return next;
    });
  }, [updateViewerScale]);
  const rotateImage = useCallback(() => setViewerRotation((current) => (current + 90) % 360), []);
  const copyImage = useCallback(() => {
    if (!actionBusy) onCopyImage?.();
  }, [actionBusy, onCopyImage]);
  const saveImageAs = useCallback(() => {
    if (!actionBusy) onSaveImageAs?.();
  }, [actionBusy, onSaveImageAs]);

  useEffect(() => {
    resetViewer();
  }, [resetViewer, src]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClosePreview();
        return;
      }
      if (event.ctrlKey && event.key.toLowerCase() === "c" && onCopyImage) {
        event.preventDefault();
        copyImage();
        return;
      }
      if (event.ctrlKey && event.key.toLowerCase() === "s" && onSaveImageAs) {
        event.preventDefault();
        saveImageAs();
        return;
      }
      if (event.key === "+" || event.key === "=") {
        event.preventDefault();
        zoomIn();
        return;
      }
      if (event.key === "-") {
        event.preventDefault();
        zoomOut();
        return;
      }
      if (event.key === "0") {
        event.preventDefault();
        resetViewer();
        return;
      }
      if (event.key.toLowerCase() === "r") {
        event.preventDefault();
        rotateImage();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    copyImage,
    onClosePreview,
    onCopyImage,
    onSaveImageAs,
    resetViewer,
    rotateImage,
    saveImageAs,
    zoomIn,
    zoomOut,
  ]);

  const handlePreviewWheel = (event: WheelEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    const direction = event.deltaY < 0 ? 1 : -1;
    updateViewerScale((current) => {
      const next = current + direction * scaleStep;
      if (next <= 1) setViewerOffset({ x: 0, y: 0 });
      return next;
    });
  };

  const handlePreviewDoubleClick = (event: MouseEvent<HTMLImageElement>) => {
    event.stopPropagation();
    if (viewerScale > 1) {
      setViewerOffset({ x: 0, y: 0 });
      setViewerScale(1);
      return;
    }
    setViewerScale(2);
  };

  const handlePointerDown = (event: ReactPointerEvent<HTMLImageElement>) => {
    if (viewerScale <= 1) return;
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = {
      pointerId: event.pointerId,
      startClientX: event.clientX,
      startClientY: event.clientY,
      startOffsetX: viewerOffset.x,
      startOffsetY: viewerOffset.y,
      moved: false,
    };
  };

  const handlePointerMove = (event: ReactPointerEvent<HTMLImageElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    event.preventDefault();
    event.stopPropagation();
    const deltaX = event.clientX - drag.startClientX;
    const deltaY = event.clientY - drag.startClientY;
    if (Math.abs(deltaX) > 2 || Math.abs(deltaY) > 2) drag.moved = true;
    setViewerOffset({
      x: drag.startOffsetX + deltaX,
      y: drag.startOffsetY + deltaY,
    });
  };

  const handlePointerEnd = (event: ReactPointerEvent<HTMLImageElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    event.preventDefault();
    event.stopPropagation();
    dragRef.current = null;
  };

  const viewerImageStyle = {
    "--wechat-image-scale": viewerScale,
    "--wechat-image-rotation": `${viewerRotation}deg`,
    "--wechat-image-offset-x": `${viewerOffset.x}px`,
    "--wechat-image-offset-y": `${viewerOffset.y}px`,
  } as CSSProperties;
  const viewerPercent = `${Math.round(viewerScale * 100)}%`;
  const canDragViewerImage = viewerScale > 1;

  return (
    <div
      className="message-image-preview wechat-image-preview"
      role="dialog"
      aria-modal="true"
      aria-label={fileName ? t("media.image.viewerNamed", { name: fileName }) : t("media.image.viewer")}
      onClick={onClosePreview}
      onWheel={handlePreviewWheel}
    >
      <div
        className="message-image-viewer-topbar"
        onClick={(event) => event.stopPropagation()}
      >
        <button
          className="message-image-preview-close"
          type="button"
          title={t("media.image.closePreview")}
          aria-label={t("media.image.closePreview")}
          onClick={onClosePreview}
        >
          <X size={18} />
        </button>
        <div className="message-image-viewer-title">
          <ImageIcon size={15} />
          <span>{fileName || t("media.image.viewer")}</span>
        </div>
        <div className="message-image-viewer-actions">
          <IconButton
            disabled={actionBusy || !onCopyImage}
            label={t("media.image.copy")}
            onClick={copyImage}
          >
            <Copy size={17} />
          </IconButton>
          <IconButton
            disabled={actionBusy || !onSaveImageAs}
            label={t("media.image.saveAs")}
            onClick={saveImageAs}
          >
            <Download size={17} />
          </IconButton>
          <IconButton
            disabled={actionBusy || !onRevealImage}
            label={t("media.image.reveal")}
            onClick={onRevealImage}
          >
            <FolderOpen size={17} />
          </IconButton>
        </div>
      </div>
      <div
        className="message-image-viewer-toolbar"
        onClick={(event) => event.stopPropagation()}
      >
        <button
          disabled={viewerScale <= minViewerScale}
          onClick={zoomOut}
          title={t("media.image.zoomOut")}
          aria-label={t("media.image.zoomOut")}
          type="button"
        >
          <ZoomOut size={18} />
        </button>
        <span className="message-image-viewer-scale">{viewerPercent}</span>
        <button
          disabled={viewerScale >= maxViewerScale}
          onClick={zoomIn}
          title={t("media.image.zoomIn")}
          aria-label={t("media.image.zoomIn")}
          type="button"
        >
          <ZoomIn size={18} />
        </button>
        <button
          onClick={rotateImage}
          title={t("media.image.rotate")}
          aria-label={t("media.image.rotate")}
          type="button"
        >
          <RotateCw size={18} />
        </button>
        <button
          onClick={resetViewer}
          title={t("media.image.resetView")}
          aria-label={t("media.image.resetView")}
          type="button"
        >
          <Scan size={18} />
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
        className={`message-image-viewer-img ${canDragViewerImage ? "can-drag" : ""}`}
        src={src}
        alt={fileName || t("media.image.viewer")}
        draggable={false}
        style={viewerImageStyle}
        onDoubleClick={handlePreviewDoubleClick}
        onPointerCancel={handlePointerEnd}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerEnd}
        onClick={(event) => event.stopPropagation()}
      />
    </div>
  );
}

function IconButton({
  children,
  disabled,
  label,
  onClick,
}: {
  children: ReactNode;
  disabled?: boolean;
  label: string;
  onClick?: () => void;
}) {
  return (
    <button
      disabled={disabled}
      onClick={onClick}
      title={label}
      aria-label={label}
      type="button"
    >
      {children}
    </button>
  );
}

function clampScale(value: number) {
  return Math.min(maxViewerScale, Math.max(minViewerScale, Number(value.toFixed(2))));
}
