import type { QueryClient } from "@tanstack/react-query";
import { Check, Globe2, RefreshCw, Wifi } from "lucide-react";
import { useEffect, useState } from "react";
import type { AuthSession } from "../../data/auth/auth-session";
import { useSetAuthSession } from "../../data/auth/auth-store";
import {
  type AppSiteLine,
  latencyText,
  latencyTone,
  measureSiteLatency,
  siteLineManager,
} from "../../data/network/site-line-manager";
import { settingRowProps } from "../models/settingsCatalog";

type LatencyValue = number | null | undefined;

export function NetworkLineSettingsSection({
  authSession,
  queryClient,
  setNotice,
}: {
  authSession: AuthSession | null;
  queryClient: QueryClient;
  setNotice: (notice: string) => void;
}) {
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
    setNotice(`已切换到 ${selected.name}`);
  };

  const handleRefresh = async () => {
    try {
      const result = await siteLineManager.refresh();
      applySiteToSession(result.currentSite);
      setNotice(result.refreshedConfig ? "线路配置已刷新" : "已检查本地线路配置");
    } catch {
      setNotice("刷新线路配置失败，请稍后重试");
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
    setNotice("线路测速已完成");
  };

  return (
    <section className="settings-network-lines" aria-label="网络线路">
      <div className="settings-network-current">
        <span className="settings-network-current-icon">
          <Globe2 size={20} />
        </span>
        <div>
          <span className="settings-network-kicker">当前站点</span>
          <strong>{lineState.currentSite.name}</strong>
          <em>{lineState.currentSite.apiBaseUrl}</em>
        </div>
        <span className="settings-network-status">
          <i />
          可用
        </span>
      </div>

      <div className="settings-network-toolbar">
        <div>
          <strong>可切换站点</strong>
          <span>
            {lineState.switchableSites.length} 条线路，S3 仅作为兜底配置源，不显示在线路列表。
          </span>
        </div>
        <div className="settings-network-actions">
          <button type="button" onClick={() => void handleRefresh()} disabled={lineState.isRefreshing}>
            <RefreshCw size={14} />
            {lineState.isRefreshing ? "刷新中" : "刷新站点"}
          </button>
          <button type="button" onClick={() => void testAll()} disabled={testingIds.size > 0}>
            <Wifi size={14} />
            {testingIds.size > 0 ? "测速中" : "全部测速"}
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
                {latencyText(latency, testing)}
              </span>
              <button
                className="settings-network-test"
                type="button"
                aria-label={`测试 ${site.name}`}
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
        {settingRowProps("activeLine").label} 会真实切换 PC 当前 API 与实时连接基址；
        {settingRowProps("lineLatencyTest").label} 沿用 APP 根地址探测规则，不携带 token、Authorization 或 Cookie。
      </p>
    </section>
  );
}
