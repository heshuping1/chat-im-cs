import { describe, expect, it } from "vitest";
import {
  detectComposerMediaKind,
  detectComposerMediaKindFromHeader,
} from "../../src/renderer/composer/domain/detectComposerMediaKind";

const encoder = new TextEncoder();

describe("detectComposerMediaKind", () => {
  it("treats source code as a file even when Windows reports video/mp2t", async () => {
    const file = new File(
      [encoder.encode("import { defineConfig } from '@playwright/test';\nexport default defineConfig({});\n")],
      "playwright.config.ts",
      { type: "video/mp2t" },
    );

    await expect(detectComposerMediaKind(file)).resolves.toBe("file");
  });

  it("detects real images from magic bytes without relying on an extension", () => {
    expect(
      detectComposerMediaKindFromHeader(
        new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
      ),
    ).toBe("image");
  });

  it("detects svg content as an image", () => {
    expect(detectComposerMediaKindFromHeader(encoder.encode("  <svg viewBox='0 0 1 1'></svg>"))).toBe(
      "image",
    );
  });

  it("detects mp4 containers from ftyp brands", () => {
    expect(
      detectComposerMediaKindFromHeader(
        new Uint8Array([
          0x00,
          0x00,
          0x00,
          0x18,
          0x66,
          0x74,
          0x79,
          0x70,
          0x69,
          0x73,
          0x6f,
          0x6d,
        ]),
      ),
    ).toBe("video");
  });

  it("only treats MPEG-TS as video when packet signatures are present", () => {
    const bytes = new Uint8Array(188 * 3);
    bytes[0] = 0x47;
    bytes[188] = 0x47;
    bytes[376] = 0x47;

    expect(detectComposerMediaKindFromHeader(bytes, "video/mp2t")).toBe("video");
  });

  it("falls back to ordinary file for unknown text and markdown", () => {
    expect(detectComposerMediaKindFromHeader(encoder.encode("# README\n\nhello\n"), "text/markdown")).toBe(
      "file",
    );
  });
});
