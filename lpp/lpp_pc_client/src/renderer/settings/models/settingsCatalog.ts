export type SettingsSectionId =
  | "accountEnterprise"
  | "privacySecurity"
  | "messageReception"
  | "chatCollaboration"
  | "appearanceEfficiency"
  | "generalNetwork"
  | "storageDiagnostics"
  | "helpAbout";

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
    "accountEnterprise",
    "账号与企业",
    "个人身份、当前企业、账号安全、登录设备和账号退出。",
    "core",
    ["account", "enterprise"],
  ),
  section(
    "privacySecurity",
    "隐私与安全",
    "搜索权限、好友验证、资料可见性、黑名单和客服数据边界。",
    "core",
    ["account", "enterprise", "local"],
  ),
  section(
    "messageReception",
    "消息与接待",
    "IM、在线客服队列、SLA、桌面提醒和接待状态联动。",
    "core",
    ["local", "enterprise"],
  ),
  section(
    "chatCollaboration",
    "聊天与协作",
    "输入、发送、截图、文件、翻译、快捷回复和聊天记录管理。",
    "core",
    ["local", "system"],
  ),
  section(
    "appearanceEfficiency",
    "外观与效率",
    "主题、字号、密度、无障碍和 Windows 桌面行为。",
    "core",
    ["local", "system"],
  ),
  section(
    "generalNetwork",
    "通用与网络",
    "语言、时区、当前环境、线路选择、测速和自动重连。",
    "support",
    ["local", "system"],
  ),
  section(
    "storageDiagnostics",
    "存储与诊断",
    "本地缓存、诊断包、开发诊断、日志脱敏和运行状态。",
    "support",
    ["local", "system"],
  ),
  section(
    "helpAbout",
    "帮助与关于",
    "投诉建议、问题反馈、协议政策和版本更新。",
    "support",
    ["enterprise", "local", "system"],
  ),
] satisfies SettingsSectionCatalog[];

export const settingsRows = [
  row("profile", "accountEnterprise", "个人资料", "头像、昵称、LPP 号、手机号、邮箱和创建时间。", "account", "action"),
  row("enterpriseIdentity", "accountEnterprise", "当前企业", "当前企业、企业号、角色和企业切换入口。", "enterprise", "info", "recordOnly"),
  row("changePassword", "accountEnterprise", "修改密码", "校验旧密码后更新账号登录密码。", "account", "action"),
  row(
    "loginDevices",
    "accountEnterprise",
    "登录设备",
    "查看已登录设备并下线异常设备。",
    "account",
    "action",
  ),
  row("logoutAccount", "accountEnterprise", "退出登录", "退出当前 PC 客服客户端账号。", "account", "action"),
  row("deactivateAccount", "accountEnterprise", "注销账户", "提交验证码后进入账号注销冷静期。", "account", "action"),

  row("allowMobileSearch", "privacySecurity", "允许通过手机号搜索", "其他用户可通过手机号找到你。", "account", "switch"),
  row("allowLppSearch", "privacySecurity", "允许通过 LPP 号搜索", "其他用户可通过 LPP 号找到你。", "account", "switch"),
  row("friendRequestVerification", "privacySecurity", "加我为好友", "控制陌生人向你发起好友申请的范围。", "account", "select"),
  row("profileVisibility", "privacySecurity", "个人资料可见性", "控制资料页对外展示范围。", "account", "select"),
  plannedRow(
    "sensitiveMasking",
    "privacySecurity",
    "敏感信息脱敏",
    "手机号、邮箱、证件、资金等敏感字段默认脱敏显示。",
    "enterprise",
    "action",
    "降低客服查看、复制和转述客户资料时的隐私泄漏风险。",
    "缺少企业级字段策略、审计日志和客户资料展示层统一脱敏规则。",
    "先沉淀企业策略接口，再统一接入客户资料、会话详情和诊断输出。",
    "missingBackendApi",
  ),
  row("blocklist", "privacySecurity", "黑名单", "查看黑名单列表，移出后对方可恢复互动。", "account", "action"),
  plannedRow(
    "copyScreenshotGuard",
    "privacySecurity",
    "截图与复制安全提示",
    "对客户资料、会话凭证和内部备注的复制截图给出明确提醒。",
    "enterprise",
    "action",
    "减少客服在高压接待中误外泄客户隐私。",
    "需要企业级策略、敏感字段标注和审计事件。",
    "先沉淀企业策略模型，再接入会话页复制/截图动作。",
  ),
  plannedRow(
    "customerAccessBoundary",
    "privacySecurity",
    "客户资料访问边界",
    "说明客服可见字段、跨团队访问和审计范围。",
    "enterprise",
    "info",
    "让客服清楚知道哪些客户资料可看、可导出、可转交。",
    "需要后端权限策略、审计日志和企业管理员配置。",
    "接入权限说明 API 后改为企业实时策略展示。",
  ),

  row("imNotifications", "messageReception", "IM 消息提醒", "好友、群聊、系统通知和好友申请进入消息提醒。", "account", "switch"),
  row("friendRequestNotifications", "messageReception", "好友申请提醒", "新的好友申请跟随 IM 消息通知策略。", "account", "info", "recordOnly"),
  row("serviceQueueNotifications", "messageReception", "在线客服队列提醒", "有访客排队、待接入时提醒客服。", "account", "switch"),
  row("slaTimeoutNotifications", "messageReception", "SLA 超时提醒", "会话接近超时或已经超时时提醒。", "account", "switch"),
  row("desktopNotifications", "messageReception", "桌面系统通知", "允许系统通知中心展示 IM 和客服提醒。", "account", "switch"),
  row("notificationPreview", "messageReception", "通知预览", "桌面通知中显示发送人和摘要，敏感内容仍按脱敏规则处理。", "account", "switch"),
  row("notificationSound", "messageReception", "声音提醒", "新消息、排队和 SLA 事件播放轻量提示音。", "account", "switch"),
  row("doNotDisturb", "messageReception", "免打扰", "减少非紧急 IM 提醒，客服队列和 SLA 仍保持关键提醒。", "account", "switch"),
  plannedRow(
    "receptionStatusSync",
    "messageReception",
    "接待状态联动",
    "在线、忙碌、离线和自动勿扰与客服接待能力联动。",
    "enterprise",
    "action",
    "避免客服下班或忙碌时继续被分配新会话。",
    "需要客服状态 API、排队分配策略和托盘状态同步。",
    "先定义状态优先级，再接入在线客服分配策略。",
  ),

  row("enterToSend", "chatCollaboration", "Enter 发送", "开启后 Enter 发送消息，Shift + Enter 换行。", "local", "switch", "localEffective"),
  row("screenshotShortcut", "chatCollaboration", "截图快捷键", "在聊天输入区快速截屏并作为图片待发送。", "local", "select", "localEffective"),
  row("dragUpload", "chatCollaboration", "文件拖拽上传", "把图片或文件拖进输入区即可发送。", "local", "switch", "localEffective"),
  plannedRow(
    "autoTranslate",
    "chatCollaboration",
    "自动翻译",
    "进入跨语言会话时自动展示译文。",
    "local",
    "action",
    "让客服面对跨语言客户时减少手动翻译成本，同时保留原文核对。",
    "已有手动翻译接口，但缺少自动识别语言、译文展示位和发送前确认流程。",
    "先接入会话级语言识别与译文展示，再开放自动翻译开关。",
    "missingRuntimeWiring",
  ),
  row("shortcutHints", "chatCollaboration", "快捷键提示", "在输入区和工具按钮上显示快捷键提示。", "local", "switch", "localEffective"),
  plannedRow(
    "quickReplyEntry",
    "chatCollaboration",
    "快捷回复管理",
    "进入客服快捷回复、话术分组和个人常用话术管理。",
    "enterprise",
    "action",
    "提升客服高频问题处理效率，并保持企业话术一致。",
    "需要复用在线客服快捷回复模型和企业话术权限。",
    "接入工作台快捷回复管理页后从这里跳转。",
  ),
  plannedRow(
    "chatBackground",
    "chatCollaboration",
    "聊天背景",
    "设置默认聊天背景或按会话单独设置。",
    "local",
    "action",
    "给长时间沟通提供更舒适的视觉环境。",
    "需要消息舞台背景渲染和会话级偏好存储。",
    "先支持全局背景，再扩展到会话级背景。",
  ),
  plannedRow(
    "mediaSendPreference",
    "chatCollaboration",
    "图片/文件/视频发送偏好",
    "控制原图、压缩、自动下载和视频封面策略。",
    "local",
    "action",
    "让客服在质量、速度和流量之间有清晰选择。",
    "需要媒体发送管线暴露压缩和缓存策略。",
    "与文件/视频消息回归一起接入。",
  ),
  plannedRow(
    "localMessageCache",
    "chatCollaboration",
    "聊天记录缓存",
    "提升重新打开会话速度，缓存敏感信息按脱敏规则处理。",
    "local",
    "action",
    "让客服多开和频繁切换会话时保留足够快的上下文恢复速度。",
    "缺少统一缓存读写层开关和敏感内容缓存脱敏策略。",
    "先把消息缓存适配器统一到设置读取，再恢复为可操作开关。",
    "missingRuntimeWiring",
  ),
  plannedRow(
    "chatExport",
    "chatCollaboration",
    "导出聊天记录",
    "按会话导出文本、图片、文件索引和时间线。",
    "local",
    "action",
    "满足客服复盘、投诉处理和内部交接。",
    "需要导出格式、权限校验和附件索引。",
    "先支持单会话导出，再扩展批量导出。",
  ),
  plannedRow(
    "chatBackup",
    "chatCollaboration",
    "备份聊天记录",
    "备份聊天记录到后续支持的安全存储。",
    "system",
    "action",
    "降低换机、重装和多开 profile 下的数据丢失风险。",
    "需要加密备份包、存储位置和恢复校验。",
    "定义备份文件格式后接入桌面文件能力。",
  ),
  plannedRow(
    "chatRestore",
    "chatCollaboration",
    "恢复聊天记录",
    "从备份中恢复聊天记录。",
    "system",
    "action",
    "让客服换设备后能快速恢复工作上下文。",
    "需要备份包校验、冲突合并和权限校验。",
    "与备份能力成套上线。",
  ),

  row("theme", "appearanceEfficiency", "主题", "切换整套颜色、边界和管理端视觉基调。", "local", "select", "localEffective"),
  row("skin", "appearanceEfficiency", "皮肤", "在当前主题下调整主色，不改变信息结构。", "local", "select", "localEffective"),
  row("fontSize", "appearanceEfficiency", "字号", "调整会话、聊天、资料面板的基础字号。", "local", "select", "localEffective"),
  row("compactList", "appearanceEfficiency", "紧凑列表", "减少会话列表行高，提高 PC 信息密度。", "local", "switch", "localEffective"),
  row("highDensityContext", "appearanceEfficiency", "高密度客户上下文", "右侧资料面板以更紧凑的行距展示。", "local", "switch", "localEffective"),
  row("reduceMotion", "appearanceEfficiency", "减少动效", "降低弹层、列表和按钮过渡动画。", "local", "switch", "localEffective"),
  row("highContrastBoundary", "appearanceEfficiency", "高对比度边界", "增强边框和分隔线，适合长时间办公。", "local", "switch", "localEffective"),
  row("keyboardFocusHint", "appearanceEfficiency", "键盘焦点提示", "Tab 操作时显示更清晰的焦点状态。", "local", "switch", "localEffective"),
  plannedRow(
    "busyDoNotDisturb",
    "appearanceEfficiency",
    "忙碌时免打扰",
    "IM 状态为忙碌时减少非紧急提醒。",
    "local",
    "action",
    "让客服进入忙碌状态时自动降低低优先级打扰。",
    "缺少 IM 状态、客服接待状态和提醒策略的统一优先级接线。",
    "先把提醒服务接入当前在线状态，再恢复为可操作开关。",
    "missingRuntimeWiring",
  ),
  plannedRow(
    "afterWorkReminder",
    "appearanceEfficiency",
    "下班后提醒",
    "非工作时间收到重要消息时给出额外提醒。",
    "enterprise",
    "action",
    "避免客服下班后漏看紧急客户和 SLA 风险。",
    "缺少企业排班、工作时间和消息优先级策略接口。",
    "接入企业排班接口后按角色配置下班后提醒。",
    "missingBackendApi",
  ),
  plannedRow(
    "minimizeToTray",
    "appearanceEfficiency",
    "最小化到托盘",
    "关闭窗口时保留后台在线。",
    "system",
    "action",
    "符合客服桌面端长期在线和低打扰工作方式。",
    "需要 Electron 托盘生命周期和退出确认策略。",
    "在主进程完善托盘菜单后打开此设置。",
    "missingDesktopApi",
  ),
  plannedRow(
    "launchAtStartup",
    "appearanceEfficiency",
    "开机自启",
    "登录系统后自动启动 PC 客户端。",
    "system",
    "action",
    "减少客服漏登导致的接待空窗。",
    "需要 Windows 登录项注册和企业策略控制。",
    "接入桌面自启能力后允许企业策略覆盖。",
    "missingDesktopApi",
  ),
  row("multiProfileIndicator", "appearanceEfficiency", "多开 profile 标识", "显示当前窗口 profile，避免多账号测试和多客服环境串号。", "system", "info", "recordOnly"),

  row("language", "generalNetwork", "界面语言", "PC 客户端菜单和界面文案语言。", "local", "info", "recordOnly"),
  row("timezone", "generalNetwork", "时区", "统一聊天时间、客服 SLA、历史会话和报表时间。", "local", "info", "recordOnly"),
  row("currentEnvironment", "generalNetwork", "当前连接环境", "显示当前测试环境地址，不展示 token、Authorization 或 Cookie。", "system", "info", "recordOnly"),
  row("activeLine", "generalNetwork", "网络线路", "按 APP 线路管理规则自动或手动选择可用站点，切换后 API 与实时连接使用新线路。", "system", "action", "available"),
  row("lineLatencyTest", "generalNetwork", "线路测速", "沿用 APP 根地址探测规则，测试所有候选线路延迟和可用状态。", "system", "action", "localEffective"),
  row("autoReconnect", "generalNetwork", "断线自动重连", "网络恢复后自动重连接口和实时消息。", "local", "info", "recordOnly"),
  row("weakNetworkDiagnostics", "generalNetwork", "弱网提示", "检测接口延迟、实时连接和最近失败请求。", "local", "info", "recordOnly"),

  row("clearLocalCache", "storageDiagnostics", "清理缓存", "清理图片、文件缩略图和临时缓存，不删除云端消息。", "local", "action"),
  row("diagnosticsExport", "storageDiagnostics", "导出诊断包", "导出本地日志、traceId、接口错误和关键操作轨迹。", "local", "action"),
  row("developmentDiagnostics", "storageDiagnostics", "开发诊断", "查看环境、版本、构建、接口、实时连接和 profile 状态。", "system", "info", "recordOnly"),
  row("runtimeStatus", "storageDiagnostics", "运行情况", "抽样显示最近消息发送、长连接接收、缓存写入和窗口展示耗时。", "local", "info", "recordOnly"),
  plannedRow(
    "apiConnectivity",
    "storageDiagnostics",
    "接口连通性检查",
    "检查 API、WebSocket、媒体和客服夹具接口状态。",
    "system",
    "action",
    "让测试和客服支持能快速定位环境问题。",
    "需要统一健康检查端点和诊断采样标准。",
    "接入健康检查后在开发诊断中展示结果。",
    "missingBackendApi",
  ),
  plannedRow(
    "profileLogDirectory",
    "storageDiagnostics",
    "日志目录",
    "打开当前 profile 的日志和诊断目录。",
    "system",
    "action",
    "方便多开环境定位单实例问题。",
    "需要主进程暴露安全的 revealInFolder 能力。",
    "优先展示只读路径，再接入打开目录动作。",
    "missingDesktopApi",
  ),

  row(
    "feedback",
    "helpAbout",
    "投诉建议与问题反馈",
    "提交投诉、建议、问题反馈和缺陷线索。",
    "enterprise",
    "action",
  ),
  row("terms", "helpAbout", "用户协议", "查看 LPP 用户服务协议。", "local", "action"),
  row("privacyPolicy", "helpAbout", "隐私政策", "查看 LPP 隐私政策和个人信息处理说明。", "local", "action"),
  row("aboutClient", "helpAbout", "关于客户端", "查看版本号、构建信息和运行环境。", "local", "action"),
  row(
    "checkUpdate",
    "helpAbout",
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
