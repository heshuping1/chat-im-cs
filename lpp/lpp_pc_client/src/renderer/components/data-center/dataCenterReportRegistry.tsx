import type { PcDataCenterView } from "../../data/workspace-access";
import { CustomerServiceConversationStatsReport } from "../CustomerServiceConversationStatsReport";
import { CustomerServiceHistoryReport } from "../CustomerServiceHistoryReport";
import { DataCenterPlaceholderReport } from "./DataCenterPlaceholderReport";
import type {
  DataCenterDomainDefinition,
  DataCenterDomainId,
  DataCenterReportDefinition,
} from "./dataCenterReportTypes";

export const dataCenterDomains: DataCenterDomainDefinition[] = [
  {
    description: "历史对话和统计对话",
    domainId: "customer-service",
    title: "在线客服",
  },
  {
    description: "客户增长、活跃留存和生命周期分析",
    domainId: "customers",
    title: "客户",
  },
  {
    description: "工单效率、分类统计和处理质量",
    domainId: "tickets",
    title: "工单",
  },
  {
    description: "运营和系统指标预留",
    domainId: "operations",
    title: "运营/系统",
  },
];

export const dataCenterReports: DataCenterReportDefinition[] = [
  {
    component: CustomerServiceHistoryReport,
    description: "统计、搜寻、历史列表、完整对话详情和报表导出在同一页面完成。",
    domainId: "customer-service",
    exportTypes: ["cs_sessions"],
    reportId: "cs-history",
    requiredPermission: "customer-service-history",
    status: "ready",
    title: "历史对话",
  },
  {
    component: CustomerServiceConversationStatsReport,
    description: "按客服统计接待量、平均首次回复、平均处理时长、满意度和来源渠道。",
    domainId: "customer-service",
    exportTypes: ["cs_staff_daily_stats"],
    reportId: "cs-conversation-stats",
    requiredPermission: "customer-service-admin",
    status: "ready",
    title: "统计对话",
  },
  {
    component: DataCenterPlaceholderReport,
    description: "按时间、渠道和来源查看客户新增与活跃趋势。",
    domainId: "customers",
    exportTypes: [],
    reportId: "customer-growth",
    requiredPermission: "team-admin",
    status: "placeholder",
    title: "客户增长",
  },
  {
    component: DataCenterPlaceholderReport,
    description: "分析客户留存、回访、流失和重新激活。",
    domainId: "customers",
    exportTypes: [],
    reportId: "customer-retention",
    requiredPermission: "team-admin",
    status: "placeholder",
    title: "活跃留存",
  },
  {
    component: DataCenterPlaceholderReport,
    description: "统计工单创建、分派、解决和逾期效率。",
    domainId: "tickets",
    exportTypes: [],
    reportId: "ticket-efficiency",
    requiredPermission: "team-admin",
    status: "placeholder",
    title: "工单效率",
  },
  {
    component: DataCenterPlaceholderReport,
    description: "按问题分类、优先级和处理结果分析工单分布。",
    domainId: "tickets",
    exportTypes: [],
    reportId: "ticket-category",
    requiredPermission: "team-admin",
    status: "placeholder",
    title: "分类统计",
  },
  {
    component: DataCenterPlaceholderReport,
    description: "预留运营和系统级指标入口。",
    domainId: "operations",
    exportTypes: [],
    reportId: "operations-system",
    requiredPermission: "team-admin",
    status: "placeholder",
    title: "运营/系统",
  },
];

export function canAccessDataCenterReport(
  report: DataCenterReportDefinition,
  dataCenterView: PcDataCenterView | undefined,
) {
  if (!dataCenterView) return false;
  if (report.requiredPermission === "customer-service-history") return true;
  return dataCenterView !== "self-service";
}

export function reportsForDataCenterDomain(
  domainId: DataCenterDomainId,
  dataCenterView: PcDataCenterView | undefined,
) {
  return dataCenterReports.filter(
    (report) =>
      report.domainId === domainId && canAccessDataCenterReport(report, dataCenterView),
  );
}

export function firstAvailableDataCenterDomain(
  dataCenterView: PcDataCenterView | undefined,
) {
  return dataCenterDomains.find((domain) =>
    reportsForDataCenterDomain(domain.domainId, dataCenterView).length > 0,
  );
}
