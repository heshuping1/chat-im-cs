import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("app brand assets", () => {
  const root = process.cwd();
  const packageJson = JSON.parse(readFileSync(resolve(root, "package.json"), "utf8")) as {
    scripts?: Record<string, string>;
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
  const appMetadataSource = readFileSync(resolve(root, "src/renderer/app/appMetadata.ts"), "utf8");
  const sidebarSource = readFileSync(resolve(root, "src/renderer/components/Sidebar.tsx"), "utf8");
  const iconSyncSource = readFileSync(resolve(root, "scripts/sync-app-icon.mjs"), "utf8");
  const iconVerifySource = readFileSync(resolve(root, "scripts/verify-packaged-icon.mjs"), "utf8");
  const startPackagedSource = readFileSync(resolve(root, "scripts/start-packaged.mjs"), "utf8");
  const fixTaskbarSource = readFileSync(resolve(root, "scripts/fix-taskbar-icon.mjs"), "utf8");
  const iconManual = readFileSync(resolve(root, "docs/PC图标统一管理手册.md"), "utf8");
  const readPngMetadata = (file: string) => {
    const bytes = readFileSync(resolve(root, file));
    return {
      width: bytes.readUInt32BE(16),
      height: bytes.readUInt32BE(20),
      colorType: bytes.readUInt8(25),
    };
  };

  it("keeps one app icon source with Windows, macOS and web outputs", () => {
    expect(existsSync(resolve(root, "assets/brand/app-icon-source.png"))).toBe(true);
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
    expect(indexHtml).toContain("%BASE_URL%app-icon-green-bubble.png");
    expect(mainSource).toContain("app.dock?.setIcon");
    expect(mainSource).toContain("app-icon-green-bubble.png");
  });

  it("provides scripts for syncing, starting and verifying packaged icons", () => {
    expect(packageJson.scripts?.["icon:fix-taskbar"]).toBe("node scripts/fix-taskbar-icon.mjs");
    expect(packageJson.scripts?.["icon:sync"]).toBe("node scripts/sync-app-icon.mjs");
    expect(packageJson.scripts?.["start:packaged"]).toBe("node scripts/start-packaged.mjs");
    expect(packageJson.scripts?.["icon:verify"]).toBe("node scripts/verify-packaged-icon.mjs");
  });

  it("documents the packaged Windows taskbar icon workflow", () => {
    expect(iconManual).toContain("任务栏");
    expect(iconManual).toContain("win-unpacked");
    expect(iconManual).toContain("icon:fix-taskbar");
    expect(iconManual).toContain("icon:sync");
    expect(iconManual).toContain("D:\\Program Files\\lpp-pc-client");
    expect(iconManual).toContain("Windows 图标缓存");
  });

  it("keeps the sync scripts tied to the shared icon outputs and packaged exe patch", () => {
    expect(iconSyncSource).toContain("rcedit-x64.exe");
    expect(iconSyncSource).toContain("app-icon-green-bubble.ico");
    expect(iconSyncSource).toContain("public/app-icon-green-bubble.png");
    expect(iconSyncSource).toContain("LPP 客服客户端.exe");
    expect(iconVerifySource).toContain("packaged-exe-icon.png");
    expect(iconVerifySource).toContain("installed-exe-icon.png");
    expect(startPackagedSource).toContain("sync-app-icon.mjs");
    expect(fixTaskbarSource).toContain("ie4uinit.exe");
    expect(fixTaskbarSource).toContain("D:\\\\Program Files\\\\lpp-pc-client");
    expect(fixTaskbarSource).toContain("rcedit-x64.exe");
  });

  it("uses the app icon in the PC sidebar brand instead of a letter fallback", () => {
    expect(appMetadataSource).toContain("import.meta.env.BASE_URL");
    expect(appMetadataSource).toContain("app-icon-green-bubble.png");
    expect(sidebarSource).toContain("appIconSrc");
    expect(sidebarSource).not.toContain('src="/app-icon-green-bubble.png"');
    expect(sidebarSource).not.toContain('className="sidebar-brand-logo" aria-hidden="true">\n            L');
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
