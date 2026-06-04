import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

import type { ModuleKey } from "../../src/renderer/data/types";
import {
  derivePcWorkspaceAccess,
  normalizeActiveModuleForAccess,
} from "../../src/renderer/data/workspace-access";

const businessModules: ModuleKey[] = [
  "onlineService",
  "workbench",
  "ticketCenter",
  "dataCenter",
  "knowledgeBase",
];

describe("pc workspace access model", () => {
  it("keeps customer tenant members on default chat modules only", () => {
    const access = derivePcWorkspaceAccess({
      apiBaseUrl: "https://api.example",
      displayName: "客户",
      membershipRole: 0,
      tenantToken: "token",
      userType: 1,
    });

    expect(access).toMatchObject({
      canReadServiceWorkbench: false,
      identityKind: "customer",
      roleKind: "customer",
      settingsProfile: "customer",
    });
    expect(access.visibleModules).toEqual([
      "messages",
      "contacts",
      "enterpriseSwitch",
      "favorites",
      "settings",
    ]);
    for (const module of businessModules) {
      expect(access.visibleModules).not.toContain(module);
    }
  });

  it("keeps basic employees on default chat modules and opens service roles fully", () => {
    expect(
      derivePcWorkspaceAccess({
        apiBaseUrl: "https://api.example",
        displayName: "技术支持",
        membershipRole: 1,
        roleLabel: "技术支持",
        tenantToken: "token",
        userType: 2,
      }),
    ).toMatchObject({
      canReadServiceWorkbench: false,
      dataCenterView: undefined,
      identityKind: "employee",
      roleKind: "basic_employee",
    });

    const serviceAccess = derivePcWorkspaceAccess({
      apiBaseUrl: "https://api.example",
      displayName: "客服",
      membershipRole: 2,
      roleLabel: "客服",
      tenantToken: "token",
      userType: 2,
    });
    expect(serviceAccess.roleKind).toBe("customer_service");
    expect(serviceAccess.dataCenterView).toBe("self-service");
    expect(serviceAccess.canReadServiceWorkbench).toBe(true);
    for (const module of businessModules) {
      expect(serviceAccess.visibleModules).toContain(module);
    }
    expect(serviceAccess.visibleModules).not.toContain("aiAssistant");
  });

  it("assigns admin and owner data center views", () => {
    expect(
      derivePcWorkspaceAccess({
        apiBaseUrl: "https://api.example",
        displayName: "管理员",
        membershipRole: 3,
        tenantToken: "token",
      }).dataCenterView,
    ).toBe("team-admin");

    expect(
      derivePcWorkspaceAccess({
        apiBaseUrl: "https://api.example",
        displayName: "所有者",
        membershipRole: 4,
        tenantToken: "token",
      }).dataCenterView,
    ).toBe("enterprise-owner");
  });

  it("does not classify unknown high membership roles as employees", () => {
    expect(
      derivePcWorkspaceAccess({
        apiBaseUrl: "https://api.example",
        displayName: "unknown",
        membershipRole: 5,
        tenantToken: "token",
      }),
    ).toMatchObject({
      canReadServiceWorkbench: false,
      identityKind: "legacy",
      roleKind: "basic_employee",
    });
  });

  it("falls back from hidden modules when a customer or basic employee switches accounts", () => {
    const customerAccess = derivePcWorkspaceAccess({
      apiBaseUrl: "https://api.example",
      displayName: "客户",
      membershipRole: 0,
      tenantToken: "token",
      userType: 1,
    });

    expect(normalizeActiveModuleForAccess("knowledgeBase", customerAccess)).toBe("messages");
    expect(normalizeActiveModuleForAccess("aiAssistant", customerAccess)).toBe("messages");
    expect(normalizeActiveModuleForAccess("messages", customerAccess)).toBe("messages");
  });
});

describe("workspace access integration closure", () => {
  const appSource = readFileSync(resolve(process.cwd(), "src/renderer/App.tsx"), "utf8");
  const sidebarSource = readFileSync(
    resolve(process.cwd(), "src/renderer/components/Sidebar.tsx"),
    "utf8",
  );
  const porcelainShellSource = readFileSync(
    resolve(process.cwd(), "src/renderer/styles/shared/porcelain-shell.css"),
    "utf8",
  );
  const mePageSource = readFileSync(
    resolve(process.cwd(), "src/renderer/components/MePage.tsx"),
    "utf8",
  );
  const composerSurfaceSource = readFileSync(
    resolve(
      process.cwd(),
      "src/renderer/messages/components/MessageComposerSurface.tsx",
    ),
    "utf8",
  );
  const sharedComposerSurfaceSource = readFileSync(
    resolve(process.cwd(), "src/renderer/components/ChatComposerSurface.tsx"),
    "utf8",
  );
  const serviceWorkspaceSource = readFileSync(
    resolve(process.cwd(), "src/renderer/components/ChatWorkspace.tsx"),
    "utf8",
  );
  const serviceIncomingNotificationsSource = readFileSync(
    resolve(
      process.cwd(),
      "src/renderer/customer-service/hooks/useCustomerServiceIncomingNotifications.ts",
    ),
    "utf8",
  );
  const serviceReminderModelSource = readFileSync(
    resolve(process.cwd(), "src/renderer/data/customer-service/cs-reminder-model.ts"),
    "utf8",
  );
  const serviceBadgeViewSource = readFileSync(
    resolve(
      process.cwd(),
      "src/renderer/data/customer-service/customer-service-badge-view.ts",
    ),
    "utf8",
  );
  const gatewayCustomerServiceSideEffectsSource = readFileSync(
    resolve(process.cwd(), "src/renderer/data/gateway/gateway-cs-side-effects.ts"),
    "utf8",
  );
  const messageCenterSource = readFileSync(
    resolve(process.cwd(), "src/renderer/components/MessageCenter.tsx"),
    "utf8",
  );
  const onlineServicePageSource = readFileSync(
    resolve(process.cwd(), "src/renderer/components/OnlineServicePage.tsx"),
    "utf8",
  );
  const aiReplyDrawerSource = readFileSync(
    resolve(process.cwd(), "src/renderer/components/AiReplySuggestionDrawer.tsx"),
    "utf8",
  );
  const serviceKnowledgeDrawerSource = readFileSync(
    resolve(
      process.cwd(),
      "src/renderer/customer-service/components/CustomerServiceKnowledgeDrawer.tsx",
    ),
    "utf8",
  );
  const serviceQuickReplyDrawerSource = readFileSync(
    resolve(
      process.cwd(),
      "src/renderer/customer-service/components/CustomerServiceQuickReplyDrawer.tsx",
    ),
    "utf8",
  );
  const composerSource = readFileSync(
    resolve(process.cwd(), "src/renderer/components/MessageComposer.tsx"),
    "utf8",
  );
  const pcAgentsSource = readFileSync(resolve(process.cwd(), "AGENTS.md"), "utf8");

  it("guards active modules and service workbench queries behind workspace access", () => {
    expect(appSource).toContain("normalizeActiveModuleForAccess");
    expect(appSource).not.toContain("AiAssistantPage");
    expect(sidebarSource).toContain("workspaceAccess.canReadServiceWorkbench");
    expect(sidebarSource).toContain("visiblePrimaryNavItems");
    expect(sidebarSource).not.toContain('label: "AI 助手"');
  });

  it("renders the light sidebar brand and bottom status center without cyclic status toggles", () => {
    expect(sidebarSource).toContain("sidebar-brand");
    expect(sidebarSource).toContain("appProductName");
    expect(sidebarSource).toContain("专业版 · v");
    expect(sidebarSource).toContain("sidebar-status-center");
    expect(sidebarSource).toContain("sidebar-footer-account-entry");
    expect(sidebarSource).toContain('<div className="sidebar-footer">');
    expect(sidebarSource).toContain("sidebar-realtime-status");
    expect(sidebarSource).toContain("gatewayStatusNotice");
    expect(sidebarSource).toContain("imPresenceStatuses.map");
    expect(sidebarSource).toContain("accountAvatarDisplayUrl");
    expect(sidebarSource).toContain("profileQuery.dataUpdatedAt");
    expect(sidebarSource).toContain("enabled: Boolean(authSession)");
    expect(sidebarSource).toContain("状态：${imStatusLabel}");
    expect(sidebarSource).not.toContain("IM ${imStatusLabel}");
    expect(sidebarSource).toContain("account-chevron");
    expect(sidebarSource).toContain("tenantInfo?.logoUrl ?? authSession?.tenantLogoUrl");
    expect(sidebarSource).toContain("spaceCode");
    expect(sidebarSource).toContain("isPersonalSpace");
    expect(sidebarSource).toContain('const spaceName = isPersonalSpace');
    expect(sidebarSource).toContain('const spaceMeta = isPersonalSpace');
    expect(sidebarSource).toContain("<strong>{spaceName}</strong>");
    expect(sidebarSource).not.toContain("<strong>{spaceCode}</strong>");
    expect(sidebarSource).not.toContain('const spaceMeta = "企业空间"');
    expect(sidebarSource).toContain("data-sidebar-popover-trigger");
    expect(sidebarSource).toContain('document.addEventListener("pointerdown"');
    expect(sidebarSource).toContain('event.key === "Escape"');
    expect(sidebarSource).toContain(".sidebar-brand-popover, .account-popover, .sidebar-status-popover");
    expect(sidebarSource).not.toContain("IM {imStatusLabel}");
    expect(sidebarSource).not.toContain("IM 在线状态");
    expect(sidebarSource).toContain("useSetCustomerServiceStatus");
    expect(sidebarSource).toContain("confirmedServiceStatus");
    expect(sidebarSource).toContain("confirmedQueueAcceptEnabled");
    expect(sidebarSource).toContain("onMutate");
    expect(onlineServicePageSource).toContain("confirmedQueueAcceptEnabled");
    expect(onlineServicePageSource).toContain("onMutate");
    expect(sidebarSource).toContain("状态未同步");
    expect(sidebarSource).not.toContain("serviceAutoSidebarCollapsed");
    expect(sidebarSource).not.toContain("sidebarCollapsed || serviceAutoSidebarCollapsed");
    expect(sidebarSource).not.toContain("useServiceLayoutMode");
    expect(sidebarSource).toContain("pcQueryKeys.customerServiceReception");
    expect(sidebarSource).toContain("getReceptionStatusOption");
    expect(sidebarSource).toContain("getReceptionControlSummary");
    expect(sidebarSource).toContain("getReceptionQueueModeDescription");
    expect(sidebarSource).toContain("getReceptionQueueModeLabel");
    expect(sidebarSource).toContain("getQueueAutoDisabledReason");
    expect(sidebarSource).toContain("resolveReceptionQueueModePatch");
    expect(sidebarSource).toContain("receptionControlStatusOptions.map");
    expect(sidebarSource).toContain("queueAcceptMutation");
    expect(sidebarSource).toContain('(["manual", "auto"] as ReceptionQueueMode[]).map');
    expect(sidebarSource).toContain("sidebar-queue-mode-option");
    expect(sidebarSource).toContain("updateReceptionStatus");
    expect(sidebarSource).toContain("接入模式");
    expect(sidebarSource).not.toContain('mode === "auto" && serviceStatus !== "online"');
    expect(sidebarSource).not.toContain("disabledByStatus");
    expect(sidebarSource).toContain("workspaceAccess.canReadServiceWorkbench &&");
    expect(sidebarSource).toContain("serviceStatusCounters");
    expect(sidebarSource).toContain("serviceStatusCompactDetail");
    expect(sidebarSource).toContain("serviceStatusFullDetail");
    expect(sidebarSource).toContain("`接待 ${receptionSummary.sessionText}");
    expect(sidebarSource).not.toContain("? receptionSummary.queueModeLabel");
    expect(sidebarSource).not.toContain("<b>{receptionSummary.queueModeLabel}</b>");
    expect(sidebarSource).not.toContain("receptionStatus?.activeSessionCount ??\n      (hasServiceThreadData ? activeTempSessions.length : null)");
    expect(sidebarSource).toContain("const activeReceptionCount = receptionStatus?.activeSessionCount ?? null");
    expect(sidebarSource).toContain('label: "接"');
    expect(sidebarSource).toContain('value: activeReceptionCount ?? "--"');
    expect(sidebarSource).toContain('label: "排"');
    expect(sidebarSource).toContain('label: "未"');
    expect(sidebarSource).toContain("name: \"接待中\"");
    expect(sidebarSource).toContain("name: \"排队\"");
    expect(sidebarSource).toContain("activeServiceUnreadCount > 0");
    expect(sidebarSource).toContain("sidebar-service-counters");
    expect(sidebarSource).toContain("sidebar-service-counter");
    expect(sidebarSource).not.toContain("<em>{serviceStatusCompactDetail}</em>");
    expect(sidebarSource).not.toContain("<em>{serviceStatusFullDetail}</em>");
    expect(sidebarSource).not.toContain("<em>{serviceStatusDetail}</em>");
    expect(sidebarSource).not.toContain("deriveSidebarServiceStatus");
    expect(sidebarSource).not.toContain("客服空闲");
    expect(sidebarSource).not.toContain("无客服权限");
    expect(sidebarSource).not.toContain("客服读取中");
    expect(sidebarSource).not.toContain("客服状态异常");
    expect(sidebarSource).not.toContain("setServicePresence");
    expect(sidebarSource).toContain('setActiveModule("enterpriseSwitch")');
    expect(sidebarSource).toContain('setActiveModule("onlineService")');
    expect(porcelainShellSource).toContain(".sidebar-brand");
    expect(porcelainShellSource).toContain(".sidebar-footer-account-entry");
    expect(porcelainShellSource).toContain("align-items: start");
    expect(porcelainShellSource).toContain("margin-bottom: auto");
    expect(porcelainShellSource).toContain(".sidebar-status-center");
    expect(porcelainShellSource).toContain("grid-template-columns: repeat(3, minmax(0, 1fr))");
    expect(porcelainShellSource).toContain("gap: 4px");
    expect(porcelainShellSource).toContain("order: 3");
    expect(porcelainShellSource).toContain("border-top: 1px solid rgba(217, 226, 236, 0.72)");
    expect(porcelainShellSource).not.toMatch(/\.account-entry\s*\{[^}]*order:\s*3/s);
    expect(porcelainShellSource).not.toMatch(/\.sidebar-footer\s*\{[^}]*order:\s*4/s);
    expect(porcelainShellSource).not.toMatch(
      /\.sidebar-footer-account-entry\s*\{[^}]*padding-top:\s*8px !important/s,
    );
    expect(porcelainShellSource).toContain("padding-top: 6px");
    expect(porcelainShellSource).toContain(".sidebar.collapsed .sidebar-status-row");
    expect(porcelainShellSource).toContain(".account-chevron");
    expect(porcelainShellSource).toContain(".sidebar-service-counters");
    expect(porcelainShellSource).toContain(".sidebar-service-counter");
    expect(porcelainShellSource).toContain(".sidebar-service-status-row > svg:last-child");
    expect(porcelainShellSource).toContain(".sidebar-service-status-row.online > svg:first-child");
    expect(porcelainShellSource).not.toContain(".sidebar-service-status-row.online svg,");
    expect(porcelainShellSource).toContain(".sidebar-service-status-options");
    expect(porcelainShellSource).toContain(".sidebar-queue-mode-option");
    expect(porcelainShellSource).toContain("grid-template-columns: minmax(0, 1fr) 16px");
    expect(porcelainShellSource).toContain(".sidebar-queue-mode-option span");
    expect(porcelainShellSource).toContain("writing-mode: horizontal-tb");
    expect(porcelainShellSource).toContain("word-break: keep-all");
    expect(porcelainShellSource).toContain(".sidebar-status-error");
    expect(porcelainShellSource).toContain(".sidebar-space-status-row");
    expect(porcelainShellSource).toContain(".sidebar-space-logo");
    expect(porcelainShellSource).toContain("height: 42px");
    expect(porcelainShellSource).toContain("height: var(--sidebar-footer-account-height, 42px) !important");
    expect(porcelainShellSource).toContain("border: 1px solid transparent !important");
    expect(porcelainShellSource).toContain("background: transparent !important");
    expect(porcelainShellSource).toContain(".account-button:focus-visible");
    expect(porcelainShellSource).not.toContain("border: 1px solid rgba(216, 226, 237, 0.74) !important");
    expect(porcelainShellSource).not.toContain("background: rgba(255, 255, 255, 0.78) !important");
    expect(porcelainShellSource).toContain(".sidebar.collapsed .account-button");
    expect(porcelainShellSource).toContain("height: 38px !important");
    expect(porcelainShellSource).toContain("min-height: 38px !important");
    expect(porcelainShellSource).toContain(".sidebar.collapsed .account-avatar");
    expect(porcelainShellSource).toContain("width: 30px !important");
    expect(porcelainShellSource).toContain("height: 30px !important");
    expect(porcelainShellSource).toContain("0 0 0 1px rgba(216, 226, 237, 0.74)");
    expect(porcelainShellSource).toContain(".sidebar.collapsed .account-status-dot");
    expect(porcelainShellSource).toContain("border-width: 1.5px");
    expect(porcelainShellSource).not.toMatch(
      /\.sidebar\.collapsed \.account-button\s*\{[^}]*min-height:\s*46px !important/s,
    );
    expect(porcelainShellSource).toContain("grid-template-columns: var(--sidebar-footer-icon-size, 30px) minmax(0, 1fr) 12px !important");
    expect(porcelainShellSource).toContain(".sidebar-service-status-row .sidebar-status-copy strong");
    expect(porcelainShellSource).toContain("white-space: nowrap");
    expect(porcelainShellSource).toContain(".app-shell.service-layout.layout-compact-sidebar");
    expect(porcelainShellSource).toContain(".app-shell.service-layout.layout-no-sidebar");
    expect(porcelainShellSource).toContain(".app-shell.service-layout.layout-queue-focus");
    expect(porcelainShellSource).toContain(".app-shell.service-layout.layout-chat-focus");
    expect(porcelainShellSource).not.toContain("background: #0f172a");
    expect(pcAgentsSource).toContain("真实数据硬规则");
    expect(pcAgentsSource).toContain("数据一定是真实的数据，禁止 mock 兜底数据。要务实。");
    expect(pcAgentsSource).toContain("不得用 mock、sample、demo、fake、硬编码业务数据");
  });

  it("uses shared settings copy without customer-service-only reminders", () => {
    expect(mePageSource).toContain("设置中心");
    expect(mePageSource).toContain("settingsSections");
    expect(mePageSource).toContain("NotificationSettingsSection");
    expect(mePageSource).not.toContain('label="在线客服排队提醒"');
    expect(mePageSource).not.toContain('label="SLA 超时提醒"');
  });

  it("hides IM composer AI tools while keeping knowledge visibility controlled", () => {
    expect(composerSurfaceSource).toContain("showKnowledgeTools");
    expect(composerSurfaceSource).toContain("showAiTools");
    expect(composerSurfaceSource).toContain("ChatComposerSurface");
    expect(sharedComposerSurfaceSource).toContain(
      "showDefaultQuickReplyTool={!showServiceTools}",
    );
    expect(messageCenterSource).toContain("canOpenAiAssistant={false}");
    expect(messageCenterSource).toContain("openAiDraftDrawer");
  });

  it("uses one shared composer surface for IM and online customer service", () => {
    expect(composerSurfaceSource).toContain("ChatComposerSurface");
    expect(serviceWorkspaceSource).toContain("ChatComposerSurface");
    expect(serviceWorkspaceSource).not.toContain("CustomerServiceComposerSurface");
    expect(serviceWorkspaceSource).toContain("attachmentScopeKey={selectedThread.threadId}");
    expect(serviceWorkspaceSource).toContain("screenshotShortcut={pcSettings.screenshotShortcut}");
    expect(serviceWorkspaceSource).toContain('toolMode="customerService"');
    expect(sharedComposerSurfaceSource).toContain('attachmentUi="compact"');
    expect(sharedComposerSurfaceSource).toContain("combinedAttachmentTool");
    expect(sharedComposerSurfaceSource).toContain("enableScreenshot");
  });

  it("keeps online-service message reminders deduped and visitor-only", () => {
    expect(serviceReminderModelSource).toContain("consumeCustomerServiceMessageReminder");
    expect(serviceReminderModelSource).toContain("isMineCustomerServiceMessage");
    expect(serviceIncomingNotificationsSource).toContain("consumeCustomerServiceMessageReminder");
    expect(gatewayCustomerServiceSideEffectsSource).toContain("consumeCustomerServiceMessageReminder");
    expect(serviceWorkspaceSource).toContain("isMineCustomerServiceMessage");
    expect(sidebarSource).toContain("resolveCustomerServiceBadgeView");
    expect(sidebarSource).toContain("serviceUnreadCount: taskbarServiceUnreadCount");
    expect(serviceBadgeViewSource).toContain("taskbarServiceUnreadCount: activeServiceUnreadCount");
    expect(sidebarSource).not.toContain("realtimeServiceAlertCount");
    expect(serviceBadgeViewSource).not.toContain("realtimeServiceAlertCount");
    expect(sidebarSource).not.toContain("previousServiceMessageRef");
  });

  it("keeps AI reply suggestions in online service but removes them from ordinary IM", () => {
    expect(serviceWorkspaceSource).toContain("AiReplySuggestionDrawer");
    expect(serviceWorkspaceSource).toContain("setServiceAssistantPane");
    expect(messageCenterSource).not.toContain("AiReplySuggestionPanel");
    expect(messageCenterSource).not.toContain("onAiReplyRequest");
    expect(serviceWorkspaceSource).toContain(
      "setAiDraftDrawer({ customerMessageId: message.messageId })",
    );
    expect(messageCenterSource).not.toContain("aiReplyTargetForDirectConversation");
    expect(messageCenterSource).not.toContain("pc-cs-staff-service-history");
    expect(messageCenterSource).not.toContain('setActiveModule("aiAssistant")');
    expect(aiReplyDrawerSource).toContain("generateAiSuggestion");
    expect(aiReplyDrawerSource).toContain("adoptAiSuggestion");
    expect(aiReplyDrawerSource).toContain("插入回复");
  });

  it("opens customer-service knowledge as an in-chat drawer and inserts into composer draft", () => {
    expect(serviceWorkspaceSource).toContain("CustomerServiceKnowledgeDrawer");
    expect(serviceWorkspaceSource).toContain("setServiceAssistantPane");
    expect(serviceWorkspaceSource).toContain("composerRef.current?.insertText");
    expect(serviceWorkspaceSource).not.toContain(
      'onKnowledgeBase={() => setActiveModule("knowledgeBase")}',
    );
    expect(serviceKnowledgeDrawerSource).toContain("插入回复");
    expect(serviceKnowledgeDrawerSource).toContain("searchKnowledge");
    expect(serviceQuickReplyDrawerSource).toContain("getQuickReplies");
    expect(serviceQuickReplyDrawerSource).toContain("filterQuickRepliesForScope");
    expect(sharedComposerSurfaceSource).toContain("onQuickReply");
    expect(messageCenterSource).toContain("CustomerServiceQuickReplyPanel");
    expect(messageCenterSource).toContain("insertQuickReply");
    expect(composerSource).toContain("export type MessageComposerHandle");
    expect(composerSource).toContain("useImperativeHandle");
    expect(composerSource).toContain("insertText:");
    expect(composerSource).toContain("showDefaultQuickReplyTool = true");
    expect(composerSource).toContain("showDefaultQuickReplyTool &&");
    expect(sharedComposerSurfaceSource).toContain("toolMode === \"customerService\"");
  });
});
