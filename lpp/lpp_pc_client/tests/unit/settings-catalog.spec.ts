import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  getSettingsSection,
  getSettingsRow,
  settingRowProps,
  settingSourceMeta,
  settingsRows,
  settingsSections,
} from "../../src/renderer/settings/models/settingsCatalog";
import { checkClientUpdate } from "../../src/renderer/settings/components/HelpAboutSettingsSection";

describe("settings catalog", () => {
  it("defines eight desktop settings sections around IM and customer service work", () => {
    expect(settingsSections.map((section) => section.id)).toEqual([
      "accountEnterprise",
      "privacySecurity",
      "messageReception",
      "chatCollaboration",
      "appearanceEfficiency",
      "generalNetwork",
      "storageDiagnostics",
      "helpAbout",
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

  it("keeps real local notification settings on message reception", () => {
    expect(getSettingsRow("imNotifications")).toMatchObject({
      sectionId: "messageReception",
      source: "account",
      control: "switch",
      capability: "available",
    });
    expect(getSettingsRow("serviceQueueNotifications")).toMatchObject({
      sectionId: "messageReception",
      source: "account",
      control: "switch",
      capability: "available",
    });
  });

  it("keeps account privacy rows on privacy and security", () => {
    expect(getSettingsRow("allowMobileSearch")).toMatchObject({
      sectionId: "privacySecurity",
      source: "account",
      capability: "available",
    });
    expect(getSettingsRow("profileVisibility")).toMatchObject({
      sectionId: "privacySecurity",
      source: "account",
      capability: "available",
    });
  });

  it("covers App settings capabilities in the PC information architecture", () => {
    for (const rowId of [
      "developmentDiagnostics",
      "feedback",
      "terms",
      "privacyPolicy",
      "checkUpdate",
      "chatBackground",
      "chatExport",
      "chatBackup",
      "chatRestore",
      "loginDevices",
      "language",
      "timezone",
    ]) {
      expect(getSettingsRow(rowId), rowId).toBeTruthy();
    }
    expect(getSettingsRow("openSourceLicenses")).toBeUndefined();
  });

  it("does not expose unsupported capabilities as fake switches", () => {
    for (const rowId of ["launchAtStartup", "minimizeToTray"]) {
      expect(getSettingsRow(rowId)).toMatchObject({
        enabled: false,
        visibleInMainList: false,
      });
      expect(getSettingsRow(rowId)?.capability).toMatch(/^missing/);
    }
  });

  it("promotes APP-equivalent network line settings into real PC capabilities", () => {
    expect(getSettingsRow("activeLine")).toMatchObject({
      sectionId: "generalNetwork",
      capability: "available",
      enabled: true,
      visibleInMainList: true,
    });
    expect(getSettingsRow("lineLatencyTest")).toMatchObject({
      sectionId: "generalNetwork",
      capability: "localEffective",
      enabled: true,
      visibleInMainList: true,
    });
  });

  it("keeps help and about actions real instead of hidden planning cards", async () => {
    expect(getSettingsSection("helpAbout")?.desc).not.toContain("开源许可");
    expect(getSettingsRow("checkUpdate")).toMatchObject({
      sectionId: "helpAbout",
      control: "action",
      capability: "available",
      enabled: true,
      visibleInMainList: true,
    });
    expect(getSettingsRow("updateFailureHelp")).toBeUndefined();
    await expect(checkClientUpdate()).rejects.toThrow("当前客户端未接入更新检查接口");
  });

  it("promotes implemented settings only when runtime or API wiring exists", () => {
    expect(getSettingsRow("loginDevices")).toMatchObject({
      capability: "available",
      visibleInMainList: true,
    });
    expect(getSettingsRow("feedback")).toMatchObject({
      capability: "available",
      visibleInMainList: true,
    });
    expect(getSettingsRow("enterToSend")).toMatchObject({
      capability: "localEffective",
      visibleInMainList: true,
    });
    expect(getSettingsRow("autoTranslate")).toMatchObject({
      capability: "missingRuntimeWiring",
      visibleInMainList: false,
    });
    expect(getSettingsRow("sensitiveMasking")).toMatchObject({
      capability: "missingBackendApi",
      visibleInMainList: false,
    });
  });

  it("requires every planned capability to explain value, dependency and next action", () => {
    const plannedRows = settingsRows.filter((row) => row.capability.startsWith("missing"));

    expect(plannedRows.length).toBeGreaterThan(10);
    for (const row of plannedRows) {
      expect(row.productValue, row.id).toBeTruthy();
      expect(row.dependency, row.id).toBeTruthy();
      expect(row.nextAction, row.id).toBeTruthy();
      expect(row.visibleInMainList, row.id).toBe(false);
    }
  });

  it("keeps recorded language, timezone and diagnostics as status display", () => {
    for (const rowId of ["language", "timezone", "developmentDiagnostics"]) {
      expect(getSettingsRow(rowId)).toMatchObject({
        control: "info",
        capability: "recordOnly",
        visibleInMainList: true,
      });
    }
  });

  it("does not pass source scope labels into normal settings rows", () => {
    expect(settingRowProps("imNotifications")).not.toHaveProperty("scopeLabel");
    expect(settingRowProps("allowMobileSearch")).not.toHaveProperty("scopeLabel");
    expect(settingRowProps("checkUpdate")).toMatchObject({
      capability: "available",
      visibleInMainList: true,
    });
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

  it("keeps privacy, diagnostics and profile runtime logic on their existing owners", () => {
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
    expect(pageSource).toContain("getAppInstanceProfile");
    expect(pageSource).toContain("NotificationSettingsSection");
    expect(pageSource).toContain("HelpAboutSettingsSection");
    const helpAboutBranch = pageSource.slice(
      pageSource.indexOf('case "helpAbout"'),
      pageSource.indexOf("function PlanningSupportBlock"),
    );
    expect(helpAboutBranch).toContain("HelpAboutSettingsSection");
    expect(helpAboutBranch).not.toContain("PlanningSupportBlock");
  });

  it("wires local composer settings into the real message composer", () => {
    const composerSource = readFileSync(
      join(process.cwd(), "src/renderer/components/MessageComposer.tsx"),
      "utf8",
    );
    const lexicalSource = readFileSync(
      join(process.cwd(), "src/renderer/components/LexicalChatInput.tsx"),
      "utf8",
    );
    const stageSource = readFileSync(
      join(process.cwd(), "src/renderer/messages/components/MessageCenterConversationStage.tsx"),
      "utf8",
    );

    expect(composerSource).toContain("enterToSend");
    expect(composerSource).toContain("dragUpload");
    expect(composerSource).toContain("shortcutHints");
    expect(lexicalSource).toContain("enterToSend");
    expect(lexicalSource).toContain("dragUpload");
    expect(stageSource).toContain("enterToSend={pcSettings.enterToSend}");
    expect(stageSource).toContain("dragUpload={pcSettings.dragUpload}");
    expect(stageSource).toContain("shortcutHints={pcSettings.shortcutHints}");
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
    expect(combined).not.toContain("Electron main/preload");
    expect(combined).not.toContain("服务端口径");
    expect(combined).not.toContain("settings-scope-pill");
    expect(combined).not.toContain("settings-source-legend");
    expect(combined).not.toContain("SourceLegend");
    expect(combined).not.toContain("section.sources.map");
  });

  it("keeps the left settings navigation layout stable", () => {
    const pageSource = readFileSync(
      join(process.cwd(), "src/renderer/components/MePage.tsx"),
      "utf8",
    );
    const cssSource = readFileSync(
      join(process.cwd(), "src/renderer/styles/settings/settings.css"),
      "utf8",
    );

    expect(pageSource).toContain('className="settings-nav-header"');
    expect(pageSource).toContain('className="settings-nav-list"');
    expect(cssSource).toMatch(
      /\.settings-page-v2\s*\{[^}]*grid-template-columns:\s*276px minmax\(0, 1fr\);[^}]*grid-template-rows:\s*minmax\(0, 1fr\);[^}]*height:\s*100%;[^}]*overflow:\s*hidden;/s,
    );
    expect(cssSource).toMatch(
      /\.settings-page-v2 \.settings-main\s*\{[^}]*grid-template-rows:\s*auto minmax\(0, 1fr\);[^}]*overflow-y:\s*hidden;[^}]*scrollbar-gutter:\s*stable;/s,
    );
    expect(cssSource).toContain(".settings-page-v2 .settings-nav-list");
    expect(cssSource).toContain("scrollbar-gutter: stable");
    expect(cssSource).toMatch(
      /\.settings-page-v2 \.settings-nav button\s*\{[^}]*height:\s*54px;[^}]*flex:\s*0 0 54px;/s,
    );
    expect(cssSource).toMatch(
      /\.settings-detail-card\s*\{[^}]*min-height:\s*0;[^}]*height:\s*calc\(100% - 14px\);[^}]*grid-template-rows:\s*auto minmax\(0, 1fr\);/s,
    );
    expect(cssSource).toMatch(
      /\.settings-detail-body\s*\{[^}]*min-height:\s*0;[^}]*align-content:\s*start;[^}]*overflow-y:\s*auto;[^}]*scrollbar-gutter:\s*stable;/s,
    );
    expect(cssSource).not.toMatch(
      /\.settings-page-v2 \.settings-nav button\s*\{[^}]*min-height:/s,
    );
  });
});
