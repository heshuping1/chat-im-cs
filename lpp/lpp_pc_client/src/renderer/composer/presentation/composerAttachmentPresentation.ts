import type { ComposerMediaKind } from "../domain/detectComposerMediaKind";

export type ComposerAttachmentVisualKind =
  | "archive"
  | "document"
  | "pdf"
  | "sheet"
  | "slide"
  | "video"
  | "word";

export type ComposerAttachmentVisual = {
  kind: ComposerAttachmentVisualKind;
  label: string;
};

export function composerMediaKindLabel(kind: ComposerMediaKind) {
  if (kind === "image") return "图片";
  if (kind === "video") return "视频";
  return "文件";
}

export function formatComposerFileSize(size: number) {
  if (!Number.isFinite(size) || size <= 0) return "";
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / 1024 / 1024).toFixed(1)} MB`;
}

export function composerFileAttachmentVisual(fileName: string): ComposerAttachmentVisual {
  const extension = fileName.split(".").pop()?.toLowerCase() ?? "";
  if (["mp4", "mov", "m4v", "webm", "avi", "mkv"].includes(extension)) {
    return { kind: "video", label: "▶" };
  }
  if (["zip", "rar", "7z", "tar", "gz"].includes(extension)) {
    return { kind: "archive", label: "ZIP" };
  }
  if (["xls", "xlsx", "csv"].includes(extension)) return { kind: "sheet", label: "X" };
  if (extension === "pdf") return { kind: "pdf", label: "PDF" };
  if (["doc", "docx"].includes(extension)) return { kind: "word", label: "W" };
  if (["ppt", "pptx"].includes(extension)) return { kind: "slide", label: "P" };
  if (["txt", "log", "md"].includes(extension)) return { kind: "document", label: "TXT" };
  return { kind: "document", label: extension ? extension.slice(0, 3).toUpperCase() : "DOC" };
}
