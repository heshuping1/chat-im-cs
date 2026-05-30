import { useQuery, useQueryClient, type QueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import {
  Bell,
  CheckCircle2,
  DatabaseBackup,
  HardDrive,
  Languages,
  MessageSquareText,
  MonitorCog,
  Palette,
  Route,
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
  ActionRow,
  InfoRow,
  InlineSettingsState,
  SelectRow,
  SwitchRow,
} from "../settings/components/SettingsRows";
import { AccountSecuritySection } from "../settings/components/AccountSecuritySection";
import { ChatArchiveSection } from "../settings/components/ChatArchiveSection";
import { DiagnosticsSettingsSection } from "../settings/components/DiagnosticsSettingsSection";
import { PrivacySettingsSection } from "./MePrivacySections";

type SettingKey = keyof PcSettings;
type SectionId =
  | "profile"
  | "notifications"
  | "desktop"
  | "display"
  | "language"
  | "chat"
  | "chatHistory"
  | "privacy"
  | "security"
  | "network"
  | "diagnostics";

const settingSections = [
  {
    id: "profile",
    title: "个人资料",
    desc: "头像、昵称、LPP 号、角色、签名和账号信息。",
    icon: UserRound,
  },
  {
    id: "notifications",
    title: "通知提醒",
    desc: "IM、在线客服、SLA 和桌面系统通知。",
    icon: Bell,
  },
  {
    id: "desktop",
    title: "桌面能力",
    desc: "托盘、开机自启、自动重连等 PC 专属体验。",
    icon: MonitorCog,
  },
  {
    id: "display",
    title: "外观显示",
    desc: "字号、列表密度、上下文密度和可访问性。",
    icon: Palette,
  },
  {
    id: "language",
    title: "语言与区域",
    desc: "界面语言、时区和时间展示口径。",
    icon: Languages,
  },
  {
    id: "chat",
    title: "聊天偏好",
    desc: "拖拽上传、自动翻译和快捷提示。",
    icon: MessageSquareText,
  },
  {
    id: "chatHistory",
    title: "聊天记录管理",
    desc: "本地缓存、导出、备份、恢复和清理。",
    icon: DatabaseBackup,
  },
  {
    id: "privacy",
    title: "朋友权限",
    desc: "搜索权限、好友验证、个人资料可见性和黑名单。",
    icon: ShieldCheck,
  },
  {
    id: "security",
    title: "账号安全",
    desc: "修改密码、登录设备和注销账户。",
    icon: HardDrive,
  },
  {
    id: "network",
    title: "网络与线路",
    desc: "线路选择、弱网提示和连接诊断。",
    icon: Route,
  },
  {
    id: "diagnostics",
    title: "诊断与支持",
    desc: "诊断包、反馈、关于和版本信息。",
    icon: DatabaseBackup,
  },
] satisfies Array<{
  id: SectionId;
  title: string;
  desc: string;
  icon: typeof Bell;
}>;

export function MePage() {
  const queryClient = useQueryClient();
  const pcSettings = usePcSettings();
  const authSession = useAuthSession();
  const clearAuthSession = useClearAuthSession();
  const updatePcSetting = useUpdatePcSetting();
  const [activeSectionId, setActiveSectionId] =
    useState<SectionId>("profile");
  const [notice, setNotice] = useState("设置会自动保存在本机");
  const activeSection = useMemo(
    () =>
      settingSections.find((section) => section.id === activeSectionId) ??
      settingSections[0],
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

  const ActiveIcon = activeSection.icon;
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
          <strong>系统设置</strong>
          <p>个人资料、提醒、显示、安全和诊断</p>
        </div>
        {settingSections.map((section) => {
          const Icon = section.icon;
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
            <h1>系统设置</h1>
            <p>
              个人资料、聊天、朋友权限、黑名单和账号安全按 App 功能归属完整呈现。
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
  section: SectionId,
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
    case "profile":
      return <ProfileSettingsSection {...actions} />;
    case "notifications":
      return (
        <>
          <SwitchRow
            label="IM 消息通知"
            desc="好友、群聊和系统通知进入消息入口。"
            checked={pcSettings.imNotifications}
            onChange={(value) => setSetting("imNotifications", value)}
          />
          <SwitchRow
            label="在线客服排队提醒"
            desc="有访客排队、待接入时提醒客服。"
            checked={pcSettings.serviceQueueNotifications}
            onChange={(value) => setSetting("serviceQueueNotifications", value)}
          />
          <SwitchRow
            label="SLA 超时提醒"
            desc="会话接近超时或已经超时时提醒。"
            checked={pcSettings.slaTimeoutNotifications}
            onChange={(value) => setSetting("slaTimeoutNotifications", value)}
          />
          <SwitchRow
            label="桌面系统通知"
            desc="允许 Windows 通知中心展示消息和客服提醒。"
            checked={pcSettings.desktopNotifications}
            onChange={(value) => setSetting("desktopNotifications", value)}
          />
        </>
      );
    case "desktop":
      return (
        <>
          <SwitchRow
            label="最小化到托盘"
            desc="关闭窗口时保留后台在线。"
            checked={pcSettings.minimizeToTray}
            onChange={(value) => setSetting("minimizeToTray", value)}
          />
          <SwitchRow
            label="开机自启"
            desc="登录系统后自动启动 PC 客户端。"
            checked={pcSettings.launchAtStartup}
            onChange={(value) => setSetting("launchAtStartup", value)}
          />
          <SwitchRow
            label="断线自动重连"
            desc="网络恢复后自动重连 Gateway 和接口。"
            checked={pcSettings.autoReconnect}
            onChange={(value) => setSetting("autoReconnect", value)}
          />
        </>
      );
    case "display":
      return (
        <>
          <SwitchRow
            label="紧凑列表"
            desc="减少会话列表行高，提高 PC 信息密度。"
            checked={pcSettings.compactList}
            onChange={(value) => setSetting("compactList", value)}
          />
          <SelectRow
            label="字号"
            desc="调整会话、聊天、资料面板的基础字号。"
            value={pcSettings.fontSize}
            options={["小", "标准", "大", "超大"]}
            onChange={(value) => setSetting("fontSize", value)}
          />
          <SelectRow
            label="主题"
            desc="切换整套颜色、边界和管理端视觉基调。"
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
            label="皮肤"
            desc="在当前主题下调整主色，不改变信息架构。"
            value={pcSettings.skin}
            options={["jade", "blue", "graphite"]}
            optionLabels={{
              jade: "翡翠绿",
              blue: "商务蓝",
              graphite: "石墨灰",
            }}
            onChange={(value) => setSetting("skin", value)}
          />
          <SwitchRow
            label="高密度客户上下文"
            desc="右侧资料面板以更紧凑的行距展示。"
            checked={pcSettings.highDensityContext}
            onChange={(value) => setSetting("highDensityContext", value)}
          />
          <SwitchRow
            label="减少动效"
            desc="降低弹层、列表和按钮过渡动画。"
            checked={pcSettings.reduceMotion}
            onChange={(value) => setSetting("reduceMotion", value)}
          />
          <SwitchRow
            label="高对比度边界"
            desc="增强边框和分隔线，适合长时间办公。"
            checked={pcSettings.highContrastBoundary}
            onChange={(value) => setSetting("highContrastBoundary", value)}
          />
          <SwitchRow
            label="键盘焦点提示"
            desc="Tab 操作时显示更清晰的焦点状态。"
            checked={pcSettings.keyboardFocusHint}
            onChange={(value) => setSetting("keyboardFocusHint", value)}
          />
        </>
      );
    case "language":
      return (
        <>
          <SelectRow
            label="界面语言"
            desc="PC 客户端菜单和界面文案语言。"
            value={pcSettings.language}
            options={["简体中文", "English", "العربية"]}
            onChange={(value) => setSetting("language", value)}
          />
          <SelectRow
            label="时区"
            desc="统一聊天时间、客服 SLA、历史会话和报表时间。"
            value={pcSettings.timezone}
            options={["系统默认", "Asia/Shanghai", "UTC"]}
            onChange={(value) => setSetting("timezone", value)}
          />
        </>
      );
    case "chat":
      return (
        <>
          <SelectRow
            label="截图快捷键"
            desc="在聊天输入区快速截取当前屏幕并作为图片待发送。"
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
            label="文件拖拽上传"
            desc="把图片或文件拖进输入区即可发送。"
            checked={pcSettings.dragUpload}
            onChange={(value) => setSetting("dragUpload", value)}
          />
          <SwitchRow
            label="自动翻译"
            desc="进入跨语言会话时自动展示译文。"
            checked={pcSettings.autoTranslate}
            onChange={(value) => setSetting("autoTranslate", value)}
          />
          <SwitchRow
            label="忙碌时免打扰"
            desc="IM 状态为忙碌时减少非紧急提醒。"
            checked={pcSettings.busyDoNotDisturb}
            onChange={(value) => setSetting("busyDoNotDisturb", value)}
          />
          <SwitchRow
            label="下班后提醒"
            desc="非工作时间收到重要消息时给出额外提醒。"
            checked={pcSettings.afterWorkReminder}
            onChange={(value) => setSetting("afterWorkReminder", value)}
          />
          <SwitchRow
            label="快捷键提示"
            desc="在输入区和工具按钮上显示快捷键提示。"
            checked={pcSettings.shortcutHints}
            onChange={(value) => setSetting("shortcutHints", value)}
          />
        </>
      );
    case "chatHistory":
      return (
        <ChatArchiveSection
          pcSettings={pcSettings}
          setNotice={actions.setNotice}
          setSetting={setSetting}
        />
      );
    case "privacy":
      return (
        <PrivacySettingsSection
          actions={actions}
          pcSettings={pcSettings}
          setSetting={setSetting}
        />
      );
    case "security":
      return (
        <AccountSecuritySection
          authSession={actions.authSession}
          clearAuthSession={actions.clearAuthSession}
          setNotice={actions.setNotice}
        />
      );
    case "network":
      return (
        <>
          <SelectRow
            label="当前线路"
            desc="按线路切换规则自动或手动选择可用站点。"
            value={pcSettings.activeLine}
            options={["自动选择", "主站", "香港线路", "新加坡线路"]}
            onChange={(value) => setSetting("activeLine", value)}
          />
          <SwitchRow
            label="断线重连提示"
            desc="弱网、断线、重连中、重连成功均给出轻提示。"
            checked={pcSettings.weakNetworkDiagnostics}
            onChange={(value) => setSetting("weakNetworkDiagnostics", value)}
          />
          <ActionRow
            label="弱网诊断"
            desc="检测接口延迟、Gateway 连接和最近失败请求。"
            action="检测"
            onClick={() => actions.setNotice("已开始弱网诊断")}
          />
        </>
      );
    case "diagnostics":
      return (
        <DiagnosticsSettingsSection
          exportDiagnostics={actions.exportDiagnostics}
          setNotice={actions.setNotice}
        />
      );
  }
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
