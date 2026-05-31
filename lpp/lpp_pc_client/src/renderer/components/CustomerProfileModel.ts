import type { ConversationListItem, CustomerProfileCard } from "../data/api-client";
import type { ContactItem } from "../data/types";
import { formatChatTime, formatShortDate } from "../lib/format";
import { channelLabel } from "./ChannelBadge";

export type ExternalSection = NonNullable<CustomerProfileCard["externalSections"]>[number];

export interface CustomerModel {
  accountBalance: string;
  accountStatus: string;
  agent: string;
  agentCreatedAt: string;
  agentType: string;
  appName: string;
  assignedStaff: string;
  avatarUrl?: string | null;
  businessLine: string;
  commissionRate: string;
  complianceNote: string;
  country: string;
  customerId: string;
  customerLanguage: string;
  emailMasked: string;
  friendUserId: string;
  id: string;
  kyc: string;
  language: string;
  lastActive: string;
  lastDevice: string;
  lastIp: string;
  lastMessage: string;
  lastMessageTime: string;
  latestFundTime: string;
  latestTouchChannel: string;
  level: string;
  marketingConsent: string;
  name: string;
  netDeposit: string;
  nextFollowUp: string;
  lppId: string;
  phoneMasked: string;
  profileVisibility: string;
  recentTradeTime: string;
  registeredAt: string;
  remark: string;
  remoteLoginAlert: string;
  risk: string;
  sections: Record<"trading" | "funds" | "sessions" | "touch" | "compliance" | "device" | "other", ExternalSection[]>;
  sessionCount: string;
  source: string;
  staffLanguage: string;
  tags: string[];
  temporaryOrders: Array<Record<string, unknown>>;
  tickets: Array<Record<string, unknown>>;
  totalDeposit: string;
  totalOrders: string;
  touchCount: string;
  tradeProduct: string;
  translateMode: string;
  twoFactor: string;
  unreadCount: string;
  winRate: string;
}

export function buildCustomerModel({
  avatarUrl,
  conversation,
  contact,
  profile,
}: {
  avatarUrl?: string | null;
  conversation?: ConversationListItem;
  contact?: ContactItem | null;
  profile?: CustomerProfileCard;
}): CustomerModel {
  const external = profile?.externalSections ?? [];
  const tradingSummary = profile?.tradingSummary ?? {};
  const tags = [...(profile?.tags ?? []), ...(contact?.tags ?? [])].filter(Boolean);
  const categorizedExternal = categorizeSections(external);
  const profileSource = sourceLabel(profile);
  const source = isKnown(profileSource) ? profileSource : contact?.source || "--";
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
  return {
    accountBalance: textValue(profile?.accountBalance),
    accountStatus: textValue(profile?.accountStatus ?? tradingSummary.accountStatus),
    agent: textValue(profile?.ib ?? tradingSummary.ib),
    agentCreatedAt: shortDate(valueAt(external, ["ib", "agent", "代理"], ["建立时间", "createdAt"])),
    agentType: textValue(valueAt(external, ["ib", "agent", "代理"], ["类型", "agentType"])),
    appName: textValue(
      profileValue(profile, ["appName", "appDisplayName", "packageName", "brandName", "tenantAppName"]),
    ),
    assignedStaff: textValue(profile?.assignedAgentName ?? profileValue(profile, ["assignedStaffName", "assignedStaffDisplayName"])),
    avatarUrl: profile?.avatarUrl || avatarUrl || conversation?.avatarUrl || contact?.avatarUrl,
    businessLine: textValue(profileValue(profile, ["businessLine", "business", "line"])),
    commissionRate: textValue(valueAt(external, ["ib", "agent", "代理"], ["佣金比例", "commissionRate"])),
    complianceNote: textValue(valueAt(external, ["kyc", "compliance", "合规"], ["备注", "note"])),
    country: textValue(profile?.country),
    customerId: textValue(firstKnownValue(profile?.customerUserId, profile?.customerId, profile?.userId, conversation?.peerUserId, contact?.userId, contact?.id)),
    customerLanguage: textValue(profileValue(profile, ["customerLanguage", "receiveLanguage", "preferredLanguage"]) ?? profile?.language),
    emailMasked: textValue(firstKnownValue(profile?.emailMasked, profile?.email, conversation?.peerEmailMasked)),
    friendUserId: textValue(firstKnownValue(contact?.userId, conversation?.peerUserId)),
    id: String(firstKnownValue(profile?.customerUserId, profile?.customerId, profile?.userId, conversation?.peerUserId, contact?.userId, contact?.id, conversation?.conversationId) ?? "customer"),
    kyc: textValue(firstKnownValue(profile?.kycStatus, profile?.kyc, profile?.kycLevel, profile?.complianceStatus, valueAt(external, ["kyc", "compliance", "合规"], ["状态", "status", "kycStatus", "kyc"]))),
    language: textValue(profileValue(profile, ["language", "customerLanguage", "preferredLanguage"])),
    lastActive: shortDate(profile?.lastActiveAt ?? contact?.lastMessageAt),
    lastDevice: textValue(valueAt(external, ["device", "设备"], ["设备", "device", "name"])),
    lastIp: textValue(valueAt(external, ["device", "设备"], ["IP", "ip", "lastIp"])),
    lastMessage: textValue(conversation?.lastMessage?.preview),
    lastMessageTime: formatChatTime(conversation?.lastMessage?.sentAt),
    latestFundTime: shortDate(valueAt(external, ["fund", "资金", "cash"], ["最近时间", "updatedAt", "createdAt"])),
    latestTouchChannel: textValue(valueAt(external, ["touch", "触达", "marketing"], ["渠道", "channel"])),
    level: textValue(firstKnownValue(profile?.customerLevel, profile?.level, profile?.grade, profile?.rank, profile?.isVip ? "VIP" : undefined)),
    marketingConsent: textValue(valueAt(external, ["marketing", "consent", "营销"], ["同意", "consent"])),
    name: textValue(firstKnownValue(profile?.displayName, profile?.customerDisplayName, profile?.customerName, profile?.nickname, contact?.name, conversation?.peerDisplayName, conversation?.title)),
    netDeposit: textValue(profile?.netDeposit),
    nextFollowUp: textValue(valueAt(external, ["touch", "触达", "marketing"], ["下次跟进", "nextFollowUp"])),
    lppId: textValue(lppId),
    phoneMasked: textValue(firstKnownValue(profile?.phoneMasked, profile?.mobileMasked, profile?.mobile, profile?.phone, conversation?.peerPhoneMasked)),
    profileVisibility: textValue(profileValue(profile, ["profileVisibility"])),
    recentTradeTime: shortDate(tradingSummary.recentTradeTime ?? tradingSummary.lastTradeAt),
    registeredAt: shortDate(profile?.registeredAt ?? tradingSummary.registeredAt),
    remark: textValue(firstKnownValue(
      profileValue(profile, ["customerRemark", "remarkName", "remark", "note"]),
      contact?.remark,
    )),
    remoteLoginAlert: textValue(valueAt(external, ["device", "security", "设备"], ["异地登录提醒", "remoteLoginAlert"])),
    risk: textValue(firstKnownValue(profile?.riskLevel, profile?.risk, profile?.riskStatus, valueAt(external, ["risk", "kyc", "compliance", "风险", "合规"], ["风险", "risk", "riskLevel", "riskStatus"]))),
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
    tags: Array.from(new Set(tags.map(textValue).filter(isKnown))),
    temporaryOrders: profile?.temporaryOrders ?? [],
    tickets: profile?.tickets ?? [],
    totalDeposit: textValue(profile?.totalDeposit),
    totalOrders: textValue(tradingSummary.totalOrders ?? profile?.tabCounts?.orders),
    touchCount: textValue(profile?.tabCounts?.touches ?? profile?.tabCounts?.campaigns),
    tradeProduct: textValue(tradingSummary.product ?? tradingSummary.symbol),
    translateMode: textValue(profileValue(profile, ["translateMode", "translationMode"])),
    twoFactor: textValue(valueAt(external, ["device", "security", "安全"], ["2FA", "twoFactor"])),
    unreadCount: textValue(conversation ? conversation.unreadCount ?? 0 : undefined),
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
  const raw =
    profile?.source ||
    profile?.sourceChannel ||
    profile?.entryChannel ||
    profile?.channel ||
    profile?.from ||
    profile?.platform ||
    profile?.provider;
  return raw ? channelLabel(raw) : "--";
}

function shortDate(value: unknown) {
  const text = textValue(value);
  if (!isKnown(text)) return "--";
  return formatShortDate(text);
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
