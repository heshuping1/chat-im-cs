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
import type { ReactNode } from "react";
import type { ConversationListItem, CustomerProfileCard } from "../data/api-client";
import type { ContactItem } from "../data/types";
import { PanelState } from "./PanelState";
import { PcAvatar } from "./PcAvatar";
import {
  buildCustomerModel,
  isKnown,
  normalizeRecord,
  sectionToItems,
  tabCount,
  textValue,
  type CustomerModel,
  type ExternalSection,
} from "./CustomerProfileModel";
import {
  CustomerProfileMetric,
  CustomerProfileTagList,
} from "./CustomerProfileBits";

type CustomerTab =
  | "overview"
  | "trading"
  | "funds"
  | "sessions"
  | "tickets"
  | "touch"
  | "compliance"
  | "agentDevice";

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
      {Boolean(error) && (
        <PanelState
          tone="error"
          text="客户资料暂不可用，已展示会话和通讯录中的基础信息。"
        />
      )}

      <section className="customer-profile-scorebar">
        <CustomerProfileMetric label="账户余额" value={model.accountBalance} />
        <CustomerProfileMetric label="累计入金" value={model.totalDeposit} />
        <CustomerProfileMetric label="总订单" value={model.totalOrders} />
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

      <section className="customer-profile-content">{renderTab(activeTab, model)}</section>
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
              ["绿泡泡号", model.lppId],
              ["姓名", model.name],
              ["客户等级", model.level],
              ["来源", model.source],
            ]}
          />
          <CustomerProfileTagList tags={model.tags} />
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
        <PanelBlock title="语言" icon={<Languages size={16} />}>
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
        <ExternalSectionList empty="暂无交易明细" sections={model.sections.trading} />
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
  children: ReactNode;
  icon: ReactNode;
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
