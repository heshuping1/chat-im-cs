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
import type { TranslationParams } from "../i18n/dictionary";
import { useI18n } from "../i18n/useI18n";
import { CustomerProfileTagList } from "./CustomerProfileBits";
import { PanelState } from "./PanelState";
import { PcAvatar } from "./PcAvatar";
import {
  buildCustomerModel,
  createCustomerModelCopy,
  isKnown,
  normalizeRecord,
  sectionToItems,
  tabCount,
  textValue,
  type CustomerModelCopy,
  type CustomerModel,
  type ExternalSection,
} from "./CustomerProfileModel";

type Translate = (key: string, params?: TranslationParams) => string;
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

const DEFAULT_TITLE = "\u5ba2\u6237\u4fe1\u606f";

const tabs: Array<{ key: CustomerTab; icon: LucideIcon }> = [
  { key: "overview", icon: Tags },
  { key: "trading", icon: ReceiptText },
  { key: "funds", icon: WalletCards },
  { key: "sessions", icon: MessageCircleMore },
  { key: "tickets", icon: ClipboardList },
  { key: "touch", icon: Radio },
  { key: "compliance", icon: ShieldCheck },
  { key: "agentDevice", icon: Smartphone },
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
  title = DEFAULT_TITLE,
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
  const { t } = useI18n();
  const [activeTab, setActiveTab] = useState<CustomerTab>("overview");
  const [overflowMenuOpen, setOverflowMenuOpen] = useState(false);
  const [actionNotice, setActionNotice] = useState("");
  const setActiveModule = useSetActiveModule();
  const customerModelCopy = useMemo(() => createCustomerModelCopy(t), [t]);
  const model = useMemo(
    () => buildCustomerModel({ avatarUrl, conversation, contact, copy: customerModelCopy, profile, profileExtra }),
    [avatarUrl, conversation, contact, customerModelCopy, profile, profileExtra],
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
        <h2>{title === DEFAULT_TITLE ? t("customerProfile.title") : title}</h2>
        {headerActions && (
          <div className="customer-info-head-actions">{headerActions}</div>
        )}
      </header>

      <CustomerIdentityHero
        model={model}
        onOpenFullProfile={() => setActiveModule("customerDetail")}
        t={t}
      />
      <CustomerStatusChips model={model} t={t} />

      {loading && <PanelState text={t("customerProfile.loading")} />}
      {showBlockingError && (
        <PanelState
          tone="error"
          text={t("customerProfile.blockingError")}
        />
      )}
      {showInlineError && (
        <PanelState text={t("customerProfile.inlineError")} />
      )}

      {activeTab === "overview" && (
        <>
          <section className="customer-360-priority-grid">
            <AccountOverviewCard model={model} t={t} />
            <AssetStructureCard model={model} t={t} />
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
              t={t}
            />
            <LanguageBridgeCard model={model} t={t} />
            <RecentTrading7dCard model={model} t={t} />
          </section>
        </>
      )}

      <section className={`customer-profile-tabbox ${overflowMenuOpen ? "menu-open" : ""}`}>
        <nav className="customer-profile-tabs" aria-label={t("customerProfile.tabsAria")}>
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
                {t(`customerProfile.tabs.${tab.key}`)}
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
            {t("customerProfile.more")}
            {activeOverflowTab && tabCount(activeOverflowTab.key, model) > 0 && (
              <em>{tabCount(activeOverflowTab.key, model)}</em>
            )}
          </button>
        </nav>
      </section>

      {activeTab !== "overview" && (
        <section className="customer-profile-content">{renderTab(activeTab, model, t, customerModelCopy)}</section>
      )}
    </aside>
  );
}

function CustomerIdentityHero({
  model,
  onOpenFullProfile,
  t,
}: {
  model: CustomerModel;
  onOpenFullProfile: () => void;
  t: Translate;
}) {
  const displayName = isKnown(model.lppId) ? `${model.name} (${model.lppId})` : model.name;
  const infoItems = [
    [t("customerProfile.fields.lppId"), model.lppId],
    [t("customerProfile.fields.userId"), model.customerId],
    [t("customerProfile.fields.source"), model.source],
    [t("customerProfile.fields.channelApp"), model.channelApp],
  ];
  return (
    <section className="customer-360-hero">
      <div className="customer-360-avatar-wrap">
        <PcAvatar avatarUrl={model.avatarUrl} className="e-avatar" name={model.name} />
        {model.isOnline && <span className="customer-360-online-dot" />}
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
        {t("customerProfile.fullProfile")}
      </button>
    </section>
  );
}

function CustomerStatusChips({ model, t }: { model: CustomerModel; t: Translate }) {
  return (
    <section className="customer-360-status-chips" aria-label={t("customerProfile.statusAria")}>
      {model.statusChips.map((chip) => (
        <span data-empty={chip.empty} data-tone={chip.tone} key={`${chip.tone}-${chip.label}`}>
          {chip.label}
        </span>
      ))}
    </section>
  );
}

function AccountOverviewCard({ model, t }: { model: CustomerModel; t: Translate }) {
  return (
    <PanelBlock
      className="customer-360-account"
      title={t("customerProfile.cards.accountOverview")}
      meta={
        isKnown(model.lastProfileUpdatedAt)
          ? t("customerProfile.updatedAt", { time: model.lastProfileUpdatedAt })
          : t("customerProfile.updatedEmpty")
      }
      icon={<WalletCards size={16} />}
    >
      <div className="customer-360-account-grid">
        <AccountMetric label={t("customerProfile.fields.accountBalance")} value={model.accountBalance} />
        <AccountMetric label={t("customerProfile.fields.netDeposit")} value={model.netDeposit} />
        <AccountMetric label={t("customerProfile.fields.totalDeposit")} value={model.totalDeposit} />
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

function AssetStructureCard({ model, t }: { model: CustomerModel; t: Translate }) {
  const gradient = donutGradient(model.assetRows);
  return (
    <PanelBlock className="customer-360-asset" title={t("customerProfile.cards.assetStructure")} icon={<ReceiptText size={16} />}>
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
            <span>{t("customerProfile.fields.totalAssets")}</span>
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
  t,
}: {
  model: CustomerModel;
  notice: string;
  onOpenTickets: () => void;
  onPendingAction: (notice: string) => void;
  onUpdateRemark?: (remarkName: string) => Promise<void> | void;
  onUpdateTags?: (tags: string[]) => Promise<void> | void;
  pending: boolean;
  t: Translate;
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
      onPendingAction(t("customerProfile.notice.missingFriendForRemark"));
      return;
    }
    try {
      await onUpdateRemark(remarkDraft.trim());
      setEditingRemark(false);
      onPendingAction(t("customerProfile.notice.remarkUpdated"));
    } catch (error) {
      onPendingAction(
        error instanceof Error
          ? t("customerProfile.notice.remarkUpdateFailedWithError", { error: error.message })
          : t("customerProfile.notice.remarkUpdateFailed"),
      );
    }
  };

  const saveTags = async () => {
    if (!editable || !onUpdateTags) {
      onPendingAction(t("customerProfile.notice.missingFriendForTags"));
      return;
    }
    try {
      await onUpdateTags(parseCompactTagDraft(tagDraft));
      setEditingTags(false);
      onPendingAction(t("customerProfile.notice.tagsUpdated"));
    } catch (error) {
      onPendingAction(
        error instanceof Error
          ? t("customerProfile.notice.tagsUpdateFailedWithError", { error: error.message })
          : t("customerProfile.notice.tagsUpdateFailed"),
      );
    }
  };

  return (
    <PanelBlock className="customer-360-actions" title={t("customerProfile.cards.serviceActions")} icon={<CalendarClock size={16} />}>
      <section
        className="customer-360-action-list"
        aria-label={t("customerProfile.actionAria")}
        data-testid="customer-profile-actions"
      >
        {editingTags ? (
          <CompactInlineRow
            actionKey="tags"
            icon={<Tags size={15} />}
            label={t("customerProfile.fields.tags")}
            pending={pending}
            t={t}
            value={tagDraft}
            onCancel={() => setEditingTags(false)}
            onChange={setTagDraft}
            onSave={saveTags}
          />
        ) : (
          <div className="customer-360-action-row" data-action-row="tags">
            <span className="customer-360-action-label">
              <Tags size={15} />
              {t("customerProfile.fields.tags")}
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
              {t("customerProfile.actions.edit")}
            </button>
          </div>
        )}
        <CompactActionRow
          actionLabel={t("customerProfile.actions.set")}
          actionKey="follow-up"
          icon={<CalendarClock size={15} />}
          label={t("customerProfile.fields.followUp")}
          onAction={() => onPendingAction(t("customerProfile.notice.followUpPending"))}
          value={isKnown(model.nextFollowUp) ? model.nextFollowUp : t("customerProfile.empty.followUp")}
        />
        <CompactActionRow
          actionLabel={t("customerProfile.actions.view")}
          actionKey="tickets"
          icon={<ClipboardList size={15} />}
          label={t("customerProfile.fields.ticket")}
          onAction={onOpenTickets}
          value={
            ticketCount > 0
              ? t("customerProfile.pendingTickets", { count: ticketCount })
              : t("customerProfile.empty.tickets")
          }
        />
        {editingRemark ? (
          <CompactInlineRow
            actionKey="remark"
            icon={<PencilLine size={15} />}
            label={t("customerProfile.fields.remark")}
            pending={pending}
            t={t}
            value={remarkDraft}
            onCancel={() => setEditingRemark(false)}
            onChange={setRemarkDraft}
            onSave={saveRemark}
          />
        ) : (
          <CompactActionRow
            actionLabel={t("customerProfile.actions.edit")}
            actionKey="remark"
            icon={<PencilLine size={15} />}
            label={t("customerProfile.fields.remark")}
            onAction={() => {
              setRemarkDraft(isKnown(model.remark) ? model.remark : "");
              setEditingRemark(true);
              onPendingAction("");
            }}
            value={isKnown(model.remark) ? model.remark : t("customerProfile.empty.remark")}
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
  t,
  value,
}: {
  actionKey: string;
  icon: ReactNode;
  label: string;
  onCancel: () => void;
  onChange: (value: string) => void;
  onSave: () => Promise<void> | void;
  pending: boolean;
  t: Translate;
  value: string;
}) {
  return (
    <div className="customer-360-action-row editing" data-action-row={actionKey}>
      <span className="customer-360-action-label">
        {icon}
        {label}
      </span>
      <input
        aria-label={t("customerProfile.actions.editField", { field: label })}
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
        <button
          type="button"
          aria-label={t("customerProfile.actions.saveField", { field: label })}
          disabled={pending}
          onClick={() => void onSave()}
        >
          <Check size={13} />
        </button>
        <button
          type="button"
          aria-label={t("customerProfile.actions.cancelFieldEdit", { field: label })}
          disabled={pending}
          onClick={onCancel}
        >
          <X size={13} />
        </button>
      </span>
    </div>
  );
}

function LanguageBridgeCard({ model, t }: { model: CustomerModel; t: Translate }) {
  return (
    <PanelBlock className="customer-360-language" title={t("customerProfile.cards.languageBridge")} icon={<Languages size={16} />}>
      <div className="customer-360-language-flow">
        <LanguageBox
          eyebrow={t("customerProfile.fields.customerReceive")}
          main={model.customerLanguage}
          sub={model.language}
          t={t}
        />
        <span className="customer-360-language-switch">
          <ArrowLeftRight size={18} />
        </span>
        <LanguageBox
          eyebrow={t("customerProfile.fields.staffView")}
          main={model.staffLanguage}
          sub={model.translateMode}
          t={t}
        />
      </div>
    </PanelBlock>
  );
}

function LanguageBox({
  eyebrow,
  main,
  sub,
  t,
}: {
  eyebrow: string;
  main: string;
  sub: string;
  t: Translate;
}) {
  return (
    <div className="customer-360-language-box">
      <span>{eyebrow}</span>
      <strong>{isKnown(main) ? main : t("customerProfile.empty.notSet")}</strong>
      <em>{isKnown(sub) ? sub : t("customerProfile.empty.notSet")}</em>
    </div>
  );
}

function RecentTrading7dCard({ model, t }: { model: CustomerModel; t: Translate }) {
  const trading = model.recent7dTrading;
  const maxValue = Math.max(...trading.bars.map((day) => day.value), 0);
  return (
    <PanelBlock className="customer-360-trading7d" title={t("customerProfile.cards.recentTrading7d")} icon={<ReceiptText size={16} />}>
      <div className="customer-360-trading-grid">
        <div className="customer-360-trading-stats">
          <TradingStat label={t("customerProfile.fields.deposit")} value={trading.deposit} tone="deposit" />
          <TradingStat label={t("customerProfile.fields.withdrawal")} value={trading.withdrawal} tone="withdrawal" />
          <TradingStat label={t("customerProfile.fields.tradingVolume")} value={trading.volume} tone="volume" />
        </div>
        <div className="customer-360-bars" aria-label={t("customerProfile.recentTrading7dAria")}>
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
        {isKnown(trading.latest) ? trading.latest : t("customerProfile.empty.latestTrade")}
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

function renderTab(tab: CustomerTab, model: CustomerModel, t: Translate, customerModelCopy: CustomerModelCopy) {
  if (tab === "overview") {
    return (
      <>
        <PanelBlock title={t("customerProfile.blocks.coreIdentity")} icon={<Tags size={16} />}>
          <InfoGrid
            rows={[
              [t("customerProfile.fields.customerId"), model.customerId],
              [t("customerProfile.fields.lppId"), model.lppId],
              [t("customerProfile.fields.name"), model.name],
              [t("customerProfile.fields.customerLevel"), model.level],
            ]}
          />
        </PanelBlock>
        <PanelBlock title={t("customerProfile.blocks.contactInfo")} icon={<Smartphone size={16} />}>
          <InfoGrid
            rows={[
              [t("customerProfile.fields.mobile"), model.phoneMasked],
              [t("customerProfile.fields.email"), model.emailMasked],
              [t("customerProfile.fields.countryRegion"), model.country],
              [t("customerProfile.fields.language"), model.language],
            ]}
          />
        </PanelBlock>
        <PanelBlock title={t("customerProfile.blocks.riskCompliance")} icon={<ShieldCheck size={16} />}>
          <InfoGrid
            rows={[
              ["KYC", model.kyc],
              [t("customerProfile.fields.risk"), model.risk],
              [t("customerProfile.fields.profileVisibility"), model.profileVisibility],
              [t("customerProfile.fields.complianceNote"), model.complianceNote],
            ]}
          />
        </PanelBlock>
        <PanelBlock title={t("customerProfile.blocks.businessOwnership")} icon={<BriefcaseBusiness size={16} />}>
          <InfoGrid
            rows={[
              [t("customerProfile.fields.channelApp"), model.appName],
              [t("customerProfile.fields.sourceChannel"), model.source],
              [t("customerProfile.fields.businessLine"), model.businessLine],
              [t("customerProfile.fields.assignedStaff"), model.assignedStaff],
              [t("customerProfile.fields.registeredAt"), model.registeredAt],
              [t("customerProfile.fields.lastActive"), model.lastActive],
            ]}
          />
        </PanelBlock>
        <PanelBlock title={t("customerProfile.blocks.language")} icon={<Languages size={16} />}>
          <InfoGrid
            rows={[
              [t("customerProfile.fields.customerReceive"), model.customerLanguage],
              [t("customerProfile.fields.staffView"), model.staffLanguage],
              [t("customerProfile.fields.translateMode"), model.translateMode],
            ]}
          />
        </PanelBlock>
        {model.sections.other.length > 0 && (
          <PanelBlock title={t("customerProfile.blocks.externalProfile")} icon={<BadgeCheck size={16} />}>
        <ExternalSectionList copy={customerModelCopy} empty={t("customerProfile.empty.externalProfile")} sections={model.sections.other} />
          </PanelBlock>
        )}
      </>
    );
  }
  if (tab === "trading") {
    return (
      <>
        <PanelBlock title={t("customerProfile.blocks.tradingSummary")} icon={<ReceiptText size={16} />}>
          <InfoGrid
            rows={[
              [t("customerProfile.fields.totalOrders"), model.totalOrders],
              [t("customerProfile.fields.tradeProduct"), model.tradeProduct],
              [t("customerProfile.fields.winRate"), model.winRate],
              [t("customerProfile.fields.recentTradeTime"), model.recentTradeTime],
              [t("customerProfile.fields.accountStatus"), model.accountStatus],
              [t("customerProfile.fields.registeredAt"), model.registeredAt],
            ]}
          />
        </PanelBlock>
        <ExternalSectionList copy={customerModelCopy} empty={t("customerProfile.empty.tradingDetails")} sections={model.sections.trading} />
        <PanelBlock title={t("customerProfile.blocks.temporaryOrders")} icon={<ReceiptText size={16} />}>
          <ItemList
            empty={t("customerProfile.empty.temporaryOrders")}
            items={model.temporaryOrders.map((order, index) => ({
              title: textValue(
                order.product
                  ?? order.symbol
                  ?? order.orderNo
                  ?? order.id
                  ?? t("customerProfile.temporaryOrderTitle", { index: index + 1 }),
                customerModelCopy,
              ),
              meta: [order.status, order.createdAt, order.riskHint].map((value) => textValue(value, customerModelCopy)).filter(isKnown),
              fields: normalizeRecord(order, customerModelCopy),
            }))}
          />
        </PanelBlock>
      </>
    );
  }
  if (tab === "funds") {
    return (
      <>
        <PanelBlock title={t("customerProfile.blocks.fundsOverview")} icon={<WalletCards size={16} />}>
          <InfoGrid
            rows={[
              [t("customerProfile.fields.accountBalance"), model.accountBalance],
              [t("customerProfile.fields.totalDeposit"), model.totalDeposit],
              [t("customerProfile.fields.netDeposit"), model.netDeposit],
              [t("customerProfile.fields.latestFundTime"), model.latestFundTime],
            ]}
          />
        </PanelBlock>
        <ExternalSectionList copy={customerModelCopy} empty={t("customerProfile.empty.fundRecords")} sections={model.sections.funds} />
      </>
    );
  }
  if (tab === "sessions") {
    return (
      <PanelBlock title={t("customerProfile.blocks.sessionHistory")} icon={<MessageCircleMore size={16} />}>
        <InfoGrid
          rows={[
            [t("customerProfile.fields.sessionCount"), model.sessionCount],
            [t("customerProfile.fields.unreadCount"), model.unreadCount],
            [t("customerProfile.fields.lastMessage"), model.lastMessage],
            [t("customerProfile.fields.lastMessageTime"), model.lastMessageTime],
          ]}
        />
        <ExternalSectionList copy={customerModelCopy} empty={t("customerProfile.empty.sessionSummary")} sections={model.sections.sessions} />
      </PanelBlock>
    );
  }
  if (tab === "tickets") {
    const ticketItems = model.tickets.map((ticket, index) => ({
      title: textValue(ticket.title ?? ticket.id ?? t("customerProfile.ticketTitle", { index: index + 1 }), customerModelCopy),
      meta: [ticket.status, ticket.priority, ticket.updatedAt].map((value) => textValue(value, customerModelCopy)).filter(isKnown),
      fields: normalizeRecord(ticket, customerModelCopy),
    }));
    return (
      <PanelBlock title={t("customerProfile.blocks.ticketSummary")} icon={<ClipboardList size={16} />}>
        <ItemList empty={t("customerProfile.empty.tickets")} items={ticketItems} />
      </PanelBlock>
    );
  }
  if (tab === "touch") {
    return (
      <>
        <PanelBlock title={t("customerProfile.blocks.touchMarketing")} icon={<Radio size={16} />}>
          <InfoGrid
            rows={[
              [t("customerProfile.fields.marketingConsent"), model.marketingConsent],
              [t("customerProfile.fields.latestTouchChannel"), model.latestTouchChannel],
              [t("customerProfile.fields.touchCount"), model.touchCount],
              [t("customerProfile.fields.nextFollowUp"), model.nextFollowUp],
            ]}
          />
        </PanelBlock>
        <ExternalSectionList copy={customerModelCopy} empty={t("customerProfile.empty.touchRecords")} sections={model.sections.touch} />
      </>
    );
  }
  if (tab === "compliance") {
    return (
      <>
        <PanelBlock title="KYC/AML" icon={<ShieldCheck size={16} />}>
          <InfoGrid
            rows={[
              [t("customerProfile.fields.kycStatus"), model.kyc],
              [t("customerProfile.fields.riskLevel"), model.risk],
              [t("customerProfile.fields.profileVisibility"), model.profileVisibility],
              [t("customerProfile.fields.complianceNote"), model.complianceNote],
            ]}
          />
        </PanelBlock>
        <ExternalSectionList copy={customerModelCopy} empty={t("customerProfile.empty.complianceData")} sections={model.sections.compliance} />
      </>
    );
  }
  return (
    <>
      <PanelBlock title={t("customerProfile.blocks.agentOwnership")} icon={<BriefcaseBusiness size={16} />}>
        <InfoGrid
          rows={[
            [t("customerProfile.fields.agent"), model.agent],
            [t("customerProfile.fields.agentType"), model.agentType],
            [t("customerProfile.fields.commissionRate"), model.commissionRate],
            [t("customerProfile.fields.createdAt"), model.agentCreatedAt],
          ]}
        />
      </PanelBlock>
      <PanelBlock title={t("customerProfile.blocks.deviceSecurity")} icon={<Smartphone size={16} />}>
        <InfoGrid
          rows={[
            [t("customerProfile.fields.lastDevice"), model.lastDevice],
            [t("customerProfile.fields.lastIp"), model.lastIp],
            ["2FA", model.twoFactor],
            [t("customerProfile.fields.remoteLoginAlert"), model.remoteLoginAlert],
          ]}
        />
        <ExternalSectionList copy={customerModelCopy} empty={t("customerProfile.empty.deviceRecords")} sections={model.sections.device} />
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
  copy,
  empty,
  sections,
}: {
  copy: CustomerModelCopy;
  empty: string;
  sections: ExternalSection[];
}) {
  const items = sections.flatMap((section) => sectionToItems(section, copy));
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
