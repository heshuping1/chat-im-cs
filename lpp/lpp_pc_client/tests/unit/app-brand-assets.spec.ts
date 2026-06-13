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
  const brandLogoSource = readFileSync(resolve(root, "src/renderer/components/AppBrandLogo.tsx"), "utf8");
  const iconSyncSource = readFileSync(resolve(root, "scripts/sync-app-icon.mjs"), "utf8");
  const iconVerifySource = readFileSync(resolve(root, "scripts/verify-packaged-icon.mjs"), "utf8");
  const startPackagedSource = readFileSync(resolve(root, "scripts/start-packaged.mjs"), "utf8");
  const fixTaskbarSource = readFileSync(resolve(root, "scripts/fix-taskbar-icon.mjs"), "utf8");
  const mobileAppIcon = readFileSync(resolve(root, "../lpp_mobile/assets/brand/app_icon.png"));
  const iconManual = readFileSync(resolve(root, "docs/release/04-PC图标统一管理手册.md"), "utf8");
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
    expect(existsSync(resolve(root, "assets/app-icon-startlink.png"))).toBe(true);
    expect(existsSync(resolve(root, "assets/app-icon-startlink.ico"))).toBe(true);
    expect(existsSync(resolve(root, "assets/app-icon-startlink.icns"))).toBe(true);
    expect(existsSync(resolve(root, "public/app-icon-startlink.png"))).toBe(true);
  });

  it("wires Electron builder icons for Windows installer and macOS app bundles", () => {
    expect(packageJson.build?.icon).toBe("assets/app-icon-startlink.ico");
    expect(packageJson.build?.win?.icon).toBe("assets/app-icon-startlink.ico");
    expect(packageJson.build?.nsis?.installerIcon).toBe("assets/app-icon-startlink.ico");
    expect(packageJson.build?.nsis?.uninstallerIcon).toBe("assets/app-icon-startlink.ico");
    expect(packageJson.build?.mac?.icon).toBe("assets/app-icon-startlink.icns");
    expect(packageJson.build?.extraResources).toContainEqual({
      from: "assets/app-icon-startlink.ico",
      to: "app-icon.ico",
    });
  });

  it("exposes the app icon to browser tabs and macOS development dock", () => {
    expect(indexHtml).toContain('rel="icon"');
    expect(indexHtml).toContain("%BASE_URL%app-icon-startlink.png");
    expect(mainSource).toContain("app.dock?.setIcon");
    expect(mainSource).toContain("app-icon-startlink.png");
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
    expect(iconManual).toContain("C:\\Program Files\\StartLink");
    expect(iconManual).toContain("startlink-shell-icon-v3.ico");
    expect(iconManual).toContain("Windows 图标缓存");
  });

  it("keeps the sync scripts tied to the shared icon outputs and packaged exe patch", () => {
    expect(iconSyncSource).toContain("rcedit-x64.exe");
    expect(iconSyncSource).toContain("app-icon-startlink.ico");
    expect(iconSyncSource).toContain("public/app-icon-startlink.png");
    expect(iconSyncSource).toContain("startlink.exe");
    expect(JSON.stringify(packageJson.build?.extraResources)).toContain("startlink-shell-icon-v3.ico");
    expect(iconManual).toContain("Windows 图标缓存");
    expect(iconVerifySource).toContain("packaged-exe-icon.png");
    expect(iconVerifySource).toContain("installed-exe-icon.png");
    expect(startPackagedSource).toContain("sync-app-icon.mjs");
    expect(fixTaskbarSource).toContain("ie4uinit.exe");
    expect(fixTaskbarSource).toContain("C:\\\\Program Files\\\\StartLink");
    expect(fixTaskbarSource).toContain("startlink-shell-icon-v3.ico");
    expect(fixTaskbarSource).toContain("rcedit-x64.exe");
  });

  it("uses a clean vector brand mark in the PC sidebar instead of cropping the app icon", () => {
    expect(appMetadataSource).toContain("import.meta.env.BASE_URL");
    expect(appMetadataSource).toContain("app-icon-startlink.png");
    expect(sidebarSource).toContain("AppBrandLogo");
    expect(brandLogoSource).toContain("<svg");
    expect(brandLogoSource).toContain("app-brand-logo-mark");
    expect(brandLogoSource).toContain("#076B4A");
    expect(brandLogoSource).toContain("#00E676");
    expect(brandLogoSource).toContain("#A8FFD1");
    expect(brandLogoSource).toContain("#F5F7EB");
    expect(brandLogoSource).toContain("#E6C97A");
    expect(brandLogoSource).not.toContain("#21d68d");
    expect(brandLogoSource).not.toContain("#06a86f");
    expect(brandLogoSource).not.toContain("#047857");
    expect(sidebarSource).not.toContain("appIconSrc");
    expect(sidebarSource).not.toContain('src={appIconSrc}');
    expect(sidebarSource).not.toContain('src="/app-icon-startlink.png"');
    expect(sidebarSource).not.toContain('className="sidebar-brand-logo" aria-hidden="true">\n            L');
  });

  it("keeps a small-size visual acceptance board for the app icon", () => {
    expect(readFileSync(resolve(root, "assets/brand/app-icon-source.png"))).toEqual(mobileAppIcon);
    expect(readFileSync(resolve(root, "assets/app-icon-startlink.png"))).toEqual(mobileAppIcon);
    expect(readFileSync(resolve(root, "public/app-icon-startlink.png"))).toEqual(mobileAppIcon);
    expect(readPngMetadata("assets/app-icon-startlink.png")).toEqual({
      width: 1024,
      height: 1024,
      colorType: 2,
    });
    expect(readPngMetadata("public/app-icon-startlink.png")).toEqual({
      width: 1024,
      height: 1024,
      colorType: 2,
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
