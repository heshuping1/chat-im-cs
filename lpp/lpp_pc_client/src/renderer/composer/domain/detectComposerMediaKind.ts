export type ComposerMediaKind = "image" | "video" | "file";

export async function detectComposerMediaKind(file: File): Promise<ComposerMediaKind> {
  const bytes = await readFileHeader(file);
  if (bytes.length === 0) return "file";
  return detectComposerMediaKindFromHeader(bytes, file.type);
}

export function detectComposerMediaKindFromHeader(
  bytes: Uint8Array,
  mimeType = "",
): ComposerMediaKind {
  if (isSvgImage(bytes)) return "image";
  const binaryKind = detectBinaryMediaKind(bytes);
  if (binaryKind) return binaryKind;
  if (isLikelyTextFile(bytes)) return "file";

  const mime = mimeType.trim().toLowerCase();
  if (mime.startsWith("image/")) return "image";
  if (mime.startsWith("video/") && mime !== "video/mp2t") return "video";
  return "file";
}

async function readFileHeader(file: File) {
  try {
    return new Uint8Array(await file.slice(0, 64 * 1024).arrayBuffer());
  } catch {
    return new Uint8Array();
  }
}

function detectBinaryMediaKind(bytes: Uint8Array): ComposerMediaKind | undefined {
  if (startsWithBytes(bytes, [0xff, 0xd8, 0xff])) return "image";
  if (startsWithBytes(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) {
    return "image";
  }
  if (startsWithAscii(bytes, "GIF87a") || startsWithAscii(bytes, "GIF89a")) {
    return "image";
  }
  if (startsWithAscii(bytes, "BM")) return "image";
  if (startsWithAscii(bytes, "RIFF") && asciiAt(bytes, 8, 4) === "WEBP") return "image";
  if (startsWithAscii(bytes, "RIFF") && asciiAt(bytes, 8, 4) === "AVI ") return "video";
  if (startsWithBytes(bytes, [0x1a, 0x45, 0xdf, 0xa3])) return "video";
  if (startsWithAscii(bytes, "OggS")) return "video";
  if (startsWithBytes(bytes, [0x30, 0x26, 0xb2, 0x75, 0x8e, 0x66, 0xcf, 0x11])) {
    return "video";
  }
  if (
    startsWithBytes(bytes, [0x00, 0x00, 0x01, 0xba]) ||
    startsWithBytes(bytes, [0x00, 0x00, 0x01, 0xb3])
  ) {
    return "video";
  }
  if (isIsoBaseMedia(bytes)) return isoBaseMediaKind(bytes);
  if (isMpegTransportStream(bytes)) return "video";
  return undefined;
}

function isIsoBaseMedia(bytes: Uint8Array) {
  return bytes.length >= 12 && asciiAt(bytes, 4, 4) === "ftyp";
}

function isoBaseMediaKind(bytes: Uint8Array): ComposerMediaKind | undefined {
  const brands = asciiAt(bytes, 8, Math.min(bytes.length - 8, 64)).toLowerCase();
  if (/(avif|avis|mif1|msf1|heic|heix|hevc|hevx)/.test(brands)) return "image";
  if (/(mp4|m4v|qt  |isom|iso2|3gp|3g2)/.test(brands)) return "video";
  return undefined;
}

function isMpegTransportStream(bytes: Uint8Array) {
  if (bytes.length < 188 * 3) return false;
  return bytes[0] === 0x47 && bytes[188] === 0x47 && bytes[376] === 0x47;
}

function isSvgImage(bytes: Uint8Array) {
  const text = asciiAt(bytes, 0, Math.min(bytes.length, 4096)).trimStart().toLowerCase();
  return text.startsWith("<svg") || (text.startsWith("<?xml") && text.includes("<svg"));
}

function isLikelyTextFile(bytes: Uint8Array) {
  const sampleLength = Math.min(bytes.length, 4096);
  if (sampleLength === 0) return false;
  let printable = 0;
  for (let index = 0; index < sampleLength; index += 1) {
    const byte = bytes[index];
    if (byte === 0) return false;
    if (byte === 9 || byte === 10 || byte === 13 || (byte >= 32 && byte <= 126) || byte >= 128) {
      printable += 1;
    }
  }
  return printable / sampleLength > 0.94;
}

function startsWithAscii(bytes: Uint8Array, value: string) {
  return asciiAt(bytes, 0, value.length) === value;
}

function startsWithBytes(bytes: Uint8Array, signature: number[]) {
  return signature.every((byte, index) => bytes[index] === byte);
}

function asciiAt(bytes: Uint8Array, offset: number, length: number) {
  return String.fromCharCode(...bytes.slice(offset, offset + length));
}
