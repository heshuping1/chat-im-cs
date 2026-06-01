import {
  ArrowLeftRight,
  BadgeCheck,
  BriefcaseBusiness,
  CalendarClock,
  Check,
  ChevronDown,
  ClipboardList,
  ExternalLink,
  Languages,
  MessageCircleMore,
  PencilLine,
  Radio,
  ReceiptText,
  ShieldCheck,
  Smartphone,
  Tags,
  WalletCards,
  X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { CSSProperties, DragEvent, ReactNode } from "react";
import type {
  ConversationListItem,
  CustomerProfileCard,
  FriendProfileExtraDto,
} from "../data/api-client";
import type { ContactItem } from "../data/types";
import { useSetActiveModule } from "../data/workspace-ui/workspace-ui-store";
import { CustomerProfileTagList } from "./CustomerProfileBits";
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

type CustomerTab =
  | "overview"
  | "trading"
  | "funds"
  | "sessions"
  | "tickets"
  | "touch"
  | "compliance"
  | "agentDevice";
type CustomerProfileVariant = "im" | "customerService";
type CustomerProfileErrorMode = "silent" | "inline" | "blocking";

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
const primaryTabs = tabs.slice(0, 5);
const overflowTabs = tabs.slice(5);

export function CustomerProfileWorkspace({
  avatarUrl,
  className = "",
  conversation,
  contact,
  error,
  errorMode = "blocking",
  headerActions,
  loading = false,
  onUpdateRemark,
  onUpdateTags,
  onDragOver,
  onDrop,
  profileActionPending = false,
  profileExtra,
  profile,
  title = "客户信息",
  variant = "customerService",
}: {
  avatarUrl?: string | null;
  className?: string;
  conversation?: ConversationListItem;
  contact?: ContactItem | null;
  error?: unknown;
  errorMode?: CustomerProfileErrorMode;
  headerActions?: ReactNode;
  loading?: boolean;
  onUpdateRemark?: (remarkName: string) => Promise<void> | void;
  onUpdateTags?: (tags: string[]) => Promise<void> | void;
  onDragOver?: (event: DragEvent<HTMLElement>) => void;
  onDrop?: (event: DragEvent<HTMLElement>) => void;
  profileActionPending?: boolean;
  profileExtra?: FriendProfileExtraDto;
  profile?: CustomerProfileCard;
  title?: string;
  variant?: CustomerProfileVariant;
}) {
  const [activeTab, setActiveTab] = useState<CustomerTab>("overview");
  const [overflowMenuOpen, setOverflowMenuOpen] = useState(false);
  const [actionNotice, setActionNotice] = useState("");
  const setActiveModule = useSetActiveModule();
  const model = useMemo(
    () => buildCustomerModel({ avatarUrl, conversation, contact, profile, profileExtra }),
    [avatarUrl, conversation, contact, profile, profileExtra],
  );
  const activeOverflowTab = overflowTabs.find((tab) => tab.key === activeTab);
  const visibleTabs = overflowMenuOpen ? tabs : primaryTabs;
  const showBlockingError = Boolean(error) && errorMode === "blocking";
  const showInlineError = Boolean(error) && errorMode === "inline";

  useEffect(() => {
    setActiveTab("overview");
    setOverflowMenuOpen(false);
  }, [model.id]);

  return (
    <aside
      className={`customer-profile-workspace customer-360-compact customer-info-panel ${className}`.trim()}
      data-customer-profile-variant={variant}
      onDragOver={onDragOver}
      onDrop={onDrop}
    >
      <header className="customer-info-head">
        <h2>{title}</h2>
        {headerActions && (
          <div className="customer-info-head-actions">{headerActions}</div>
        )}
      </header>

      <CustomerIdentityHero
        model={model}
        onOpenFullProfile={() => setActiveModule("customerDetail")}
      />
      <CustomerStatusChips model={model} />

      {loading && <PanelState text="正在加载客户资料..." />}
      {showBlockingError && (
        <PanelState
          tone="error"
          text="客户资料暂不可用，已展示会话和通讯录中的基础信息。"
        />
      )}
      {showInlineError && (
        <PanelState text="部分客户画像暂未同步，已展示当前可用资料。" />
      )}

      {activeTab === "overview" && (
        <>
          <section className="customer-360-priority-grid">
            <AccountOverviewCard model={model} />
            <AssetStructureCard model={model} />
            <ServiceActionPanel
              model={model}
              notice={actionNotice}
              pending={profileActionPending}
              onOpenTickets={() => {
                setActiveTab("tickets");
                setOverflowMenuOpen(false);
                setActionNotice("");
              }}
              onPendingAction={setActionNotice}
              onUpdateRemark={onUpdateRemark}
              onUpdateTags={onUpdateTags}
            />
            <LanguageBridgeCard model={model} />
            <RecentTrading7dCard model={model} />
          </section>
        </>
      )}

      <section className={`customer-profile-tabbox ${overflowMenuOpen ? "menu-open" : ""}`}>
        <nav className="customer-profile-tabs" aria-label="客户资料页签">
          {visibleTabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                className={activeTab === tab.key ? "active" : ""}
                type="button"
                key={tab.key}
                onClick={() => {
                  setActiveTab(tab.key);
                  if (!overflowTabs.some((item) => item.key === tab.key)) {
                    setOverflowMenuOpen(false);
                  }
                }}
              >
                <Icon size={15} />
                {tab.label}
                {tabCount(tab.key, model) > 0 && <em>{tabCount(tab.key, model)}</em>}
              </button>
            );
          })}
          <button
            className={`customer-profile-tabs-toggle ${activeOverflowTab ? "active" : ""}`}
            type="button"
            aria-expanded={overflowMenuOpen}
            onClick={() => setOverflowMenuOpen((open) => !open)}
          >
            <ChevronDown size={14} />
            更多
            {activeOverflowTab && tabCount(activeOverflowTab.key, model) > 0 && (
              <em>{tabCount(activeOverflowTab.key, model)}</em>
            )}
          </button>
        </nav>
      </section>

      {activeTab !== "overview" && (
        <section className="customer-profile-content">{renderTab(activeTab, model)}</section>
      )}
    </aside>
  );
}

function CustomerIdentityHero({
  model,
  onOpenFullProfile,
}: {
  model: CustomerModel;
  onOpenFullProfile: () => void;
}) {
  const displayName = isKnown(model.lppId) ? `${model.name}（${model.lppId}）` : model.name;
  const infoItems = [
    ["绿泡泡号", model.lppId],
    ["用户ID", model.customerId],
    ["来源", model.source],
    ["渠道应用", model.channelApp],
  ];
  return (
    <section className="customer-360-hero">
      <div className="customer-360-avatar-wrap">
        <PcAvatar avatarUrl={model.avatarUrl} className="e-avatar" name={model.name} />
        {model.onlineStatus === "在线" && <span className="customer-360-online-dot" />}
      </div>
      <div className="customer-360-identity-main">
        <div className="customer-360-name-row">
          <strong>{displayName}</strong>
          <span className="customer-360-vip" data-empty={!isKnown(model.vipLevel)}>
            {isKnown(model.vipLevel) ? model.vipLevel : "VIP"}
          </span>
        </div>
        <p className="customer-360-presence">{model.onlineStatus}</p>
        <div className="customer-360-info-grid">
          {infoItems.map(([label, value]) => (
            <span key={label}>
              <em>{label}</em>
              <strong>{isKnown(value) ? value : "--"}</strong>
            </span>
          ))}
        </div>
      </div>
      <button
        className="customer-360-full-profile"
        type="button"
        onClick={onOpenFullProfile}
      >
        <ExternalLink size={13} />
        完整档案
      </button>
    </section>
  );
}

function CustomerStatusChips({ model }: { model: CustomerModel }) {
  return (
    <section className="customer-360-status-chips" aria-label="客户状态">
      {model.statusChips.map((chip) => (
        <span data-empty={chip.empty} data-tone={chip.tone} key={`${chip.tone}-${chip.label}`}>
          {chip.label}
        </span>
      ))}
    </section>
  );
}

function AccountOverviewCard({ model }: { model: CustomerModel }) {
  return (
    <PanelBlock
      className="customer-360-account"
      title="账户总览"
      meta={isKnown(model.lastProfileUpdatedAt) ? `更新 ${model.lastProfileUpdatedAt}` : "更新 --"}
      icon={<WalletCards size={16} />}
    >
      <div className="customer-360-account-grid">
        <AccountMetric label="账户余额" value={model.accountBalance} />
        <AccountMetric label="净入金" value={model.netDeposit} />
        <AccountMetric label="累计入金" value={model.totalDeposit} />
      </div>
    </PanelBlock>
  );
}

function AccountMetric({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="customer-360-account-metric">
      <strong data-empty={!isKnown(value)}>{isKnown(value) ? value : "--"}</strong>
      <span>{label}</span>
    </div>
  );
}

function AssetStructureCard({ model }: { model: CustomerModel }) {
  const gradient = donutGradient(model.assetRows);
  return (
    <PanelBlock className="customer-360-asset" title="资产结构" icon={<ReceiptText size={16} />}>
      <div className="customer-360-asset-layout">
        <div
          className="customer-360-donut"
          data-empty={model.assetMix.length === 0}
          style={{ "--donut": gradient } as CSSProperties}
        >
          <div>
            <strong data-empty={!isKnown(model.accountBalance)}>
              {isKnown(model.accountBalance) ? model.accountBalance : "--"}
            </strong>
            <span>总资产</span>
          </div>
        </div>
        <div className="customer-360-asset-list">
          {model.assetRows.map((item) => (
            <div className="customer-360-asset-row" data-empty={item.empty} key={item.name}>
              <span className="customer-360-asset-name">
                <i style={{ background: item.color }} />
                {item.name}
              </span>
              <span>{item.percentLabel}</span>
              <strong>{item.amount}</strong>
            </div>
          ))}
        </div>
      </div>
    </PanelBlock>
  );
}

function ServiceActionPanel({
  model,
  notice,
  onOpenTickets,
  onPendingAction,
  onUpdateRemark,
  onUpdateTags,
  pending,
}: {
  model: CustomerModel;
  notice: string;
  onOpenTickets: () => void;
  onPendingAction: (notice: string) => void;
  onUpdateRemark?: (remarkName: string) => Promise<void> | void;
  onUpdateTags?: (tags: string[]) => Promise<void> | void;
  pending: boolean;
}) {
  const ticketCount = model.tickets.length;
  const editable = isKnown(model.friendUserId);
  const [editingRemark, setEditingRemark] = useState(false);
  const [remarkDraft, setRemarkDraft] = useState("");
  const [editingTags, setEditingTags] = useState(false);
  const [tagDraft, setTagDraft] = useState("");

  useEffect(() => {
    if (!editingRemark) setRemarkDraft(isKnown(model.remark) ? model.remark : "");
  }, [editingRemark, model.remark]);

  useEffect(() => {
    if (!editingTags) setTagDraft(model.tags.join("，"));
  }, [editingTags, model.tags]);

  const saveRemark = async () => {
    if (!editable || !onUpdateRemark) {
      onPendingAction("当前客户缺少好友 ID，无法编辑备注");
      return;
    }
    try {
      await onUpdateRemark(remarkDraft.trim());
      setEditingRemark(false);
      onPendingAction("备注已更新");
    } catch (error) {
      onPendingAction(error instanceof Error ? `备注更新失败：${error.message}` : "备注更新失败");
    }
  };

  const saveTags = async () => {
    if (!editable || !onUpdateTags) {
      onPendingAction("当前客户缺少好友 ID，无法编辑标签");
      return;
    }
    try {
      await onUpdateTags(parseCompactTagDraft(tagDraft));
      setEditingTags(false);
      onPendingAction("标签已更新");
    } catch (error) {
      onPendingAction(error instanceof Error ? `标签更新失败：${error.message}` : "标签更新失败");
    }
  };

  return (
    <PanelBlock className="customer-360-actions" title="服务动作" icon={<CalendarClock size={16} />}>
      <section
        className="customer-360-action-list"
        aria-label="客户处理"
        data-testid="customer-profile-actions"
      >
        {editingTags ? (
          <CompactInlineRow
            actionKey="tags"
            icon={<Tags size={15} />}
            label="标签"
            pending={pending}
            value={tagDraft}
            onCancel={() => setEditingTags(false)}
            onChange={setTagDraft}
            onSave={saveTags}
          />
        ) : (
          <div className="customer-360-action-row" data-action-row="tags">
            <span className="customer-360-action-label">
              <Tags size={15} />
              标签
            </span>
            <div className="customer-360-action-value">
              <CustomerProfileTagList
                tags={model.tags}
                onAdd={() => {
                  setTagDraft(model.tags.join("，"));
                  setEditingTags(true);
                  onPendingAction("");
                }}
              />
            </div>
            <button
              className="customer-360-action-control ghost"
              type="button"
              onClick={() => {
                setTagDraft(model.tags.join("，"));
                setEditingTags(true);
                onPendingAction("");
              }}
            >
              编辑
            </button>
          </div>
        )}
        <CompactActionRow
          actionLabel="设置"
          actionKey="follow-up"
          icon={<CalendarClock size={15} />}
          label="跟进"
          onAction={() => onPendingAction("跟进接口待接入")}
          value={isKnown(model.nextFollowUp) ? model.nextFollowUp : "未设置跟进"}
        />
        <CompactActionRow
          actionLabel="查看"
          actionKey="tickets"
          icon={<ClipboardList size={15} />}
          label="工单"
          onAction={onOpenTickets}
          value={ticketCount > 0 ? `待处理 ${ticketCount}` : "暂无工单"}
        />
        {editingRemark ? (
          <CompactInlineRow
            actionKey="remark"
            icon={<PencilLine size={15} />}
            label="备注"
            pending={pending}
            value={remarkDraft}
            onCancel={() => setEditingRemark(false)}
            onChange={setRemarkDraft}
            onSave={saveRemark}
          />
        ) : (
          <CompactActionRow
            actionLabel="编辑"
            actionKey="remark"
            icon={<PencilLine size={15} />}
            label="备注"
            onAction={() => {
              setRemarkDraft(isKnown(model.remark) ? model.remark : "");
              setEditingRemark(true);
              onPendingAction("");
            }}
            value={isKnown(model.remark) ? model.remark : "暂无备注"}
          />
        )}
        {notice && (
          <p className="customer-360-action-notice" role="status">
            {notice}
          </p>
        )}
      </section>
    </PanelBlock>
  );
}

function CompactActionRow({
  actionLabel,
  actionKey,
  icon,
  label,
  onAction,
  value,
}: {
  actionLabel: string;
  actionKey: string;
  icon: ReactNode;
  label: string;
  onAction: () => void;
  value: string;
}) {
  return (
    <div className="customer-360-action-row" data-action-row={actionKey}>
      <span className="customer-360-action-label">
        {icon}
        {label}
      </span>
      <strong className="customer-360-action-value">{value}</strong>
      <button className="customer-360-action-control" type="button" onClick={onAction}>
        {actionLabel}
      </button>
    </div>
  );
}

function CompactInlineRow({
  actionKey,
  icon,
  label,
  onCancel,
  onChange,
  onSave,
  pending,
  value,
}: {
  actionKey: string;
  icon: ReactNode;
  label: string;
  onCancel: () => void;
  onChange: (value: string) => void;
  onSave: () => Promise<void> | void;
  pending: boolean;
  value: string;
}) {
  return (
    <div className="customer-360-action-row editing" data-action-row={actionKey}>
      <span className="customer-360-action-label">
        {icon}
        {label}
      </span>
      <input
        aria-label={`编辑${label}`}
        className="customer-360-action-input"
        disabled={pending}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter") void onSave();
          if (event.key === "Escape") onCancel();
        }}
      />
      <span className="customer-360-editor-actions">
        <button type="button" aria-label={`保存${label}`} disabled={pending} onClick={() => void onSave()}>
          <Check size={13} />
        </button>
        <button type="button" aria-label={`取消${label}编辑`} disabled={pending} onClick={onCancel}>
          <X size={13} />
        </button>
      </span>
    </div>
  );
}

function LanguageBridgeCard({ model }: { model: CustomerModel }) {
  return (
    <PanelBlock className="customer-360-language" title="语言桥" icon={<Languages size={16} />}>
      <div className="customer-360-language-flow">
        <LanguageBox eyebrow="客户接收" main={model.customerLanguage} sub={model.language} />
        <span className="customer-360-language-switch">
          <ArrowLeftRight size={18} />
        </span>
        <LanguageBox eyebrow="客服查看" main={model.staffLanguage} sub={model.translateMode} />
      </div>
    </PanelBlock>
  );
}

function LanguageBox({
  eyebrow,
  main,
  sub,
}: {
  eyebrow: string;
  main: string;
  sub: string;
}) {
  return (
    <div className="customer-360-language-box">
      <span>{eyebrow}</span>
      <strong>{isKnown(main) ? main : "未设置"}</strong>
      <em>{isKnown(sub) ? sub : "未设置"}</em>
    </div>
  );
}

function RecentTrading7dCard({ model }: { model: CustomerModel }) {
  const trading = model.recent7dTrading;
  const maxValue = Math.max(...trading.bars.map((day) => day.value), 0);
  return (
    <PanelBlock className="customer-360-trading7d" title="交易历史（近7天）" icon={<ReceiptText size={16} />}>
      <div className="customer-360-trading-grid">
        <div className="customer-360-trading-stats">
          <TradingStat label="入金" value={trading.deposit} tone="deposit" />
          <TradingStat label="出金" value={trading.withdrawal} tone="withdrawal" />
          <TradingStat label="交易额" value={trading.volume} tone="volume" />
        </div>
        <div className="customer-360-bars" aria-label="近7天交易柱状图">
          {trading.bars.map((day) => (
            <span data-empty={day.empty} key={day.label}>
              <i
                className={day.active ? "active" : ""}
                style={{ height: `${maxValue > 0 ? Math.max(12, (day.value / maxValue) * 50) : 10}px` }}
              />
              <em>{day.label}</em>
            </span>
          ))}
        </div>
      </div>
      <p className="customer-360-latest-trade" data-empty={!isKnown(trading.latest)}>
        {isKnown(trading.latest) ? trading.latest : "最近一次交易 --"}
      </p>
    </PanelBlock>
  );
}

function TradingStat({
  label,
  tone,
  value,
}: {
  label: string;
  tone: string;
  value: string;
}) {
  return (
    <p data-tone={tone}>
      <span>{label}</span>
      <strong>{isKnown(value) ? value : "--"}</strong>
    </p>
  );
}

function parseCompactTagDraft(value: string) {
  return Array.from(
    new Set(
      value
        .split(/[,，\n]/g)
        .map((item) => item.trim())
        .filter(Boolean),
    ),
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
            ]}
          />
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
              ["渠道应用", model.appName],
              ["来源渠道", model.source],
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
  className = "",
  icon,
  meta,
  title,
}: {
  children: ReactNode;
  className?: string;
  icon: ReactNode;
  meta?: string;
  title: string;
}) {
  return (
    <section className={`customer-profile-block ${className}`.trim()}>
      <h3>
        <span>
          {icon}
          {title}
        </span>
        {meta && <em>{meta}</em>}
      </h3>
      {children}
    </section>
  );
}

function donutGradient(items: CustomerModel["assetRows"]) {
  if (items.every((item) => item.empty)) {
    return "conic-gradient(#e5edf6 0% 100%)";
  }
  let cursor = 0;
  const segments = items.map((item) => {
    const percent = Number.parseFloat(item.percentLabel);
    const next = cursor + (Number.isFinite(percent) ? Math.max(0, percent) : 0);
    const segment = `${item.color} ${cursor}% ${next}%`;
    cursor = next;
    return segment;
  });
  if (cursor < 100) segments.push(`#e8eef5 ${cursor}% 100%`);
  return `conic-gradient(${segments.join(", ")})`;
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
