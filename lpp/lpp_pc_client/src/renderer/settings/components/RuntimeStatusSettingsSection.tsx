import { Activity } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  getRecentMessageTraceSamples,
  summarizeRecentMessageTraceGroups,
  type MessageTraceGroupSummary,
  type MessageTraceSample,
  type MessageTraceStage,
} from "../../data/diagnostics/message-trace-diagnostics";
import { useI18n } from "../../i18n/useI18n";
import { InfoRow } from "./SettingsRows";
import { settingRowProps } from "../models/settingsCatalog";

type Translate = ReturnType<typeof useI18n>["t"];

export function RuntimeStatusSettingsSection() {
  const { locale, t } = useI18n();
  const [samples, setSamples] = useState<MessageTraceSample[]>(() =>
    getRecentMessageTraceSamples(500),
  );

  useEffect(() => {
    const timer = window.setInterval(() => {
      setSamples(getRecentMessageTraceSamples(500));
    }, 1500);
    return () => window.clearInterval(timer);
  }, []);

  const groups = useMemo(() => summarizeRecentMessageTraceGroups(samples, 6), [samples]);
  const newest = groups[0];

  return (
    <section className="runtime-status-panel" aria-label={t("me.runtimeStatus.aria")}>
      <InfoRow
        {...settingRowProps("runtimeStatus")}
        desc={newest ? runtimeStatusSummary(newest, t) : t("me.runtimeStatus.emptyDesc")}
        stateText={newest ? t("me.runtimeStatus.realtime") : t("me.runtimeStatus.waiting")}
      />
      <div className="runtime-status-card">
        <header>
          <span>
            <Activity size={16} />
            <strong>{t("me.runtimeStatus.recentLatency")}</strong>
          </span>
          <em>{t("me.runtimeStatus.localOnly")}</em>
        </header>
        {groups.length ? (
          <ul>
            {groups.map((group) => (
              <li key={group.traceId}>
                <div className="runtime-status-title">
                  <strong>{traceTitle(group, t)}</strong>
                  <em>{formatClock(group.lastAt, locale)}</em>
                </div>
                <div className="runtime-status-metrics">
                  {metric(t("me.runtimeStatus.metric.serverToGateway"), group.serverToGatewayMs, t)}
                  {metric(t("me.runtimeStatus.metric.gatewayToCache"), group.gatewayToCacheMs, t)}
                  {metric(t("me.runtimeStatus.metric.gatewayToUi"), group.gatewayToUiMs, t)}
                  {metric(t("me.runtimeStatus.metric.sendHttp"), group.sendHttpMs, t)}
                  {metric(t("me.runtimeStatus.metric.sendToAck"), group.sendToAckMs, t)}
                </div>
                <p>{latestStageText(group, t)}</p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="runtime-status-empty">{t("me.runtimeStatus.empty")}</p>
        )}
      </div>
    </section>
  );
}

function runtimeStatusSummary(group: MessageTraceGroupSummary, t: Translate) {
  if (group.serverToGatewayMs !== undefined) {
    return t("me.runtimeStatus.summary.serverToGateway", {
      duration: formatMs(group.serverToGatewayMs, t),
    });
  }
  if (group.sendHttpMs !== undefined) {
    return t("me.runtimeStatus.summary.sendHttp", {
      duration: formatMs(group.sendHttpMs, t),
    });
  }
  if (group.queryDiscoveredAt) {
    return t("me.runtimeStatus.summary.queryDiscovered");
  }
  return t("me.runtimeStatus.summary.recorded");
}

function traceTitle(group: MessageTraceGroupSummary, t: Translate) {
  const owner =
    group.owner === "customerService"
      ? t("me.runtimeStatus.owner.customerService")
      : t("me.runtimeStatus.owner.im");
  const id = shortId(group.messageId || group.clientMsgId || group.traceId);
  return t("me.runtimeStatus.traceTitle", { owner, id });
}

function latestStageText(group: MessageTraceGroupSummary, t: Translate) {
  const latest = group.stages[group.stages.length - 1];
  const channel =
    latest.sourceChannel === "gateway"
      ? t("me.runtimeStatus.channel.gateway")
      : latest.sourceChannel === "http-query"
        ? t("me.runtimeStatus.channel.httpQuery")
        : t("me.runtimeStatus.channel.send");
  return t("me.runtimeStatus.latestStage", {
    channel,
    stage: t(stageLabelKey(latest.stage)),
  });
}

function metric(label: string, value: number | undefined, t: Translate) {
  if (value === undefined) return null;
  return (
    <span key={label}>
      <b>{label}</b>
      <em>{formatMs(value, t)}</em>
    </span>
  );
}

function formatMs(value: number, t: Translate) {
  if (value >= 1000) return t("me.runtimeStatus.seconds", { value: (value / 1000).toFixed(2) });
  return t("me.runtimeStatus.milliseconds", { value: Math.round(value) });
}

function formatClock(value: string, locale: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleTimeString(locale, { hour12: false });
}

function shortId(value: string) {
  if (value.length <= 8) return value;
  return value.slice(-8);
}

function stageLabelKey(stage: MessageTraceStage) {
  return `me.runtimeStatus.stage.${stage.replace(/\./g, "_")}`;
}
