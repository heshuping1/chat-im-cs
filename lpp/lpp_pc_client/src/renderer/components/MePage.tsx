import { useMutation, useQuery, useQueryClient, type QueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import {
  Bell,
  Bug,
  CheckCircle2,
  ChevronRight,
  DatabaseBackup,
  Download,
  HardDrive,
  Languages,
  MessageSquareText,
  MonitorCog,
  Palette,
  Route,
  ShieldCheck,
  Trash2,
  UserRound,
} from "lucide-react";
import { pcQueryKeys } from "../data/query-keys";
import { requireApiClient } from "../data/runtime";
import type {
  BlockedUserDto,
  ProfilePrivacySettingsDto,
  UserProfileDto,
} from "../data/api-client";
import { useWorkspaceStore, type AuthSession, type PcSettings } from "../data/store";
import { formatError, formatShortDate } from "../lib/format";

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
  const pcSettings = useWorkspaceStore((state) => state.pcSettings);
  const authSession = useWorkspaceStore((state) => state.authSession);
  const clearAuthSession = useWorkspaceStore((state) => state.clearAuthSession);
  const updatePcSetting = useWorkspaceStore((state) => state.updatePcSetting);
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
    const result = await window.desktopApi?.exportDiagnostics({
      sessionId: "pc-local-session",
      traceId: `pc-${Date.now()}`,
      breadcrumbs: ["pc.open", "settings.open", "diagnostics.export"],
      errors: [],
    });
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
        <>
          <SwitchRow
            label="聊天记录本地缓存"
            desc="提升重新打开会话速度，缓存敏感信息按脱敏规则处理。"
            checked={pcSettings.localMessageCache}
            onChange={(value) => setSetting("localMessageCache", value)}
          />
          <ActionRow
            label="导出聊天记录"
            desc="按会话导出文本、图片、文件索引。"
            action="导出"
            onClick={() => actions.setNotice("聊天记录导出能力待接入")}
          />
          <ActionRow
            label="备份聊天记录"
            desc="备份到本机或后续支持的安全存储。"
            action="备份"
            onClick={() => actions.setNotice("聊天记录备份能力待接入")}
          />
          <ActionRow
            label="恢复聊天记录"
            desc="从本机备份恢复聊天记录。"
            action="恢复"
            onClick={() => actions.setNotice("聊天记录恢复能力待接入")}
          />
          <ActionRow
            label="清理本地缓存"
            desc="清理图片、文件缩略图和临时缓存，不删除服务端消息。"
            action="清理"
            onClick={() => {
              localStorage.removeItem("lpp.pc.message-cache");
              actions.setNotice("已清理本地聊天缓存");
            }}
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
    case "security":
      return <SecuritySettingsSection actions={actions} />;
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
        <>
          <ActionRow
            label="导出诊断包"
            desc="导出本地日志、traceId、接口错误和关键操作轨迹。"
            action="导出"
            icon={<Download size={15} />}
            onClick={() => void actions.exportDiagnostics()}
          />
          <ActionRow
            label="用户反馈"
            desc="提交问题、截图和诊断线索给服务端。"
            action="反馈"
            icon={<Bug size={15} />}
            onClick={() => actions.setNotice("反馈接口待接入")}
          />
          <ActionRow
            label="关于客户端"
            desc="查看版本号、构建信息和运行环境。"
            action="查看"
            icon={<HardDrive size={15} />}
            onClick={() => actions.setNotice("LPP PC 客服客户端 v0.1.0")}
          />
        </>
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

function PrivacySettingsSection({
  actions,
  pcSettings,
  setSetting,
}: {
  actions: {
    authSession: AuthSession | null;
    setNotice: (notice: string) => void;
    queryClient: QueryClient;
  };
  pcSettings: PcSettings;
  setSetting: <K extends SettingKey>(key: K, value: PcSettings[K]) => void;
}) {
  const privacyQuery = useQuery({
    queryKey: pcQueryKeys.accountPrivacy(
      actions.authSession?.apiBaseUrl,
      actions.authSession?.tenantToken,
    ),
    enabled: Boolean(actions.authSession),
    staleTime: 60_000,
    queryFn: async () => requireApiClient(actions.authSession).getPrivacySettings(),
  });
  const updatePrivacy = useMutation({
    mutationFn: async (body: Partial<ProfilePrivacySettingsDto>) =>
      requireApiClient(actions.authSession).updatePrivacySettings(body),
    onSuccess: async () => {
      await actions.queryClient.invalidateQueries({
        queryKey: pcQueryKeys.accountPrivacy(
          actions.authSession?.apiBaseUrl,
          actions.authSession?.tenantToken,
        ),
      });
      actions.setNotice("朋友权限已保存");
    },
    onError: (error) => actions.setNotice(`朋友权限保存失败：${formatError(error)}`),
  });
  const data = privacyQuery.data;
  return (
    <>
      {privacyQuery.error && (
        <InlineSettingsState
          tone="error"
          text={`朋友权限加载失败：${formatError(privacyQuery.error)}`}
        />
      )}
      <SwitchRow
        label="允许通过手机号搜索"
        desc="其他用户可通过手机号找到你。"
        checked={data?.searchableByMobile ?? pcSettings.allowMobileSearch}
        onChange={(value) => {
          setSetting("allowMobileSearch", value);
          updatePrivacy.mutate({ searchableByMobile: value });
        }}
      />
      <SwitchRow
        label="允许通过 LPP 号搜索"
        desc="其他用户可通过 LPP 号找到你。"
        checked={data?.searchableByLppId ?? pcSettings.allowLppSearch}
        onChange={(value) => {
          setSetting("allowLppSearch", value);
          updatePrivacy.mutate({ searchableByLppId: value });
        }}
      />
      <SelectRow
        label="加我为好友"
        desc="控制陌生人向你发起好友申请的范围。"
        value={friendRequestLabel(data?.allowFriendRequest, pcSettings.friendRequestVerification)}
        options={["所有人", "有共同好友的人", "不允许"]}
        onChange={(value) => {
          setSetting("friendRequestVerification", value !== "不允许");
          updatePrivacy.mutate({ allowFriendRequest: friendRequestValue(value) });
        }}
      />
      <SelectRow
        label="个人资料可见性"
        desc="控制资料页对外展示范围。"
        value={profileVisibilityLabel(data?.profileVisibility, pcSettings.profileVisibility)}
        options={["所有人", "仅好友", "不允许"]}
        onChange={(value) => {
          setSetting("profileVisibility", value);
          updatePrivacy.mutate({ profileVisibility: profileVisibilityValue(value) });
        }}
      />
      <SwitchRow
        label="敏感信息脱敏"
        desc="手机号、邮箱、证件、资金等敏感字段默认脱敏显示。"
        checked={pcSettings.sensitiveMasking}
        onChange={(value) => setSetting("sensitiveMasking", value)}
      />
      <BlacklistBlock actions={actions} />
    </>
  );
}

function BlacklistBlock({
  actions,
}: {
  actions: {
    authSession: AuthSession | null;
    setNotice: (notice: string) => void;
    queryClient: QueryClient;
  };
}) {
  const blocklistQuery = useQuery({
    queryKey: pcQueryKeys.accountBlocklist(
      actions.authSession?.apiBaseUrl,
      actions.authSession?.tenantToken,
    ),
    enabled: Boolean(actions.authSession),
    staleTime: 60_000,
    queryFn: async () => requireApiClient(actions.authSession).getBlocklist(),
  });
  const unblock = useMutation({
    mutationFn: async (blockedUserId: string) =>
      requireApiClient(actions.authSession).unblockUser(blockedUserId),
    onSuccess: async () => {
      await actions.queryClient.invalidateQueries({
        queryKey: pcQueryKeys.accountBlocklist(
          actions.authSession?.apiBaseUrl,
          actions.authSession?.tenantToken,
        ),
      });
      actions.setNotice("已移出黑名单");
    },
    onError: (error) => actions.setNotice(`移出黑名单失败：${formatError(error)}`),
  });
  const list = blocklistQuery.data ?? [];
  return (
    <div className="settings-sub-card">
      <header>
        <strong>黑名单</strong>
        <span>{list.length} 人</span>
      </header>
      {blocklistQuery.isLoading && <InlineSettingsState text="正在读取黑名单..." />}
      {blocklistQuery.error && (
        <InlineSettingsState
          tone="error"
          text={`黑名单加载失败：${formatError(blocklistQuery.error)}`}
        />
      )}
      {!blocklistQuery.isLoading && list.length === 0 && (
        <InlineSettingsState text="暂无黑名单用户" />
      )}
      {list.map((item) => (
        <div className="settings-list-row" key={item.blockedUserId}>
          <span>
            <strong>{item.displayName || item.blockedUserId}</strong>
            <em>{formatShortDate(item.createdAt)}</em>
          </span>
          <button
            type="button"
            disabled={unblock.isPending}
            onClick={() => unblock.mutate(item.blockedUserId)}
          >
            移出
          </button>
        </div>
      ))}
    </div>
  );
}

function SecuritySettingsSection({
  actions,
}: {
  actions: {
    authSession: AuthSession | null;
    setNotice: (notice: string) => void;
    clearAuthSession: () => void;
  };
}) {
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [deactivateReason, setDeactivateReason] = useState("");
  const changePassword = useMutation({
    mutationFn: async () => {
      if (!oldPassword || !newPassword) throw new Error("请输入旧密码和新密码");
      return requireApiClient(actions.authSession).changePassword({
        oldPassword,
        newPassword,
      });
    },
    onSuccess: () => {
      setOldPassword("");
      setNewPassword("");
      actions.setNotice("密码已修改");
    },
    onError: (error) => actions.setNotice(`修改密码失败：${formatError(error)}`),
  });
  const deactivate = useMutation({
    mutationFn: async () => {
      if (!verificationCode.trim()) throw new Error("请输入注销验证码");
      return requireApiClient(actions.authSession).deactivateAccount({
        verificationCode,
        reason: deactivateReason,
      });
    },
    onSuccess: () => {
      actions.setNotice("注销申请已提交，账号进入冷静期");
      actions.clearAuthSession();
    },
    onError: (error) => actions.setNotice(`注销失败：${formatError(error)}`),
  });
  return (
    <>
      <div className="settings-sub-card">
        <header>
          <strong>修改密码</strong>
          <span>账号登录密码</span>
        </header>
        <div className="settings-form-grid">
          <input
            type="password"
            value={oldPassword}
            placeholder="旧密码"
            onChange={(event) => setOldPassword(event.target.value)}
          />
          <input
            type="password"
            value={newPassword}
            placeholder="新密码"
            onChange={(event) => setNewPassword(event.target.value)}
          />
          <button
            type="button"
            disabled={changePassword.isPending}
            onClick={() => changePassword.mutate()}
          >
            {changePassword.isPending ? "提交中" : "修改密码"}
          </button>
        </div>
      </div>
      <ActionRow
        label="登录设备"
        desc="查看已登录设备并下线异常设备。"
        action="查看"
        onClick={() => actions.setNotice("登录设备列表待接入")}
      />
      <div className="settings-sub-card danger">
        <header>
          <strong>注销账户</strong>
          <span>提交后进入 7 天冷静期</span>
        </header>
        <div className="settings-form-grid">
          <input
            value={verificationCode}
            placeholder="注销验证码"
            onChange={(event) => setVerificationCode(event.target.value)}
          />
          <input
            value={deactivateReason}
            placeholder="注销原因，可选"
            onChange={(event) => setDeactivateReason(event.target.value)}
          />
          <button
            type="button"
            disabled={deactivate.isPending || !actions.authSession?.platformToken}
            onClick={() => deactivate.mutate()}
          >
            <Trash2 size={14} />
            {deactivate.isPending ? "提交中" : "申请注销"}
          </button>
        </div>
        {!actions.authSession?.platformToken && (
          <InlineSettingsState
            tone="error"
            text="当前会话缺少平台 Token，请重新登录后再注销账户。"
          />
        )}
      </div>
    </>
  );
}

function InlineSettingsState({
  text,
  tone = "muted",
}: {
  text: string;
  tone?: "muted" | "error";
}) {
  return <p className={`utility-inline-state ${tone}`}>{text}</p>;
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

function friendRequestLabel(
  value: ProfilePrivacySettingsDto["allowFriendRequest"],
  fallback: boolean,
) {
  if (value === "nobody") return "不允许";
  if (value === "friends_of_friends") return "有共同好友的人";
  if (value === "everyone") return "所有人";
  return fallback ? "所有人" : "不允许";
}

function friendRequestValue(value: string) {
  if (value === "不允许") return "nobody";
  if (value === "有共同好友的人") return "friends_of_friends";
  return "everyone";
}

function profileVisibilityLabel(
  value: ProfilePrivacySettingsDto["profileVisibility"],
  fallback: PcSettings["profileVisibility"],
) {
  if (value === "everyone") return "所有人";
  if (value === "nobody") return "不允许";
  if (value === "friends") return "仅好友";
  return fallback;
}

function profileVisibilityValue(value: string) {
  if (value === "所有人") return "everyone";
  if (value === "不允许") return "nobody";
  return "friends";
}

function SwitchRow({
  label,
  desc,
  checked,
  onChange,
}: {
  label: string;
  desc: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <button
      className="setting-detail-row"
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
    >
      <span>
        <strong>{label}</strong>
        <em>{desc}</em>
      </span>
      <span className={`setting-switch ${checked ? "on" : ""}`} aria-hidden="true">
        <i />
      </span>
    </button>
  );
}

function SelectRow<T extends string>({
  label,
  desc,
  value,
  options,
  optionLabels,
  onChange,
}: {
  label: string;
  desc: string;
  value: T;
  options: T[];
  optionLabels?: Partial<Record<T, string>>;
  onChange: (value: T) => void;
}) {
  return (
    <label className="setting-detail-row select">
      <span>
        <strong>{label}</strong>
        <em>{desc}</em>
      </span>
      <select
        aria-label={label}
        value={value}
        onChange={(event) => onChange(event.target.value as T)}
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {optionLabels?.[option] ?? option}
          </option>
        ))}
      </select>
    </label>
  );
}

function ActionRow({
  label,
  desc,
  action,
  icon,
  onClick,
}: {
  label: string;
  desc: string;
  action: string;
  icon?: ReactNode;
  onClick: () => void;
}) {
  return (
    <button className="setting-detail-row action" type="button" onClick={onClick}>
      <span>
        <strong>{label}</strong>
        <em>{desc}</em>
      </span>
      <b>
        {icon}
        {action}
        <ChevronRight size={15} />
      </b>
    </button>
  );
}

function InfoRow({ label, desc }: { label: string; desc: string }) {
  return (
    <div className="setting-detail-row info">
      <span>
        <strong>{label}</strong>
        <em>{desc}</em>
      </span>
    </div>
  );
}
