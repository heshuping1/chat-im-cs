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
    record.module === "cs-state" || record.module === "cs-cache" || record.moduleLabel === "客服路由",
  );

  const phaseOne: ConnectivityHealthItem[] = [
    {
      desc: "展示当前请求基址；如果最近有 API 错误，会直接标记为需关注。",
      id: "api-base",
      label: "当前 API",
      source: "phase-one",
      status: latestApiError ? "failed" : apiBaseUrl ? "observable" : "no-sample",
      statusLabel: latestApiError ? "需关注" : apiBaseUrl ? "可观测" : "暂无基址",
      value: latestApiError?.reason || apiBaseUrl || "--",
    },
    {
      desc: "复用线路配置与测速能力，不额外携带 token 或 Cookie。",
      id: "site-lines",
      label: "线路配置",
      source: "phase-one",
      status: lineCount ? "observable" : "no-sample",
      statusLabel: lineCount ? "可观测" : "暂无线路",
      value: currentSiteName && lineCount ? `${currentSiteName} / ${lineCount} 条线路` : "--",
    },
    {
      desc: "读取现有 Gateway 连接诊断，不新建测试长连接。",
      id: "gateway-runtime",
      label: "实时连接",
      source: "phase-one",
      status: latestGateway
        ? failedRecord(latestGateway)
          ? "failed"
          : "observable"
        : "no-sample",
      statusLabel: latestGateway ? (failedRecord(latestGateway) ? "需关注" : "可观测") : "暂无采样",
      value: latestGateway ? `最近记录 ${formatClock(latestGateway.at)}` : "--",
    },
    {
      desc: "只显示最近媒体上传、下载或缓存错误；未发生过则不冒充成功。",
      id: "media-recent-errors",
      label: "媒体链路",
      source: "phase-one",
      status: latestMedia ? "failed" : "no-sample",
      statusLabel: latestMedia ? "需关注" : "暂无采样",
      value: latestMedia?.reason || "--",
    },
    {
      desc: "读取在线客服状态与缓存诊断，辅助判断接待、队列和分配问题。",
      id: "customer-service-routing",
      label: "客服路由",
      source: "phase-one",
      status: latestCustomerService
        ? failedRecord(latestCustomerService)
          ? "failed"
          : "observable"
        : "no-sample",
      statusLabel: latestCustomerService
        ? failedRecord(latestCustomerService)
          ? "需关注"
          : "可观测"
        : "暂无采样",
      value: latestCustomerService ? `最近记录 ${formatClock(latestCustomerService.at)}` : "--",
    },
  ];

  const phaseTwo: ConnectivityHealthItem[] = [
    futureEndpoint("api-health", "API 健康端点", "服务端提供轻量 health 后展示 API 服务状态、版本和依赖摘要。"),
    futureEndpoint("gateway-health", "Gateway 健康端点", "服务端提供长连接健康状态后展示连接、协商和订阅状态。"),
    futureEndpoint("media-health", "媒体上传/下载端点", "媒体服务提供健康端点后展示上传、下载和鉴权链路。"),
    futureEndpoint("cs-health", "在线客服队列端点", "客服服务提供队列/分配健康端点后展示接待链路。"),
    futureEndpoint("fixture-health", "客服测试夹具", "仅开发/测试环境接入，用于验证客服夹具接口状态。"),
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

function futureEndpoint(id: string, label: string, desc: string): ConnectivityHealthItem {
  return {
    desc,
    id,
    label,
    source: "phase-two",
    status: "pending",
    statusLabel: "待接入",
    value: "需要服务端健康端点",
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
  return date.toLocaleTimeString("zh-CN", { hour12: false });
}
