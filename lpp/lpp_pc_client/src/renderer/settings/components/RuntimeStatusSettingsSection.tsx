import { Activity } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  getRecentMessageTraceSamples,
  messageTraceStageLabel,
  summarizeRecentMessageTraceGroups,
  type MessageTraceGroupSummary,
  type MessageTraceSample,
} from "../../data/diagnostics/message-trace-diagnostics";
import { InfoRow } from "./SettingsRows";
import { settingRowProps } from "../models/settingsCatalog";

export function RuntimeStatusSettingsSection() {
  const [samples, setSamples] = useState<MessageTraceSample[]>(() =>
    getRecentMessageTraceSamples(80),
  );

  useEffect(() => {
    const timer = window.setInterval(() => {
      setSamples(getRecentMessageTraceSamples(80));
    }, 1500);
    return () => window.clearInterval(timer);
  }, []);

  const groups = useMemo(() => summarizeRecentMessageTraceGroups(samples, 6), [samples]);
  const newest = groups[0];

  return (
    <section className="runtime-status-panel" aria-label="运行情况">
      <InfoRow
        {...settingRowProps("runtimeStatus")}
        desc={newest ? runtimeStatusSummary(newest) : "暂无消息耗时采样，发送或接收消息后会自动显示。"}
        stateText={newest ? "实时采样" : "等待采样"}
      />
      <div className="runtime-status-card">
        <header>
          <span>
            <Activity size={16} />
            <strong>最近消息耗时</strong>
          </span>
          <em>仅展示本机可观测阶段</em>
        </header>
        {groups.length ? (
          <ul>
            {groups.map((group) => (
              <li key={group.traceId}>
                <div className="runtime-status-title">
                  <strong>{traceTitle(group)}</strong>
                  <em>{formatClock(group.lastAt)}</em>
                </div>
                <div className="runtime-status-metrics">
                  {metric("服务端到长连接", group.serverToGatewayMs)}
                  {metric("长连接到缓存", group.gatewayToCacheMs)}
                  {metric("长连接到窗口", group.gatewayToUiMs)}
                  {metric("发送请求", group.sendHttpMs)}
                  {metric("提交到确认", group.sendToAckMs)}
                </div>
                <p>{latestStageText(group)}</p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="runtime-status-empty">暂无采样</p>
        )}
      </div>
    </section>
  );
}

function runtimeStatusSummary(group: MessageTraceGroupSummary) {
  if (group.serverToGatewayMs !== undefined) {
    return `最近一条长连接消息：服务端时间到本机收到 ${formatMs(group.serverToGatewayMs)}。`;
  }
  if (group.sendHttpMs !== undefined) {
    return `最近一次发送请求耗时 ${formatMs(group.sendHttpMs)}。`;
  }
  if (group.queryDiscoveredAt) {
    return "最近一条消息由主动查询发现。";
  }
  return "已记录最近消息运行轨迹。";
}

function traceTitle(group: MessageTraceGroupSummary) {
  const owner = group.owner === "customerService" ? "在线客服" : "IM";
  const id = shortId(group.messageId || group.clientMsgId || group.traceId);
  return `${owner} 消息 ${id}`;
}

function latestStageText(group: MessageTraceGroupSummary) {
  const latest = group.stages[group.stages.length - 1];
  const channel = latest.sourceChannel === "gateway"
    ? "长连接"
    : latest.sourceChannel === "http-query"
      ? "主动查询"
      : "发送链路";
  return `${channel}，最新阶段：${messageTraceStageLabel(latest.stage)}`;
}

function metric(label: string, value: number | undefined) {
  if (value === undefined) return null;
  return (
    <span key={label}>
      <b>{label}</b>
      <em>{formatMs(value)}</em>
    </span>
  );
}

function formatMs(value: number) {
  if (value >= 1000) return `${(value / 1000).toFixed(2)} 秒`;
  return `${Math.round(value)} 毫秒`;
}

function formatClock(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleTimeString("zh-CN", { hour12: false });
}

function shortId(value: string) {
  if (value.length <= 8) return value;
  return value.slice(-8);
}
