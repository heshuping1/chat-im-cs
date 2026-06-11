import type { ComponentType } from "react";

import type { PcDataCenterView } from "../../data/workspace-access";

export type DataCenterDomainId =
  | "customer-service"
  | "customers"
  | "tickets"
  | "operations";

export type DataCenterReportId =
  | "cs-history"
  | "cs-conversation-stats"
  | "customer-growth"
  | "customer-retention"
  | "ticket-efficiency"
  | "ticket-category"
  | "operations-system";

export type DataCenterExportType = "cs_sessions" | "cs_staff_daily_stats";

export type DataCenterReportPermission =
  | "customer-service-history"
  | "customer-service-admin"
  | "team-admin";

export interface DataCenterDomainDefinition {
  description: string;
  domainId: DataCenterDomainId;
  title: string;
}

export interface DataCenterReportComponentProps {
  dataCenterView: PcDataCenterView;
  report: DataCenterReportDefinition;
}

export interface DataCenterReportDefinition {
  component: ComponentType<DataCenterReportComponentProps>;
  description: string;
  domainId: DataCenterDomainId;
  exportTypes: DataCenterExportType[];
  reportId: DataCenterReportId;
  requiredPermission: DataCenterReportPermission;
  status: "ready" | "placeholder";
  title: string;
}
