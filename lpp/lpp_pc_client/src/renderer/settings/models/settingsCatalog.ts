export type SettingsSectionId =
  | "account"
  | "enterprise"
  | "messages"
  | "privacy"
  | "customerService"
  | "network"
  | "common"
  | "storageDiagnostics"
  | "about";

export type SettingSource = "local" | "account" | "enterprise" | "system";
export type SettingCapability =
  | "available"
  | "localEffective"
  | "recordOnly"
  | "missingBackendApi"
  | "missingDesktopApi"
  | "missingRuntimeWiring";
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
  priority: "core" | "support";
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
  productValue?: string;
  dependency?: string;
  nextAction?: string;
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
  | "productValue"
  | "dependency"
  | "nextAction"
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
  section(
    "account",
    "账户",
    "账户资料、密码、登录设备、退出登录和注销账户。",
    "core",
    ["account"],
  ),
  section(
    "enterprise",
    "企业",
    "当前企业、企业号、角色和企业切换入口。",
    "core",
    ["enterprise"],
  ),
  section(
    "messages",
    "消息",
    "IM 消息提醒、好友申请提醒和免打扰。",
    "core",
    ["account"],
  ),
  section(
    "privacy",
    "隐私",
    "搜索权限、好友验证、资料可见性和黑名单。",
    "core",
    ["account", "local"],
  ),
  section(
    "customerService",
    "在线客服",
    "接待提醒、已接入会话新消息、SLA 和客服效率。",
    "core",
    ["account", "local"],
  ),
  section(
    "network",
    "线路切换",
    "当前环境、线路选择、测速、自动重连和弱网提示。",
    "support",
    ["local", "system"],
  ),
  section(
    "common",
    "通用",
    "通知、输入、翻译、聊天、外观、桌面、语言和时间。",
    "core",
    ["account", "local", "system"],
  ),
  section(
    "storageDiagnostics",
    "存储诊断",
    "缓存清理、连接体检、诊断记录、诊断包和运行情况。",
    "support",
    ["local", "system"],
  ),
  section(
    "about",
    "关于",
    "版本信息、检查更新、用户协议、隐私政策和意见反馈。",
    "support",
    ["enterprise", "local", "system"],
  ),
] satisfies SettingsSectionCatalog[];

export const settingsRows = [
  row("profile", "account", "个人资料", "头像、昵称、LPP 号、手机号、邮箱和创建时间。", "account", "action"),
  row("enterpriseIdentity", "enterprise", "当前企业", "当前企业、企业号、角色和企业切换入口。", "enterprise", "info", "recordOnly"),
  row("changePassword", "account", "修改密码", "校验旧密码后更新账号登录密码。", "account", "action"),
  row(
    "loginDevices",
    "account",
    "登录设备",
    "查看已登录设备并下线异常设备。",
    "account",
    "action",
  ),
  row("logoutAccount", "account", "退出登录", "退出当前 PC 客服客户端账号。", "account", "action"),
  row("deactivateAccount", "account", "注销账户", "提交验证码后进入账号注销冷静期。", "account", "action"),

  row("allowMobileSearch", "privacy", "允许通过手机号搜索", "其他用户可通过手机号找到你。", "account", "switch"),
  row("allowLppSearch", "privacy", "允许通过 LPP 号搜索", "其他用户可通过 LPP 号找到你。", "account", "switch"),
  row("friendRequestVerification", "privacy", "加我为好友", "控制陌生人向你发起好友申请的范围。", "account", "select"),
  row("profileVisibility", "privacy", "个人资料可见性", "控制资料页对外展示范围。", "account", "select"),
  row("blocklist", "privacy", "黑名单", "查看黑名单列表，移出后对方可恢复互动。", "account", "action"),

  row("imNotifications", "messages", "IM 消息提醒", "好友、群聊、系统通知和好友申请进入消息提醒。", "account", "switch"),
  row("friendRequestNotifications", "messages", "好友申请提醒", "新的好友申请跟随 IM 消息通知策略。", "account", "info", "recordOnly"),
  row("serviceQueueNotifications", "customerService", "访客排队/待接入提醒", "有访客排队、待接入或待接管时提醒客服。", "account", "switch"),
  row("customerServiceMessageNotifications", "customerService", "已接入会话新消息提醒", "已接入或正在处理的客服会话收到访客新消息时提醒。", "local", "switch"),
  row("slaTimeoutNotifications", "customerService", "SLA 超时提醒", "会话接近超时或已经超时时提醒。", "account", "switch"),
  row("desktopNotifications", "common", "桌面系统通知", "允许系统通知中心展示 IM 和客服提醒。", "account", "switch"),
  row("notificationPreview", "common", "通知预览", "桌面通知中显示发送人和摘要，敏感内容仍按脱敏规则处理。", "account", "switch"),
  row("notificationSound", "common", "声音提醒", "新消息、排队和 SLA 事件播放轻量提示音。", "account", "switch"),
  row("doNotDisturb", "messages", "免打扰", "减少非紧急 IM 提醒，客服队列和 SLA 仍保持关键提醒。", "account", "switch"),

  row("enterToSend", "common", "Enter 发送", "开启后 Enter 发送消息，Shift + Enter 换行。", "local", "switch", "localEffective"),
  row("screenshotShortcut", "common", "截图快捷键", "在聊天输入区快速截屏并作为图片待发送。", "local", "select", "localEffective"),
  row("dragUpload", "common", "文件拖拽上传", "把图片或文件拖进输入区即可发送。", "local", "switch", "localEffective"),
  row("autoTranslate", "common", "自动翻译全部会话", "进入跨语言会话时自动展示对方文本译文，会话可单独覆盖。", "local", "switch", "localEffective"),
  row("shortcutHints", "common", "快捷键提示", "在输入区和工具按钮上显示快捷键提示。", "local", "switch", "localEffective"),
  row(
    "chatBackground",
    "common",
    "聊天背景",
    "设置默认聊天背景或按会话单独设置。",
    "local",
    "action",
    "localEffective",
  ),
  row("chatExport", "common", "导出聊天记录", "导出最近真实会话消息为 JSON 文件。", "local", "action"),
  row("chatBackup", "common", "备份聊天记录", "生成本机加密聊天记录备份文件。", "system", "action"),
  row("chatRestore", "common", "导入/恢复聊天记录", "校验本地备份文件并保存为本机归档。", "system", "action"),

  row("theme", "common", "主题", "切换整套颜色、边界和管理端视觉基调。", "local", "select", "localEffective"),
  row("skin", "common", "皮肤", "在当前主题下调整主色，不改变信息结构。", "local", "select", "localEffective"),
  row("fontSize", "common", "字号", "调整会话、聊天、资料面板的基础字号。", "local", "select", "localEffective"),
  row("compactList", "common", "紧凑列表", "减少会话列表行高，提高 PC 信息密度。", "local", "switch", "localEffective"),
  row("highDensityContext", "customerService", "高密度客户上下文", "右侧资料面板以更紧凑的行距展示。", "local", "switch", "localEffective"),
  row("reduceMotion", "common", "减少动效", "降低弹层、列表和按钮过渡动画。", "local", "switch", "localEffective"),
  row("highContrastBoundary", "common", "高对比度边界", "增强边框和分隔线，适合长时间办公。", "local", "switch", "localEffective"),
  row("keyboardFocusHint", "common", "键盘焦点提示", "Tab 操作时显示更清晰的焦点状态。", "local", "switch", "localEffective"),
  row("minimizeToTray", "common", "最小化到托盘", "关闭窗口时保留后台在线。", "system", "switch"),
  row("launchAtStartup", "common", "开机自启", "登录系统后自动启动 PC 客户端。", "system", "switch"),
  row("multiProfileIndicator", "common", "多开 profile 标识", "显示当前窗口 profile，避免多账号测试和多客服环境串号。", "system", "info", "recordOnly"),

  row("language", "common", "界面语言", "PC 客户端菜单和界面文案语言。", "local", "info", "recordOnly"),
  row("timezone", "common", "时区", "统一聊天时间、客服 SLA、历史会话和报表时间。", "local", "info", "recordOnly"),
  row("currentEnvironment", "network", "当前连接环境", "显示当前测试环境地址，不展示 token、Authorization 或 Cookie。", "system", "info", "recordOnly"),
  row("activeLine", "network", "网络线路", "按 APP 线路管理规则自动或手动选择可用站点，切换后 API 与实时连接使用新线路。", "system", "action", "available"),
  row("lineLatencyTest", "network", "线路测速", "沿用 APP 根地址探测规则，测试所有候选线路延迟和可用状态。", "system", "action", "localEffective"),
  row("autoReconnect", "network", "断线自动重连", "网络恢复后自动重连接口和实时消息。", "local", "info", "recordOnly"),
  row("weakNetworkDiagnostics", "network", "弱网提示", "检测接口延迟、实时连接和最近失败请求。", "local", "info", "recordOnly"),

  row("clearLocalCache", "storageDiagnostics", "清理缓存", "清理图片、文件缩略图和临时缓存，不删除云端消息。", "local", "action"),
  row("diagnosticsExport", "storageDiagnostics", "导出诊断包", "导出本地日志、traceId、接口错误和关键操作轨迹。", "local", "action"),
  row("diagnosticsRecentRecords", "storageDiagnostics", "诊断记录", "查看本机最近诊断摘要、模块筛选和脱敏后的 traceId。", "local", "info"),
  row("connectivityHealth", "storageDiagnostics", "连接体检", "查看当前 API、线路、实时连接、媒体和客服路由的可观测状态。", "local", "info"),
  row("developmentDiagnostics", "storageDiagnostics", "开发诊断", "查看环境、版本、构建、接口、实时连接和 profile 状态。", "system", "info", "recordOnly"),
  row("runtimeStatus", "storageDiagnostics", "运行情况", "抽样显示最近消息发送、长连接接收、缓存写入和窗口展示耗时。", "local", "info", "recordOnly"),

  row(
    "feedback",
    "about",
    "反馈",
    "提交投诉、建议、问题反馈和缺陷线索。",
    "enterprise",
    "action",
  ),
  row("terms", "about", "用户协议", "查看 LPP 用户服务协议。", "local", "action"),
  row("privacyPolicy", "about", "隐私政策", "查看 LPP 隐私政策和个人信息处理说明。", "local", "action"),
  row("aboutClient", "about", "关于客户端", "查看版本号、构建信息和运行环境。", "local", "action"),
  row(
    "checkUpdate",
    "about",
    "检查更新",
    "检查当前版本、更新说明和可用安装包。",
    "system",
    "action",
  ),
] satisfies SettingsRowCatalog[];

export function getSettingsSection(id: SettingsSectionId) {
  return settingsSections.find((sectionItem) => sectionItem.id === id);
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
    productValue: rowItem.productValue,
    dependency: rowItem.dependency,
    nextAction: rowItem.nextAction,
  };
}

function section(
  id: SettingsSectionId,
  title: string,
  desc: string,
  priority: SettingsSectionCatalog["priority"],
  sources: SettingSource[],
): SettingsSectionCatalog {
  return { id, title, desc, priority, sources };
}

function plannedRow(
  id: string,
  sectionId: SettingsSectionId,
  label: string,
  desc: string,
  source: SettingSource,
  control: SettingControl,
  productValue: string,
  dependency: string,
  nextAction: string,
  capability: Extract<
    SettingCapability,
    "missingBackendApi" | "missingDesktopApi" | "missingRuntimeWiring"
  > = "missingBackendApi",
): SettingsRowCatalog {
  return row(id, sectionId, label, desc, source, control, capability, false, {
    productValue,
    dependency,
    nextAction,
  });
}

function row(
  id: string,
  sectionId: SettingsSectionId,
  label: string,
  desc: string,
  source: SettingSource,
  control: SettingControl,
  capability: SettingCapability = "available",
  enabled = true,
  planning?: {
    productValue?: string;
    dependency?: string;
    nextAction?: string;
    disabledReason?: string;
  },
): SettingsRowCatalog {
  const visibleInMainList =
    capability === "available" ||
    capability === "localEffective" ||
    capability === "recordOnly";
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
    disabledReason: planning?.disabledReason,
    productValue: planning?.productValue,
    dependency: planning?.dependency,
    nextAction: planning?.nextAction,
  };
}

function statusLabelForCapability(capability: SettingCapability) {
  if (capability === "localEffective") return "本机生效";
  if (capability === "recordOnly") return "状态展示";
  if (capability === "missingBackendApi") return "缺少接口";
  if (capability === "missingDesktopApi") return "缺少桌面能力";
  if (capability === "missingRuntimeWiring") return "待接入流程";
  return undefined;
}
