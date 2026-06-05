import { Clipboard, FileText } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import type { AppInstanceProfilePayload } from "../../../shared/desktop-api";
import { getAppInstanceProfile } from "../../data/app-instance/app-instance";
import { useI18n } from "../../i18n/useI18n";
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
import { settingRowProps } from "../models/settingsCatalog";
import { InfoRow } from "./SettingsRows";

type Translate = ReturnType<typeof useI18n>["t"];

export function DiagnosticsRecordsSection({
  exportDiagnostics,
  setNotice,
}: {
  exportDiagnostics: () => Promise<void>;
  setNotice: (notice: string) => void;
}) {
  const { locale, t } = useI18n();
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
  const selectedFilterLabel = diagnosticsFilterLabel(
    diagnosticsRecordFilters.find((item) => item.id === filter)?.id ?? "all",
    t,
  );
  const traceRecords = records.filter((record) => record.traceId && record.traceId !== "--").slice(0, 6);

  return (
    <section className="diagnostics-records-panel" aria-label={t("me.diagnosticsRecords.aria")}>
      <InfoRow
        {...settingRowProps("diagnosticsRecentRecords")}
        desc={diagnosticsRecordsSummaryText(summary.totalCount, summary.failedCount, t)}
        stateText={
          summary.totalCount
            ? t("me.diagnosticsRecords.recentRecords")
            : t("me.diagnosticsRecords.waitingRecords")
        }
      />
      <div className="diagnostics-records-card">
        <header>
          <span>
            <FileText size={16} />
            <strong>{t("me.diagnosticsRecords.title")}</strong>
          </span>
          <button type="button" onClick={() => void exportDiagnostics()}>
            {t("me.diagnosticsRecords.exportPackage")}
          </button>
        </header>
        <p className="diagnostics-records-source-note">
          {t("me.diagnosticsRecords.sourceNote")}
        </p>
        <div className="diagnostics-records-summary">
          <span>
            <b>{summary.totalCount}</b>
            <em>{t("me.diagnosticsRecords.recordCount", { filter: selectedFilterLabel })}</em>
          </span>
          <span>
            <b>{summary.failedCount}</b>
            <em>{t("me.diagnosticsRecords.failedRecords")}</em>
          </span>
          <span>
            <b>{summary.latestErrorAt ? formatClock(summary.latestErrorAt, locale) : "--"}</b>
            <em>{t("me.diagnosticsRecords.latestError")}</em>
          </span>
          <span>
            <b>
              {profile
                ? `${profile.profileName} / ${profile.clientInstanceId.slice(0, 8)}`
                : t("me.diagnosticsRecords.browserDebug")}
            </b>
            <em>{t("me.diagnosticsRecords.currentProfile")}</em>
          </span>
        </div>
        <div className="diagnostics-records-workbench">
          <nav className="diagnostics-records-module-list" aria-label={t("me.diagnosticsRecords.moduleFilterAria")}>
            {filterSummaries.map((item) => (
              <button
                key={item.id}
                className={filter === item.id ? "active" : ""}
                type="button"
                onClick={() => setFilter(item.id)}
              >
                <strong>{diagnosticsFilterLabel(item.id, t)}</strong>
                <span>{t("me.diagnosticsRecords.countItems", { count: item.count })}</span>
                {item.failedCount > 0 && (
                  <em>{t("me.diagnosticsRecords.failedCount", { count: item.failedCount })}</em>
                )}
              </button>
            ))}
          </nav>
          <div className="diagnostics-records-log-view">
            <header>
              <strong>{t("me.diagnosticsRecords.logTitle", { filter: selectedFilterLabel })}</strong>
              <span>{t("me.diagnosticsRecords.recentCount", { count: records.length })}</span>
            </header>
            {records.length ? (
              <>
                <pre aria-label={t("me.diagnosticsRecords.logTitle", { filter: selectedFilterLabel })}>{logText}</pre>
                {traceRecords.length > 0 && (
                  <div className="diagnostics-log-actions" aria-label={t("me.diagnosticsRecords.copyTraceAria")}>
                    {traceRecords.map((record) => (
                      <button
                        key={`${record.traceId}-${record.at}`}
                        type="button"
                        onClick={() => void copyTraceId(record.traceId, setNotice, t)}
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
                {t("me.diagnosticsRecords.emptyLog", { filter: selectedFilterLabel })}
              </p>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

function diagnosticsRecordsSummaryText(totalCount: number, failedCount: number, t: Translate) {
  if (!totalCount) return t("me.diagnosticsRecords.emptySummary");
  return t("me.diagnosticsRecords.summary", { total: totalCount, failed: failedCount });
}

async function copyTraceId(
  traceId: string,
  setNotice: (notice: string) => void,
  t: Translate,
) {
  try {
    await navigator.clipboard?.writeText(traceId);
    setNotice(t("me.diagnosticsRecords.traceCopied"));
  } catch {
    setNotice(t("me.diagnosticsRecords.traceCopyFailed"));
  }
}

function formatClock(value: string, locale: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime()) || date.getTime() === 0) return "--";
  return date.toLocaleTimeString(locale, { hour12: false });
}

function shortTraceId(value: string) {
  if (value.length <= 18) return value;
  return `${value.slice(0, 8)}...${value.slice(-6)}`;
}

function diagnosticsFilterLabel(filter: string, t: Translate) {
  return t(`me.diagnosticsRecords.filter.${filter}`);
}
