import {
  BadgeCheck,
  BriefcaseBusiness,
  ChevronDown,
  ChevronUp,
  ClipboardList,
  Languages,
  MessageCircleMore,
  Radio,
  ReceiptText,
  ShieldCheck,
  Smartphone,
  Tags,
  WalletCards,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { ConversationListItem, CustomerProfileCard } from "../data/api-client";
import type { ContactItem } from "../data/types";
import { formatChatTime } from "../lib/format";
import { channelLabel } from "./ChannelBadge";
import { PcAvatar } from "./PcAvatar";

type CustomerTab =
  | "overview"
  | "trading"
  | "funds"
  | "sessions"
  | "tickets"
  | "touch"
  | "compliance"
  | "agentDevice";

type ExternalSection = NonNullable<CustomerProfileCard["externalSections"]>[number];

const tabs: Array<{ key: CustomerTab; label: string; icon: LucideIcon }> = [
  { key: "overview", label: "总览", icon: Tags },
  { key: "trading", label: "交易记录", icon: ReceiptText },
  { key: "funds", label: "资金流水", icon: WalletCards },
  { key: "sessions", label: "会话", icon: MessageCircleMore },
  { key: "tickets", label: "工单", icon: ClipboardList },
  { key: "touch", label: "触达", icon: Radio },
  { key: "compliance", label: "KYC/合规", icon: ShieldCheck },
  { key: "agentDevice", label: "代理/设备", icon: Smartphone },
];

export function CustomerProfileWorkspace({
  avatarUrl,
  className = "",
  conversation,
  contact,
  error,
  loading = false,
  profile,
  title = "客户信息",
}: {
  avatarUrl?: string | null;
  className?: string;
  conversation?: ConversationListItem;
  contact?: ContactItem | null;
  error?: unknown;
  loading?: boolean;
  profile?: CustomerProfileCard;
  title?: string;
}) {
  const [activeTab, setActiveTab] = useState<CustomerTab>("overview");
  const [tabsExpanded, setTabsExpanded] = useState(false);
  const model = useMemo(
    () => buildCustomerModel({ avatarUrl, conversation, contact, profile }),
    [avatarUrl, conversation, contact, profile],
  );
  const visibleTabs = tabsExpanded ? tabs : tabs.slice(0, 5);
  const hasMoreTabs = tabs.length > visibleTabs.length;

  useEffect(() => {
    setActiveTab("overview");
    setTabsExpanded(false);
  }, [model.id]);

  return (
    <aside className={`customer-profile-workspace customer-info-panel ${className}`.trim()}>
      <header className="customer-info-head">
        <h2>{title}</h2>
      </header>

      <section className="customer-profile-hero">
        <PcAvatar avatarUrl={model.avatarUrl} className="e-avatar" name={model.name} />
        <div>
          <strong>{model.name}</strong>
          <p>
            {[model.level, model.kyc, model.risk, model.source].filter(isKnown).join(" · ") ||
              "暂无客户摘要"}
          </p>
          <div className="customer-profile-badges" aria-label="客户状态">
            <span>{isKnown(model.level) ? model.level : "普通客户"}</span>
            <span>{isKnown(model.kyc) ? model.kyc : "KYC 未知"}</span>
            <span>{isKnown(model.risk) ? model.risk : "风险未知"}</span>
          </div>
        </div>
      </section>

      {loading && <PanelState text="正在加载客户资料..." />}
      {Boolean(error) && <PanelState tone="error" text="客户资料暂不可用" />}

      <section className="customer-profile-scorebar">
        <Metric label="账户余额" value={model.accountBalance} />
        <Metric label="累计入金" value={model.totalDeposit} />
        <Metric label="总订单" value={model.totalOrders} />
      </section>

      <section className={`customer-profile-tabbox ${tabsExpanded ? "expanded" : ""}`}>
        <nav className="customer-profile-tabs" aria-label="客户资料页签">
          {visibleTabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                className={activeTab === tab.key ? "active" : ""}
                type="button"
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
              >
                <Icon size={15} />
                {tab.label}
                {tabCount(tab.key, model) > 0 && <em>{tabCount(tab.key, model)}</em>}
              </button>
            );
          })}
          {(hasMoreTabs || tabsExpanded) && (
            <button
              className="customer-profile-tabs-toggle"
              type="button"
              aria-expanded={tabsExpanded}
              onClick={() => setTabsExpanded((expanded) => !expanded)}
            >
              {tabsExpanded ? (
                <>
                  <ChevronUp size={14} />
                  收起分类
                </>
              ) : (
                <>
                  <ChevronDown size={14} />
                  更多分类
                </>
              )}
            </button>
          )}
        </nav>
      </section>

      <section className="customer-profile-content">
        {renderTab(activeTab, model)}
      </section>
    </aside>
  );
}

function renderTab(tab: CustomerTab, model: CustomerModel) {
  if (tab === "overview") {
    return (
      <>
        <PanelBlock title="核心身份" icon={<Tags size={16} />}>
          <InfoGrid
            rows={[
              ["客户 ID", model.customerId],
              ["LPP 号", model.lppId],
              ["姓名", model.name],
              ["客户等级", model.level],
              ["来源", model.source],
            ]}
          />
          <TagList tags={model.tags} />
        </PanelBlock>
        <PanelBlock title="联系方式" icon={<Smartphone size={16} />}>
          <InfoGrid
            rows={[
              ["手机", model.phoneMasked],
              ["邮箱", model.emailMasked],
              ["国家/地区", model.country],
              ["语言", model.language],
            ]}
          />
        </PanelBlock>
        <PanelBlock title="风控合规" icon={<ShieldCheck size={16} />}>
          <InfoGrid
            rows={[
              ["KYC", model.kyc],
              ["风险", model.risk],
              ["资料可见性", model.profileVisibility],
              ["合规备注", model.complianceNote],
            ]}
          />
        </PanelBlock>
        <PanelBlock title="业务归属" icon={<BriefcaseBusiness size={16} />}>
          <InfoGrid
            rows={[
              ["马甲包", model.appName],
              ["业务线", model.businessLine],
              ["归属客服", model.assignedStaff],
              ["注册时间", model.registeredAt],
              ["最后活跃", model.lastActive],
            ]}
          />
        </PanelBlock>
        <PanelBlock title="语言桥" icon={<Languages size={16} />}>
          <InfoGrid
            rows={[
              ["客户接收", model.customerLanguage],
              ["客服查看", model.staffLanguage],
              ["翻译模式", model.translateMode],
            ]}
          />
        </PanelBlock>
        {model.sections.other.length > 0 && (
          <PanelBlock title="扩展资料" icon={<BadgeCheck size={16} />}>
            <ExternalSectionList empty="暂无扩展资料" sections={model.sections.other} />
          </PanelBlock>
        )}
      </>
    );
  }
  if (tab === "trading") {
    return (
      <>
        <PanelBlock title="历史交易概况" icon={<ReceiptText size={16} />}>
          <InfoGrid
            rows={[
              ["总订单", model.totalOrders],
              ["交易产品", model.tradeProduct],
              ["胜率", model.winRate],
              ["最近交易时间", model.recentTradeTime],
              ["账户状态", model.accountStatus],
              ["注册日期", model.registeredAt],
            ]}
          />
        </PanelBlock>
        <ExternalSectionList
          empty="暂无交易明细"
          sections={model.sections.trading}
        />
        <PanelBlock title="临时订单" icon={<ReceiptText size={16} />}>
          <ItemList
            empty="暂无临时订单"
            items={model.temporaryOrders.map((order, index) => ({
              title: textValue(order.product ?? order.symbol ?? order.orderNo ?? order.id ?? `临时订单 ${index + 1}`),
              meta: [order.status, order.createdAt, order.riskHint].map(textValue).filter(isKnown),
              fields: normalizeRecord(order),
            }))}
          />
        </PanelBlock>
      </>
    );
  }
  if (tab === "funds") {
    return (
      <>
        <PanelBlock title="资金概览" icon={<WalletCards size={16} />}>
          <InfoGrid
            rows={[
              ["账户余额", model.accountBalance],
              ["累计入金", model.totalDeposit],
              ["净入金", model.netDeposit],
              ["最近资金变动", model.latestFundTime],
            ]}
          />
        </PanelBlock>
        <ExternalSectionList empty="暂无资金流水" sections={model.sections.funds} />
      </>
    );
  }
  if (tab === "sessions") {
    return (
      <PanelBlock title="会话历史" icon={<MessageCircleMore size={16} />}>
        <InfoGrid
          rows={[
            ["会话数量", model.sessionCount],
            ["未读消息", model.unreadCount],
            ["最近消息", model.lastMessage],
            ["最后时间", model.lastMessageTime],
          ]}
        />
        <ExternalSectionList empty="暂无会话历史摘要" sections={model.sections.sessions} />
      </PanelBlock>
    );
  }
  if (tab === "tickets") {
    const ticketItems = model.tickets.map((ticket, index) => ({
      title: textValue(ticket.title ?? ticket.id ?? `工单 ${index + 1}`),
      meta: [ticket.status, ticket.priority, ticket.updatedAt].map(textValue).filter(isKnown),
      fields: normalizeRecord(ticket),
    }));
    return (
      <PanelBlock title="工单摘要" icon={<ClipboardList size={16} />}>
        <ItemList empty="暂无工单" items={ticketItems} />
      </PanelBlock>
    );
  }
  if (tab === "touch") {
    return (
      <>
        <PanelBlock title="触达与营销" icon={<Radio size={16} />}>
          <InfoGrid
            rows={[
              ["营销同意", model.marketingConsent],
              ["最近触达渠道", model.latestTouchChannel],
              ["触达次数", model.touchCount],
              ["下次跟进", model.nextFollowUp],
            ]}
          />
        </PanelBlock>
        <ExternalSectionList empty="暂无触达记录" sections={model.sections.touch} />
      </>
    );
  }
  if (tab === "compliance") {
    return (
      <>
        <PanelBlock title="KYC/AML" icon={<ShieldCheck size={16} />}>
          <InfoGrid
            rows={[
              ["KYC 状态", model.kyc],
              ["风险等级", model.risk],
              ["资料可见性", model.profileVisibility],
              ["合规备注", model.complianceNote],
            ]}
          />
        </PanelBlock>
        <ExternalSectionList empty="暂无 KYC/合规数据" sections={model.sections.compliance} />
      </>
    );
  }
  return (
    <>
      <PanelBlock title="归属代理" icon={<BriefcaseBusiness size={16} />}>
        <InfoGrid
          rows={[
            ["归属代理", model.agent],
            ["代理类型", model.agentType],
            ["佣金比例", model.commissionRate],
            ["建立时间", model.agentCreatedAt],
          ]}
        />
      </PanelBlock>
      <PanelBlock title="设备与安全" icon={<Smartphone size={16} />}>
        <InfoGrid
          rows={[
            ["最后设备", model.lastDevice],
            ["最后 IP", model.lastIp],
            ["2FA", model.twoFactor],
            ["异地登录提醒", model.remoteLoginAlert],
          ]}
        />
        <ExternalSectionList empty="暂无设备记录" sections={model.sections.device} />
      </PanelBlock>
    </>
  );
}

function PanelBlock({
  children,
  icon,
  title,
}: {
  children: React.ReactNode;
  icon: React.ReactNode;
  title: string;
}) {
  return (
    <section className="customer-profile-block">
      <h3>
        {icon}
        {title}
      </h3>
      {children}
    </section>
  );
}

function InfoGrid({ rows }: { rows: Array<[string, string]> }) {
  return (
    <div className="customer-profile-grid">
      {rows.map(([label, value]) => (
        <div className="customer-info-row" key={label}>
          <span>{label}</span>
          <strong>{value || "--"}</strong>
        </div>
      ))}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="customer-profile-metric">
      <span>{label}</span>
      <strong>{value || "--"}</strong>
    </div>
  );
}

function TagList({ tags }: { tags: string[] }) {
  return (
    <div className="customer-info-tags">
      {tags.length > 0 ? tags.map((tag) => <span key={tag}>{tag}</span>) : <span>暂无标签</span>}
      <button type="button">+ 添加</button>
    </div>
  );
}

function ExternalSectionList({
  empty,
  sections,
}: {
  empty: string;
  sections: ExternalSection[];
}) {
  const items = sections.flatMap(sectionToItems);
  return <ItemList empty={empty} items={items} />;
}

function ItemList({
  empty,
  items,
}: {
  empty: string;
  items: Array<{ title: string; meta: string[]; fields: Array<[string, string]> }>;
}) {
  if (items.length === 0) return <PanelState text={empty} />;
  return (
    <div className="customer-profile-list">
      {items.map((item, index) => (
        <article className="customer-profile-list-item" key={`${item.title}-${index}`}>
          <strong>{item.title}</strong>
          {item.meta.length > 0 && <p>{item.meta.join(" · ")}</p>}
          {item.fields.length > 0 && <InfoGrid rows={item.fields.slice(0, 6)} />}
        </article>
      ))}
    </div>
  );
}

function PanelState({ text, tone = "muted" }: { text: string; tone?: "muted" | "error" }) {
  return <div className={`panel-state ${tone}`}>{text}</div>;
}

interface CustomerModel {
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

function buildCustomerModel({
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
  return {
    accountBalance: textValue(profile?.accountBalance),
    accountStatus: textValue(profile?.accountStatus ?? tradingSummary.accountStatus),
    agent: textValue(profile?.ib ?? tradingSummary.ib),
    agentCreatedAt: shortDate(valueAt(external, ["ib", "agent", "代理"], ["建立时间", "createdAt"])),
    agentType: textValue(valueAt(external, ["ib", "agent", "代理"], ["类型", "agentType"])),
    appName: textValue(
      profileValue(profile, ["appName", "appDisplayName", "packageName", "brandName", "tenantAppName"]) ??
        contact?.groupName,
    ),
    assignedStaff: textValue(profile?.assignedAgentName ?? profileValue(profile, ["assignedStaffName", "assignedStaffDisplayName"])),
    avatarUrl: profile?.avatarUrl || avatarUrl || conversation?.avatarUrl || contact?.avatarUrl,
    businessLine: textValue(profileValue(profile, ["businessLine", "business", "line"])),
    commissionRate: textValue(valueAt(external, ["ib", "agent", "代理"], ["佣金比例", "commissionRate"])),
    complianceNote: textValue(valueAt(external, ["kyc", "compliance", "合规"], ["备注", "note"])),
    country: textValue(profile?.country),
    customerId: textValue(profile?.customerUserId ?? conversation?.peerUserId ?? contact?.userId ?? contact?.id),
    customerLanguage: textValue(profileValue(profile, ["customerLanguage", "receiveLanguage"]) ?? profile?.language),
    emailMasked: textValue(profile?.emailMasked ?? conversation?.peerEmailMasked),
    id: profile?.customerUserId || conversation?.peerUserId || contact?.userId || contact?.id || conversation?.conversationId || "customer",
    kyc: textValue(profile?.kycStatus),
    language: textValue(profile?.language),
    lastActive: shortDate(profile?.lastActiveAt ?? contact?.lastMessageAt),
    lastDevice: textValue(valueAt(external, ["device", "设备"], ["设备", "device", "name"])),
    lastIp: textValue(valueAt(external, ["device", "设备"], ["IP", "ip", "lastIp"])),
    lastMessage: textValue(conversation?.lastMessage?.preview),
    lastMessageTime: formatChatTime(conversation?.lastMessage?.sentAt),
    latestFundTime: shortDate(valueAt(external, ["fund", "资金", "cash"], ["最近时间", "updatedAt", "createdAt"])),
    latestTouchChannel: textValue(valueAt(external, ["touch", "触达", "marketing"], ["渠道", "channel"])),
    level: textValue(profile?.customerLevel || (profile?.isVip ? "VIP" : undefined)),
    marketingConsent: textValue(valueAt(external, ["marketing", "consent", "营销"], ["同意", "consent"])),
    name: profile?.displayName || contact?.name || conversation?.title || "--",
    netDeposit: textValue(profile?.netDeposit),
    nextFollowUp: textValue(valueAt(external, ["touch", "触达", "marketing"], ["下次跟进", "nextFollowUp"])),
    lppId: textValue(conversation?.peerLppId ?? profileValue(profile, ["lppId", "lppNo", "lppNumber"])),
    phoneMasked: textValue(profile?.phoneMasked ?? conversation?.peerPhoneMasked),
    profileVisibility: textValue(profileValue(profile, ["profileVisibility"])),
    recentTradeTime: shortDate(tradingSummary.recentTradeTime ?? tradingSummary.lastTradeAt),
    registeredAt: shortDate(profile?.registeredAt ?? tradingSummary.registeredAt),
    remoteLoginAlert: textValue(valueAt(external, ["device", "security", "设备"], ["异地登录提醒", "remoteLoginAlert"])),
    risk: textValue(profile?.riskLevel),
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
    tags: Array.from(new Set(tags)),
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

function tabCount(tab: CustomerTab, model: CustomerModel) {
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

function sectionToItems(section: ExternalSection) {
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

function normalizeRecord(value: unknown): Array<[string, string]> {
  if (!value || typeof value !== "object") return [];
  if (Array.isArray(value)) {
    return value.flatMap((item) => normalizeRecord(item));
  }
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
    if (record[key] !== undefined && record[key] !== null && record[key] !== "") {
      return record[key];
    }
  }
  return undefined;
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
  const date = new Date(text);
  if (Number.isNaN(date.getTime())) return text;
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
    date.getDate(),
  ).padStart(2, "0")}`;
}

function textValue(value: unknown): string {
  if (value === undefined || value === null || value === "") return "--";
  if (typeof value === "number") return Number.isFinite(value) ? String(value) : "--";
  if (typeof value === "boolean") return value ? "是" : "否";
  if (Array.isArray(value)) return value.map(textValue).filter(isKnown).join(" / ") || "--";
  if (typeof value === "object") return "--";
  return String(value);
}

function isKnown(value: unknown): value is string {
  return typeof value === "string" && value.trim() !== "" && value !== "--";
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
    updatedAt: "更新时间",
  };
  return map[key] ?? key;
}
