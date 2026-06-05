import type {
  ConversationListItem,
  CustomerProfileCard,
  FriendProfileExtraDto,
} from "../data/api-client";
import type { ContactItem } from "../data/types";
import { formatChatTime, formatShortDate } from "../lib/format";
import { channelLabel } from "./ChannelBadge";

export type ExternalSection = NonNullable<CustomerProfileCard["externalSections"]>[number];
export type CustomerModelTranslate = (key: string, params?: Record<string, string | number>) => string;

export interface CustomerModelCopy {
  assetRows: string[];
  booleans: {
    no: string;
    yes: string;
  };
  enumLabels: Record<string, string>;
  fieldLabels: Record<string, string>;
  latestTradePrefix: string;
  lotUnit: string;
  recordTitle: string;
  sectionDetailTitle: string;
  statuses: {
    active: string;
    inactive: string;
    offline: string;
    online: string;
    registered: string;
    unregistered: string;
    unverified: string;
    verified: string;
  };
}

export interface CustomerAssetMixItem {
  name: string;
  percent: number;
  amount: string;
  color: string;
}

export interface CustomerAssetRow {
  name: string;
  percentLabel: string;
  amount: string;
  color: string;
  empty: boolean;
}

export interface CustomerStatusChip {
  label: string;
  tone: "registered" | "verified" | "active" | "muted";
  empty: boolean;
}

export interface CustomerTrading7dDay {
  label: string;
  value: number;
  active: boolean;
}

export interface CustomerRecent7dBar {
  label: string;
  value: number;
  active: boolean;
  empty: boolean;
}

export interface CustomerRecent7dTrading {
  deposit: string;
  withdrawal: string;
  volume: string;
  days: CustomerTrading7dDay[];
  bars: CustomerRecent7dBar[];
  latest: string;
}

export interface CustomerModel {
  accountBalance: string;
  accountStatus: string;
  accountBalanceDelta: string;
  activationStatus: string;
  agent: string;
  agentCreatedAt: string;
  agentType: string;
  appName: string;
  assetMix: CustomerAssetMixItem[];
  assetRows: CustomerAssetRow[];
  assignedStaff: string;
  avatarUrl?: string | null;
  businessLine: string;
  channelApp: string;
  commissionRate: string;
  complianceNote: string;
  country: string;
  customerId: string;
  customerLanguage: string;
  emailMasked: string;
  friendUserId: string;
  hasAgentRelationship: boolean;
  id: string;
  kyc: string;
  language: string;
  lastActive: string;
  lastDevice: string;
  lastIp: string;
  lastMessage: string;
  lastMessageTime: string;
  lastProfileUpdatedAt: string;
  latestFundTime: string;
  latestTouchChannel: string;
  level: string;
  marketingConsent: string;
  name: string;
  netDeposit: string;
  netDepositDelta: string;
  nextFollowUp: string;
  lppId: string;
  isOnline: boolean;
  onlineStatus: string;
  phoneMasked: string;
  profileVisibility: string;
  recent7dTrading: CustomerRecent7dTrading;
  recentTradeTime: string;
  registeredAt: string;
  registrationStatus: string;
  remark: string;
  remoteLoginAlert: string;
  risk: string;
  sections: Record<"trading" | "funds" | "sessions" | "touch" | "compliance" | "device" | "other", ExternalSection[]>;
  sessionCount: string;
  source: string;
  staffLanguage: string;
  statusChips: CustomerStatusChip[];
  tags: string[];
  temporaryOrders: Array<Record<string, unknown>>;
  tickets: Array<Record<string, unknown>>;
  totalDeposit: string;
  totalDepositDelta: string;
  totalOrders: string;
  touchCount: string;
  tradeProduct: string;
  translateMode: string;
  twoFactor: string;
  unreadCount: string;
  verificationStatus: string;
  vipLevel: string;
  winRate: string;
}

const defaultCustomerModelCopy: CustomerModelCopy = {
  assetRows: ["黄金", "外汇", "指数", "大宗商品"],
  booleans: {
    no: "否",
    yes: "是",
  },
  enumLabels: {
    accepted: "已接受",
    active: "已激活",
    app: "自有应用",
    blocked: "已拉黑",
    busy: "忙碌",
    closed: "已关闭",
    disabled: "已禁用",
    enabled: "已启用",
    everyone: "所有人",
    failed: "失败",
    friends: "仅好友",
    high: "高",
    low: "低",
    medium: "中",
    mobile_app: "移动应用",
    native: "自有应用",
    no: "否",
    nobody: "不允许",
    offline: "离线",
    online: "在线",
    own_app: "自有应用",
    pending: "待处理",
    rejected: "已拒绝",
    reviewed: "已审核",
    success: "成功",
    unknown: "未知",
    unverified: "未认证",
    verified: "已认证",
    web: "网页",
    website: "网页",
    yes: "是",
  },
  fieldLabels: {
    accountBalance: "账户余额",
    amount: "金额",
    createdAt: "创建时间",
    netDeposit: "净入金",
    product: "产品",
    status: "状态",
    symbol: "品种",
    totalDeposit: "总入金",
    type: "类型",
    updatedAt: "更新时间",
  },
  latestTradePrefix: "最近交易",
  lotUnit: "手",
  recordTitle: "记录 {index}",
  sectionDetailTitle: "详情",
  statuses: {
    active: "已激活",
    inactive: "未激活",
    offline: "离线",
    online: "在线",
    registered: "已注册",
    unregistered: "未注册",
    unverified: "未认证",
    verified: "已认证",
  },
};

export function createCustomerModelCopy(translate: CustomerModelTranslate): CustomerModelCopy {
  const enumKeys = Object.keys(defaultCustomerModelCopy.enumLabels);
  const fieldKeys = Object.keys(defaultCustomerModelCopy.fieldLabels);
  return {
    assetRows: [0, 1, 2, 3].map((index) => translate(`customerProfile.model.assetRows.${index}`)),
    booleans: {
      no: translate("customerProfile.model.booleans.no"),
      yes: translate("customerProfile.model.booleans.yes"),
    },
    enumLabels: Object.fromEntries(
      enumKeys.map((key) => [key, translate(`customerProfile.model.enumLabels.${key}`)]),
    ),
    fieldLabels: Object.fromEntries(
      fieldKeys.map((key) => [key, translate(`customerProfile.model.fieldLabels.${key}`)]),
    ),
    latestTradePrefix: translate("customerProfile.model.latestTradePrefix"),
    lotUnit: translate("customerProfile.model.lotUnit"),
    recordTitle: translate("customerProfile.model.recordTitle", { index: "{index}" }),
    sectionDetailTitle: translate("customerProfile.model.sectionDetailTitle"),
    statuses: {
      active: translate("customerProfile.model.statuses.active"),
      inactive: translate("customerProfile.model.statuses.inactive"),
      offline: translate("customerProfile.model.statuses.offline"),
      online: translate("customerProfile.model.statuses.online"),
      registered: translate("customerProfile.model.statuses.registered"),
      unregistered: translate("customerProfile.model.statuses.unregistered"),
      unverified: translate("customerProfile.model.statuses.unverified"),
      verified: translate("customerProfile.model.statuses.verified"),
    },
  };
}

export function buildCustomerModel({
  avatarUrl,
  copy = defaultCustomerModelCopy,
  conversation,
  contact,
  profile,
  profileExtra,
}: {
  avatarUrl?: string | null;
  copy?: CustomerModelCopy;
  conversation?: ConversationListItem;
  contact?: ContactItem | null;
  profile?: CustomerProfileCard;
  profileExtra?: FriendProfileExtraDto;
}): CustomerModel {
  const external = profile?.externalSections ?? [];
  const tradingSummary = profile?.tradingSummary ?? {};
  const profileExtraTags = Array.isArray(profileExtra?.tags) ? profileExtra.tags : [];
  const tags = profileExtraTags.length > 0 ? profileExtraTags : profile?.tags ?? [];
  const categorizedExternal = categorizeSections(external);
  const profileSource = sourceLabel(profile);
  const source = textValue(firstKnownValue(profileExtra?.source, profileSource));
  const agent = textValue(profile?.ib ?? tradingSummary.ib);
  const assetMix = buildAssetMix(profile, external);
  const level = textValue(firstKnownValue(profile?.customerLevel, profile?.level, profile?.grade, profile?.rank, profile?.isVip ? "VIP" : undefined));
  const lppId = firstKnownValue(
    profileValue(profile, [
      "lppId",
      "lppNo",
      "lppNumber",
      "customerLppId",
      "customerLppNo",
      "greenBubbleId",
      "greenBubbleNo",
      "userNo",
    ]),
    conversation?.peerLppId,
    conversation?.peerLppNo,
    conversation?.peerLppNumber,
    conversation?.peerUserNo,
    contact?.lppId,
    valueAt(external, ["identity", "profile", "customer", "\u5ba2\u6237", "\u6838\u5fc3\u8eab\u4efd"], [
      "\u7eff\u6ce1\u6ce1\u53f7",
      "lppId",
      "lppNo",
      "lppNumber",
      "customerLppId",
      "greenBubbleId",
      "userNo",
    ]),
  );
  const appName = textValue(
    profileValue(profile, [
      "appName",
      "app_name",
      "appDisplayName",
      "app_display_name",
      "packageName",
      "package_name",
      "brandName",
      "brand_name",
      "tenantAppName",
      "tenant_app_name",
    ]),
  );
  const activationStatus = normalizeActivationStatus(firstKnownValue(profileValue(profile, ["activationStatus", "activatedStatus", "isActivated", "activeStatus"]), profile?.accountStatus, tradingSummary.accountStatus), copy);
  const kyc = textValue(firstKnownValue(profile?.kycStatus, profile?.kyc, profile?.kycLevel, profile?.complianceStatus, valueAt(external, ["kyc", "compliance", "\u5408\u89c4"], ["\u72b6\u6001", "status", "kycStatus", "kyc"])));
  const recent7dTrading = buildRecent7dTrading(profile, external, copy);
  const risk = textValue(firstKnownValue(profile?.riskLevel, profile?.risk, profile?.riskStatus, valueAt(external, ["risk", "kyc", "compliance", "\u98ce\u9669", "\u5408\u89c4"], ["\u98ce\u9669", "risk", "riskLevel", "riskStatus"])));
  const tagsClean = Array.from(new Set(tags.map((tag) => textValue(tag, copy)).filter(isKnown).filter((tag) => !isVipLabel(tag))));
  const verificationStatus = normalizeVerificationStatus(firstKnownValue(profileValue(profile, ["verificationStatus", "verifiedStatus", "isVerified"]), profile?.kycStatus, profile?.complianceStatus), copy);
  const registeredAtRaw = firstKnownValue(profile?.registeredAt, tradingSummary.registeredAt);
  const registrationStatus = normalizeRegistrationStatus(
    firstKnownValue(profileValue(profile, ["registrationStatus", "registeredStatus", "isRegistered", "registered"]), registeredAtRaw),
    registeredAtRaw,
    copy,
  );
  const onlineStatusRaw = firstKnownValue(profileValue(profile, ["onlineStatus", "presence", "isOnline"]), contact?.online);
  const onlineStatus = normalizeOnlineStatus(onlineStatusRaw, copy);
  return {
    accountBalance: textValue(profile?.accountBalance),
    accountBalanceDelta: textValue(firstKnownValue(profileValue(profile, ["accountBalanceDelta", "balanceDelta", "balance7dDelta"]), tradingSummary.accountBalanceDelta)),
    accountStatus: textValue(profile?.accountStatus ?? tradingSummary.accountStatus),
    activationStatus,
    agent,
    agentCreatedAt: shortDate(valueAt(external, ["ib", "agent", "\u4ee3\u7406"], ["\u5efa\u7acb\u65f6\u95f4", "createdAt"])),
    agentType: textValue(valueAt(external, ["ib", "agent", "\u4ee3\u7406"], ["\u7c7b\u578b", "agentType"])),
    appName,
    assetMix,
    assetRows: buildAssetRows(assetMix, copy),
    assignedStaff: textValue(profile?.assignedAgentName ?? profileValue(profile, ["assignedStaffName", "assignedStaffDisplayName"])),
    avatarUrl: profile?.avatarUrl || avatarUrl || conversation?.avatarUrl || contact?.avatarUrl,
    businessLine: textValue(profileValue(profile, ["businessLine", "business", "line"])),
    channelApp: appName,
    commissionRate: textValue(valueAt(external, ["ib", "agent", "\u4ee3\u7406"], ["\u4f63\u91d1\u6bd4\u4f8b", "commissionRate"])),
    complianceNote: textValue(valueAt(external, ["kyc", "compliance", "\u5408\u89c4"], ["\u5907\u6ce8", "note"])),
    country: textValue(profile?.country),
    customerId: textValue(firstKnownValue(profile?.customerUserId, profile?.customerId, profile?.userId, conversation?.peerUserId, contact?.userId, contact?.id)),
    customerLanguage: textValue(profileValue(profile, ["customerLanguage", "receiveLanguage", "preferredLanguage"]) ?? profile?.language),
    emailMasked: textValue(firstKnownValue(profile?.emailMasked, profile?.email, conversation?.peerEmailMasked)),
    friendUserId: textValue(firstKnownValue(contact?.userId, conversation?.peerUserId)),
    hasAgentRelationship: isKnown(agent),
    id: String(firstKnownValue(profile?.customerUserId, profile?.customerId, profile?.userId, conversation?.peerUserId, contact?.userId, contact?.id, conversation?.conversationId) ?? "customer"),
    kyc,
    language: textValue(profileValue(profile, ["language", "customerLanguage", "preferredLanguage"])),
    lastActive: shortDate(profile?.lastActiveAt ?? contact?.lastMessageAt),
    lastDevice: textValue(valueAt(external, ["device", "\u8bbe\u5907"], ["\u8bbe\u5907", "device", "name"])),
    lastIp: textValue(valueAt(external, ["device", "\u8bbe\u5907"], ["IP", "ip", "lastIp"])),
    lastMessage: textValue(conversation?.lastMessage?.preview),
    lastMessageTime: formatChatTime(conversation?.lastMessage?.sentAt),
    lastProfileUpdatedAt: shortTime(firstKnownValue(profileValue(profile, ["updatedAt", "lastUpdatedAt", "profileUpdatedAt"]), tradingSummary.updatedAt)),
    latestFundTime: shortDate(valueAt(external, ["fund", "\u8d44\u91d1", "cash"], ["\u6700\u8fd1\u65f6\u95f4", "updatedAt", "createdAt"])),
    latestTouchChannel: textValue(valueAt(external, ["touch", "\u89e6\u8fbe", "marketing"], ["\u6e20\u9053", "channel"])),
    level,
    marketingConsent: textValue(valueAt(external, ["marketing", "consent", "\u8425\u9500"], ["\u540c\u610f", "consent"])),
    name: textValue(firstKnownValue(profile?.displayName, profile?.customerDisplayName, profile?.customerName, profile?.nickname, contact?.name, conversation?.peerDisplayName, conversation?.title)),
    netDeposit: textValue(profile?.netDeposit),
    netDepositDelta: textValue(firstKnownValue(profileValue(profile, ["netDepositDelta", "netDeposit7dDelta"]), tradingSummary.netDepositDelta)),
    nextFollowUp: textValue(valueAt(external, ["touch", "\u89e6\u8fbe", "marketing"], ["\u4e0b\u6b21\u8ddf\u8fdb", "nextFollowUp"])),
    lppId: textValue(lppId),
    isOnline: isOnlineState(onlineStatusRaw, onlineStatus, copy),
    onlineStatus,
    phoneMasked: textValue(firstKnownValue(profile?.phoneMasked, profile?.mobileMasked, profile?.mobile, profile?.phone, conversation?.peerPhoneMasked)),
    profileVisibility: textValue(profileValue(profile, ["profileVisibility"])),
    recent7dTrading,
    recentTradeTime: shortDate(tradingSummary.recentTradeTime ?? tradingSummary.lastTradeAt),
    registeredAt: shortDate(registeredAtRaw),
    registrationStatus,
    remark: textValue(profileExtra?.note),
    remoteLoginAlert: textValue(valueAt(external, ["device", "security", "\u8bbe\u5907"], ["\u5f02\u5730\u767b\u5f55\u63d0\u9192", "remoteLoginAlert"])),
    risk,
    sections: {
      trading: categorizedExternal.trading,
      funds: categorizedExternal.funds,
      sessions: categorizedExternal.sessions,
      touch: categorizedExternal.touch,
      compliance: categorizedExternal.compliance,
      device: categorizedExternal.device,
      other: categorizedExternal.other,
    },
    sessionCount: textValue(profile?.tabCounts?.sessions ?? profile?.tabCounts?.conversations),
    source,
    staffLanguage: textValue(profileValue(profile, ["staffLanguage", "viewLanguage"])),
    statusChips: buildStatusChips({ activationStatus, copy, registrationStatus, verificationStatus }),
    tags: tagsClean,
    temporaryOrders: profile?.temporaryOrders ?? [],
    tickets: profile?.tickets ?? [],
    totalDeposit: textValue(profile?.totalDeposit),
    totalDepositDelta: textValue(firstKnownValue(profileValue(profile, ["totalDepositDelta", "deposit7dDelta"]), tradingSummary.totalDepositDelta)),
    totalOrders: textValue(tradingSummary.totalOrders ?? profile?.tabCounts?.orders),
    touchCount: textValue(profile?.tabCounts?.touches ?? profile?.tabCounts?.campaigns),
    tradeProduct: textValue(tradingSummary.product ?? tradingSummary.symbol),
    translateMode: textValue(profileValue(profile, ["translateMode", "translationMode"])),
    twoFactor: textValue(valueAt(external, ["device", "security", "\u5b89\u5168"], ["2FA", "twoFactor"])),
    unreadCount: textValue(conversation ? conversation.unreadCount ?? 0 : undefined),
    verificationStatus,
    vipLevel: normalizeVipLevel(profile, level),
    winRate: textValue(tradingSummary.winRate),
  };
}

export function tabCount(tab: string, model: CustomerModel) {
  if (tab === "trading") return countSections(model.sections.trading, model.totalOrders) + model.temporaryOrders.length;
  if (tab === "funds") return countSections(model.sections.funds, "0");
  if (tab === "sessions") return Number(model.sessionCount) || 0;
  if (tab === "tickets") return model.tickets.length;
  if (tab === "touch") return countSections(model.sections.touch, model.touchCount);
  if (tab === "compliance") return countSections(model.sections.compliance, "0");
  if (tab === "agentDevice") return countSections(model.sections.device, "0");
  return 0;
}

const assetColors = ["#2563eb", "#38a8db", "#4cc9a6", "#f59e42", "#9b7af5", "#f06292"];
const defaultAssetRowColors = ["#2563eb", "#4f9df7", "#2fc79a", "#ff8a14"];

function buildStatusChips({
  activationStatus,
  copy,
  registrationStatus,
  verificationStatus,
}: {
  activationStatus: string;
  copy: CustomerModelCopy;
  registrationStatus: string;
  verificationStatus: string;
}): CustomerStatusChip[] {
  return [
    {
      empty: registrationStatus === copy.statuses.unregistered,
      label: registrationStatus,
      tone: registrationStatus === copy.statuses.unregistered ? "muted" : "registered",
    },
    {
      empty: activationStatus === copy.statuses.inactive,
      label: activationStatus,
      tone: activationStatus === copy.statuses.inactive ? "muted" : "active",
    },
    {
      empty: verificationStatus === copy.statuses.unverified,
      label: verificationStatus,
      tone: verificationStatus === copy.statuses.unverified ? "muted" : "verified",
    },
  ];
}

function buildAssetRows(assetMix: CustomerAssetMixItem[], copy: CustomerModelCopy): CustomerAssetRow[] {
  return defaultAssetRowColors.map((color, index) => {
    const item = assetMix[index];
    if (!item) {
      return {
        amount: "--",
        color,
        empty: true,
        name: copy.assetRows[index] ?? defaultCustomerModelCopy.assetRows[index] ?? "--",
        percentLabel: "--",
      };
    }
    return {
      amount: item.amount,
      color: item.color,
      empty: false,
      name: item.name,
      percentLabel: formatPercent(item.percent),
    };
  });
}

function buildAssetMix(
  profile: CustomerProfileCard | undefined,
  sections: ExternalSection[],
): CustomerAssetMixItem[] {
  const raw = firstKnownAssetSource(
    profileValue(profile, ["assetMix", "assetStructure", "assetAllocation", "assets"]),
    profile?.tradingSummary && (profile.tradingSummary as Record<string, unknown>).assetMix,
    valueAt(sections, ["asset", "assets", "\u8d44\u4ea7", "\u6301\u4ed3"], ["items", "assetMix", "assets"]),
    sectionsBy(sections, ["asset", "assets", "\u8d44\u4ea7", "\u6301\u4ed3"])[0]?.items,
  );
  const records =
    Array.isArray(raw)
      ? raw
      : raw && typeof raw === "object" && Array.isArray((raw as Record<string, unknown>).items)
        ? ((raw as Record<string, unknown>).items as unknown[])
        : raw && typeof raw === "object" && Array.isArray((raw as Record<string, unknown>).assets)
          ? ((raw as Record<string, unknown>).assets as unknown[])
          : [];
  return records
    .map((item, index) => {
      if (!item || typeof item !== "object") return null;
      const record = item as Record<string, unknown>;
      const name = textValue(firstKnownValue(record.name, record.assetName, record.product, record.symbol, record.type));
      const percent = numericValue(firstKnownValue(record.percent, record.percentage, record.ratio, record.weight));
      const amount = textValue(firstKnownValue(record.amount, record.value, record.balance, record.marketValue));
      if (!isKnown(name) || percent <= 0) return null;
      return {
        amount,
        color: textValue(record.color) !== "--" ? textValue(record.color) : assetColors[index % assetColors.length],
        name,
        percent,
      };
    })
    .filter((item): item is CustomerAssetMixItem => Boolean(item));
}

function buildRecent7dTrading(
  profile: CustomerProfileCard | undefined,
  sections: ExternalSection[],
  copy: CustomerModelCopy,
): CustomerRecent7dTrading {
  const tradingSummary = profile?.tradingSummary ?? {};
  const rawDays = firstKnownAssetSource(
    profileValue(profile, ["recent7dTrading", "recent7dTrades", "last7DaysTrading", "trading7d"]),
    tradingSummary.recent7dTrading,
    tradingSummary.trading7d,
    valueAt(sections, ["trade", "trading", "\u4ea4\u6613"], ["recent7dTrading", "trading7d", "days", "items"]),
    sectionsBy(sections, ["recent7d", "\u8fd17\u5929", "\u4e03\u5929"])[0]?.items,
  );
  const dayRecords = Array.isArray(rawDays)
    ? rawDays
    : rawDays && typeof rawDays === "object" && Array.isArray((rawDays as Record<string, unknown>).days)
      ? ((rawDays as Record<string, unknown>).days as unknown[])
      : [];
  const days = dayRecords
    .map((item, index) => {
      if (!item || typeof item !== "object") return null;
      const record = item as Record<string, unknown>;
      const label = textValue(firstKnownValue(record.label, record.date, record.day));
      const value = numericValue(firstKnownValue(record.value, record.volume, record.amount, record.tradeAmount));
      if (!isKnown(label) || value <= 0) return null;
      return {
        active: Boolean(record.active ?? record.isToday ?? index === dayRecords.length - 1),
        label,
        value,
      };
    })
    .filter((item): item is CustomerTrading7dDay => Boolean(item))
    .slice(-7);
  const summaryRecord =
    rawDays && typeof rawDays === "object" && !Array.isArray(rawDays)
      ? (rawDays as Record<string, unknown>)
      : tradingSummary;
  return {
    bars: buildRecent7dBars(days),
    days,
    deposit: textValue(firstKnownValue(summaryRecord.deposit, summaryRecord.totalDeposit7d, summaryRecord.deposit7d, profileValue(profile, ["recent7dDeposit"]))),
    latest: latestTradeLabel(profile, sections, copy),
    volume: textValue(firstKnownValue(summaryRecord.volume, summaryRecord.tradeVolume, summaryRecord.tradingVolume7d, profileValue(profile, ["recent7dTradeVolume"]))),
    withdrawal: textValue(firstKnownValue(summaryRecord.withdrawal, summaryRecord.withdraw, summaryRecord.totalWithdrawal7d, profileValue(profile, ["recent7dWithdrawal"]))),
  };
}

function buildRecent7dBars(days: CustomerTrading7dDay[]): CustomerRecent7dBar[] {
  const fallbackLabels = recent7dLabels();
  return fallbackLabels.map((label, index) => {
    const day = days[index];
    return day
      ? {
          active: day.active,
          empty: false,
          label: day.label,
          value: day.value,
        }
      : {
          active: index === fallbackLabels.length - 1,
          empty: true,
          label,
          value: 0,
        };
  });
}

function recent7dLabels() {
  const today = new Date();
  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(today);
    date.setDate(today.getDate() - (6 - index));
    return `${date.getMonth() + 1}/${date.getDate()}`;
  });
}

function latestTradeLabel(profile: CustomerProfileCard | undefined, sections: ExternalSection[], copy: CustomerModelCopy) {
  const tradingSummary = profile?.tradingSummary ?? {};
  const raw = firstNonEmptyValue(
    profileValue(profile, ["latestTrade", "lastTrade"]),
    tradingSummary.latestTrade,
    tradingSummary.lastTrade,
    valueAt(sections, ["trade", "trading", "\u4ea4\u6613"], ["latestTrade", "lastTrade"]),
  );
  if (typeof raw === "string") return textValue(raw);
  if (!raw || typeof raw !== "object") return "--";
  const record = raw as Record<string, unknown>;
  const symbol = textValue(firstKnownValue(record.symbol, record.product, record.name));
  const lot = textValue(firstKnownValue(record.lot, record.lots, record.volume, record.size));
  const pnl = textValue(firstKnownValue(record.pnl, record.profit, record.profitLoss, record.result));
  const parts = [
    isKnown(symbol) ? symbol : undefined,
    isKnown(lot) ? `${lot} ${copy.lotUnit}` : undefined,
    isKnown(pnl) ? pnl : undefined,
  ].filter(Boolean);
  return parts.length > 0 ? `${copy.latestTradePrefix} ${parts.join(" · ")}` : "--";
}

function firstKnownAssetSource(...values: unknown[]) {
  return values.find((value) => {
    if (Array.isArray(value)) return value.length > 0;
    if (!value || typeof value !== "object") return false;
    const record = value as Record<string, unknown>;
    return Array.isArray(record.items) || Array.isArray(record.days) || Array.isArray(record.assets);
  });
}

function firstNonEmptyValue(...values: unknown[]) {
  return values.find((value) => {
    if (Array.isArray(value)) return value.length > 0;
    if (value && typeof value === "object") return Object.keys(value).length > 0;
    return isKnown(textValue(value));
  });
}

function numericValue(value: unknown) {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  if (typeof value !== "string") return 0;
  const normalized = value.replace(/[%,$,\s]/g, "");
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

function normalizeOnlineStatus(value: unknown, copy: CustomerModelCopy) {
  if (typeof value === "boolean") return value ? copy.statuses.online : copy.statuses.offline;
  const text = textValue(value);
  const normalized = text.trim().toLowerCase();
  if (["online", "active", "yes", "true", "1", "\u5728\u7ebf"].includes(normalized)) return copy.statuses.online;
  if (["offline", "inactive", "no", "false", "0", "\u79bb\u7ebf"].includes(normalized)) return copy.statuses.offline;
  return isKnown(text) ? text : copy.statuses.offline;
}

function isOnlineState(value: unknown, normalizedStatus: string, copy: CustomerModelCopy) {
  if (typeof value === "boolean") return value;
  const text = textValue(value).trim().toLowerCase();
  return normalizedStatus === copy.statuses.online || ["online", "active", "yes", "true", "1", "\u5728\u7ebf"].includes(text);
}

function normalizeRegistrationStatus(value: unknown, registeredAt: unknown, copy: CustomerModelCopy) {
  if (typeof value === "boolean") return value ? copy.statuses.registered : copy.statuses.unregistered;
  const text = textValue(value);
  const normalized = text.trim().toLowerCase();
  if (["\u662f", "\u5df2\u6ce8\u518c", "\u6210\u529f"].includes(text) || ["yes", "registered", "success", "true", "1"].includes(normalized)) return copy.statuses.registered;
  if (["\u5426", "\u672a\u6ce8\u518c", "\u672a\u5f00\u6237"].includes(text) || ["no", "unregistered", "false", "0"].includes(normalized)) return copy.statuses.unregistered;
  if (isKnown(text) && isKnown(textValue(registeredAt))) return copy.statuses.registered;
  if (isKnown(text)) return text;
  return isKnown(textValue(registeredAt)) ? copy.statuses.registered : copy.statuses.unregistered;
}

function normalizeActivationStatus(value: unknown, copy: CustomerModelCopy) {
  if (typeof value === "boolean") return value ? copy.statuses.active : copy.statuses.inactive;
  const text = textValue(value);
  const normalized = text.trim().toLowerCase();
  if (!isKnown(text)) return copy.statuses.inactive;
  if (["\u6d3b\u8dc3", "\u5df2\u542f\u7528", "\u5df2\u901a\u8fc7", "\u6210\u529f"].includes(text) || ["active", "enabled", "accepted", "success", "yes", "true", "1"].includes(normalized)) return copy.statuses.active;
  if (["\u5426", "\u672a\u542f\u7528", "\u672a\u6fc0\u6d3b", "\u7981\u7528", "\u5df2\u7981\u7528"].includes(text) || ["inactive", "disabled", "failed", "no", "false", "0"].includes(normalized)) return copy.statuses.inactive;
  return text;
}

function normalizeVerificationStatus(value: unknown, copy: CustomerModelCopy) {
  if (typeof value === "boolean") return value ? copy.statuses.verified : copy.statuses.unverified;
  const text = textValue(value);
  const normalized = text.trim().toLowerCase();
  if (!isKnown(text)) return copy.statuses.unverified;
  if (["\u5df2\u901a\u8fc7", "\u5df2\u5ba1\u6838", "\u6210\u529f"].includes(text) || ["accepted", "reviewed", "success", "verified", "yes", "true", "1"].includes(normalized)) return copy.statuses.verified;
  if (["\u5426", "\u5931\u8d25", "\u5df2\u62d2\u7edd", "\u672a\u8ba4\u8bc1"].includes(text) || ["failed", "rejected", "unverified", "no", "false", "0"].includes(normalized)) return copy.statuses.unverified;
  return text;
}

function normalizeVipLevel(profile: CustomerProfileCard | undefined, level: string) {
  if (profile?.isVip) return isKnown(level) && level !== "\u666e\u901a\u5ba2\u6237" ? level : "VIP";
  return isVipLabel(level) ? level : "--";
}

function riskLabel(value: string) {
  if (["\u9ad8", "\u9ad8\u98ce\u9669"].includes(value)) return "\u9ad8\u98ce\u9669";
  return value;
}

function riskTone(value: string) {
  const normalized = value.toLowerCase();
  if (["\u9ad8", "\u9ad8\u98ce\u9669", "high", "red", "warning", "\u5f02\u5e38"].some((key) => normalized.includes(key))) {
    return "risk";
  }
  return "muted";
}

function formatPercent(value: number) {
  return `${Number.isInteger(value) ? value : value.toFixed(1)}%`;
}

function isVipLabel(value: string) {
  return value.trim().toLowerCase().includes("vip");
}

function categorizeSections(sections: ExternalSection[]) {
  const groups: CustomerModel["sections"] = {
    trading: [],
    funds: [],
    sessions: [],
    touch: [],
    compliance: [],
    device: [],
    other: [],
  };
  for (const section of sections) {
    const haystack = `${section.type ?? ""} ${section.sectionType ?? ""} ${section.title ?? ""}`.toLowerCase();
    if (["trade", "trading", "transaction", "\u4ea4\u6613", "\u8ba2\u5355"].some((key) => haystack.includes(key))) {
      groups.trading.push(section);
    } else if (["fund", "cash", "capital", "\u8d44\u91d1", "\u6d41\u6c34"].some((key) => haystack.includes(key))) {
      groups.funds.push(section);
    } else if (["session", "conversation", "\u4f1a\u8bdd"].some((key) => haystack.includes(key))) {
      groups.sessions.push(section);
    } else if (["touch", "marketing", "campaign", "\u89e6\u8fbe", "\u8425\u9500"].some((key) => haystack.includes(key))) {
      groups.touch.push(section);
    } else if (["kyc", "aml", "compliance", "\u5408\u89c4"].some((key) => haystack.includes(key))) {
      groups.compliance.push(section);
    } else if (["device", "login", "\u8bbe\u5907", "\u5b89\u5168"].some((key) => haystack.includes(key))) {
      groups.device.push(section);
    } else {
      groups.other.push(section);
    }
  }
  return groups;
}

function countSections(sections: ExternalSection[], fallback: string) {
  const count = sections.reduce((sum, section) => sum + sectionToItems(section).length, 0);
  return count || Number(fallback) || 0;
}

function sectionsBy(sections: ExternalSection[], keys: string[]) {
  return sections.filter((section) => {
    const haystack = `${section.type ?? ""} ${section.sectionType ?? ""} ${section.title ?? ""}`.toLowerCase();
    return keys.some((key) => haystack.includes(key.toLowerCase()));
  });
}

export function sectionToItems(section: ExternalSection, copy: CustomerModelCopy = defaultCustomerModelCopy) {
  const items = Array.isArray(section.items) ? section.items : [];
  if (items.length > 0) {
    return items.map((item, index) => ({
      title: textValue(
        item.title ?? item.name ?? item.orderNo ?? item.id ?? section.title ?? copy.recordTitle.replace("{index}", String(index + 1)),
        copy,
      ),
      meta: [item.status, item.type, item.updatedAt, item.createdAt].map((value) => textValue(value, copy)).filter(isKnown),
      fields: normalizeRecord(item, copy),
    }));
  }
  const fields =
    Array.isArray(section.fields)
      ? section.fields.flatMap((field) => normalizeRecord(field, copy))
      : normalizeRecord(section.fields ?? section, copy);
  return fields.length > 0
    ? [{ title: textValue(section.title ?? section.type ?? copy.sectionDetailTitle, copy), meta: [], fields }]
    : [];
}

export function normalizeRecord(value: unknown, copy: CustomerModelCopy = defaultCustomerModelCopy): Array<[string, string]> {
  if (!value || typeof value !== "object") return [];
  if (Array.isArray(value)) return value.flatMap((item) => normalizeRecord(item, copy));
  return Object.entries(value as Record<string, unknown>)
    .filter(([key]) => !["items", "fields", "type", "sectionType", "title"].includes(key))
    .map(([key, val]) => [fieldLabel(key, copy), textValue(val, copy)] as [string, string])
    .filter(([, val]) => isKnown(val));
}

function valueAt(sections: ExternalSection[], sectionKeys: string[], fieldKeys: string[]) {
  const section = sectionsBy(sections, sectionKeys)[0];
  if (!section) return undefined;
  const records = [
    ...(Array.isArray(section.items) ? section.items : []),
    ...(Array.isArray(section.fields) ? section.fields : []),
    section.fields && !Array.isArray(section.fields) ? section.fields : undefined,
    section,
  ].filter(Boolean) as Array<Record<string, unknown>>;
  for (const record of records) {
    for (const key of fieldKeys) {
      const exact = record[key];
      if (isKnown(textValue(exact))) return exact;
      const found = Object.entries(record).find(([field]) => field.toLowerCase() === key.toLowerCase());
      if (found && isKnown(textValue(found[1]))) return found[1];
    }
  }
  return undefined;
}

function profileValue(profile: CustomerProfileCard | undefined, keys: string[]) {
  if (!profile) return undefined;
  const record = profile as Record<string, unknown>;
  for (const key of keys) {
    if (record[key] !== undefined && record[key] !== null && record[key] !== "") return record[key];
  }
  return undefined;
}

function firstKnownValue(...values: unknown[]) {
  return values.find((value) => isKnown(textValue(value)));
}

function sourceLabel(profile?: CustomerProfileCard) {
  const raw = profileValue(profile, [
    "source",
    "sourceChannel",
    "source_channel",
    "entryChannel",
    "entry_channel",
    "channel",
    "from",
    "platform",
    "provider",
  ]);
  const source = textValue(raw);
  return isKnown(source) ? channelLabel(source) : "--";
}

function shortDate(value: unknown) {
  const text = textValue(value);
  if (!isKnown(text)) return "--";
  return formatShortDate(text);
}

function shortTime(value: unknown) {
  const text = textValue(value);
  if (!isKnown(text)) return "--";
  const date = new Date(text);
  if (!Number.isNaN(date.getTime())) {
    return date.toLocaleTimeString("zh-CN", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  }
  return text;
}

export function textValue(value: unknown, copy: CustomerModelCopy = defaultCustomerModelCopy): string {
  if (value === undefined || value === null || value === "") return "--";
  if (typeof value === "number") return Number.isFinite(value) ? String(value) : "--";
  if (typeof value === "boolean") return value ? copy.booleans.yes : copy.booleans.no;
  if (Array.isArray(value)) return value.map((item) => textValue(item, copy)).filter(isKnown).join(" / ") || "--";
  if (typeof value === "object") return "--";
  return enumLabel(String(value), copy);
}

export function isKnown(value: unknown): value is string {
  return typeof value === "string" && value.trim() !== "" && value !== "--";
}

function enumLabel(value: string, copy: CustomerModelCopy) {
  const normalized = value.trim().toLowerCase().replace(/[\s-]+/g, "_");
  return copy.enumLabels[normalized] ?? value;
}

function fieldLabel(key: string, copy: CustomerModelCopy) {
  return copy.fieldLabels[key] ?? key;
}
