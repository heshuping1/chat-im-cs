import {
  ArrowLeft,
  BadgeCheck,
  CalendarClock,
  ClipboardList,
  MessageCircleMore,
  PencilLine,
  Radio,
  ReceiptText,
  ShieldCheck,
  Smartphone,
  Tags,
  WalletCards,
} from "lucide-react";
import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import { buildCustomerModel, createCustomerModelCopy, isKnown, type CustomerModel } from "./CustomerProfileModel";
import { useCustomerContextPanelModel } from "./CustomerContextPanel";
import { PanelState } from "./PanelState";
import { PcAvatar } from "./PcAvatar";
import { useSetActiveModule } from "../data/workspace-ui/workspace-ui-store";
import type { TranslationParams } from "../i18n/dictionary";
import { useI18n } from "../i18n/useI18n";

type Translate = (key: string, params?: TranslationParams) => string;

type DetailTab =
  | "overview"
  | "trading"
  | "funds"
  | "tickets"
  | "sessions"
  | "touch"
  | "compliance"
  | "agentDevice";

const detailTabs: Array<{ key: DetailTab }> = [
  { key: "overview" },
  { key: "trading" },
  { key: "funds" },
  { key: "tickets" },
  { key: "sessions" },
  { key: "touch" },
  { key: "compliance" },
  { key: "agentDevice" },
];

export function CustomerDetailPage() {
  const { t } = useI18n();
  const [activeTab, setActiveTab] = useState<DetailTab>("overview");
  const setActiveModule = useSetActiveModule();
  const { profileForPanel, profileLoading, selectedThread } = useCustomerContextPanelModel();
  const customerModelCopy = useMemo(() => createCustomerModelCopy(t), [t]);
  const model = useMemo(
    () =>
      buildCustomerModel({
        avatarUrl: selectedThread?.customerAvatarUrl || selectedThread?.avatarUrl,
        copy: customerModelCopy,
        profile: profileForPanel,
      }),
    [customerModelCopy, profileForPanel, selectedThread],
  );

  if (!selectedThread && !profileForPanel) {
    return (
      <main className="module-page customer-detail-page">
        <PanelState text={t("customerProfile.detail.selectConversation")} />
      </main>
    );
  }

  return (
    <main className="module-page customer-detail-page">
      <header className="customer-detail-hero">
        <button type="button" onClick={() => setActiveModule("onlineService")}>
          <ArrowLeft size={16} />
          {t("customerProfile.detail.backToConversation")}
        </button>
        <PcAvatar avatarUrl={model.avatarUrl} className="e-avatar" name={model.name} />
        <div className="customer-detail-identity">
          <h1>{model.name}</h1>
          <p>
            {[model.lppId, model.customerId].filter(isKnown).join(" · ") ||
              t("customerProfile.detail.noIdentity")}
          </p>
          <div>
            {isKnown(model.vipLevel) && <span data-tone="vip">{model.vipLevel}</span>}
            {isKnown(model.risk) && <span data-tone="risk">{model.risk}</span>}
            {isKnown(model.verificationStatus) && <span>{model.verificationStatus}</span>}
            {isKnown(model.kyc) && <span>{model.kyc}</span>}
            {isKnown(model.source) && <span>{t("customerProfile.detail.sourceBadge", { value: model.source })}</span>}
            {isKnown(model.channelApp) && <span>{t("customerProfile.detail.channelBadge", { value: model.channelApp })}</span>}
          </div>
        </div>
        <div className="customer-detail-actions">
          <button type="button">
            <ClipboardList size={15} />
            {t("customerProfile.detail.createTicket")}
          </button>
          <button type="button">
            <Tags size={15} />
            {t("customerProfile.actions.editField", { field: t("customerProfile.fields.tags") })}
          </button>
          <button type="button">
            <PencilLine size={15} />
            {t("customerProfile.detail.addRemark")}
          </button>
        </div>
      </header>

      {profileLoading && <PanelState text={t("customerProfile.detail.loadingFullProfile")} />}

      <nav className="customer-detail-tabs" aria-label={t("customerProfile.detail.tabsAria")}>
        {detailTabs.map((tab) => (
          <button
            className={activeTab === tab.key ? "active" : ""}
            type="button"
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
          >
            {t(`customerProfile.tabs.${tab.key}`)}
          </button>
        ))}
      </nav>

      <section className="customer-detail-content">
        {renderDetailTab(activeTab, model, t)}
      </section>
    </main>
  );
}

function renderDetailTab(tab: DetailTab, model: CustomerModel, t: Translate) {
  if (tab === "overview") {
    return (
      <div className="customer-detail-grid">
        <DetailCard title={t("customerProfile.cards.accountOverview")} icon={<WalletCards size={17} />}>
          <DetailRows
            rows={[
              [t("customerProfile.fields.accountBalance"), model.accountBalance],
              [t("customerProfile.fields.netDeposit"), model.netDeposit],
              [t("customerProfile.fields.totalDeposit"), model.totalDeposit],
              [t("customerProfile.fields.activationStatus"), model.activationStatus],
            ]}
          />
        </DetailCard>
        <DetailCard title={t("customerProfile.detail.serviceContext")} icon={<CalendarClock size={17} />}>
          <DetailRows
            rows={[
              [t("customerProfile.fields.tags"), model.tags.join(" / ") || "--"],
              [t("customerProfile.fields.followUp"), model.nextFollowUp],
              [
                t("customerProfile.fields.ticket"),
                model.tickets.length > 0
                  ? t("customerProfile.detail.ticketCount", { count: model.tickets.length })
                  : "--",
              ],
              [t("customerProfile.fields.remark"), model.remark],
            ]}
          />
        </DetailCard>
        <DetailCard title={t("customerProfile.cards.languageBridge")} icon={<BadgeCheck size={17} />}>
          <DetailRows
            rows={[
              [t("customerProfile.fields.customerReceive"), model.customerLanguage],
              [t("customerProfile.fields.staffView"), model.staffLanguage],
              [t("customerProfile.fields.translateMode"), model.translateMode],
              [t("customerProfile.fields.sourceChannel"), model.source],
            ]}
          />
        </DetailCard>
      </div>
    );
  }
  const config = {
    agentDevice: [t("customerProfile.tabs.agentDevice"), <Smartphone size={17} />],
    compliance: [t("customerProfile.tabs.compliance"), <ShieldCheck size={17} />],
    funds: [t("customerProfile.tabs.funds"), <WalletCards size={17} />],
    sessions: [t("customerProfile.tabs.sessions"), <MessageCircleMore size={17} />],
    tickets: [t("customerProfile.tabs.tickets"), <ClipboardList size={17} />],
    touch: [t("customerProfile.tabs.touch"), <Radio size={17} />],
    trading: [t("customerProfile.tabs.trading"), <ReceiptText size={17} />],
  }[tab] as [string, ReactNode];
  return (
    <DetailCard title={config[0]} icon={config[1]}>
      <PanelState text={t("customerProfile.detail.placeholder")} />
    </DetailCard>
  );
}

function DetailCard({
  children,
  icon,
  title,
}: {
  children: ReactNode;
  icon: ReactNode;
  title: string;
}) {
  return (
    <article className="customer-detail-card">
      <h2>
        {icon}
        {title}
      </h2>
      {children}
    </article>
  );
}

function DetailRows({ rows }: { rows: Array<[string, string]> }) {
  return (
    <div className="customer-detail-rows">
      {rows.map(([label, value]) => (
        <p key={label}>
          <span>{label}</span>
          <strong>{isKnown(value) ? value : "--"}</strong>
        </p>
      ))}
    </div>
  );
}
