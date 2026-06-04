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
  it("defines the nine top-level settings categories without fragmented sections", () => {
    expect(settingsSections.map((section) => section.id)).toEqual([
      "account",
      "enterprise",
      "messages",
      "privacy",
      "customerService",
      "network",
      "common",
      "storageDiagnostics",
      "about",
    ]);
    for (const section of settingsSections) {
      expect(section.title, section.id).not.toMatch(/[与和]/);
    }
    for (const oldSectionId of [
      "accountEnterprise",
      "privacySecurity",
      "messageReception",
      "chatCollaboration",
      "appearanceEfficiency",
      "generalNetwork",
      "helpAbout",
      "security",
      "commonNotifications",
      "chatInput",
      "translation",
      "chatAppearance",
      "chatArchive",
      "appearance",
      "efficiency",
      "desktop",
      "language",
      "storage",
      "diagnostics",
      "help",
    ]) {
      expect(getSettingsSection(oldSectionId as never), oldSectionId).toBeUndefined();
    }
  });

  it("maps every settings row into the nine categories without orphan rows", () => {
    const expectedSectionsByRowId: Record<string, string> = {
      profile: "account",
      changePassword: "account",
      loginDevices: "account",
      logoutAccount: "account",
      deactivateAccount: "account",
      enterpriseIdentity: "enterprise",
      imNotifications: "messages",
      friendRequestNotifications: "messages",
      doNotDisturb: "messages",
      allowMobileSearch: "privacy",
      allowLppSearch: "privacy",
      friendRequestVerification: "privacy",
      profileVisibility: "privacy",
      blocklist: "privacy",
      serviceQueueNotifications: "customerService",
      customerServiceMessageNotifications: "customerService",
      foregroundInAppCustomerServiceReminders: "customerService",
      slaTimeoutNotifications: "customerService",
      highDensityContext: "customerService",
      currentEnvironment: "network",
      activeLine: "network",
      lineLatencyTest: "network",
      autoReconnect: "network",
      weakNetworkDiagnostics: "network",
      desktopNotifications: "common",
      notificationPreview: "common",
      notificationSound: "common",
      enterToSend: "common",
      screenshotShortcut: "common",
      dragUpload: "common",
      shortcutHints: "common",
      autoTranslate: "common",
      chatBackground: "common",
      chatExport: "common",
      chatBackup: "common",
      chatRestore: "common",
      theme: "common",
      skin: "common",
      fontSize: "common",
      compactList: "common",
      reduceMotion: "common",
      highContrastBoundary: "common",
      keyboardFocusHint: "common",
      minimizeToTray: "common",
      launchAtStartup: "common",
      multiProfileIndicator: "common",
      language: "common",
      timezone: "common",
      clearLocalCache: "storageDiagnostics",
      diagnosticsExport: "storageDiagnostics",
      diagnosticsRecentRecords: "storageDiagnostics",
      connectivityHealth: "storageDiagnostics",
      developmentDiagnostics: "storageDiagnostics",
      runtimeStatus: "storageDiagnostics",
      feedback: "about",
      terms: "about",
      privacyPolicy: "about",
      aboutClient: "about",
      checkUpdate: "about",
    };

    expect(settingsRows.map((row) => row.id).sort()).toEqual(
      Object.keys(expectedSectionsByRowId).sort(),
    );
    for (const row of settingsRows) {
      expect(row.sectionId, row.id).toBe(expectedSectionsByRowId[row.id]);
      expect(getSettingsSection(row.sectionId), row.id).toBeTruthy();
    }
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

  it("places IM settings under messages, customer service settings under customer service, and shared notification settings under common", () => {
    expect(getSettingsRow("imNotifications")).toMatchObject({
      sectionId: "messages",
      source: "account",
      control: "switch",
      capability: "available",
    });
    expect(getSettingsRow("friendRequestNotifications")).toMatchObject({
      sectionId: "messages",
    });
    expect(getSettingsRow("serviceQueueNotifications")).toMatchObject({
      sectionId: "customerService",
      label: "访客排队/待接入提醒",
      desc: "有访客排队、待接入或待接管时提醒客服。",
      source: "account",
      control: "switch",
      capability: "available",
    });
    expect(getSettingsRow("customerServiceMessageNotifications")).toMatchObject({
      sectionId: "customerService",
      label: "已接入会话新消息提醒",
      desc: "已接入或正在处理的客服会话收到访客新消息时提醒。",
      source: "local",
      control: "switch",
      capability: "available",
    });
    expect(getSettingsRow("foregroundInAppCustomerServiceReminders")).toMatchObject({
      sectionId: "customerService",
      label: "前台站内消息提醒",
      desc: "PC 客户端在前台时，收到已接入客服会话新消息显示右上角提醒卡片。",
      source: "local",
      control: "switch",
      capability: "localEffective",
    });
    expect(getSettingsRow("slaTimeoutNotifications")).toMatchObject({
      sectionId: "customerService",
    });
    for (const rowId of [
      "desktopNotifications",
      "notificationPreview",
      "notificationSound",
    ]) {
      expect(getSettingsRow(rowId), rowId).toMatchObject({
        sectionId: "common",
      });
    }
    expect(getSettingsRow("doNotDisturb")).toMatchObject({ sectionId: "messages" });
  });

  it("keeps customer service presence status out of settings navigation", () => {
    expect(getSettingsSection("customerService")?.desc).not.toContain("接待状态");
    expect(getSettingsRow("receptionStatusSync")).toBeUndefined();
  });

  it("keeps account privacy rows on privacy and security", () => {
    expect(getSettingsRow("allowMobileSearch")).toMatchObject({
      sectionId: "privacy",
      source: "account",
      capability: "available",
    });
    expect(getSettingsRow("profileVisibility")).toMatchObject({
      sectionId: "privacy",
      source: "account",
      capability: "available",
    });
  });

  it("places account, enterprise and security rows into the account and enterprise categories", () => {
    expect(getSettingsRow("profile")).toMatchObject({ sectionId: "account" });
    expect(getSettingsRow("enterpriseIdentity")).toMatchObject({ sectionId: "enterprise" });
    for (const rowId of ["changePassword", "loginDevices", "logoutAccount", "deactivateAccount"]) {
      expect(getSettingsRow(rowId), rowId).toMatchObject({ sectionId: "account" });
    }
  });

  it("removes undecided privacy planning cards from settings", () => {
    expect(getSettingsRow("sensitiveMasking")).toBeUndefined();
    expect(getSettingsRow("customerAccessBoundary")).toBeUndefined();
    expect(getSettingsRow("copyScreenshotGuard")).toBeUndefined();
    const source = readFileSync(
      join(process.cwd(), "src/renderer/components/MePrivacySections.tsx"),
      "utf8",
    );
    expect(source).not.toContain("敏感信息脱敏");
    expect(source).not.toContain('setSetting("sensitiveMasking"');
  });

  it("removes the undecided after work reminder planning card", () => {
    expect(getSettingsRow("afterWorkReminder")).toBeUndefined();
  });

  it("removes the rejected busy do not disturb planning card", () => {
    expect(getSettingsRow("busyDoNotDisturb")).toBeUndefined();
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
    const unsupportedRowIds: string[] = [];

    for (const rowId of unsupportedRowIds) {
      expect(getSettingsRow(rowId)).toMatchObject({
        enabled: false,
        visibleInMainList: false,
      });
      expect(getSettingsRow(rowId)?.capability).toMatch(/^missing/);
    }
  });

  it("keeps visible implemented controls enabled by default", () => {
    const implementedControlRows = settingsRows.filter(
      (row) =>
        row.visibleInMainList &&
        row.control !== "info" &&
        (row.capability === "available" || row.capability === "localEffective"),
    );

    expect(implementedControlRows.length).toBeGreaterThan(0);
    for (const row of implementedControlRows) {
      expect(row.enabled, row.id).toBe(true);
    }
  });

  it("renders account nickname and signature as editable profile fields", () => {
    const source = readFileSync(
      join(process.cwd(), "src/renderer/components/MePage.tsx"),
      "utf8",
    );

    expect(source).toContain("settings-profile-form");
    expect(source).toContain("displayNameDraft");
    expect(source).toContain("signatureDraft");
    expect(source).toContain("updateMyProfile");
    expect(source).not.toContain('<InfoRow label="昵称"');
    expect(source).not.toContain('<InfoRow label="签名"');
  });

  it("keeps implemented settings backed by an editable renderer surface", () => {
    const sources = new Map(
      [
        "src/renderer/components/MePage.tsx",
        "src/renderer/components/MePrivacySections.tsx",
        "src/renderer/settings/components/AccountSecuritySection.tsx",
        "src/renderer/settings/components/ChatArchiveSection.tsx",
        "src/renderer/settings/components/ChatBackgroundSection.tsx",
        "src/renderer/settings/components/DiagnosticsRecordsSection.tsx",
        "src/renderer/settings/components/HelpAboutSettingsSection.tsx",
        "src/renderer/settings/components/NetworkLineSettingsSection.tsx",
        "src/renderer/settings/components/NotificationSettingsSection.tsx",
      ].map((file) => [file, readFileSync(join(process.cwd(), file), "utf8")]),
    );
    const sourceText = [...sources.values()].join("\n");

    const notificationRows = [
      "imNotifications",
      "serviceQueueNotifications",
      "customerServiceMessageNotifications",
      "foregroundInAppCustomerServiceReminders",
      "slaTimeoutNotifications",
      "desktopNotifications",
      "notificationPreview",
      "notificationSound",
      "doNotDisturb",
    ];
    const notificationSource =
      sources.get("src/renderer/settings/components/NotificationSettingsSection.tsx") ?? "";
    for (const rowId of notificationRows) {
      expect(notificationSource, rowId).toContain(`"${rowId}"`);
    }
    expect(notificationSource).toContain("settingRowProps(remoteRow.id)");
    expect(notificationSource).toContain("settingRowProps(rowId)");

    const catalogDrivenRows = [
      "enterToSend",
      "screenshotShortcut",
      "dragUpload",
      "autoTranslate",
      "shortcutHints",
      "chatBackground",
      "chatExport",
      "chatBackup",
      "chatRestore",
      "theme",
      "skin",
      "fontSize",
      "compactList",
      "highDensityContext",
      "reduceMotion",
      "highContrastBoundary",
      "keyboardFocusHint",
      "minimizeToTray",
      "launchAtStartup",
      "clearLocalCache",
      "terms",
      "privacyPolicy",
      "checkUpdate",
    ];
    for (const rowId of catalogDrivenRows) {
      expect(sourceText, rowId).toContain(`settingRowProps("${rowId}")`);
    }

    expect(sources.get("src/renderer/components/MePrivacySections.tsx")).toContain(
      'settingRowProps("allowMobileSearch")',
    );
    expect(sources.get("src/renderer/components/MePrivacySections.tsx")).toContain(
      'settingRowProps("allowLppSearch")',
    );
    expect(sources.get("src/renderer/components/MePrivacySections.tsx")).toContain(
      'settingRowProps("friendRequestVerification")',
    );
    expect(sources.get("src/renderer/components/MePrivacySections.tsx")).toContain(
      'settingRowProps("profileVisibility")',
    );
    expect(sources.get("src/renderer/components/MePrivacySections.tsx")).toContain(
      'settingRowProps("blocklist")',
    );
    expect(sources.get("src/renderer/components/MePrivacySections.tsx")).toContain(
      "unblock.mutate",
    );
    expect(sources.get("src/renderer/settings/components/AccountSecuritySection.tsx")).toContain(
      "changePassword.mutate",
    );
    expect(sources.get("src/renderer/settings/components/AccountSecuritySection.tsx")).toContain(
      "deactivate.mutate",
    );
    expect(sources.get("src/renderer/settings/components/HelpAboutSettingsSection.tsx")).toContain(
      "submitFeedback.mutate",
    );
    expect(sources.get("src/renderer/settings/components/NetworkLineSettingsSection.tsx")).toContain(
      "handleSelect(site)",
    );
    expect(sources.get("src/renderer/settings/components/NetworkLineSettingsSection.tsx")).toContain(
      "testAll()",
    );
    expect(sources.get("src/renderer/settings/components/DiagnosticsRecordsSection.tsx")).toContain(
      "exportDiagnostics()",
    );
  });

  it("promotes minimize to tray into a real desktop setting", () => {
    expect(getSettingsRow("minimizeToTray")).toMatchObject({
      sectionId: "common",
      control: "switch",
      capability: "available",
      enabled: true,
      visibleInMainList: true,
    });
  });

  it("promotes launch at startup into a real desktop setting", () => {
    expect(getSettingsRow("launchAtStartup")).toMatchObject({
      sectionId: "common",
      control: "switch",
      capability: "available",
      enabled: true,
      visibleInMainList: true,
    });
  });

  it("promotes APP-equivalent network line settings into real PC capabilities", () => {
    expect(getSettingsRow("activeLine")).toMatchObject({
      sectionId: "network",
      capability: "available",
      enabled: true,
      visibleInMainList: true,
    });
    expect(getSettingsRow("lineLatencyTest")).toMatchObject({
      sectionId: "network",
      capability: "localEffective",
      enabled: true,
      visibleInMainList: true,
    });
  });

  it("keeps help and about actions real instead of hidden planning cards", async () => {
    expect(getSettingsRow("checkUpdate")).toMatchObject({
      sectionId: "about",
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
      control: "switch",
      capability: "localEffective",
      visibleInMainList: true,
    });
  });

  it("promotes chat archive import export and local backup into real settings entries", () => {
    for (const rowId of ["chatExport", "chatBackup", "chatRestore"]) {
      expect(getSettingsRow(rowId), rowId).toMatchObject({
        sectionId: "common",
        control: "action",
        capability: "available",
        enabled: true,
        visibleInMainList: true,
      });
      expect(getSettingsRow(rowId)?.productValue).toBeUndefined();
      expect(getSettingsRow(rowId)?.dependency).toBeUndefined();
      expect(getSettingsRow(rowId)?.nextAction).toBeUndefined();
    }
  });

  it("promotes chat background into a local effective setting with stage wiring", () => {
    expect(getSettingsRow("chatBackground")).toMatchObject({
      sectionId: "common",
      control: "action",
      capability: "localEffective",
      enabled: true,
      visibleInMainList: true,
    });
    expect(getSettingsRow("chatBackground")?.productValue).toBeUndefined();
    expect(getSettingsRow("chatBackground")?.dependency).toBeUndefined();
    expect(getSettingsRow("chatBackground")?.nextAction).toBeUndefined();

    const backgroundSectionSource = readFileSync(
      join(process.cwd(), "src/renderer/settings/components/ChatBackgroundSection.tsx"),
      "utf8",
    );
    const stageSource = readFileSync(
      join(process.cwd(), "src/renderer/messages/components/MessageCenterConversationStage.tsx"),
      "utf8",
    );
    const listSource = readFileSync(
      join(process.cwd(), "src/renderer/messages/components/MessageListPanel.tsx"),
      "utf8",
    );

    expect(backgroundSectionSource).toContain("chatBackgroundPresets");
    expect(backgroundSectionSource).toContain("chatBackgroundPreset");
    expect(stageSource).toContain("chatBackgroundPreset={pcSettings.chatBackgroundPreset}");
    expect(listSource).toContain("chatBackgroundStyleVariables");
  });

  it("keeps quick reply management out of chat collaboration planning", () => {
    const commonRows = settingsRows.filter((row) => row.sectionId === "common");

    expect(getSettingsRow("quickReplyEntry")).toBeUndefined();
    expect(commonRows.map((row) => row.label)).not.toContain("快捷回复管理");
  });

  it("keeps media send preference removed from chat collaboration planning", () => {
    const commonRows = settingsRows.filter((row) => row.sectionId === "common");

    expect(getSettingsRow("mediaSendPreference")).toBeUndefined();
    expect(commonRows.map((row) => row.label)).not.toContain("图片/文件/视频发送偏好");
  });

  it("keeps undecided local message cache out of chat collaboration planning", () => {
    const commonRows = settingsRows.filter((row) => row.sectionId === "common");

    expect(getSettingsRow("localMessageCache")).toBeUndefined();
    expect(commonRows.map((row) => row.label)).not.toContain("聊天记录缓存");
  });

  it("requires every planned capability to explain value, dependency and next action", () => {
    const plannedRows = settingsRows.filter((row) => row.capability.startsWith("missing"));

    for (const row of plannedRows) {
      expect(row.productValue, row.id).toBeTruthy();
      expect(row.dependency, row.id).toBeTruthy();
      expect(row.nextAction, row.id).toBeTruthy();
      expect(row.visibleInMainList, row.id).toBe(false);
    }
  });

  it("keeps recorded language, timezone and diagnostics as status display", () => {
    for (const rowId of ["language", "timezone", "runtimeStatus", "developmentDiagnostics"]) {
      expect(getSettingsRow(rowId)).toMatchObject({
        control: "info",
        capability: "recordOnly",
        visibleInMainList: true,
      });
    }
  });

  it("promotes recent diagnostics records into the storage and diagnostics page", () => {
    expect(getSettingsRow("diagnosticsRecentRecords")).toMatchObject({
      sectionId: "storageDiagnostics",
      label: "诊断记录",
      control: "info",
      capability: "available",
      visibleInMainList: true,
    });
    expect(getSettingsRow("profileLogDirectory")).toBeUndefined();
  });

  it("promotes connectivity health into a real storage diagnostics panel", () => {
    expect(getSettingsRow("connectivityHealth")).toMatchObject({
      sectionId: "storageDiagnostics",
      label: "连接体检",
      control: "info",
      capability: "available",
      visibleInMainList: true,
    });
    expect(getSettingsRow("apiConnectivity")).toBeUndefined();
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
      join(process.cwd(), "src/renderer/settings/components/DiagnosticsRecordsSection.tsx"),
      "utf8",
    );
    const pageSource = readFileSync(
      join(process.cwd(), "src/renderer/components/MePage.tsx"),
      "utf8",
    );

    expect(privacySource).toContain("pcQueryKeys.accountPrivacy");
    expect(diagnosticsSource).toContain("exportDiagnostics");
    expect(diagnosticsSource).toContain("getRecentDiagnosticsRecords");
    expect(pageSource).toContain("getAppInstanceProfile");
    expect(pageSource).toContain("NotificationSettingsSection");
    expect(pageSource).toContain("HelpAboutSettingsSection");
    expect(pageSource).toContain("RuntimeStatusSettingsSection");
    const aboutBranch = pageSource.slice(
      pageSource.indexOf('case "about"'),
      pageSource.indexOf("function PlanningSupportBlock"),
    );
    expect(aboutBranch).toContain("HelpAboutSettingsSection");
    expect(aboutBranch).not.toContain("PlanningSupportBlock");
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

  it("wires auto translate into settings, IM and customer service conversations", () => {
    const pageSource = readFileSync(
      join(process.cwd(), "src/renderer/components/MePage.tsx"),
      "utf8",
    );
    const messageCenterSource = readFileSync(
      join(process.cwd(), "src/renderer/components/MessageCenter.tsx"),
      "utf8",
    );
    const chatWorkspaceSource = readFileSync(
      join(process.cwd(), "src/renderer/components/ChatWorkspace.tsx"),
      "utf8",
    );
    const serviceBubbleSource = readFileSync(
      join(process.cwd(), "src/renderer/customer-service/components/ServiceMessageBubble.tsx"),
      "utf8",
    );

    expect(pageSource).toContain('setSetting("autoTranslate"');
    expect(messageCenterSource).toContain("useAutoTranslateMessages");
    expect(messageCenterSource).toContain("autoTranslateConversationMode");
    expect(chatWorkspaceSource).toContain("useAutoTranslateMessages");
    expect(chatWorkspaceSource).toContain("autoTranslateConversationMode");
    expect(serviceBubbleSource).toContain("translationText");
  });

  it("wires chat archive actions into a real settings panel instead of planning cards", () => {
    const chatArchiveSource = readFileSync(
      join(process.cwd(), "src/renderer/settings/components/ChatArchiveSection.tsx"),
      "utf8",
    );

    expect(chatArchiveSource).toContain("exportChatArchiveJson");
    expect(chatArchiveSource).toContain("saveChatArchiveFile");
    expect(chatArchiveSource).toContain("openChatArchiveFile");
    expect(chatArchiveSource).not.toContain("待接入");
    expect(chatArchiveSource).toContain("本地归档不会同步到云端");
  });

  it("wires SLA timeout reminders into the customer service polling path", () => {
    const sidebarSource = readFileSync(
      join(process.cwd(), "src/renderer/components/Sidebar.tsx"),
      "utf8",
    );

    expect(sidebarSource).toContain("isRiskyCustomerServiceThread");
    expect(sidebarSource).toContain("pcSettings.slaTimeoutNotifications");
    expect(sidebarSource).toContain('channel: "sla"');
    expect(sidebarSource).toContain('icon: "sla"');
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
