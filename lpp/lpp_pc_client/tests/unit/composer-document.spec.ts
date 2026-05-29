import { describe, expect, it } from "vitest";
import {
  composerDocumentAttachmentIds,
  composerDocumentPreview,
  composerDocumentText,
  composerSendPartsFromDocument,
  normalizeComposerDocumentParts,
  type ComposerDocumentPart,
} from "../../src/renderer/composer/domain/composerDocument";

describe("composer document model", () => {
  const imagePart: ComposerDocumentPart = {
    type: "attachment",
    payload: {
      id: "img-1",
      kind: "image",
      fileName: "photo.png",
      size: 1024,
    },
  };

  const filePart: ComposerDocumentPart = {
    type: "attachment",
    payload: {
      id: "file-1",
      kind: "file",
      fileName: "report.xlsx",
      size: 2048,
    },
  };

  it("keeps text, attachments, and line breaks in document order", () => {
    const parts: ComposerDocumentPart[] = [
      { type: "text", text: "A" },
      imagePart,
      { type: "text", text: "\nB" },
      filePart,
      { type: "text", text: "\nC" },
    ];

    expect(composerDocumentText(parts)).toBe("A\nB\nC");
    expect(composerDocumentPreview(parts)).toBe("A[图片]\nB[文件]\nC");
    expect(composerDocumentAttachmentIds(parts)).toEqual(["img-1", "file-1"]);
  });

  it("merges adjacent text without moving attachments", () => {
    expect(
      normalizeComposerDocumentParts([
        { type: "text", text: "A" },
        { type: "text", text: "B" },
        imagePart,
        { type: "text", text: "C" },
        { type: "text", text: "D" },
      ]),
    ).toEqual([
      { type: "text", text: "AB" },
      imagePart,
      { type: "text", text: "CD" },
    ]);
  });

  it("creates a serial send queue from the visible document order", () => {
    const imageAttachment = { id: "img-1", kind: "image" as const };
    const fileAttachment = { id: "file-1", kind: "file" as const };
    const attachmentById = (id: string) =>
      id === "img-1" ? imageAttachment : id === "file-1" ? fileAttachment : undefined;

    expect(
      composerSendPartsFromDocument({
        attachmentById,
        parts: [
          { type: "text", text: " A " },
          imagePart,
          { type: "text", text: "\nB\n" },
          filePart,
          { type: "text", text: " " },
        ],
      }),
    ).toEqual([
      { type: "text", text: "A" },
      { type: "attachment", attachment: imageAttachment },
      { type: "text", text: "B" },
      { type: "attachment", attachment: fileAttachment },
    ]);
  });
});
