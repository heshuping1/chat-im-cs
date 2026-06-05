import type { DiagnosticRecordViewModel } from "./diagnosticsRecords";

export type ConnectivityHealthStatus = "observable" | "failed" | "no-sample" | "pending";

export interface ConnectivityHealthItem {
  desc: string;
  id: string;
  label: string;
  source: "phase-one" | "phase-two";
  status: ConnectivityHealthStatus;
  statusLabel: string;
  value: string;
}

export interface ConnectivityHealthInput {
  apiBaseUrl?: string | null;
  currentSiteName?: string;
  diagnostics?: DiagnosticRecordViewModel[];
  lineCount?: number;
}

export interface ConnectivityHealthViewModel {
  phaseOne: ConnectivityHealthItem[];
  phaseTwo: ConnectivityHealthItem[];
  summary: {
    failedCount: number;
    observableCount: number;
    pendingCount: number;
    totalCount: number;
  };
}

export function createConnectivityHealthViewModel({
  apiBaseUrl,
  currentSiteName,
  diagnostics = [],
  lineCount,
}: ConnectivityHealthInput): ConnectivityHealthViewModel {
  const latestApiError = latestRecord(diagnostics, (record) => record.module === "api-error");
  const latestGateway = latestRecord(diagnostics, (record) =>
    record.module === "gateway" || record.event === "gateway.health",
  );
  const latestMedia = latestRecord(diagnostics, (record) =>
    /media|upload|download|cache/i.test(`${record.event} ${record.phase} ${record.reason}`),
  );
  const latestCustomerService = latestRecord(diagnostics, (record) =>
    record.module === "cs-state" || record.module === "cs-cache" || record.module === "cs-routing",
  );

  const phaseOne: ConnectivityHealthItem[] = [
    {
      id: "api-base",
      desc: "",
      label: "当前 API",
      source: "phase-one",
      status: latestApiError ? "failed" : apiBaseUrl ? "observable" : "no-sample",
      statusLabel: latestApiError ? "failed" : apiBaseUrl ? "observable" : "no-sample",
      value: latestApiError?.reason || apiBaseUrl || "--",
    },
    {
      id: "site-lines",
      desc: "",
      label: "线路配置",
      source: "phase-one",
      status: lineCount ? "observable" : "no-sample",
      statusLabel: lineCount ? "observable" : "no-sample",
      value: currentSiteName && lineCount ? `${currentSiteName} / ${lineCount} 条线路` : "--",
    },
    {
      id: "gateway-runtime",
      desc: "",
      label: "实时连接",
      source: "phase-one",
      status: latestGateway
        ? failedRecord(latestGateway)
          ? "failed"
          : "observable"
        : "no-sample",
      statusLabel: latestGateway ? (failedRecord(latestGateway) ? "failed" : "observable") : "no-sample",
      value: latestGateway ? formatClock(latestGateway.at) : "--",
    },
    {
      id: "media-recent-errors",
      desc: "",
      label: "媒体上传/下载",
      source: "phase-one",
      status: latestMedia ? "failed" : "no-sample",
      statusLabel: latestMedia ? "failed" : "no-sample",
      value: latestMedia?.reason || "--",
    },
    {
      id: "customer-service-routing",
      desc: "",
      label: "在线客服路由",
      source: "phase-one",
      status: latestCustomerService
        ? failedRecord(latestCustomerService)
          ? "failed"
          : "observable"
        : "no-sample",
      statusLabel: latestCustomerService
        ? failedRecord(latestCustomerService)
          ? "failed"
          : "observable"
        : "no-sample",
      value: latestCustomerService ? formatClock(latestCustomerService.at) : "--",
    },
  ];

  const phaseTwo: ConnectivityHealthItem[] = [
    futureEndpoint("api-health"),
    futureEndpoint("gateway-health"),
    futureEndpoint("media-health"),
    futureEndpoint("cs-health"),
    futureEndpoint("fixture-health"),
  ];

  const allItems = [...phaseOne, ...phaseTwo];
  return {
    phaseOne,
    phaseTwo,
    summary: {
      failedCount: allItems.filter((item) => item.status === "failed").length,
      observableCount: allItems.filter((item) => item.status === "observable").length,
      pendingCount: allItems.filter((item) => item.status === "pending" || item.status === "no-sample").length,
      totalCount: allItems.length,
    },
  };
}

function futureEndpoint(id: string): ConnectivityHealthItem {
  return {
    desc: "",
    id,
    label: phaseTwoLabel(id),
    source: "phase-two",
    status: "pending",
    statusLabel: "pending",
    value: "",
  };
}

function latestRecord(
  records: DiagnosticRecordViewModel[],
  predicate: (record: DiagnosticRecordViewModel) => boolean,
) {
  return records.find(predicate);
}

function failedRecord(record: DiagnosticRecordViewModel) {
  return /failed|invalid|error|degraded/i.test(record.result);
}

function formatClock(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime()) || date.getTime() === 0) return "--";
  return `最近记录 ${date.toLocaleTimeString("zh-CN", {
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    timeZone: "Asia/Shanghai",
  })}`;
}

function phaseTwoLabel(id: string) {
  if (id === "api-health") return "API 健康端点";
  if (id === "gateway-health") return "Gateway 健康端点";
  if (id === "media-health") return "媒体上传/下载端点";
  if (id === "cs-health") return "在线客服队列端点";
  if (id === "fixture-health") return "客服测试夹具";
  return id;
}
