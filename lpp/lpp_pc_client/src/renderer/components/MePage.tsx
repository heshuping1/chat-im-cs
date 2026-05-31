import { useQuery, useQueryClient, type QueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import {
  Bell,
  CheckCircle2,
  DatabaseBackup,
  MessageSquareText,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import { pcQueryKeys } from "../data/query-keys";
import { requireApiClient } from "../data/runtime";
import type {
  UserProfileDto,
} from "../data/api-client";
import type { AuthSession } from "../data/auth/auth-session";
import { useAuthSession, useClearAuthSession } from "../data/auth/auth-store";
import type { PcSettings } from "../data/settings/pc-settings";
import { usePcSettings, useUpdatePcSetting } from "../data/settings/settings-store";
import { formatError, formatShortDate } from "../lib/format";
import { exportCurrentDiagnosticsPackage } from "../settings/runtime/diagnosticsExport";
import {
  InfoRow,
  InlineSettingsState,
  SelectRow,
  SwitchRow,
} from "../settings/components/SettingsRows";
import {
  settingRowProps,
  settingsSections,
  settingsRowsForSection,
  type SettingsSectionId,
} from "../settings/models/settingsCatalog";
import { AccountSecuritySection } from "../settings/components/AccountSecuritySection";
import { ChatArchiveSection } from "../settings/components/ChatArchiveSection";
import { DiagnosticsSettingsSection } from "../settings/components/DiagnosticsSettingsSection";
import { PrivacySettingsSection } from "./MePrivacySections";

type SettingKey = keyof PcSettings;
const sectionIcons = {
  identity: UserRound,
  privacy: ShieldCheck,
  notifications: Bell,
  workspace: MessageSquareText,
  localDiagnostics: DatabaseBackup,
} satisfies Record<SettingsSectionId, typeof Bell>;

export function MePage() {
  const queryClient = useQueryClient();
  const pcSettings = usePcSettings();
  const authSession = useAuthSession();
  const clearAuthSession = useClearAuthSession();
  const updatePcSetting = useUpdatePcSetting();
  const [activeSectionId, setActiveSectionId] =
    useState<SettingsSectionId>("identity");
  const [notice, setNotice] = useState("设置更改后会自动保存");
  const activeSection = useMemo(
    () =>
      settingsSections.find((section) => section.id === activeSectionId) ??
      settingsSections[0],
    [activeSectionId],
  );

  const setSetting = <K extends SettingKey>(key: K, value: PcSettings[K]) => {
    updatePcSetting(key, value);
    setNotice("已保存");
  };

  const exportDiagnostics = async () => {
    const result = await exportCurrentDiagnosticsPackage();
    setNotice(result ? "诊断包已导出" : "已取消导出诊断包");
  };

  const ActiveIcon = sectionIcons[activeSection.id];
  const profileQuery = useQuery({
    queryKey: pcQueryKeys.accountProfile(authSession?.apiBaseUrl, authSession?.tenantToken),
    enabled: Boolean(authSession),
    staleTime: 60_000,
    queryFn: async () => requireApiClient(authSession).getMyProfile(),
  });

  return (
    <main className="module-page me-page settings-page-v2">
      <aside className="settings-nav" aria-label="设置分组">
        <div>
          <span className="settings-nav-kicker">SETTINGS</span>
          <strong>设置</strong>
          <p>个人资料、提醒、显示、安全和诊断</p>
        </div>
        {settingsSections.map((section) => {
          const Icon = sectionIcons[section.id];
          return (
            <button
              className={activeSectionId === section.id ? "selected" : ""}
              key={section.id}
              type="button"
              onClick={() => setActiveSectionId(section.id)}
            >
              <Icon size={16} />
              <span>
                <strong>{section.title}</strong>
                <em>{section.desc}</em>
              </span>
            </button>
          );
        })}
      </aside>

      <section className="settings-main">
        <section className="settings-hero-panel settings-hero-compact">
          <div>
            <span className="eyebrow">PC 客户端</span>
            <h1>设置</h1>
            <p>
              管理账号、安全、提醒、聊天体验和诊断工具。只展示当前可用能力，暂未支持的能力会单独说明。
            </p>
          </div>
          <div className="settings-health">
            <CheckCircle2 size={18} />
            <span>{notice}</span>
          </div>
        </section>

        <section className="settings-detail-card" aria-live="polite">
          <header className="settings-detail-head">
            <span className="settings-detail-icon">
              <ActiveIcon size={22} />
            </span>
            <div>
              <h2>{activeSection.title}</h2>
              <p>{activeSection.desc}</p>
            </div>
          </header>
          <div className="settings-detail-body">
            {renderSection(activeSectionId, pcSettings, setSetting, {
              exportDiagnostics,
              setNotice,
              authSession,
              profile: profileQuery.data,
              profileLoading: profileQuery.isLoading,
              profileError: profileQuery.error,
              queryClient,
              clearAuthSession,
            })}
          </div>
        </section>
      </section>
    </main>
  );
}

function renderSection(
  section: SettingsSectionId,
  pcSettings: PcSettings,
  setSetting: <K extends SettingKey>(key: K, value: PcSettings[K]) => void,
  actions: {
    exportDiagnostics: () => Promise<void>;
    setNotice: (notice: string) => void;
    authSession: AuthSession | null;
    profile?: UserProfileDto;
    profileLoading: boolean;
    profileError: unknown;
    queryClient: QueryClient;
    clearAuthSession: () => void;
  },
) {
  switch (section) {
    case "identity":
      return (
        <>
          <ProfileSettingsSection {...actions} />
          <AccountSecuritySection
            authSession={actions.authSession}
            clearAuthSession={actions.clearAuthSession}
            setNotice={actions.setNotice}
          />
        </>
      );
    case "privacy":
      return (
        <PrivacySettingsSection
          actions={actions}
          pcSettings={pcSettings}
          setSetting={setSetting}
        />
      );
    case "notifications":
      return (
        <>
          <SwitchRow
            {...settingRowProps("imNotifications")}
            checked={pcSettings.imNotifications}
            onChange={(value) => setSetting("imNotifications", value)}
          />
          <InfoRow
            {...settingRowProps("friendRequestNotifications")}
            desc={`新的好友申请跟随 IM 消息通知策略。当前：${pcSettings.imNotifications ? "开启" : "关闭"}`}
          />
          <SwitchRow
            {...settingRowProps("serviceQueueNotifications")}
            checked={pcSettings.serviceQueueNotifications}
            onChange={(value) => setSetting("serviceQueueNotifications", value)}
          />
          <SwitchRow
            {...settingRowProps("slaTimeoutNotifications")}
            checked={pcSettings.slaTimeoutNotifications}
            onChange={(value) => setSetting("slaTimeoutNotifications", value)}
          />
          <SwitchRow
            {...settingRowProps("desktopNotifications")}
            checked={pcSettings.desktopNotifications}
            onChange={(value) => setSetting("desktopNotifications", value)}
          />
        </>
      );
    case "workspace":
      return (
        <>
          <SelectRow
            {...settingRowProps("screenshotShortcut")}
            value={pcSettings.screenshotShortcut}
            options={["Alt+A", "Ctrl+Alt+A", "Ctrl+Shift+A", "None"]}
            optionLabels={{
              "Alt+A": "Alt + A",
              "Ctrl+Alt+A": "Ctrl + Alt + A",
              "Ctrl+Shift+A": "Ctrl + Shift + A",
              None: "不启用",
            }}
            onChange={(value) => setSetting("screenshotShortcut", value)}
          />
          <SwitchRow
            {...settingRowProps("dragUpload")}
            checked={pcSettings.dragUpload}
            onChange={(value) => setSetting("dragUpload", value)}
          />
          <SwitchRow
            {...settingRowProps("autoTranslate")}
            checked={pcSettings.autoTranslate}
            onChange={(value) => setSetting("autoTranslate", value)}
          />
          <SelectRow
            {...settingRowProps("theme")}
            value={pcSettings.theme}
            options={["porcelain", "business", "classic-wechat", "dark", "high-contrast"]}
            optionLabels={{
              porcelain: "白瓷",
              business: "专业商务",
              "classic-wechat": "经典微信",
              dark: "深色",
              "high-contrast": "高对比",
            }}
            onChange={(value) => setSetting("theme", value)}
          />
          <SelectRow
            {...settingRowProps("skin")}
            value={pcSettings.skin}
            options={["jade", "blue", "graphite"]}
            optionLabels={{
              jade: "翡翠绿",
              blue: "商务蓝",
              graphite: "石墨灰",
            }}
            onChange={(value) => setSetting("skin", value)}
          />
          <SelectRow
            {...settingRowProps("fontSize")}
            value={pcSettings.fontSize}
            options={["小", "标准", "大", "超大"]}
            onChange={(value) => setSetting("fontSize", value)}
          />
          <SwitchRow
            {...settingRowProps("compactList")}
            checked={pcSettings.compactList}
            onChange={(value) => setSetting("compactList", value)}
          />
          <SwitchRow
            {...settingRowProps("highDensityContext")}
            checked={pcSettings.highDensityContext}
            onChange={(value) => setSetting("highDensityContext", value)}
          />
          <SwitchRow
            {...settingRowProps("reduceMotion")}
            checked={pcSettings.reduceMotion}
            onChange={(value) => setSetting("reduceMotion", value)}
          />
          <SwitchRow
            {...settingRowProps("highContrastBoundary")}
            checked={pcSettings.highContrastBoundary}
            onChange={(value) => setSetting("highContrastBoundary", value)}
          />
          <SwitchRow
            {...settingRowProps("keyboardFocusHint")}
            checked={pcSettings.keyboardFocusHint}
            onChange={(value) => setSetting("keyboardFocusHint", value)}
          />
          <SwitchRow
            {...settingRowProps("busyDoNotDisturb")}
            checked={pcSettings.busyDoNotDisturb}
            onChange={(value) => setSetting("busyDoNotDisturb", value)}
          />
          <SwitchRow
            {...settingRowProps("afterWorkReminder")}
            checked={pcSettings.afterWorkReminder}
            onChange={(value) => setSetting("afterWorkReminder", value)}
          />
          <SwitchRow
            {...settingRowProps("shortcutHints")}
            checked={pcSettings.shortcutHints}
            onChange={(value) => setSetting("shortcutHints", value)}
          />
        </>
      );
    case "localDiagnostics":
      return (
        <>
          <ChatArchiveSection
            pcSettings={pcSettings}
            setNotice={actions.setNotice}
            setSetting={setSetting}
          />
          <DiagnosticsSettingsSection
            exportDiagnostics={actions.exportDiagnostics}
            setNotice={actions.setNotice}
          />
          <PendingSupportBlock />
        </>
      );
  }
}

function PendingSupportBlock() {
  const pendingRows = settingsRowsForSection("localDiagnostics").filter(
    (rowItem) => !rowItem.visibleInMainList,
  );

  return (
    <section className="settings-pending-support" aria-label="待支持能力">
      <div>
        <strong>待支持能力</strong>
        <p>这些能力会在后续版本接入，当前不作为可生效开关展示。</p>
      </div>
      <ul>
        {pendingRows.map((rowItem) => (
          <li key={rowItem.id}>
            <span>{rowItem.label}</span>
            <em>{rowItem.statusLabel ?? "暂未支持"}</em>
          </li>
        ))}
      </ul>
    </section>
  );
}

function ProfileSettingsSection({
  authSession,
  profile,
  profileLoading,
  profileError,
}: {
  authSession: AuthSession | null;
  profile?: UserProfileDto;
  profileLoading: boolean;
  profileError: unknown;
}) {
  const displayName = profile?.displayName || authSession?.displayName || "--";
  return (
    <>
      {profileLoading && <InlineSettingsState text="正在读取个人资料..." />}
      {profileError && (
        <InlineSettingsState
          tone="error"
          text={`个人资料加载失败：${formatError(profileError)}`}
        />
      )}
      <InfoRow label="昵称" desc={displayName} />
      <InfoRow label="LPP 号" desc={profile?.lppId || authSession?.lppId || "--"} />
      <InfoRow label="角色" desc={authSession?.roleLabel || "成员"} />
      <InfoRow label="签名" desc={profile?.signature || profile?.bio || "暂无签名"} />
      <InfoRow label="登录名" desc={profile?.loginName || "--"} />
      <InfoRow label="用户 ID" desc={profile?.userId || authSession?.userId || "--"} />
      <InfoRow label="手机号" desc={maskMobile(profile?.mobile)} />
      <InfoRow label="邮箱" desc={maskEmail(profile?.email)} />
      <InfoRow label="创建时间" desc={formatShortDate(profile?.createdAt)} />
    </>
  );
}

function maskMobile(value?: string | null) {
  if (!value) return "--";
  const normalized = value.replace(/\s+/g, "");
  if (normalized.length < 7) return value;
  return `${normalized.slice(0, 3)}****${normalized.slice(-4)}`;
}

function maskEmail(value?: string | null) {
  if (!value) return "--";
  const [name, domain] = value.split("@");
  if (!name || !domain) return value;
  const visible = name.length <= 2 ? name.slice(0, 1) : name.slice(0, 2);
  return `${visible}***@${domain}`;
}
