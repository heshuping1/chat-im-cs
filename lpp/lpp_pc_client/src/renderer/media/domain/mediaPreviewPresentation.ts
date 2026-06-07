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

const imagePreviewBoxes: Record<ImagePreviewBucket, MediaPreviewBox> = {
  standard: { width: 220, height: 220, className: "media-preview-image-standard" },
  wide: { width: 260, height: 146, className: "media-preview-image-wide" },
  tall: { width: 178, height: 280, className: "media-preview-image-tall" },
  unknown: { width: 178, height: 280, className: "media-preview-image-unknown" },
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
}: {
  bucket?: ImagePreviewBucket;
  displayState?: MediaPreviewDisplayState;
} = {}): MediaPreviewPresentation {
  return {
    previewKind: "image",
    previewBox: imagePreviewBoxes[bucket],
    displayState,
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
  kind,
}: {
  kind: MediaPreviewKind;
  imageBucket?: ImagePreviewBucket;
  displayState?: MediaPreviewDisplayState;
}): MediaPreviewPresentation {
  if (kind === "image") {
    return imagePreviewPresentation({ bucket: imageBucket, displayState });
  }
  if (kind === "video") return videoPreviewPresentation({ displayState });
  if (kind === "file") return filePreviewPresentation({ displayState });
  return {
    previewKind: kind,
    previewBox: previewBoxes[kind] ?? previewBoxes.unknown,
    displayState,
  };
}
