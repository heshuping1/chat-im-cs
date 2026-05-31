import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  getSettingsRow,
  settingRowProps,
  settingSourceMeta,
  settingsSections,
} from "../../src/renderer/settings/models/settingsCatalog";

describe("settings catalog", () => {
  it("defines five stable settings sections by ownership and product task", () => {
    expect(settingsSections.map((section) => section.id)).toEqual([
      "identity",
      "privacy",
      "notifications",
      "workspace",
      "localDiagnostics",
    ]);
  });

  it("keeps setting source semantics internal without surfacing them as row labels", () => {
    expect(settingSourceMeta.local).toMatchObject({
      label: "local",
      effect: "local-only",
    });
    expect(settingSourceMeta.account).toMatchObject({
      label: "account",
      effect: "account-synced",
    });
    expect(settingSourceMeta.system).toMatchObject({
      label: "system",
      effect: "requires-system-support",
    });
  });

  it("keeps real local notification settings on the local source", () => {
    expect(getSettingsRow("imNotifications")).toMatchObject({
      sectionId: "notifications",
      source: "local",
      control: "switch",
      capability: "active",
    });
    expect(getSettingsRow("serviceQueueNotifications")).toMatchObject({
      sectionId: "notifications",
      source: "local",
      control: "switch",
      capability: "active",
    });
  });

  it("keeps account privacy rows on the account source", () => {
    expect(getSettingsRow("allowMobileSearch")).toMatchObject({
      sectionId: "privacy",
      source: "account",
      capability: "active",
    });
    expect(getSettingsRow("profileVisibility")).toMatchObject({
      sectionId: "privacy",
      source: "account",
      capability: "active",
    });
  });

  it("does not expose unsupported system capabilities as fake switches", () => {
    for (const rowId of ["launchAtStartup", "minimizeToTray", "activeLine"]) {
      expect(getSettingsRow(rowId)).toMatchObject({
        source: "system",
        control: "action",
        capability: "pending",
        enabled: false,
        visibleInMainList: false,
      });
    }
  });

  it("marks unconsumed language and timezone settings as recorded preferences", () => {
    for (const rowId of ["language", "timezone"]) {
      expect(getSettingsRow(rowId)).toMatchObject({
        source: "local",
        control: "action",
        capability: "recordOnly",
        enabled: false,
        visibleInMainList: false,
      });
    }
  });

  it("does not pass source scope labels into normal settings rows", () => {
    expect(settingRowProps("imNotifications")).not.toHaveProperty("scopeLabel");
    expect(settingRowProps("allowMobileSearch")).not.toHaveProperty("scopeLabel");
    expect(settingRowProps("feedback")).toMatchObject({
      statusLabel: "暂未支持",
    });
  });

  it("keeps unsupported capabilities in the pending support group", () => {
    const hiddenRows = [
      "launchAtStartup",
      "minimizeToTray",
      "activeLine",
      "language",
      "timezone",
    ];

    expect(hiddenRows.map((rowId) => settingRowProps(rowId).visibleInMainList)).toEqual(
      hiddenRows.map(() => false),
    );
  });

  it("does not persist unsupported settings from the settings page", () => {
    const source = readFileSync(
      join(process.cwd(), "src/renderer/components/MePage.tsx"),
      "utf8",
    );

    for (const key of [
      "launchAtStartup",
      "minimizeToTray",
      "activeLine",
      "language",
      "timezone",
      "autoReconnect",
      "weakNetworkDiagnostics",
    ]) {
      expect(source).not.toContain(`setSetting("${key}"`);
    }
  });

  it("keeps privacy and diagnostics on their existing owners", () => {
    const privacySource = readFileSync(
      join(process.cwd(), "src/renderer/components/MePrivacySections.tsx"),
      "utf8",
    );
    const diagnosticsSource = readFileSync(
      join(process.cwd(), "src/renderer/settings/components/DiagnosticsSettingsSection.tsx"),
      "utf8",
    );
    const pageSource = readFileSync(
      join(process.cwd(), "src/renderer/components/MePage.tsx"),
      "utf8",
    );

    expect(privacySource).toContain("pcQueryKeys.accountPrivacy");
    expect(diagnosticsSource).toContain("exportDiagnostics");
    expect(pageSource).not.toContain("desktopApi");
  });

  it("keeps source and engineering language out of visible settings source files", () => {
    const files = [
      "src/renderer/components/MePage.tsx",
      "src/renderer/settings/models/settingsCatalog.ts",
      "src/renderer/settings/components/SettingsRows.tsx",
      "src/renderer/settings/components/AccountSecuritySection.tsx",
      "src/renderer/components/MePrivacySections.tsx",
    ];
    const combined = files
      .map((file) => readFileSync(join(process.cwd(), file), "utf8"))
      .join("\n");

    expect(combined).not.toContain("所有设备同步");
    expect(combined).not.toContain("仅当前电脑");
    expect(combined).not.toContain("由管理员配置");
    expect(combined).not.toContain("客户端能力");
    expect(combined).not.toContain("Electron main/preload");
    expect(combined).not.toContain("服务端口径");
    expect(combined).not.toContain("settings-scope-pill");
    expect(combined).not.toContain("settings-source-legend");
    expect(combined).not.toContain("SourceLegend");
    expect(combined).not.toContain("section.sources.map");
  });
});
