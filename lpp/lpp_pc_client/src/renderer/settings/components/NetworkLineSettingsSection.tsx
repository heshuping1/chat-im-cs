import type { QueryClient } from "@tanstack/react-query";
import { Check, Globe2, RefreshCw, Wifi } from "lucide-react";
import { useEffect, useState } from "react";

import type { AuthSession } from "../../data/auth/auth-session";
import { useSetAuthSession } from "../../data/auth/auth-store";
import {
  type AppSiteLine,
  latencyTone,
  measureSiteLatency,
  siteLineManager,
} from "../../data/network/site-line-manager";
import { useI18n } from "../../i18n/useI18n";

type LatencyValue = number | null | undefined;
type Translate = ReturnType<typeof useI18n>["t"];

export function NetworkLineSettingsSection({
  authSession,
  queryClient,
  setNotice,
}: {
  authSession: AuthSession | null;
  queryClient: QueryClient;
  setNotice: (notice: string) => void;
}) {
  const { t } = useI18n();
  const setAuthSession = useSetAuthSession();
  const [lineState, setLineState] = useState(siteLineManager.getSnapshot());
  const [latencies, setLatencies] = useState<Record<string, LatencyValue>>({});
  const [testingIds, setTestingIds] = useState<Set<string>>(() => new Set());

  useEffect(() => {
    const unsubscribe = siteLineManager.subscribe(() =>
      setLineState(siteLineManager.getSnapshot()),
    );
    return () => {
      unsubscribe();
    };
  }, []);

  const applySiteToSession = (site: AppSiteLine) => {
    if (!authSession || authSession.apiBaseUrl === site.apiBaseUrl) return;
    queryClient.clear();
    setAuthSession({ ...authSession, apiBaseUrl: site.apiBaseUrl });
  };

  const handleSelect = (site: AppSiteLine) => {
    const selected = siteLineManager.selectSite(site);
    applySiteToSession(selected);
    setNotice(t("me.networkLine.switched", { name: selected.name }));
  };

  const handleRefresh = async () => {
    try {
      const result = await siteLineManager.refresh();
      applySiteToSession(result.currentSite);
      setNotice(
        result.refreshedConfig
          ? t("me.networkLine.configRefreshed")
          : t("me.networkLine.localChecked"),
      );
    } catch {
      setNotice(t("me.networkLine.refreshFailed"));
    }
  };

  const testOne = async (site: AppSiteLine) => {
    setTestingIds((current) => new Set([...current, site.id]));
    try {
      const value = await measureSiteLatency(site);
      setLatencies((current) => ({ ...current, [site.id]: value }));
    } finally {
      setTestingIds((current) => {
        const next = new Set(current);
        next.delete(site.id);
        return next;
      });
    }
  };

  const testAll = async () => {
    await Promise.all(lineState.switchableSites.map((site) => testOne(site)));
    setNotice(t("me.networkLine.testCompleted"));
  };

  return (
    <section className="settings-network-lines" aria-label={t("me.networkLine.aria")}>
      <div className="settings-network-current">
        <span className="settings-network-current-icon">
          <Globe2 size={20} />
        </span>
        <div>
          <span className="settings-network-kicker">{t("me.networkLine.currentSite")}</span>
          <strong>{lineState.currentSite.name}</strong>
          <em>{lineState.currentSite.apiBaseUrl}</em>
        </div>
        <span className="settings-network-status">
          <i />
          {t("me.networkLine.available")}
        </span>
      </div>

      <div className="settings-network-toolbar">
        <div>
          <strong>{t("me.networkLine.switchableSites")}</strong>
          <span>{t("me.networkLine.switchableSummary", { count: lineState.switchableSites.length })}</span>
        </div>
        <div className="settings-network-actions">
          <button type="button" onClick={() => void handleRefresh()} disabled={lineState.isRefreshing}>
            <RefreshCw size={14} />
            {lineState.isRefreshing ? t("me.networkLine.refreshing") : t("me.networkLine.refresh")}
          </button>
          <button type="button" onClick={() => void testAll()} disabled={testingIds.size > 0}>
            <Wifi size={14} />
            {testingIds.size > 0 ? t("me.networkLine.testing") : t("me.networkLine.testAll")}
          </button>
        </div>
      </div>

      <div className="settings-network-list">
        {lineState.switchableSites.map((site) => {
          const selected = site.id === lineState.currentSite.id;
          const testing = testingIds.has(site.id);
          const latency = latencies[site.id];
          return (
            <div className={`settings-network-row ${selected ? "selected" : ""}`} key={site.id}>
              <button
                className="settings-network-select"
                type="button"
                onClick={() => handleSelect(site)}
              >
                <span className="settings-network-row-main">
                  <strong>{site.name}</strong>
                  <em>{site.apiBaseUrl}</em>
                </span>
              </button>
              <span className={`settings-network-latency ${latencyTone(latency)}`}>
                {latencyDisplayText(latency, testing, t)}
              </span>
              <button
                className="settings-network-test"
                type="button"
                aria-label={t("me.networkLine.testNamed", { name: site.name })}
                onClick={(event) => {
                  event.stopPropagation();
                  void testOne(site);
                }}
              >
                <RefreshCw size={14} />
              </button>
              {selected && (
                <span className="settings-network-check">
                  <Check size={15} />
                </span>
              )}
            </div>
          );
        })}
      </div>

      <p className="settings-network-note">
        {t("me.networkLine.note", {
          activeLine: t("me.networkLine.activeLine"),
          latencyTest: t("me.networkLine.latencyTest"),
        })}
      </p>
    </section>
  );
}

function latencyDisplayText(value: LatencyValue, testing: boolean, t: Translate) {
  if (testing) return t("me.networkLine.latency.testing");
  if (value === undefined) return t("me.networkLine.latency.untested");
  if (value === null) return t("me.networkLine.latency.unavailable");
  return t("me.networkLine.latency.ms", { value });
}
