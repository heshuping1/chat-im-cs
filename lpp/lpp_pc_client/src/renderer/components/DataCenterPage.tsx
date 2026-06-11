import {
  Activity,
  BarChart3,
  Headphones,
  History,
  MessageCircleMore,
  Repeat2,
  Settings2,
  Tags,
  TicketCheck,
  TrendingUp,
  Users,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import type { PcDataCenterView } from "../data/workspace-access";
import {
  dataCenterDomains,
  firstAvailableDataCenterDomain,
  reportsForDataCenterDomain,
} from "./data-center/dataCenterReportRegistry";
import type {
  DataCenterDomainId,
  DataCenterReportDefinition,
  DataCenterReportId,
} from "./data-center/dataCenterReportTypes";
import { PanelState } from "./PanelState";

export function DataCenterPage({
  dataCenterView = "enterprise-owner",
}: {
  dataCenterView?: PcDataCenterView;
}) {
  const initialDomain =
    firstAvailableDataCenterDomain(dataCenterView)?.domainId ?? "customer-service";
  const [selectedDomainId, setSelectedDomainId] =
    useState<DataCenterDomainId>(initialDomain);
  const [selectedReportId, setSelectedReportId] =
    useState<DataCenterReportId>("cs-history");

  const domainsWithReports = useMemo(
    () =>
      dataCenterDomains.map((domain) => ({
        ...domain,
        reports: reportsForDataCenterDomain(domain.domainId, dataCenterView),
      })),
    [dataCenterView],
  );
  const selectedDomain =
    domainsWithReports.find((domain) => domain.domainId === selectedDomainId) ??
    domainsWithReports.find((domain) => domain.reports.length > 0);
  const reports = selectedDomain?.reports ?? [];
  const activeReport =
    reports.find((report) => report.reportId === selectedReportId) ?? reports[0];

  useEffect(() => {
    if (selectedDomain?.domainId && selectedDomain.domainId !== selectedDomainId) {
      setSelectedDomainId(selectedDomain.domainId);
      return;
    }
    if (activeReport?.reportId && activeReport.reportId !== selectedReportId) {
      setSelectedReportId(activeReport.reportId);
    }
  }, [activeReport?.reportId, selectedDomain?.domainId, selectedDomainId, selectedReportId]);

  const ActiveReportComponent = activeReport?.component;

  return (
    <main className="module-page data-center-page data-center-shell">
      <nav className="data-center-domain-nav" aria-label="数据中心业务域">
        {domainsWithReports.map((domain) => {
          const Icon = domainIcon(domain.domainId);
          const disabled = domain.reports.length === 0;
          return (
            <button
              key={domain.domainId}
              type="button"
              className={domain.domainId === selectedDomain?.domainId ? "active" : ""}
              disabled={disabled}
              onClick={() => {
                setSelectedDomainId(domain.domainId);
                setSelectedReportId(domain.reports[0]?.reportId ?? "cs-history");
              }}
            >
              <Icon size={16} />
              <span>{domain.title}</span>
              <small>{domain.description}</small>
            </button>
          );
        })}
      </nav>

      {reports.length > 0 && (
        <section className="data-center-report-cluster">
          <nav
            className="data-center-report-tabs"
            aria-label={`${selectedDomain?.title ?? "数据中心"}二级页签`}
          >
            {reports.map((report) => {
              const ReportIcon = reportIcon(report.reportId);
              return (
                <button
                  key={report.reportId}
                  type="button"
                  className={report.reportId === activeReport?.reportId ? "active" : ""}
                  aria-current={report.reportId === activeReport?.reportId ? "page" : undefined}
                  onClick={() => setSelectedReportId(report.reportId)}
                >
                  <ReportIcon size={15} />
                  {report.title}
                </button>
              );
            })}
          </nav>
        </section>
      )}

      <section className="data-center-report-surface">
        {ActiveReportComponent && activeReport ? (
          <ActiveReportComponent dataCenterView={dataCenterView} report={activeReport} />
        ) : (
          <PanelState text="当前角色暂无可查看的数据报表。" />
        )}
      </section>
    </main>
  );
}

function domainIcon(domainId: DataCenterDomainId) {
  const icons = {
    "customer-service": Headphones,
    customers: Users,
    operations: Settings2,
    tickets: TicketCheck,
  } satisfies Record<DataCenterDomainId, typeof BarChart3>;
  return icons[domainId] ?? BarChart3;
}

function reportIcon(reportId: DataCenterReportId) {
  const icons = {
    "cs-history": History,
    "cs-conversation-stats": MessageCircleMore,
    "customer-growth": TrendingUp,
    "customer-retention": Repeat2,
    "ticket-efficiency": Activity,
    "ticket-category": Tags,
    "operations-system": Settings2,
  } satisfies Record<DataCenterReportId, typeof BarChart3>;
  return icons[reportId] ?? BarChart3;
}

export type { DataCenterReportDefinition };
