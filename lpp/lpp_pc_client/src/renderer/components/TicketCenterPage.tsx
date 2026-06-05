import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  ClipboardList,
  Search,
  SlidersHorizontal,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useI18n } from "../i18n/useI18n";

const ticketLanes: Array<{
  titleKey: string;
  descriptionKey: string;
  icon: LucideIcon;
}> = [
  {
    titleKey: "ticket.lanes.pending.title",
    descriptionKey: "ticket.lanes.pending.description",
    icon: Clock3,
  },
  {
    titleKey: "ticket.lanes.escalating.title",
    descriptionKey: "ticket.lanes.escalating.description",
    icon: AlertTriangle,
  },
  {
    titleKey: "ticket.lanes.resolved.title",
    descriptionKey: "ticket.lanes.resolved.description",
    icon: CheckCircle2,
  },
];

export function TicketCenterPage() {
  const { t } = useI18n();
  return (
    <main className="module-page skeleton-page ticket-center-page">
      <header className="skeleton-hero">
        <div>
          <span className="eyebrow">TICKET CENTER</span>
          <h1>{t("ticket.title")}</h1>
          <p>{t("ticket.description")}</p>
        </div>
        <button className="skeleton-primary-action" type="button" disabled>
          <ClipboardList size={16} />
          {t("ticket.newTicket")}
        </button>
      </header>

      <section className="skeleton-toolbar" aria-label={t("ticket.filterAria")}>
        <label className="skeleton-search">
          <Search size={16} />
          <input placeholder={t("ticket.searchPlaceholder")} />
        </label>
        <button type="button">
          <SlidersHorizontal size={15} />
          {t("common.filter")}
        </button>
      </section>

      <section className="skeleton-lane-grid">
        {ticketLanes.map((lane) => {
          const Icon = lane.icon;
          return (
            <article className="skeleton-lane-card" key={lane.titleKey}>
              <span className="skeleton-lane-icon">
                <Icon size={18} />
              </span>
              <strong>{t(lane.titleKey)}</strong>
              <p>{t(lane.descriptionKey)}</p>
              <em>{t("common.noData")}</em>
            </article>
          );
        })}
      </section>

      <section className="skeleton-empty-panel">
        <ClipboardList size={28} />
        <h2>{t("ticket.emptyTitle")}</h2>
        <p>{t("ticket.emptyText")}</p>
      </section>
    </main>
  );
}
