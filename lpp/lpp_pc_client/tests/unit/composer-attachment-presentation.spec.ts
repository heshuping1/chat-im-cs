import { describe, expect, it } from "vitest";
import {
  composerFileAttachmentVisual,
  composerMediaKindLabel,
  formatComposerFileSize,
} from "../../src/renderer/composer/presentation/composerAttachmentPresentation";

describe("composer attachment presentation", () => {
  it("formats media kind labels consistently", () => {
    expect(composerMediaKindLabel("image")).toBe("图片");
    expect(composerMediaKindLabel("video")).toBe("视频");
    expect(composerMediaKindLabel("file")).toBe("文件");
  });

  it("formats file sizes for compact cards", () => {
    expect(formatComposerFileSize(597)).toBe("597 B");
    expect(formatComposerFileSize(17.3 * 1024)).toBe("17.3 KB");
    expect(formatComposerFileSize(27.8 * 1024 * 1024)).toBe("27.8 MB");
    expect(formatComposerFileSize(0)).toBe("");
  });

  it("selects stable file icons from extensions", () => {
    expect(composerFileAttachmentVisual("debug.log")).toEqual({ kind: "document", label: "TXT" });
    expect(composerFileAttachmentVisual("report.xlsx")).toEqual({ kind: "sheet", label: "X" });
    expect(composerFileAttachmentVisual("contract.pdf")).toEqual({ kind: "pdf", label: "PDF" });
    expect(composerFileAttachmentVisual("clip.mp4")).toEqual({ kind: "video", label: "▶" });
    expect(composerFileAttachmentVisual("unknown")).toEqual({ kind: "document", label: "UNK" });
    expect(composerFileAttachmentVisual("")).toEqual({ kind: "document", label: "DOC" });
  });
});
