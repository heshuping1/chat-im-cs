export type DiagnosticsRecordModuleFilter =
  | "all"
  | "message"
  | "gateway"
  | "cs-routing"
  | "api-traffic"
  | "api-error"
  | "settings"
  | "runtime";

export interface DiagnosticRecordViewModel {
  at: string;
  event: string;
  logLine: string;
  module: string;
  moduleLabel: string;
  phase: string;
  reason: string;
  result: string;
  traceId: string;
}

export interface DiagnosticsRecordGroupViewModel {
  failedCount: number;
  module: string;
  moduleLabel: string;
  records: DiagnosticRecordViewModel[];
  totalCount: number;
}

export interface DiagnosticsRecordFilterSummary {
  count: number;
  failedCount: number;
  id: DiagnosticsRecordModuleFilter;
  label: string;
}

export interface DiagnosticsRecordsSummary {
  failedCount: number;
  latestErrorAt: string | null;
  totalCount: number;
}

type DiagnosticsTarget = Partial<Record<DiagnosticsWindowKey, unknown>>;

type DiagnosticsWindowKey =
  | "__lppApiErrorDiagnostics"
  | "__lppApiTrafficDiagnostics"
  | "__lppCustomerServiceCacheDiagnostics"
  | "__lppCustomerServiceStateDiagnostics"
  | "__lppGatewayDiagnostics"
  | "__lppMessageCenterDiagnostics"
  | "__lppRuntimeErrorDiagnostics"
  | "__lppSettingsDiagnostics";

interface DiagnosticsSource {
  key: DiagnosticsWindowKey;
  module: string;
  moduleFilter: Exclude<DiagnosticsRecordModuleFilter, "all">;
  moduleLabel: string;
}

export interface GetRecentDiagnosticsRecordsOptions {
  limit?: number;
  moduleFilter?: DiagnosticsRecordModuleFilter;
  target?: DiagnosticsTarget | null;
}

export const diagnosticsRecordFilters: Array<{
  id: DiagnosticsRecordModuleFilter;
  label: string;
}> = [
  { id: "all", label: "全部" },
  { id: "message", label: "消息链路" },
  { id: "gateway", label: "网关" },
  { id: "cs-routing", label: "客服路由" },
  { id: "api-traffic", label: "API 请求" },
  { id: "api-error", label: "API 错误" },
  { id: "settings", label: "设置" },
  { id: "runtime", label: "运行时" },
];

const diagnosticsSources: DiagnosticsSource[] = [
  {
    key: "__lppMessageCenterDiagnostics",
    module: "message-center",
    moduleFilter: "message",
    moduleLabel: "消息链路",
  },
  {
    key: "__lppGatewayDiagnostics",
    module: "gateway",
    moduleFilter: "gateway",
    moduleLabel: "网关",
  },
  {
    key: "__lppCustomerServiceStateDiagnostics",
    module: "cs-state",
    moduleFilter: "cs-routing",
    moduleLabel: "客服路由",
  },
  {
    key: "__lppCustomerServiceCacheDiagnostics",
    module: "cs-cache",
    moduleFilter: "cs-routing",
    moduleLabel: "客服路由",
  },
  {
    key: "__lppApiTrafficDiagnostics",
    module: "api-traffic",
    moduleFilter: "api-traffic",
    moduleLabel: "API 请求",
  },
  {
    key: "__lppApiErrorDiagnostics",
    module: "api-error",
    moduleFilter: "api-error",
    moduleLabel: "API 错误",
  },
  {
    key: "__lppSettingsDiagnostics",
    module: "settings",
    moduleFilter: "settings",
    moduleLabel: "设置",
  },
  {
    key: "__lppRuntimeErrorDiagnostics",
    module: "runtime-error",
    moduleFilter: "runtime",
    moduleLabel: "运行时",
  },
];

const maxSummaryLength = 120;
type TextReplacement = string | ((substring: string, ...args: string[]) => string);

const sensitiveTextPatterns: Array<[RegExp, TextReplacement]> = [
  [/Bearer\s+[A-Za-z0-9._~+/=-]+/gi, "Bearer ***"],
  [/(Authorization|Cookie)\s*:\s*[^\s,;，。]+/gi, "$1: [redacted]"],
  [/\b(?:token|authorization|cookie|password|secret|credential)=?[^\s,;，。]+/gi, "[redacted]"],
  [/\b1[3-9]\d{9}\b/g, (value: string) => `${value.slice(0, 3)}****${value.slice(-4)}`],
];

export function getRecentDiagnosticsRecords({
  limit = 50,
  moduleFilter = "all",
  target = currentDiagnosticsTarget(),
}: GetRecentDiagnosticsRecordsOptions = {}): DiagnosticRecordViewModel[] {
  const records = diagnosticsSources
    .filter((source) => moduleFilter === "all" || source.moduleFilter === moduleFilter)
    .flatMap((source) => recordsFromSource(source, target))
    .sort((left, right) => Date.parse(right.at) - Date.parse(left.at));

  return records.slice(0, limit);
}

export function summarizeDiagnosticsRecords(
  records: DiagnosticRecordViewModel[],
): DiagnosticsRecordsSummary {
  const failedRecords = records.filter((record) => isFailedResult(record.result));
  return {
    failedCount: failedRecords.length,
    latestErrorAt: failedRecords[0]?.at ?? null,
    totalCount: records.length,
  };
}

export function getDiagnosticsRecordGroups(
  records: DiagnosticRecordViewModel[],
): DiagnosticsRecordGroupViewModel[] {
  const groups = new Map<string, DiagnosticRecordViewModel[]>();
  for (const record of records) {
    const current = groups.get(record.moduleLabel) ?? [];
    current.push(record);
    groups.set(record.moduleLabel, current);
  }
  return Array.from(groups.entries()).map(([moduleLabel, groupRecords]) => ({
    failedCount: groupRecords.filter((record) => isFailedResult(record.result)).length,
    module: groupRecords[0]?.module ?? moduleLabel,
    moduleLabel,
    records: groupRecords,
    totalCount: groupRecords.length,
  }));
}

export function getDiagnosticsRecordFilterSummaries(
  records: DiagnosticRecordViewModel[],
): DiagnosticsRecordFilterSummary[] {
  return diagnosticsRecordFilters.map((filter) => {
    const filterId = filter.id;
    if (filterId === "all") {
      return {
        count: records.length,
        failedCount: records.filter((record) => isFailedResult(record.result)).length,
        id: filterId,
        label: filter.label,
      };
    }
    const filtered = records.filter((record) => recordMatchesFilter(record, filterId));
    return {
      count: filtered.length,
      failedCount: filtered.filter((record) => isFailedResult(record.result)).length,
      id: filterId,
      label: filter.label,
    };
  });
}

export function getDiagnosticsRecordsLogText(records: DiagnosticRecordViewModel[]) {
  return records.map((record) => record.logLine).join("\n");
}

export function filterDiagnosticsRecords(
  records: DiagnosticRecordViewModel[],
  filter: DiagnosticsRecordModuleFilter,
) {
  return filter === "all" ? records : records.filter((record) => recordMatchesFilter(record, filter));
}

function recordMatchesFilter(
  record: DiagnosticRecordViewModel,
  filter: Exclude<DiagnosticsRecordModuleFilter, "all">,
) {
  if (filter === "message") return record.module === "message-center";
  if (filter === "gateway") return record.module === "gateway";
  if (filter === "cs-routing") return record.module === "cs-state" || record.module === "cs-cache";
  if (filter === "api-traffic") return record.module === "api-traffic";
  if (filter === "api-error") return record.module === "api-error";
  if (filter === "settings") return record.module === "settings";
  return record.module === "runtime-error";
}

function recordsFromSource(
  source: DiagnosticsSource,
  target: DiagnosticsTarget | null,
): DiagnosticRecordViewModel[] {
  const rawRecords = target?.[source.key];
  if (!Array.isArray(rawRecords)) return [];
  return rawRecords.flatMap((record) => normalizeRecord(source, record));
}

function normalizeRecord(
  source: DiagnosticsSource,
  record: unknown,
): DiagnosticRecordViewModel[] {
  if (!record || typeof record !== "object" || Array.isArray(record)) return [];
  const fields = record as Record<string, unknown>;
  const at = normalizeTimestamp(fields.timestamp ?? fields.at ?? fields.occurredAt ?? fields.generatedAt);
  const viewModel = {
    at,
    event: sanitizeSummary(stringField(fields.event) || stringField(fields.kind) || source.module),
    module: stringField(fields.module) || source.module,
    moduleLabel: source.moduleLabel,
    phase: sanitizeSummary(stringField(fields.phase) || "--"),
    reason: summarizeReason(fields),
    result: sanitizeSummary(stringField(fields.result) || stringField(fields.status) || "--"),
    traceId: sanitizeSummary(stringField(fields.traceId) || `${source.module}-${Date.parse(at) || 0}`),
  };
  return [
    {
      ...viewModel,
      logLine: formatLogLine(viewModel),
    },
  ];
}

function summarizeReason(fields: Record<string, unknown>) {
  const directReason = stringField(fields.reason);
  if (directReason) return sanitizeSummary(directReason);

  const errorMessage = errorSummary(fields.error);
  if (errorMessage) return sanitizeSummary(errorMessage);

  const summary = stringField(fields.summary) || stringField(fields.classification);
  if (summary) return sanitizeSummary(summary);

  return "--";
}

function errorSummary(error: unknown) {
  if (!error) return undefined;
  if (typeof error === "string") return error;
  if (typeof error !== "object" || Array.isArray(error)) return String(error);
  const fields = error as Record<string, unknown>;
  return (
    stringField(fields.userMessage) ||
    stringField(fields.message) ||
    stringField(fields.code) ||
    stringField(fields.kind)
  );
}

function stringField(value: unknown) {
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return undefined;
}

function normalizeTimestamp(value: unknown) {
  if (typeof value === "number") return new Date(value).toISOString();
  if (typeof value === "string") {
    const date = new Date(value);
    if (!Number.isNaN(date.getTime())) return date.toISOString();
  }
  return new Date(0).toISOString();
}

function sanitizeSummary(value: string) {
  const redacted = sensitiveTextPatterns.reduce(
    (text, [pattern, replacement]) => text.replace(pattern, replacement as never),
    value,
  );
  return redacted.length > maxSummaryLength
    ? `${redacted.slice(0, maxSummaryLength)}...`
    : redacted;
}

function formatLogLine(record: Omit<DiagnosticRecordViewModel, "logLine">) {
  return [
    formatTime(record.at),
    `[${record.moduleLabel}]`,
    record.result,
    record.phase,
    record.event,
    record.reason,
    `trace=${record.traceId}`,
  ].filter(Boolean).join(" ");
}

function formatTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime()) || date.getTime() === 0) return "--:--:--";
  return date.toLocaleTimeString("zh-CN", { hour12: false });
}

function isFailedResult(result: string) {
  return /failed|invalid|error|degraded/i.test(result);
}

function currentDiagnosticsTarget(): DiagnosticsTarget | null {
  return typeof window === "undefined" ? null : window;
}
