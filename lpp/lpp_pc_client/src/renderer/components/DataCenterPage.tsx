import {
  Activity,
  ChartNoAxesCombined,
  Gauge,
  LineChart,
  RefreshCw,
  UsersRound,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { PcDataCenterView } from "../data/workspace-access";
import { useI18n } from "../i18n/useI18n";

type DataCard = {
  titleKey: string;
  descriptionKey: string;
  icon: LucideIcon;
};

const defaultDataCards: DataCard[] = [
  {
    titleKey: "dataCenter.cards.serviceEfficiency.title",
    descriptionKey: "dataCenter.cards.serviceEfficiency.description",
    icon: Gauge,
  },
  {
    titleKey: "dataCenter.cards.customerGrowth.title",
    descriptionKey: "dataCenter.cards.customerGrowth.description",
    icon: UsersRound,
  },
  {
    titleKey: "dataCenter.cards.serviceTrend.title",
    descriptionKey: "dataCenter.cards.serviceTrend.description",
    icon: LineChart,
  },
  {
    titleKey: "dataCenter.cards.realtimeStatus.title",
    descriptionKey: "dataCenter.cards.realtimeStatus.description",
    icon: Activity,
  },
];

const selfServiceDataCards: DataCard[] = [
  {
    titleKey: "dataCenter.cards.myServiceEfficiency.title",
    descriptionKey: "dataCenter.cards.myServiceEfficiency.description",
    icon: Gauge,
  },
  {
    titleKey: "dataCenter.cards.myCustomerFollowUp.title",
    descriptionKey: "dataCenter.cards.myCustomerFollowUp.description",
    icon: UsersRound,
  },
  {
    titleKey: "dataCenter.cards.myServiceTrend.title",
    descriptionKey: "dataCenter.cards.myServiceTrend.description",
    icon: LineChart,
  },
  {
    titleKey: "dataCenter.cards.myRealtimeStatus.title",
    descriptionKey: "dataCenter.cards.myRealtimeStatus.description",
    icon: Activity,
  },
];

export function DataCenterPage({
  dataCenterView = "team-admin",
}: {
  dataCenterView?: PcDataCenterView;
}) {
  const { t } = useI18n();
  const dataCards = dataCardsForView(dataCenterView);
  const pageTitle =
    dataCenterView === "self-service"
      ? t("dataCenter.title.selfService")
      : dataCenterView === "enterprise-owner"
        ? t("dataCenter.title.enterpriseOwner")
        : t("dataCenter.title.default");
  const pageDescription =
    dataCenterView === "self-service"
      ? t("dataCenter.description.selfService")
      : t("dataCenter.description.default");
  return (
    <main className="module-page skeleton-page data-center-page">
      <header className="skeleton-hero">
        <div>
          <span className="eyebrow">DATA CENTER</span>
          <h1>{pageTitle}</h1>
          <p>{pageDescription}</p>
        </div>
        <button className="skeleton-primary-action" type="button" disabled>
          <RefreshCw size={16} />
          {t("dataCenter.refreshMetrics")}
        </button>
      </header>

      <section className="skeleton-metric-strip">
        <div>
          <span>{t("dataCenter.metrics.todayConversations")}</span>
          <strong>--</strong>
        </div>
        <div>
          <span>{t("dataCenter.metrics.slaRisk")}</span>
          <strong>--</strong>
        </div>
        <div>
          <span>{t("dataCenter.metrics.customerSatisfaction")}</span>
          <strong>--</strong>
        </div>
        <div>
          <span>{t("dataCenter.metrics.pendingTickets")}</span>
          <strong>--</strong>
        </div>
      </section>

      <section className="skeleton-lane-grid four">
        {dataCards.map((card) => {
          const Icon = card.icon;
          return (
            <article className="skeleton-lane-card" key={card.titleKey}>
              <span className="skeleton-lane-icon">
                <Icon size={18} />
              </span>
              <strong>{t(card.titleKey)}</strong>
              <p>{t(card.descriptionKey)}</p>
              <em>{t("common.noData")}</em>
            </article>
          );
        })}
      </section>

      <section className="skeleton-empty-panel wide">
        <ChartNoAxesCombined size={30} />
        <h2>{t("dataCenter.emptyTitle")}</h2>
        <p>{t("dataCenter.emptyText")}</p>
      </section>
    </main>
  );
}

function dataCardsForView(dataCenterView: PcDataCenterView) {
  return dataCenterView === "self-service" ? selfServiceDataCards : defaultDataCards;
}
