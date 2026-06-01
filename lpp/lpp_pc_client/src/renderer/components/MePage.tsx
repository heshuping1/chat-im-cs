import { useMutation, useQuery, useQueryClient, type QueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import {
  Bell,
  Building2,
  Camera,
  CheckCircle2,
  DatabaseBackup,
  Globe2,
  Headphones,
  HelpCircle,
  Keyboard,
  LockKeyhole,
  Palette,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import type { AppInstanceProfilePayload } from "../../shared/desktop-api";
import { getAppInstanceProfile } from "../data/app-instance/app-instance";
import { pcQueryKeys } from "../data/query-keys";
import { requireApiClient } from "../data/runtime";
import type { TenantInfoDto, UserProfileDto } from "../data/api-client";
import type { AuthSession } from "../data/auth/auth-session";
import { useAuthSession, useClearAuthSession, useSetAuthSession } from "../data/auth/auth-store";
import type { PcSettings } from "../data/settings/pc-settings";
import { usePcSettings, useUpdatePcSetting } from "../data/settings/settings-store";
import { formatError, formatShortDate } from "../lib/format";
import { PcAvatar } from "./PcAvatar";
import { exportCurrentDiagnosticsPackage } from "../settings/runtime/diagnosticsExport";
import {
  ActionRow,
  InfoRow,
  InlineSettingsState,
  SelectRow,
  SwitchRow,
} from "../settings/components/SettingsRows";
import {
  settingRowProps,
  settingsSections,
  settingsRowsForSection,
  type SettingsRowCatalog,
  type SettingsSectionId,
} from "../settings/models/settingsCatalog";
import { AccountSecuritySection } from "../settings/components/AccountSecuritySection";
import { ChatArchiveSection } from "../settings/components/ChatArchiveSection";
import { DiagnosticsSettingsSection } from "../settings/components/DiagnosticsSettingsSection";
import { HelpAboutSettingsSection } from "../settings/components/HelpAboutSettingsSection";
import { NetworkLineSettingsSection } from "../settings/components/NetworkLineSettingsSection";
import { NotificationSettingsSection } from "../settings/components/NotificationSettingsSection";
import { PrivacySettingsSection } from "./MePrivacySections";

type SettingKey = keyof PcSettings;

const sectionIcons = {
  accountEnterprise: UserRound,
  privacySecurity: ShieldCheck,
  messageReception: Headphones,
  chatCollaboration: Keyboard,
  appearanceEfficiency: Palette,
  generalNetwork: Globe2,
  storageDiagnostics: DatabaseBackup,
  helpAbout: HelpCircle,
} satisfies Record<SettingsSectionId, typeof Bell>;

export function MePage() {
  const queryClient = useQueryClient();
  const pcSettings = usePcSettings();
  const authSession = useAuthSession();
  const clearAuthSession = useClearAuthSession();
  const setAuthSession = useSetAuthSession();
  const updatePcSetting = useUpdatePcSetting();
  const [activeSectionId, setActiveSectionId] =
    useState<SettingsSectionId>("accountEnterprise");
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
  const tenantInfoQuery = useQuery({
    queryKey: pcQueryKeys.accountTenant(authSession?.apiBaseUrl, authSession?.tenantToken),
    enabled: Boolean(authSession),
    staleTime: 60_000,
    queryFn: async () => requireApiClient(authSession).getTenantInfo(),
  });

  return (
    <main className="module-page me-page settings-page-v2">
      <aside className="settings-nav" aria-label="设置分组">
        <div className="settings-nav-header">
          <span className="settings-nav-kicker">SETTINGS</span>
          <strong>设置中心</strong>
          <p>按客服真实工作心智组织账号、安全、接待、协作、网络和诊断。</p>
        </div>
        <div className="settings-nav-list">
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
        </div>
      </aside>

      <section className="settings-main">
        <section className="settings-hero-panel settings-hero-compact">
          <div>
            <span className="eyebrow">PC 客服客户端</span>
            <h1>设置中心</h1>
            <p>
              按账号身份、隐私安全、消息接待、聊天协作、网络诊断和帮助关于管理 PC 客服工作环境。
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
              tenantInfo: tenantInfoQuery.data,
              profileLoading: profileQuery.isLoading,
              profileError: profileQuery.error,
              queryClient,
              clearAuthSession,
              setAuthSession,
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
    tenantInfo?: TenantInfoDto;
    profileLoading: boolean;
    profileError: unknown;
    queryClient: QueryClient;
    clearAuthSession: () => void;
    setAuthSession: (session: AuthSession) => void;
  },
) {
  switch (section) {
    case "accountEnterprise":
      return (
        <>
          <ProfileSettingsSection {...actions} />
          <EnterpriseIdentitySection
            authSession={actions.authSession}
            tenantInfo={actions.tenantInfo}
          />
          <AccountSecuritySection
            authSession={actions.authSession}
            clearAuthSession={actions.clearAuthSession}
            setNotice={actions.setNotice}
          />
          <PlanningSupportBlock sectionId={section} />
        </>
      );
    case "privacySecurity":
      return (
        <>
          <PrivacySettingsSection
            actions={actions}
            pcSettings={pcSettings}
            setSetting={setSetting}
          />
          <PlanningSupportBlock sectionId={section} />
        </>
      );
    case "messageReception":
      return (
        <>
          <NotificationSettingsSection
            authSession={actions.authSession}
            pcSettings={pcSettings}
            setNotice={actions.setNotice}
            setSetting={setSetting}
          />
          <PlanningSupportBlock sectionId={section} />
        </>
      );
    case "chatCollaboration":
      return (
        <>
          <SwitchRow
            {...settingRowProps("enterToSend")}
            checked={pcSettings.enterToSend}
            onChange={(value) => setSetting("enterToSend", value)}
          />
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
            {...settingRowProps("shortcutHints")}
            checked={pcSettings.shortcutHints}
            onChange={(value) => setSetting("shortcutHints", value)}
          />
          <ChatArchiveSection
            pcSettings={pcSettings}
            setNotice={actions.setNotice}
            setSetting={setSetting}
          />
          <PlanningSupportBlock sectionId={section} />
        </>
      );
    case "appearanceEfficiency":
      return (
        <>
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
          <AppProfileInfoRow />
          <PlanningSupportBlock sectionId={section} />
        </>
      );
    case "generalNetwork":
      return (
        <>
          <InfoRow {...settingRowProps("language")} desc={pcSettings.language} />
          <InfoRow {...settingRowProps("timezone")} desc={pcSettings.timezone} />
          <InfoRow
            {...settingRowProps("currentEnvironment")}
            desc={formatEnvironment(actions.authSession?.apiBaseUrl)}
          />
          <NetworkLineSettingsSection
            authSession={actions.authSession}
            queryClient={actions.queryClient}
            setNotice={actions.setNotice}
          />
          <InfoRow
            {...settingRowProps("autoReconnect")}
            desc={pcSettings.autoReconnect ? "已启用，网络恢复后自动重连接口和实时消息。" : "已关闭。"}
          />
          <InfoRow
            {...settingRowProps("weakNetworkDiagnostics")}
            desc={pcSettings.weakNetworkDiagnostics ? "已记录弱网线索，可随诊断包导出。" : "未记录弱网线索。"}
          />
          <PlanningSupportBlock sectionId={section} />
        </>
      );
    case "storageDiagnostics":
      return (
        <>
          <ActionRow
            {...settingRowProps("clearLocalCache")}
            action="清理"
            onClick={() => {
              localStorage.removeItem("lpp.pc.message-cache");
              actions.setNotice("已清理聊天缓存");
            }}
          />
          <DiagnosticsSettingsSection
            exportDiagnostics={actions.exportDiagnostics}
          />
          {shouldShowDevelopmentDiagnostics(actions.authSession) && (
            <DevelopmentDiagnosticsSection authSession={actions.authSession} />
          )}
          <PlanningSupportBlock sectionId={section} />
        </>
      );
    case "helpAbout":
      return (
        <HelpAboutSettingsSection
          authSession={actions.authSession}
          setNotice={actions.setNotice}
        />
      );
  }
}

function PlanningSupportBlock({ sectionId }: { sectionId: SettingsSectionId }) {
  const plannedRows = settingsRowsForSection(sectionId).filter(
    (rowItem) => !rowItem.visibleInMainList,
  );
  if (!plannedRows.length) return null;

  return (
    <section className="settings-pending-support" aria-label="规划能力">
      <div>
        <strong>规划能力</strong>
        <p>这些能力已有明确产品位置和接入条件，暂不伪装成可生效开关。</p>
      </div>
      <div className="settings-plan-grid">
        {plannedRows.map((rowItem) => (
          <PlanningCapabilityCard key={rowItem.id} rowItem={rowItem} />
        ))}
      </div>
    </section>
  );
}

function PlanningCapabilityCard({ rowItem }: { rowItem: SettingsRowCatalog }) {
  return (
    <article className="settings-plan-card">
      <header>
        <strong>{rowItem.label}</strong>
        <em>{rowItem.statusLabel ?? "计划接入"}</em>
      </header>
      <p>{rowItem.desc}</p>
      <dl>
        <div>
          <dt>价值</dt>
          <dd>{rowItem.productValue ?? "完善 PC 客服端设置能力。"}</dd>
        </div>
        <div>
          <dt>依赖</dt>
          <dd>{rowItem.dependency ?? "需要补齐产品、接口或桌面端基础能力。"}</dd>
        </div>
        <div>
          <dt>下一步</dt>
          <dd>{rowItem.nextAction ?? "完成依赖拆分后接入。"}</dd>
        </div>
      </dl>
    </article>
  );
}

function ProfileSettingsSection({
  authSession,
  profile,
  profileLoading,
  profileError,
  queryClient,
  setAuthSession,
  setNotice,
}: {
  authSession: AuthSession | null;
  profile?: UserProfileDto;
  profileLoading: boolean;
  profileError: unknown;
  queryClient: QueryClient;
  setAuthSession: (session: AuthSession) => void;
  setNotice: (notice: string) => void;
}) {
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreviewUrl, setAvatarPreviewUrl] = useState("");
  const displayName = profile?.displayName || authSession?.displayName || "--";
  const avatarUrl = avatarPreviewUrl || profile?.avatarUrl || authSession?.avatarUrl;
  const updateAvatar = useMutation({
    mutationFn: async (file: File) => {
      const client = requireApiClient(authSession);
      const uploaded = await client.uploadMedia(file, "image");
      const nextAvatarUrl = uploadedAvatarUrl(uploaded);
      if (!nextAvatarUrl) throw new Error("头像上传成功，但服务端未返回图片地址");
      await client.updateMyProfile({ avatarUrl: nextAvatarUrl });
      const updatedProfile = await client.getMyProfile();
      const confirmedAvatarUrl = normalizeAvatarUrl(updatedProfile.avatarUrl);
      const previousAvatarUrl = normalizeAvatarUrl(profile?.avatarUrl || authSession?.avatarUrl);
      if (!confirmedAvatarUrl) {
        throw new Error("头像已上传，但服务端个人资料未返回头像地址");
      }
      if (
        previousAvatarUrl &&
        !sameAvatarResource(nextAvatarUrl, previousAvatarUrl) &&
        sameAvatarResource(confirmedAvatarUrl, previousAvatarUrl)
      ) {
        throw new Error("头像已上传，但服务端个人资料未写入新头像");
      }
      const refreshedAvatarUrl = avatarUrlWithCacheBuster(confirmedAvatarUrl);
      return {
        avatarUrl: refreshedAvatarUrl,
        profile: {
          ...updatedProfile,
          avatarUrl: refreshedAvatarUrl,
        },
      };
    },
    onSuccess: async ({ avatarUrl: nextAvatarUrl, profile: updatedProfile }) => {
      setAvatarFile(null);
      queryClient.setQueryData(
        pcQueryKeys.accountProfile(authSession?.apiBaseUrl, authSession?.tenantToken),
        updatedProfile,
      );
      await queryClient.invalidateQueries({
        queryKey: pcQueryKeys.accountProfile(
          authSession?.apiBaseUrl,
          authSession?.tenantToken,
        ),
      });
      if (authSession) {
        setAuthSession({
          ...authSession,
          avatarUrl: nextAvatarUrl,
          displayName: updatedProfile.displayName || authSession.displayName,
          lppId: updatedProfile.lppId ?? authSession.lppId,
          userId: updatedProfile.userId ?? authSession.userId,
          platformUserId: updatedProfile.platformUserId ?? authSession.platformUserId,
          userType: updatedProfile.userType ?? authSession.userType,
        });
      }
      setNotice("头像已更新");
    },
    onError: (error) => setNotice(`头像更新失败：${formatError(error)}`),
  });

  useEffect(() => {
    if (!avatarFile) {
      setAvatarPreviewUrl("");
      return;
    }
    const objectUrl = URL.createObjectURL(avatarFile);
    setAvatarPreviewUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [avatarFile]);

  const handleAvatarFileChange = (file?: File) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setNotice("请选择图片文件作为头像");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setNotice("头像图片不能超过 5 MB");
      return;
    }
    setAvatarFile(file);
    setNotice("已选择头像，点击保存后生效");
  };

  return (
    <>
      {profileLoading && <InlineSettingsState text="正在读取个人资料..." />}
      {profileError && (
        <InlineSettingsState
          tone="error"
          text={`个人资料加载失败：${formatError(profileError)}`}
        />
      )}
      <div className="settings-sub-card settings-avatar-card">
        <header>
          <strong>个人头像</strong>
          <span className="settings-sub-card-meta">
            <Camera size={14} />
            <em>JPG、PNG、WebP，最大 5 MB</em>
          </span>
        </header>
        <div className="settings-avatar-editor">
          <PcAvatar
            avatarUrl={avatarUrl}
            className="settings-profile-avatar"
            name={displayName}
          />
          <div className="settings-avatar-actions">
            <strong>{displayName}</strong>
            <em>{avatarFile ? avatarFile.name : "当前头像会同步到会话、联系人和侧边栏展示。"}</em>
            <div>
              <label className="settings-avatar-upload-button">
                <input
                  accept="image/*"
                  type="file"
                  onChange={(event) => {
                    handleAvatarFileChange(event.currentTarget.files?.[0]);
                    event.currentTarget.value = "";
                  }}
                />
                选择图片
              </label>
              <button
                type="button"
                disabled={!avatarFile || updateAvatar.isPending || !authSession}
                onClick={() => {
                  if (avatarFile) updateAvatar.mutate(avatarFile);
                }}
              >
                {updateAvatar.isPending ? "保存中" : "保存头像"}
              </button>
              {avatarFile && (
                <button
                  type="button"
                  disabled={updateAvatar.isPending}
                  onClick={() => {
                    setAvatarFile(null);
                    setNotice("已取消头像更改");
                  }}
                >
                  取消
                </button>
              )}
            </div>
          </div>
        </div>
        {!authSession && (
          <InlineSettingsState tone="error" text="登录状态已失效，请重新登录后设置头像。" />
        )}
      </div>
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

function uploadedAvatarUrl(uploaded: { thumbnailUrl?: string; url?: string }) {
  const record = uploaded as Record<string, unknown>;
  for (const key of ["url", "fileUrl", "thumbnailUrl", "downloadUrl"]) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return "";
}

function normalizeAvatarUrl(value?: string | null) {
  return typeof value === "string" ? value.trim() : "";
}

function sameAvatarResource(left?: string | null, right?: string | null) {
  const leftUrl = stripAvatarCacheBuster(normalizeAvatarUrl(left));
  const rightUrl = stripAvatarCacheBuster(normalizeAvatarUrl(right));
  return Boolean(leftUrl && rightUrl && leftUrl === rightUrl);
}

function stripAvatarCacheBuster(value: string) {
  if (!value) return "";
  try {
    const url = new URL(value, "https://avatar.local");
    url.searchParams.delete("_v");
    return url.pathname + url.search + url.hash;
  } catch {
    return value.replace(/([?&])_v=\d+(&?)/, (_match, prefix, suffix) =>
      suffix ? prefix : "",
    );
  }
}

function avatarUrlWithCacheBuster(value: string) {
  if (!value || /^(blob:|data:)/i.test(value)) return value;
  const separator = value.includes("?") ? "&" : "?";
  return `${value}${separator}_v=${Date.now()}`;
}

function EnterpriseIdentitySection({
  authSession,
  tenantInfo,
}: {
  authSession: AuthSession | null;
  tenantInfo?: TenantInfoDto;
}) {
  const tenantCode = tenantInfo?.tenantCode || authSession?.tenantCode || "mouse-corp";
  const tenantName = tenantInfo?.tenantName || authSession?.tenantName || "mouse_corp";
  return (
    <div className="settings-sub-card">
      <header>
        <strong>当前企业</strong>
        <span className="settings-sub-card-meta">
          <Building2 size={14} />
          <em>{tenantCode}</em>
        </span>
      </header>
      <InfoRow
        {...settingRowProps("enterpriseIdentity")}
        desc={`${tenantName} / 企业号 ${tenantCode} / ${authSession?.roleLabel || "成员"}`}
      />
    </div>
  );
}

function AppProfileInfoRow() {
  const [profile, setProfile] = useState<AppInstanceProfilePayload | null>(null);

  useEffect(() => {
    void getAppInstanceProfile().then(setProfile).catch(() => setProfile(null));
  }, []);

  return (
    <InfoRow
      {...settingRowProps("multiProfileIndicator")}
      desc={
        profile
          ? `${profile.profileName} / ${profile.clientInstanceId.slice(0, 8)}`
          : "正在读取当前窗口 profile..."
      }
    />
  );
}

function DevelopmentDiagnosticsSection({ authSession }: { authSession: AuthSession | null }) {
  const [version, setVersion] = useState("浏览器调试");
  const [profile, setProfile] = useState<AppInstanceProfilePayload | null>(null);

  useEffect(() => {
    void window.desktopApi?.getAppVersion?.().then(setVersion).catch(() => setVersion("未知版本"));
    void getAppInstanceProfile().then(setProfile).catch(() => setProfile(null));
  }, []);

  const diagnosticsCount =
    (window.__lppSettingsDiagnostics?.length ?? 0) +
    (window.__lppGatewayDiagnostics?.length ?? 0) +
    (window.__lppApiErrorDiagnostics?.length ?? 0) +
    (window.__lppMessageCenterDiagnostics?.length ?? 0);

  return (
    <div className="settings-sub-card settings-dev-diagnostics">
      <header>
        <strong>开发诊断</strong>
        <span className="settings-sub-card-meta">
          <LockKeyhole size={14} />
          <em>仅开发/测试环境显示</em>
        </span>
      </header>
      <InfoRow {...settingRowProps("developmentDiagnostics")} desc="诊断信息默认脱敏，不展示密码、token、Authorization、Cookie 或完整手机号。" />
      <InfoRow label="当前环境" desc={import.meta.env.DEV ? "开发/测试运行" : "测试连接或内部开关"} />
      <InfoRow label="版本" desc={version} />
      <InfoRow label="API 地址" desc={formatEnvironment(authSession?.apiBaseUrl)} />
      <InfoRow label="实时连接" desc="随诊断包采集 WebSocket 与消息网关状态。" />
      <InfoRow
        label="Profile"
        desc={profile ? `${profile.profileName} / ${profile.deviceId.slice(0, 8)}` : "浏览器调试"}
      />
      <InfoRow label="最近诊断记录" desc={`${diagnosticsCount} 条，可导出诊断包给研发定位。`} />
    </div>
  );
}

function shouldShowDevelopmentDiagnostics(authSession: AuthSession | null) {
  if (import.meta.env.DEV) return true;
  if (typeof window !== "undefined" && window.localStorage.getItem("lpp.devDiagnostics") === "1") {
    return true;
  }
  return /(?:localhost|127\.0\.0\.1|test|dev|staging|qa)/i.test(authSession?.apiBaseUrl ?? "");
}

function formatEnvironment(value?: string | null) {
  if (!value) return "当前代码默认测试环境";
  try {
    const url = new URL(value);
    return `${url.origin}（已隐藏 token、Authorization、Cookie）`;
  } catch {
    return "当前连接环境（已隐藏敏感信息）";
  }
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
