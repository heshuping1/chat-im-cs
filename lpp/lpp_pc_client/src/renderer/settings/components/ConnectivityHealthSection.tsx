import { Activity, RadioTower, Stethoscope } from "lucide-react";
import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import type { AuthSession } from "../../data/auth/auth-session";
import { siteLineManager } from "../../data/network/site-line-manager";
import { InfoRow } from "./SettingsRows";
import { settingRowProps } from "../models/settingsCatalog";
import {
  createConnectivityHealthViewModel,
  type ConnectivityHealthItem,
} from "../models/connectivityHealth";
import { getRecentDiagnosticsRecords } from "../models/diagnosticsRecords";

export function ConnectivityHealthSection({ authSession }: { authSession: AuthSession | null }) {
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
    <section className="connectivity-health-panel" aria-label="连接体检">
      <InfoRow
        {...settingRowProps("connectivityHealth")}
        desc={connectivitySummaryText(viewModel.summary.failedCount, viewModel.summary.pendingCount)}
        stateText={viewModel.summary.failedCount ? "需关注" : "可观测"}
      />
      <div className="connectivity-health-card">
        <header>
          <span>
            <Stethoscope size={16} />
            <strong>连接体检</strong>
          </span>
          <em>不新建测试连接，不伪造成功状态</em>
        </header>
        <div className="connectivity-health-summary">
          <span>
            <b>{viewModel.summary.observableCount}</b>
            <em>可观测</em>
          </span>
          <span>
            <b>{viewModel.summary.failedCount}</b>
            <em>需关注</em>
          </span>
          <span>
            <b>{viewModel.summary.pendingCount}</b>
            <em>待接入/暂无采样</em>
          </span>
        </div>
        <ConnectivityHealthGroup
          icon={<Activity size={15} />}
          items={viewModel.phaseOne}
          title="第一阶段：当前可观测"
        />
        <ConnectivityHealthGroup
          icon={<RadioTower size={15} />}
          items={viewModel.phaseTwo}
          title="第二阶段：健康端点"
        />
      </div>
    </section>
  );
}

function ConnectivityHealthGroup({
  icon,
  items,
  title,
}: {
  icon: ReactNode;
  items: ConnectivityHealthItem[];
  title: string;
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
              <strong>{item.label}</strong>
              <em>{item.statusLabel}</em>
            </header>
            <p>{item.value}</p>
            <span>{item.desc}</span>
          </article>
        ))}
      </div>
    </section>
  );
}

function connectivitySummaryText(failedCount: number, pendingCount: number) {
  if (failedCount > 0) return `${failedCount} 项需要关注，${pendingCount} 项待接入或暂无采样。`;
  return `当前没有失败采样，${pendingCount} 项待接入或暂无采样。`;
}
