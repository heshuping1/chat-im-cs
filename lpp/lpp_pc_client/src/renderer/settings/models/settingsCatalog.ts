export type SettingsSectionId =
  | "identity"
  | "privacy"
  | "notifications"
  | "workspace"
  | "localDiagnostics";

export type SettingSource = "local" | "account" | "enterprise" | "system";
export type SettingCapability = "active" | "pending" | "recordOnly" | "readonly";
export type SettingControl = "switch" | "select" | "action" | "info";

export interface SettingSourceMeta {
  label: string;
  effect: string;
  desc: string;
}

export interface SettingsSectionCatalog {
  id: SettingsSectionId;
  title: string;
  desc: string;
  sources: SettingSource[];
}

export interface SettingsRowCatalog {
  id: string;
  sectionId: SettingsSectionId;
  label: string;
  desc: string;
  source: SettingSource;
  control: SettingControl;
  capability: SettingCapability;
  enabled: boolean;
  statusLabel?: string;
  visibleInMainList: boolean;
  disabledReason?: string;
}

export type SettingsRowPresentation = Pick<
  SettingsRowCatalog,
  | "label"
  | "desc"
  | "source"
  | "capability"
  | "enabled"
  | "statusLabel"
  | "visibleInMainList"
  | "disabledReason"
>;

export const settingSourceMeta: Record<SettingSource, SettingSourceMeta> = {
  local: {
    label: "local",
    effect: "local-only",
    desc: "Stored with PC preferences and applied by the current client runtime.",
  },
  account: {
    label: "account",
    effect: "account-synced",
    desc: "Saved by account APIs and invalidated through existing account queries.",
  },
  enterprise: {
    label: "enterprise",
    effect: "enterprise-managed",
    desc: "Reserved for organization policy or administrator-controlled settings.",
  },
  system: {
    label: "system",
    effect: "requires-system-support",
    desc: "Requires a dedicated desktop capability before it can be enabled.",
  },
};

export const settingsSections = [
  {
    id: "identity",
    title: "账号与身份",
    desc: "个人资料、登录身份、账号安全和注销。",
    sources: ["account"],
  },
  {
    id: "privacy",
    title: "隐私与好友",
    desc: "搜索权限、加好友权限、资料可见性和黑名单。",
    sources: ["account", "local"],
  },
  {
    id: "notifications",
    title: "消息与客服提醒",
    desc: "IM、好友申请、在线客服排队、SLA 和桌面通知。",
    sources: ["local"],
  },
  {
    id: "workspace",
    title: "聊天与工作台",
    desc: "输入区、截图、外观、密度和长时间办公辅助。",
    sources: ["local"],
  },
  {
    id: "localDiagnostics",
    title: "诊断与缓存",
    desc: "缓存、诊断包、版本信息和待支持能力。",
    sources: ["local", "system", "enterprise"],
  },
] satisfies SettingsSectionCatalog[];

export const settingsRows = [
  row("profile", "identity", "账号资料", "展示昵称、LPP 号、手机号、邮箱和创建时间。", "account", "info"),
  row("changePassword", "identity", "修改密码", "校验旧密码后更新账号登录密码。", "account", "action"),
  row("loginDevices", "identity", "登录设备", "查看已登录设备并下线异常设备。", "account", "action", "pending", false, "当前版本暂未支持登录设备管理。"),
  row("deactivateAccount", "identity", "注销账户", "提交验证码后进入账号注销冷静期。", "account", "action"),

  row("allowMobileSearch", "privacy", "允许通过手机号搜索", "其他用户可通过手机号找到你。", "account", "switch"),
  row("allowLppSearch", "privacy", "允许通过 LPP 号搜索", "其他用户可通过 LPP 号找到你。", "account", "switch"),
  row("friendRequestVerification", "privacy", "加我为好友", "控制陌生人向你发起好友申请的范围。", "account", "select"),
  row("profileVisibility", "privacy", "个人资料可见性", "控制资料页对外展示范围。", "account", "select"),
  row("sensitiveMasking", "privacy", "敏感信息脱敏", "手机号、邮箱、证件、资金等敏感字段默认脱敏显示。", "local", "switch"),
  row("blocklist", "privacy", "黑名单", "查看黑名单列表，移出后对方可恢复互动。", "account", "action"),

  row("imNotifications", "notifications", "IM 消息通知", "好友、群聊、系统通知和好友申请进入消息提醒。", "local", "switch"),
  row("friendRequestNotifications", "notifications", "好友申请提醒", "新的好友申请跟随 IM 消息通知策略，不单独新增设置项。", "local", "info"),
  row("serviceQueueNotifications", "notifications", "在线客服排队提醒", "有访客排队、待接入时提醒客服。", "local", "switch"),
  row("slaTimeoutNotifications", "notifications", "SLA 超时提醒", "会话接近超时或已经超时时提醒。", "local", "switch"),
  row("desktopNotifications", "notifications", "桌面系统通知", "允许系统通知中心展示 IM 和客服提醒。", "local", "switch"),

  row("screenshotShortcut", "workspace", "截图快捷键", "在聊天输入区快速截屏并作为图片待发送。", "local", "select"),
  row("dragUpload", "workspace", "文件拖拽上传", "把图片或文件拖进输入区即可发送。", "local", "switch"),
  row("autoTranslate", "workspace", "自动翻译", "进入跨语言会话时自动展示译文。", "local", "switch"),
  row("theme", "workspace", "主题", "切换整套颜色、边界和管理端视觉基调。", "local", "select"),
  row("skin", "workspace", "皮肤", "在当前主题下调整主色，不改变信息架构。", "local", "select"),
  row("fontSize", "workspace", "字号", "调整会话、聊天、资料面板的基础字号。", "local", "select"),
  row("compactList", "workspace", "紧凑列表", "减少会话列表行高，提高 PC 信息密度。", "local", "switch"),
  row("highDensityContext", "workspace", "高密度客户上下文", "右侧资料面板以更紧凑的行距展示。", "local", "switch"),
  row("reduceMotion", "workspace", "减少动效", "降低弹层、列表和按钮过渡动画。", "local", "switch"),
  row("highContrastBoundary", "workspace", "高对比度边界", "增强边框和分隔线，适合长时间办公。", "local", "switch"),
  row("keyboardFocusHint", "workspace", "键盘焦点提示", "Tab 操作时显示更清晰的焦点状态。", "local", "switch"),
  row("busyDoNotDisturb", "workspace", "忙碌时免打扰", "IM 状态为忙碌时减少非紧急提醒。", "local", "switch"),
  row("afterWorkReminder", "workspace", "下班后提醒", "非工作时间收到重要消息时给出额外提醒。", "local", "switch"),
  row("shortcutHints", "workspace", "快捷键提示", "在输入区和工具按钮上显示快捷键提示。", "local", "switch"),

  row("localMessageCache", "localDiagnostics", "聊天记录缓存", "提升重新打开会话速度，缓存敏感信息按脱敏规则处理。", "local", "switch"),
  row("chatExport", "localDiagnostics", "导出聊天记录", "按会话导出文本、图片、文件索引。", "local", "action", "pending", false, "当前版本暂未支持聊天记录导出。"),
  row("chatBackup", "localDiagnostics", "备份聊天记录", "备份聊天记录到后续支持的安全存储。", "system", "action", "pending", false, "当前版本暂未支持聊天记录备份。"),
  row("chatRestore", "localDiagnostics", "恢复聊天记录", "从备份中恢复聊天记录。", "system", "action", "pending", false, "当前版本暂未支持聊天记录恢复。"),
  row("clearLocalCache", "localDiagnostics", "清理缓存", "清理图片、文件缩略图和临时缓存，不删除云端消息。", "local", "action"),
  row("diagnosticsExport", "localDiagnostics", "导出诊断包", "导出本地日志、traceId、接口错误和关键操作轨迹。", "local", "action"),
  row("feedback", "localDiagnostics", "用户反馈", "提交问题、截图和诊断线索给团队。", "enterprise", "action", "pending", false, "当前版本暂未支持从设置页提交反馈。"),
  row("aboutClient", "localDiagnostics", "关于客户端", "查看版本号、构建信息和运行环境。", "local", "action"),
  row("launchAtStartup", "localDiagnostics", "开机自启", "登录系统后自动启动 PC 客户端。", "system", "action", "pending", false, "当前版本暂未支持开机自启。"),
  row("minimizeToTray", "localDiagnostics", "最小化到托盘", "关闭窗口时保留后台在线。", "system", "action", "pending", false, "当前版本暂未支持最小化到托盘。"),
  row("activeLine", "localDiagnostics", "网络线路", "按线路切换规则自动或手动选择可用站点。", "system", "action", "pending", false, "当前版本暂未支持手动切换线路。"),
  row("language", "localDiagnostics", "界面语言", "PC 客户端菜单和界面文案语言。", "local", "action", "recordOnly", false, "当前版本暂未支持切换界面语言。"),
  row("timezone", "localDiagnostics", "时区", "统一聊天时间、客服 SLA、历史会话和报表时间。", "local", "action", "recordOnly", false, "当前版本暂未支持切换时区显示。"),
  row("autoReconnect", "localDiagnostics", "断线自动重连", "网络恢复后自动重连接口和实时消息。", "local", "action", "recordOnly", false, "当前版本自动处理重连策略。"),
  row("weakNetworkDiagnostics", "localDiagnostics", "弱网诊断", "检测接口延迟、实时连接和最近失败请求。", "local", "action", "recordOnly", false, "当前版本暂未提供完整检测。"),
] satisfies SettingsRowCatalog[];

export function getSettingsSection(id: SettingsSectionId) {
  return settingsSections.find((section) => section.id === id);
}

export function getSettingsRow(id: string) {
  return settingsRows.find((rowItem) => rowItem.id === id);
}

export function settingsRowsForSection(sectionId: SettingsSectionId) {
  return settingsRows.filter((rowItem) => rowItem.sectionId === sectionId);
}

export function settingRowProps(id: string): SettingsRowPresentation {
  const rowItem = getSettingsRow(id);
  if (!rowItem) {
    throw new Error(`Unknown settings row: ${id}`);
  }
  return {
    label: rowItem.label,
    desc: rowItem.desc,
    source: rowItem.source,
    capability: rowItem.capability,
    enabled: rowItem.enabled,
    statusLabel: rowItem.statusLabel,
    visibleInMainList: rowItem.visibleInMainList,
    disabledReason: rowItem.disabledReason,
  };
}

function row(
  id: string,
  sectionId: SettingsSectionId,
  label: string,
  desc: string,
  source: SettingSource,
  control: SettingControl,
  capability: SettingCapability = "active",
  enabled = true,
  disabledReason?: string,
): SettingsRowCatalog {
  const visibleInMainList = capability === "active" || capability === "readonly";
  return {
    id,
    sectionId,
    label,
    desc,
    source,
    control,
    capability,
    enabled,
    statusLabel: statusLabelForCapability(capability),
    visibleInMainList,
    disabledReason,
  };
}

function statusLabelForCapability(capability: SettingCapability) {
  if (capability === "pending" || capability === "recordOnly") return "暂未支持";
  if (capability === "readonly") return "只读";
  return undefined;
}
