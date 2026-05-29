import type { ComposerSendPart } from "../../media/runtime/sendQueue";

export type ComposerAttachmentKind = "image" | "video" | "file";

export type ComposerAttachmentPayload = {
  id: string;
  kind: ComposerAttachmentKind;
  fileName: string;
  size: number;
  previewUrl?: string;
  status?: "ready" | "failed";
  error?: string;
};

export type ComposerDocumentPart =
  | { type: "text"; text: string }
  | { type: "attachment"; payload: ComposerAttachmentPayload };

export function normalizeComposerDocumentParts(
  parts: ComposerDocumentPart[],
): ComposerDocumentPart[] {
  const normalized: ComposerDocumentPart[] = [];
  for (const part of parts) {
    if (part.type === "text") {
      appendComposerTextPart(normalized, part.text);
      continue;
    }
    normalized.push(part);
  }
  return normalized;
}

export function composerDocumentText(parts: ComposerDocumentPart[]) {
  return parts
    .filter((part): part is Extract<ComposerDocumentPart, { type: "text" }> => part.type === "text")
    .map((part) => part.text)
    .join("");
}

export function composerDocumentPreview(parts: ComposerDocumentPart[]) {
  return normalizeComposerDocumentParts(parts)
    .map((part) => {
      if (part.type === "text") return part.text;
      return composerAttachmentPreviewLabel(part.payload.kind);
    })
    .join("")
    .trim();
}

export function composerDocumentAttachmentIds(parts: ComposerDocumentPart[]) {
  return parts.flatMap((part) => (part.type === "attachment" ? [part.payload.id] : []));
}

export function composerSendPartsFromDocument<Attachment>({
  attachmentById,
  parts,
}: {
  attachmentById: (attachmentId: string) => Attachment | undefined;
  parts: ComposerDocumentPart[];
}): ComposerSendPart<Attachment>[] {
  return normalizeComposerDocumentParts(parts).flatMap((part): ComposerSendPart<Attachment>[] => {
    if (part.type === "text") {
      const text = part.text.trim();
      return text ? [{ type: "text", text }] : [];
    }
    const attachment = attachmentById(part.payload.id);
    return attachment ? [{ type: "attachment", attachment }] : [];
  });
}

export function appendComposerTextPart(parts: ComposerDocumentPart[], text: string) {
  if (!text) return;
  const previous = parts.at(-1);
  if (previous?.type === "text") {
    previous.text += text;
    return;
  }
  parts.push({ type: "text", text });
}

function composerAttachmentPreviewLabel(kind: ComposerAttachmentKind) {
  if (kind === "image") return "\u005b\u56fe\u7247\u005d";
  if (kind === "video") return "\u005b\u89c6\u9891\u005d";
  return "\u005b\u6587\u4ef6\u005d";
}
