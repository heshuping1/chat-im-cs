import { Clipboard, FileText } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { getAppInstanceProfile } from "../../data/app-instance/app-instance";
import type { AppInstanceProfilePayload } from "../../../shared/desktop-api";
import { InfoRow } from "./SettingsRows";
import { settingRowProps } from "../models/settingsCatalog";
import {
  diagnosticsRecordFilters,
  filterDiagnosticsRecords,
  getDiagnosticsRecordFilterSummaries,
  getDiagnosticsRecordsLogText,
  getRecentDiagnosticsRecords,
  summarizeDiagnosticsRecords,
  type DiagnosticRecordViewModel,
  type DiagnosticsRecordModuleFilter,
} from "../models/diagnosticsRecords";

export function DiagnosticsRecordsSection({
  exportDiagnostics,
  setNotice,
}: {
  exportDiagnostics: () => Promise<void>;
  setNotice: (notice: string) => void;
}) {
  const [filter, setFilter] = useState<DiagnosticsRecordModuleFilter>("all");
  const [profile, setProfile] = useState<AppInstanceProfilePayload | null>(null);
  const [allRecords, setAllRecords] = useState<DiagnosticRecordViewModel[]>(() =>
    getRecentDiagnosticsRecords({ limit: 240 }),
  );

  useEffect(() => {
    void getAppInstanceProfile().then(setProfile).catch(() => setProfile(null));
  }, []);

  useEffect(() => {
    const refresh = () => setAllRecords(getRecentDiagnosticsRecords({ limit: 240 }));
    refresh();
    const timer = window.setInterval(refresh, 1500);
    return () => window.clearInterval(timer);
  }, []);

  const records = useMemo(() => filterDiagnosticsRecords(allRecords, filter), [allRecords, filter]);
  const summary = useMemo(() => summarizeDiagnosticsRecords(records), [records]);
  const filterSummaries = useMemo(() => getDiagnosticsRecordFilterSummaries(allRecords), [allRecords]);
  const logText = useMemo(() => getDiagnosticsRecordsLogText(records), [records]);
  const selectedFilterLabel = diagnosticsRecordFilters.find((item) => item.id === filter)?.label ?? "全部";
  const traceRecords = records.filter((record) => record.traceId && record.traceId !== "--").slice(0, 6);

  return (
    <section className="diagnostics-records-panel" aria-label="诊断记录">
      <InfoRow
        {...settingRowProps("diagnosticsRecentRecords")}
        desc={diagnosticsRecordsSummaryText(summary.totalCount, summary.failedCount)}
        stateText={summary.totalCount ? "最近记录" : "等待记录"}
      />
      <div className="diagnostics-records-card">
        <header>
          <span>
            <FileText size={16} />
            <strong>最近诊断记录</strong>
          </span>
          <button type="button" onClick={() => void exportDiagnostics()}>
            导出诊断包
          </button>
        </header>
        <p className="diagnostics-records-source-note">
          设置页按问题域汇总 renderer 内存诊断并展示脱敏日志行；诊断包里的持久化记录会继续按 jsonl 文件分流，供研发深挖。
        </p>
        <div className="diagnostics-records-summary">
          <span>
            <b>{summary.totalCount}</b>
            <em>{selectedFilterLabel}记录</em>
          </span>
          <span>
            <b>{summary.failedCount}</b>
            <em>异常记录</em>
          </span>
          <span>
            <b>{summary.latestErrorAt ? formatClock(summary.latestErrorAt) : "--"}</b>
            <em>最近异常</em>
          </span>
          <span>
            <b>{profile ? `${profile.profileName} / ${profile.clientInstanceId.slice(0, 8)}` : "浏览器调试"}</b>
            <em>当前 profile</em>
          </span>
        </div>
        <div className="diagnostics-records-workbench">
          <nav className="diagnostics-records-module-list" aria-label="诊断模块筛选">
            {filterSummaries.map((item) => (
              <button
                key={item.id}
                className={filter === item.id ? "active" : ""}
                type="button"
                onClick={() => setFilter(item.id)}
              >
                <strong>{item.label}</strong>
                <span>{item.count} 条</span>
                {item.failedCount > 0 && <em>{item.failedCount} 异常</em>}
              </button>
            ))}
          </nav>
          <div className="diagnostics-records-log-view">
            <header>
              <strong>{selectedFilterLabel}日志</strong>
              <span>{records.length} 条最近记录</span>
            </header>
            {records.length ? (
              <>
                <pre aria-label={`${selectedFilterLabel}日志`}>{logText}</pre>
                {traceRecords.length > 0 && (
                  <div className="diagnostics-log-actions" aria-label="复制最近 traceId">
                    {traceRecords.map((record) => (
                      <button
                        key={`${record.traceId}-${record.at}`}
                        type="button"
                        onClick={() => void copyTraceId(record.traceId, setNotice)}
                      >
                        <Clipboard size={13} />
                        {shortTraceId(record.traceId)}
                      </button>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <p className="diagnostics-records-empty">
                暂无{selectedFilterLabel}诊断记录。发生接口错误、消息链路异常或设置写入后会在这里显示脱敏日志行。
              </p>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

function diagnosticsRecordsSummaryText(totalCount: number, failedCount: number) {
  if (!totalCount) return "暂无本机诊断记录，可继续使用导出诊断包给研发定位。";
  return `已收集 ${totalCount} 条最近诊断记录，其中 ${failedCount} 条需要关注。`;
}

async function copyTraceId(traceId: string, setNotice: (notice: string) => void) {
  try {
    await navigator.clipboard?.writeText(traceId);
    setNotice("已复制 traceId");
  } catch {
    setNotice("无法复制 traceId，请手动选择");
  }
}

function formatClock(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime()) || date.getTime() === 0) return "--";
  return date.toLocaleTimeString("zh-CN", { hour12: false });
}

function shortTraceId(value: string) {
  if (value.length <= 18) return value;
  return `${value.slice(0, 8)}...${value.slice(-6)}`;
}
