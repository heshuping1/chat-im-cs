import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("app brand assets", () => {
  const root = process.cwd();
  const packageJson = JSON.parse(readFileSync(resolve(root, "package.json"), "utf8")) as {
    build?: {
      icon?: string;
      extraResources?: Array<{ from?: string; to?: string }>;
      mac?: { icon?: string };
      nsis?: {
        installerIcon?: string;
        uninstallerIcon?: string;
      };
      win?: { icon?: string };
    };
  };
  const indexHtml = readFileSync(resolve(root, "index.html"), "utf8");
  const mainSource = readFileSync(resolve(root, "src/main/main.ts"), "utf8");
  const readPngMetadata = (file: string) => {
    const bytes = readFileSync(resolve(root, file));
    return {
      width: bytes.readUInt32BE(16),
      height: bytes.readUInt32BE(20),
      colorType: bytes.readUInt8(25),
    };
  };

  it("keeps one app icon source with Windows, macOS and web outputs", () => {
    expect(existsSync(resolve(root, "assets/app-icon-green-bubble.png"))).toBe(true);
    expect(existsSync(resolve(root, "assets/app-icon-green-bubble.ico"))).toBe(true);
    expect(existsSync(resolve(root, "assets/app-icon-green-bubble.icns"))).toBe(true);
    expect(existsSync(resolve(root, "public/app-icon-green-bubble.png"))).toBe(true);
  });

  it("wires Electron builder icons for Windows installer and macOS app bundles", () => {
    expect(packageJson.build?.icon).toBe("assets/app-icon-green-bubble.ico");
    expect(packageJson.build?.win?.icon).toBe("assets/app-icon-green-bubble.ico");
    expect(packageJson.build?.nsis?.installerIcon).toBe("assets/app-icon-green-bubble.ico");
    expect(packageJson.build?.nsis?.uninstallerIcon).toBe("assets/app-icon-green-bubble.ico");
    expect(packageJson.build?.mac?.icon).toBe("assets/app-icon-green-bubble.icns");
    expect(packageJson.build?.extraResources).toContainEqual({
      from: "assets/app-icon-green-bubble.ico",
      to: "app-icon.ico",
    });
  });

  it("exposes the app icon to browser tabs and macOS development dock", () => {
    expect(indexHtml).toContain('rel="icon"');
    expect(indexHtml).toContain("/app-icon-green-bubble.png");
    expect(mainSource).toContain("app.dock?.setIcon");
    expect(mainSource).toContain("app-icon-green-bubble.png");
  });

  it("keeps a small-size visual acceptance board for the app icon", () => {
    expect(readPngMetadata("assets/app-icon-green-bubble.png")).toEqual({
      width: 1254,
      height: 1254,
      colorType: 6,
    });
    expect(readPngMetadata("public/app-icon-green-bubble.png")).toEqual({
      width: 1254,
      height: 1254,
      colorType: 6,
    });
    expect(existsSync(resolve(root, "docs/refactor/validation/P24-BRAND-003-app-icon-size-preview.png"))).toBe(
      true,
    );
    expect(readPngMetadata("docs/refactor/validation/P24-BRAND-003-app-icon-size-preview.png")).toEqual({
      width: 1180,
      height: 420,
      colorType: 6,
    });
  });
});
