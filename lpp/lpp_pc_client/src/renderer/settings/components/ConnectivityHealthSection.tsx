import { Activity, RadioTower, Stethoscope } from "lucide-react";
import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";

import type { AuthSession } from "../../data/auth/auth-session";
import { siteLineManager } from "../../data/network/site-line-manager";
import { useI18n } from "../../i18n/useI18n";
import {
  createConnectivityHealthViewModel,
  type ConnectivityHealthItem,
} from "../models/connectivityHealth";
import { getRecentDiagnosticsRecords } from "../models/diagnosticsRecords";
import { settingRowProps } from "../models/settingsCatalog";
import { InfoRow } from "./SettingsRows";

type Translate = ReturnType<typeof useI18n>["t"];

export function ConnectivityHealthSection({ authSession }: { authSession: AuthSession | null }) {
  const { locale, t } = useI18n();
  const [lineState, setLineState] = useState(siteLineManager.getSnapshot());
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const unsubscribe = siteLineManager.subscribe(() => setLineState(siteLineManager.getSnapshot()));
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => setTick((value) => value + 1), 1500);
    return () => window.clearInterval(timer);
  }, []);

  const diagnostics = useMemo(() => getRecentDiagnosticsRecords({ limit: 160 }), [tick]);
  const viewModel = useMemo(
    () =>
      createConnectivityHealthViewModel({
        apiBaseUrl: authSession?.apiBaseUrl,
        currentSiteName: lineState.currentSite.name,
        diagnostics,
        lineCount: lineState.switchableSites.length,
      }),
    [authSession?.apiBaseUrl, diagnostics, lineState.currentSite.name, lineState.switchableSites.length],
  );

  return (
    <section className="connectivity-health-panel" aria-label={t("me.connectivityHealth.aria")}>
      <InfoRow
        {...settingRowProps("connectivityHealth")}
        label={t("me.connectivityHealth.title")}
        desc={connectivitySummaryText(viewModel.summary.failedCount, viewModel.summary.pendingCount, t)}
        stateText={
          viewModel.summary.failedCount
            ? t("me.connectivityHealth.needsAttention")
            : t("me.connectivityHealth.observable")
        }
      />
      <div className="connectivity-health-card">
        <header>
          <span>
            <Stethoscope size={16} />
            <strong>{t("me.connectivityHealth.title")}</strong>
          </span>
          <em>{t("me.connectivityHealth.noSyntheticConnection")}</em>
        </header>
        <div className="connectivity-health-summary">
          <span>
            <b>{viewModel.summary.observableCount}</b>
            <em>{t("me.connectivityHealth.observable")}</em>
          </span>
          <span>
            <b>{viewModel.summary.failedCount}</b>
            <em>{t("me.connectivityHealth.needsAttention")}</em>
          </span>
          <span>
            <b>{viewModel.summary.pendingCount}</b>
            <em>{t("me.connectivityHealth.pendingOrNoSample")}</em>
          </span>
        </div>
        <ConnectivityHealthGroup
          icon={<Activity size={15} />}
          items={viewModel.phaseOne}
          locale={locale}
          title={t("me.connectivityHealth.phaseOne")}
          t={t}
        />
        <ConnectivityHealthGroup
          icon={<RadioTower size={15} />}
          items={viewModel.phaseTwo}
          locale={locale}
          title={t("me.connectivityHealth.phaseTwo")}
          t={t}
        />
      </div>
    </section>
  );
}

function ConnectivityHealthGroup({
  icon,
  items,
  locale,
  title,
  t,
}: {
  icon: ReactNode;
  items: ConnectivityHealthItem[];
  locale: string;
  title: string;
  t: Translate;
}) {
  return (
    <section className="connectivity-health-group">
      <h3>
        {icon}
        {title}
      </h3>
      <div className="connectivity-health-grid">
        {items.map((item) => (
          <article className={`connectivity-health-item ${item.status}`} key={item.id}>
            <header>
              <strong>{t(`me.connectivityHealth.item.${item.id}.label`)}</strong>
              <em>{connectivityStatusText(item, t)}</em>
            </header>
            <p>{connectivityValueText(item, locale, t)}</p>
            <span>{t(`me.connectivityHealth.item.${item.id}.desc`)}</span>
          </article>
        ))}
      </div>
    </section>
  );
}

function connectivitySummaryText(failedCount: number, pendingCount: number, t: Translate) {
  if (failedCount > 0) {
    return t("me.connectivityHealth.summaryWithFailures", {
      failed: failedCount,
      pending: pendingCount,
    });
  }
  return t("me.connectivityHealth.summaryNoFailures", { pending: pendingCount });
}

function connectivityStatusText(item: ConnectivityHealthItem, t: Translate) {
  if (item.id === "api-base" && item.status === "no-sample") {
    return t("me.connectivityHealth.status.noBaseUrl");
  }
  if (item.id === "site-lines" && item.status === "no-sample") {
    return t("me.connectivityHealth.status.noLines");
  }
  return t(`me.connectivityHealth.status.${item.statusLabel}`);
}

function connectivityValueText(item: ConnectivityHealthItem, locale: string, t: Translate) {
  if (item.source === "phase-two") return t("me.connectivityHealth.requiresServerHealth");
  if (item.value === "--") return item.value;
  if ((item.id === "gateway-runtime" || item.id === "customer-service-routing") && item.value) {
    const date = new Date(item.value);
    const time = Number.isNaN(date.getTime())
      ? item.value
      : date.toLocaleTimeString(locale, { hour12: false });
    return t("me.connectivityHealth.recentRecord", { time });
  }
  if (item.id === "site-lines" && item.value.includes("/")) {
    const [site, rawCount] = item.value.split("/").map((part) => part.trim());
    return t("me.connectivityHealth.siteLineValue", { site, count: rawCount });
  }
  return item.value;
}
