export type MediaPreviewKind = "image" | "video" | "file" | "voice" | "contact" | "unknown";
export type MediaPreviewDisplayState = "empty" | "loading" | "ready" | "failed";
export type ImagePreviewBucket = "standard" | "wide" | "tall" | "unknown";

export interface MediaPreviewBox {
  width: number;
  height: number;
  className: string;
}

export interface MediaPreviewPresentation {
  previewKind: MediaPreviewKind;
  previewBox: MediaPreviewBox;
  displayState: MediaPreviewDisplayState;
}

export interface ImagePreviewSize {
  width?: number;
  height?: number;
}

const imagePreviewBounds = {
  maxHeight: 280,
  maxWidth: 260,
  standardMaxSide: 220,
};

const imagePreviewBoxes: Record<ImagePreviewBucket, MediaPreviewBox> = {
  standard: { width: 220, height: 220, className: "media-preview-image-standard" },
  wide: { width: 260, height: 146, className: "media-preview-image-wide" },
  tall: { width: 178, height: 280, className: "media-preview-image-tall" },
  unknown: { width: 180, height: 180, className: "media-preview-image-unknown" },
};

const previewBoxes: Record<Exclude<MediaPreviewKind, "image">, MediaPreviewBox> = {
  video: { width: 178, height: 316, className: "media-preview-video" },
  file: { width: 318, height: 108, className: "media-preview-file" },
  voice: { width: 250, height: 58, className: "media-preview-voice" },
  contact: { width: 280, height: 86, className: "media-preview-contact" },
  unknown: { width: 180, height: 112, className: "media-preview-unknown" },
};

export function imagePreviewPresentation({
  bucket = "unknown",
  displayState = "loading",
  imageSize,
}: {
  bucket?: ImagePreviewBucket;
  displayState?: MediaPreviewDisplayState;
  imageSize?: ImagePreviewSize;
} = {}): MediaPreviewPresentation {
  return {
    previewKind: "image",
    previewBox: imagePreviewBoxFromSize(imageSize) ?? imagePreviewBoxes[bucket],
    displayState,
  };
}

export function imagePreviewBoxFromSize(
  imageSize: ImagePreviewSize | undefined,
): MediaPreviewBox | undefined {
  const width = safePositiveSize(imageSize?.width);
  const height = safePositiveSize(imageSize?.height);
  if (!width || !height) return undefined;
  const ratio = width / height;
  const maxWidth =
    ratio > 1.2 ? imagePreviewBounds.maxWidth : imagePreviewBounds.standardMaxSide;
  const maxHeight =
    ratio < 0.8 ? imagePreviewBounds.maxHeight : imagePreviewBounds.standardMaxSide;
  const scale = Math.min(maxWidth / width, maxHeight / height, 1);
  const previewWidth = Math.max(1, Math.round(width * scale));
  const previewHeight = Math.max(1, Math.round(height * scale));
  return {
    width: previewWidth,
    height: previewHeight,
    className: imagePreviewClassName(ratio),
  };
}

export function videoPreviewPresentation({
  displayState = "loading",
}: {
  displayState?: MediaPreviewDisplayState;
} = {}): MediaPreviewPresentation {
  return {
    previewKind: "video",
    previewBox: previewBoxes.video,
    displayState,
  };
}

export function filePreviewPresentation({
  displayState = "loading",
}: {
  displayState?: MediaPreviewDisplayState;
} = {}): MediaPreviewPresentation {
  return {
    previewKind: "file",
    previewBox: previewBoxes.file,
    displayState,
  };
}

export function mediaPreviewPresentation({
  displayState = "loading",
  imageBucket,
  imageSize,
  kind,
}: {
  kind: MediaPreviewKind;
  imageBucket?: ImagePreviewBucket;
  imageSize?: ImagePreviewSize;
  displayState?: MediaPreviewDisplayState;
}): MediaPreviewPresentation {
  if (kind === "image") {
    return imagePreviewPresentation({ bucket: imageBucket, displayState, imageSize });
  }
  if (kind === "video") return videoPreviewPresentation({ displayState });
  if (kind === "file") return filePreviewPresentation({ displayState });
  return {
    previewKind: kind,
    previewBox: previewBoxes[kind] ?? previewBoxes.unknown,
    displayState,
  };
}

function imagePreviewClassName(ratio: number) {
  if (ratio >= 1.6) return "media-preview-image-wide";
  if (ratio <= 0.72) return "media-preview-image-tall";
  return "media-preview-image-standard";
}

function safePositiveSize(value: number | undefined) {
  return typeof value === "number" && Number.isFinite(value) && value > 0
    ? value
    : undefined;
}
