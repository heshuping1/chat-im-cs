import type {
  ConversationListItem,
  CustomerProfileCard,
  FriendProfileExtraDto,
} from "../data/api-client";
import type { ContactItem } from "../data/types";
import { formatChatTime, formatShortDate } from "../lib/format";
import { channelLabel } from "./ChannelBadge";

export type ExternalSection = NonNullable<CustomerProfileCard["externalSections"]>[number];

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

export function buildCustomerModel({
  avatarUrl,
  conversation,
  contact,
  profile,
  profileExtra,
}: {
  avatarUrl?: string | null;
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
    valueAt(external, ["identity", "profile", "customer", "客户", "核心身份"], [
      "绿泡泡号",
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
  const activationStatus = normalizeActivationStatus(firstKnownValue(profileValue(profile, ["activationStatus", "activatedStatus", "isActivated", "activeStatus"]), profile?.accountStatus, tradingSummary.accountStatus));
  const kyc = textValue(firstKnownValue(profile?.kycStatus, profile?.kyc, profile?.kycLevel, profile?.complianceStatus, valueAt(external, ["kyc", "compliance", "合规"], ["状态", "status", "kycStatus", "kyc"])));
  const recent7dTrading = buildRecent7dTrading(profile, external);
  const risk = textValue(firstKnownValue(profile?.riskLevel, profile?.risk, profile?.riskStatus, valueAt(external, ["risk", "kyc", "compliance", "风险", "合规"], ["风险", "risk", "riskLevel", "riskStatus"])));
  const tagsClean = Array.from(new Set(tags.map(textValue).filter(isKnown).filter((tag) => !isVipLabel(tag))));
  const verificationStatus = normalizeVerificationStatus(firstKnownValue(profileValue(profile, ["verificationStatus", "verifiedStatus", "isVerified"]), profile?.kycStatus, profile?.complianceStatus));
  const registeredAtRaw = firstKnownValue(profile?.registeredAt, tradingSummary.registeredAt);
  const registrationStatus = normalizeRegistrationStatus(
    firstKnownValue(profileValue(profile, ["registrationStatus", "registeredStatus", "isRegistered", "registered"]), registeredAtRaw),
    registeredAtRaw,
  );
  return {
    accountBalance: textValue(profile?.accountBalance),
    accountBalanceDelta: textValue(firstKnownValue(profileValue(profile, ["accountBalanceDelta", "balanceDelta", "balance7dDelta"]), tradingSummary.accountBalanceDelta)),
    accountStatus: textValue(profile?.accountStatus ?? tradingSummary.accountStatus),
    activationStatus,
    agent,
    agentCreatedAt: shortDate(valueAt(external, ["ib", "agent", "代理"], ["建立时间", "createdAt"])),
    agentType: textValue(valueAt(external, ["ib", "agent", "代理"], ["类型", "agentType"])),
    appName,
    assetMix,
    assetRows: buildAssetRows(assetMix),
    assignedStaff: textValue(profile?.assignedAgentName ?? profileValue(profile, ["assignedStaffName", "assignedStaffDisplayName"])),
    avatarUrl: profile?.avatarUrl || avatarUrl || conversation?.avatarUrl || contact?.avatarUrl,
    businessLine: textValue(profileValue(profile, ["businessLine", "business", "line"])),
    channelApp: appName,
    commissionRate: textValue(valueAt(external, ["ib", "agent", "代理"], ["佣金比例", "commissionRate"])),
    complianceNote: textValue(valueAt(external, ["kyc", "compliance", "合规"], ["备注", "note"])),
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
    lastDevice: textValue(valueAt(external, ["device", "设备"], ["设备", "device", "name"])),
    lastIp: textValue(valueAt(external, ["device", "设备"], ["IP", "ip", "lastIp"])),
    lastMessage: textValue(conversation?.lastMessage?.preview),
    lastMessageTime: formatChatTime(conversation?.lastMessage?.sentAt),
    lastProfileUpdatedAt: shortTime(firstKnownValue(profileValue(profile, ["updatedAt", "lastUpdatedAt", "profileUpdatedAt"]), tradingSummary.updatedAt)),
    latestFundTime: shortDate(valueAt(external, ["fund", "资金", "cash"], ["最近时间", "updatedAt", "createdAt"])),
    latestTouchChannel: textValue(valueAt(external, ["touch", "触达", "marketing"], ["渠道", "channel"])),
    level,
    marketingConsent: textValue(valueAt(external, ["marketing", "consent", "营销"], ["同意", "consent"])),
    name: textValue(firstKnownValue(profile?.displayName, profile?.customerDisplayName, profile?.customerName, profile?.nickname, contact?.name, conversation?.peerDisplayName, conversation?.title)),
    netDeposit: textValue(profile?.netDeposit),
    netDepositDelta: textValue(firstKnownValue(profileValue(profile, ["netDepositDelta", "netDeposit7dDelta"]), tradingSummary.netDepositDelta)),
    nextFollowUp: textValue(valueAt(external, ["touch", "触达", "marketing"], ["下次跟进", "nextFollowUp"])),
    lppId: textValue(lppId),
    onlineStatus: normalizeOnlineStatus(firstKnownValue(profileValue(profile, ["onlineStatus", "presence", "isOnline"]), contact?.online)),
    phoneMasked: textValue(firstKnownValue(profile?.phoneMasked, profile?.mobileMasked, profile?.mobile, profile?.phone, conversation?.peerPhoneMasked)),
    profileVisibility: textValue(profileValue(profile, ["profileVisibility"])),
    recent7dTrading,
    recentTradeTime: shortDate(tradingSummary.recentTradeTime ?? tradingSummary.lastTradeAt),
    registeredAt: shortDate(registeredAtRaw),
    registrationStatus,
    remark: textValue(profileExtra?.note),
    remoteLoginAlert: textValue(valueAt(external, ["device", "security", "设备"], ["异地登录提醒", "remoteLoginAlert"])),
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
    statusChips: buildStatusChips({ activationStatus, registrationStatus, verificationStatus }),
    tags: tagsClean,
    temporaryOrders: profile?.temporaryOrders ?? [],
    tickets: profile?.tickets ?? [],
    totalDeposit: textValue(profile?.totalDeposit),
    totalDepositDelta: textValue(firstKnownValue(profileValue(profile, ["totalDepositDelta", "deposit7dDelta"]), tradingSummary.totalDepositDelta)),
    totalOrders: textValue(tradingSummary.totalOrders ?? profile?.tabCounts?.orders),
    touchCount: textValue(profile?.tabCounts?.touches ?? profile?.tabCounts?.campaigns),
    tradeProduct: textValue(tradingSummary.product ?? tradingSummary.symbol),
    translateMode: textValue(profileValue(profile, ["translateMode", "translationMode"])),
    twoFactor: textValue(valueAt(external, ["device", "security", "安全"], ["2FA", "twoFactor"])),
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
const defaultAssetRows = [
  { color: "#2563eb", name: "黄金" },
  { color: "#4f9df7", name: "外汇" },
  { color: "#2fc79a", name: "指数" },
  { color: "#ff8a14", name: "商品" },
];

function buildStatusChips({
  activationStatus,
  registrationStatus,
  verificationStatus,
}: {
  activationStatus: string;
  registrationStatus: string;
  verificationStatus: string;
}): CustomerStatusChip[] {
  return [
    {
      empty: registrationStatus === "未注册",
      label: registrationStatus,
      tone: registrationStatus === "未注册" ? "muted" : "registered",
    },
    {
      empty: activationStatus === "未激活",
      label: activationStatus,
      tone: activationStatus === "未激活" ? "muted" : "active",
    },
    {
      empty: verificationStatus === "未认证",
      label: verificationStatus,
      tone: verificationStatus === "未认证" ? "muted" : "verified",
    },
  ];
}

function buildAssetRows(assetMix: CustomerAssetMixItem[]): CustomerAssetRow[] {
  return defaultAssetRows.map((fallback, index) => {
    const item = assetMix[index];
    if (!item) {
      return {
        amount: "--",
        color: fallback.color,
        empty: true,
        name: fallback.name,
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
    valueAt(sections, ["asset", "assets", "资产", "持仓"], ["items", "assetMix", "assets"]),
    sectionsBy(sections, ["asset", "assets", "资产", "持仓"])[0]?.items,
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
): CustomerRecent7dTrading {
  const tradingSummary = profile?.tradingSummary ?? {};
  const rawDays = firstKnownAssetSource(
    profileValue(profile, ["recent7dTrading", "recent7dTrades", "last7DaysTrading", "trading7d"]),
    tradingSummary.recent7dTrading,
    tradingSummary.trading7d,
    valueAt(sections, ["trade", "trading", "交易"], ["recent7dTrading", "trading7d", "days", "items"]),
    sectionsBy(sections, ["recent7d", "近7天", "七天"])[0]?.items,
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
    latest: latestTradeLabel(profile, sections),
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

function latestTradeLabel(profile: CustomerProfileCard | undefined, sections: ExternalSection[]) {
  const tradingSummary = profile?.tradingSummary ?? {};
  const raw = firstNonEmptyValue(
    profileValue(profile, ["latestTrade", "lastTrade"]),
    tradingSummary.latestTrade,
    tradingSummary.lastTrade,
    valueAt(sections, ["trade", "trading", "交易"], ["latestTrade", "lastTrade"]),
  );
  if (typeof raw === "string") return textValue(raw);
  if (!raw || typeof raw !== "object") return "--";
  const record = raw as Record<string, unknown>;
  const symbol = textValue(firstKnownValue(record.symbol, record.product, record.name));
  const lot = textValue(firstKnownValue(record.lot, record.lots, record.volume, record.size));
  const pnl = textValue(firstKnownValue(record.pnl, record.profit, record.profitLoss, record.result));
  const parts = [
    isKnown(symbol) ? symbol : undefined,
    isKnown(lot) ? `${lot} 手` : undefined,
    isKnown(pnl) ? pnl : undefined,
  ].filter(Boolean);
  return parts.length > 0 ? `最近一次交易 ${parts.join(" · ")}` : "--";
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

function normalizeOnlineStatus(value: unknown) {
  if (typeof value === "boolean") return value ? "在线" : "离线";
  const text = textValue(value);
  return isKnown(text) ? text : "离线";
}

function normalizeRegistrationStatus(value: unknown, registeredAt: unknown) {
  if (typeof value === "boolean") return value ? "已注册" : "未注册";
  const text = textValue(value);
  if (["是", "已注册", "registered", "success", "成功"].includes(text)) return "已注册";
  if (["否", "未注册", "unregistered", "未开户"].includes(text)) return "未注册";
  if (isKnown(text) && isKnown(textValue(registeredAt))) return "已注册";
  if (isKnown(text)) return text;
  return isKnown(textValue(registeredAt)) ? "已注册" : "未注册";
}

function normalizeActivationStatus(value: unknown) {
  if (typeof value === "boolean") return value ? "已激活" : "未激活";
  const text = textValue(value);
  if (!isKnown(text)) return "未激活";
  if (["活跃", "已启用", "已通过", "成功"].includes(text)) return "已激活";
  if (["否", "未启用", "未激活", "禁用", "已禁用"].includes(text)) return "未激活";
  return text;
}

function normalizeVerificationStatus(value: unknown) {
  if (typeof value === "boolean") return value ? "已认证" : "未认证";
  const text = textValue(value);
  if (!isKnown(text)) return "未认证";
  if (["已通过", "已审核", "成功"].includes(text)) return "已认证";
  if (["否", "失败", "已拒绝", "未认证"].includes(text)) return "未认证";
  return text;
}

function normalizeVipLevel(profile: CustomerProfileCard | undefined, level: string) {
  if (profile?.isVip) return isKnown(level) && level !== "普通客户" ? level : "VIP";
  return isVipLabel(level) ? level : "--";
}

function riskLabel(value: string) {
  if (["高", "高风险"].includes(value)) return "高风险";
  return value;
}

function riskTone(value: string) {
  const normalized = value.toLowerCase();
  if (["高", "高风险", "high", "red", "warning", "异常"].some((key) => normalized.includes(key))) {
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
    if (["trade", "trading", "transaction", "交易", "订单"].some((key) => haystack.includes(key))) {
      groups.trading.push(section);
    } else if (["fund", "cash", "capital", "资金", "流水"].some((key) => haystack.includes(key))) {
      groups.funds.push(section);
    } else if (["session", "conversation", "会话"].some((key) => haystack.includes(key))) {
      groups.sessions.push(section);
    } else if (["touch", "marketing", "campaign", "触达", "营销"].some((key) => haystack.includes(key))) {
      groups.touch.push(section);
    } else if (["kyc", "aml", "compliance", "合规"].some((key) => haystack.includes(key))) {
      groups.compliance.push(section);
    } else if (["device", "login", "设备", "安全"].some((key) => haystack.includes(key))) {
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

export function sectionToItems(section: ExternalSection) {
  const items = Array.isArray(section.items) ? section.items : [];
  if (items.length > 0) {
    return items.map((item, index) => ({
      title: textValue(item.title ?? item.name ?? item.orderNo ?? item.id ?? section.title ?? `记录 ${index + 1}`),
      meta: [item.status, item.type, item.updatedAt, item.createdAt].map(textValue).filter(isKnown),
      fields: normalizeRecord(item),
    }));
  }
  const fields =
    Array.isArray(section.fields)
      ? section.fields.flatMap(normalizeRecord)
      : normalizeRecord(section.fields ?? section);
  return fields.length > 0
    ? [{ title: textValue(section.title ?? section.type ?? "详情"), meta: [], fields }]
    : [];
}

export function normalizeRecord(value: unknown): Array<[string, string]> {
  if (!value || typeof value !== "object") return [];
  if (Array.isArray(value)) return value.flatMap((item) => normalizeRecord(item));
  return Object.entries(value as Record<string, unknown>)
    .filter(([key]) => !["items", "fields", "type", "sectionType", "title"].includes(key))
    .map(([key, val]) => [fieldLabel(key), textValue(val)] as [string, string])
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

export function textValue(value: unknown): string {
  if (value === undefined || value === null || value === "") return "--";
  if (typeof value === "number") return Number.isFinite(value) ? String(value) : "--";
  if (typeof value === "boolean") return value ? "是" : "否";
  if (Array.isArray(value)) return value.map(textValue).filter(isKnown).join(" / ") || "--";
  if (typeof value === "object") return "--";
  return enumLabel(String(value));
}

export function isKnown(value: unknown): value is string {
  return typeof value === "string" && value.trim() !== "" && value !== "--";
}

function enumLabel(value: string) {
  const normalized = value.trim().toLowerCase().replace(/[\s-]+/g, "_");
  const map: Record<string, string> = {
    accepted: "已通过",
    active: "活跃",
    app: "自有 App",
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
    mobile_app: "移动 App",
    native: "自有 App",
    no: "否",
    nobody: "不允许",
    offline: "离线",
    online: "在线",
    own_app: "自有 App",
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
  };
  return map[normalized] ?? value;
}

function fieldLabel(key: string) {
  const map: Record<string, string> = {
    accountBalance: "账户余额",
    amount: "金额",
    createdAt: "创建时间",
    netDeposit: "净入金",
    product: "产品",
    status: "状态",
    symbol: "品种",
    totalDeposit: "累计入金",
    type: "类型",
    updatedAt: "更新时间",
  };
  return map[key] ?? key;
}
