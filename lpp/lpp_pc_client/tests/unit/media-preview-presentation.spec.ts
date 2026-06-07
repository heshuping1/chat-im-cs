import { describe, expect, it } from "vitest";

import {
  filePreviewPresentation,
  imagePreviewPresentation,
  mediaPreviewPresentation,
  videoPreviewPresentation,
} from "../../src/renderer/media/domain/mediaPreviewPresentation";

describe("media preview presentation", () => {
  it("uses a stable unknown image card without requiring natural dimensions", () => {
    expect(imagePreviewPresentation()).toEqual({
      previewKind: "image",
      previewBox: {
        width: 178,
        height: 280,
        className: "media-preview-image-unknown",
      },
      displayState: "loading",
    });
  });

  it("keeps image buckets finite instead of deriving chat height at render time", () => {
    expect(imagePreviewPresentation({ bucket: "standard" }).previewBox).toEqual({
      width: 220,
      height: 220,
      className: "media-preview-image-standard",
    });
    expect(imagePreviewPresentation({ bucket: "wide" }).previewBox).toEqual({
      width: 260,
      height: 146,
      className: "media-preview-image-wide",
    });
    expect(imagePreviewPresentation({ bucket: "tall" }).previewBox).toEqual({
      width: 178,
      height: 280,
      className: "media-preview-image-tall",
    });
  });

  it("gives video and file previews fixed outer boxes", () => {
    expect(videoPreviewPresentation({ displayState: "ready" })).toEqual({
      previewKind: "video",
      previewBox: {
        width: 178,
        height: 316,
        className: "media-preview-video",
      },
      displayState: "ready",
    });
    expect(filePreviewPresentation({ displayState: "failed" })).toEqual({
      previewKind: "file",
      previewBox: {
        width: 318,
        height: 108,
        className: "media-preview-file",
      },
      displayState: "failed",
    });
  });

  it("normalizes unsupported media into a stable unknown preview", () => {
    expect(mediaPreviewPresentation({ kind: "voice" })).toMatchObject({
      previewKind: "voice",
      previewBox: {
        width: 250,
        height: 58,
        className: "media-preview-voice",
      },
    });
  });
});
