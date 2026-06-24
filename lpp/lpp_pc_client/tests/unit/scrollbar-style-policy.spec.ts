import { readdirSync, readFileSync, statSync } from "node:fs";
import { relative, resolve } from "node:path";

import { describe, expect, it } from "vitest";

const stylesRoot = resolve(process.cwd(), "src/renderer/styles");

function readCssFiles(dir: string): Array<{ path: string; source: string }> {
  return readdirSync(dir).flatMap((entry) => {
    const fullPath = resolve(dir, entry);
    const stat = statSync(fullPath);
    if (stat.isDirectory()) return readCssFiles(fullPath);
    if (!entry.endsWith(".css")) return [];
    return [
      {
        path: relative(stylesRoot, fullPath).replace(/\\/g, "/"),
        source: readFileSync(fullPath, "utf8"),
      },
    ];
  });
}

describe("scrollbar style policy", () => {
  const cssFiles = readCssFiles(stylesRoot);

  it("keeps scrollbar rails stable instead of changing width while scrolling", () => {
    const collapsedRailRules = cssFiles.flatMap(({ path, source }) => {
      const matches = source.matchAll(/:not\(\.is-scrolling\)::-webkit-scrollbar\s*\{[^}]*?(?:width|height):\s*0(?:\s*!important)?/gs);
      return [...matches].map((match) => `${path}: ${match[0]}`);
    });

    expect(collapsedRailRules).toEqual([]);
  });

  it("does not opt content scroll containers back out of stable scrollbar gutters", () => {
    const autoGutterRules = cssFiles.flatMap(({ path, source }) => {
      const matches = source.matchAll(/scrollbar-gutter:\s*auto\b[^;]*;/g);
      return [...matches].map((match) => `${path}: ${match[0]}`);
    });

    expect(autoGutterRules).toEqual([]);
  });

  it("does not attach scrollbar gutters to every element", () => {
    const universalGutterRules = cssFiles.flatMap(({ path, source }) => {
      const matches = source.matchAll(/(?:^|})\s*\*\s*\{[^}]*scrollbar-gutter:\s*[^;]+;/g);
      return [...matches].map((match) => `${path}: ${match[0]}`);
    });

    expect(universalGutterRules).toEqual([]);
  });

  it("keeps scrollbar-width none scoped to explicit horizontal tool surfaces", () => {
    const hiddenScrollbarRules = cssFiles.flatMap(({ path, source }) => {
      const matches = source.matchAll(/scrollbar-width:\s*none\b[^;]*;/g);
      return [...matches].map((match) => `${path}: ${match[0]}`);
    });

    expect(hiddenScrollbarRules).toEqual([
      "contacts/contacts.css: scrollbar-width: none !important;",
      "messages/composer-rich-input.css: scrollbar-width: none !important;",
    ]);
  });
});
