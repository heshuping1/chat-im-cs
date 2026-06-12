import type {
  DiagnosticsJsonValue,
  DiagnosticsModuleSnapshot,
  DiagnosticsPayload,
} from "../../../shared/desktop-api";
import {
  extractPerformanceSamples,
  summarizePerformanceSamples,
} from "../performance/performance-samples";
import { persistedSendDiagnosticsStorageKey } from "../send/send-state-machine";

type DiagnosticsWindowKey =
  | "__lppApiContractDiagnostics"
  | "__lppApiErrorDiagnostics"
  | "__lppApiTrafficDiagnostics"
  | "__lppAuthDiagnostics"
  | "__lppCustomerServiceCacheDiagnostics"
  | "__lppCustomerServiceMessageAuditDiagnostics"
  | "__lppCustomerServiceStateDiagnostics"
  | "__lppGatewayDiagnostics"
  | "__lppImReadDiagnostics"
  | "__lppMessageCenterDiagnostics"
  | "__lppReminderDiagnostics"
  | "__lppRuntimeErrorDiagnostics"
  | "__lppSendDiagnostics"
  | "__lppStartupDiagnostics"
  | "__lppSettingsDiagnostics";

interface DiagnosticsSource {
  module: string;
  key: DiagnosticsWindowKey;
  persistedKey?: string;
}

type DiagnosticsTarget = Partial<Record<DiagnosticsWindowKey, unknown>> & {
  location?: {
    pathname?: string;
  };
  navigator?: {
    language?: string;
    onLine?: boolean;
    platform?: string;
    userAgent?: string;
  };
  localStorage?: {
    getItem(key: string): string | null;
  };
};

export interface DiagnosticsPackageOptions {
  now?: Date;
  sessionId?: string;
  target?: DiagnosticsTarget | null;
  traceId?: string;
}

const diagnosticsSources: DiagnosticsSource[] = [
  { module: "gateway", key: "__lppGatewayDiagnostics" },
  { module: "auth", key: "__lppAuthDiagnostics" },
  { module: "settings", key: "__lppSettingsDiagnostics" },
  { module: "im-read", key: "__lppImReadDiagnostics" },
  { module: "reminder", key: "__lppReminderDiagnostics" },
  { module: "api-contract", key: "__lppApiContractDiagnostics" },
  { module: "api-error", key: "__lppApiErrorDiagnostics" },
  { module: "api-traffic", key: "__lppApiTrafficDiagnostics" },
  {
    module: "send",
    key: "__lppSendDiagnostics",
    persistedKey: persistedSendDiagnosticsStorageKey,
  },
  { module: "message-center", key: "__lppMessageCenterDiagnostics" },
  { module: "cs-state", key: "__lppCustomerServiceStateDiagnostics" },
  { module: "cs-cache", key: "__lppCustomerServiceCacheDiagnostics" },
  { module: "cs-message-audit", key: "__lppCustomerServiceMessageAuditDiagnostics" },
  { module: "startup", key: "__lppStartupDiagnostics" },
  { module: "runtime-error", key: "__lppRuntimeErrorDiagnostics" },
];

const maxModuleRecords = 200;
const maxObjectEntries = 80;
const maxArrayItems = 200;
const maxDepth = 8;
const sensitiveKeyPattern = /token|password|authorization|secret|credential/i;

export function createDiagnosticsExportPayload(
  options: DiagnosticsPackageOptions = {},
): DiagnosticsPayload {
  const target = options.target ?? currentDiagnosticsTarget();
  const now = options.now ?? new Date();
  const traceId =
    options.traceId ?? `diagnostics-export-${now.getTime()}-${Math.random().toString(16).slice(2)}`;
  const generatedAt = now.toISOString();
  const sessionId = options.sessionId ?? "pc-local-session";
  const diagnostics = collectDiagnosticsSnapshots(target);
  const packagedDiagnostics = {
    runtime: createRuntimeSnapshot(target, now),
    ...diagnostics,
  };
  const performanceSummary = createPerformanceSummarySnapshot({
    breadcrumbs: [],
    diagnostics: packagedDiagnostics,
    errors: [],
    generatedAt,
    sessionId,
    traceId,
  });
  const diagnosticsWithPerformance = performanceSummary.recordCount > 0
    ? { ...packagedDiagnostics, performance: performanceSummary }
    : packagedDiagnostics;

  return {
    breadcrumbs: createDiagnosticsBreadcrumbs(diagnostics),
    diagnostics: diagnosticsWithPerformance,
    errors: collectDiagnosticsErrors(diagnostics),
    generatedAt,
    sessionId,
    traceId,
  };
}

export function sanitizeDiagnosticsValue(value: unknown, depth = 0): DiagnosticsJsonValue {
  if (depth > maxDepth) return "[truncated-depth]";
  if (value === null) return null;
  if (typeof value === "string") return redactDiagnosticsString("", value);
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value === "boolean") return value;
  if (Array.isArray(value)) {
    return value
      .slice(0, maxArrayItems)
      .map((item) => sanitizeDiagnosticsValue(item, depth + 1));
  }
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .slice(0, maxObjectEntries)
        .map(([key, entry]) => [
          key,
          sensitiveKeyPattern.test(key)
            ? "[redacted]"
            : sanitizeDiagnosticsValue(sanitizeDiagnosticsEntry(key, entry), depth + 1),
        ]),
    );
  }
  return String(value);
}

function collectDiagnosticsSnapshots(
  target: DiagnosticsTarget | null,
): Record<string, DiagnosticsModuleSnapshot> {
  return Object.fromEntries(
    diagnosticsSources.map((source) => [
      source.module,
      createModuleSnapshot(
        target?.[source.key] ?? readPersistedDiagnostics(target, source.persistedKey),
      ),
    ]),
  );
}

function createModuleSnapshot(value: unknown): DiagnosticsModuleSnapshot {
  const records = Array.isArray(value) ? value : [];
  return {
    recordCount: records.length,
    records: records.slice(-maxModuleRecords).map((record) => sanitizeDiagnosticsValue(record)),
    truncated: records.length > maxModuleRecords ? true : undefined,
  };
}

function readPersistedDiagnostics(
  target: DiagnosticsTarget | null,
  persistedKey?: string,
) {
  if (!persistedKey) return undefined;
  try {
    const value = target?.localStorage?.getItem(persistedKey);
    if (!value) return undefined;
    const parsed = JSON.parse(value) as unknown;
    return Array.isArray(parsed) ? parsed : undefined;
  } catch {
    return undefined;
  }
}

function createPerformanceSummarySnapshot(
  payload: DiagnosticsPayload,
): DiagnosticsModuleSnapshot {
  const summaries = summarizePerformanceSamples(extractPerformanceSamples([payload]));
  return {
    recordCount: summaries.length,
    records: summaries.map((summary) => sanitizeDiagnosticsValue(summary)),
  };
}

function createRuntimeSnapshot(
  target: DiagnosticsTarget | null,
  now: Date,
): DiagnosticsModuleSnapshot {
  return {
    recordCount: 1,
    records: [
      sanitizeDiagnosticsValue({
        generatedAt: now.toISOString(),
        language: target?.navigator?.language,
        online: target?.navigator?.onLine,
        pathname: target?.location?.pathname,
        platform: target?.navigator?.platform,
        userAgent: target?.navigator?.userAgent,
      }),
    ],
  };
}

function createDiagnosticsBreadcrumbs(
  diagnostics: Record<string, DiagnosticsModuleSnapshot>,
) {
  return [
    "pc.open",
    "settings.open",
    "diagnostics.export",
    ...Object.entries(diagnostics).map(([moduleName, snapshot]) =>
      `${moduleName}:${snapshot.recordCount}`,
    ),
  ];
}

function collectDiagnosticsErrors(
  diagnostics: Record<string, DiagnosticsModuleSnapshot>,
): DiagnosticsPayload["errors"] {
  return Object.entries(diagnostics).flatMap(([moduleName, snapshot]) =>
    snapshot.records.flatMap((record) => createErrorEntry(moduleName, record)),
  ).slice(0, 200);
}

function createErrorEntry(
  moduleName: string,
  record: DiagnosticsJsonValue,
): DiagnosticsPayload["errors"] {
  if (!record || typeof record !== "object" || Array.isArray(record)) return [];
  const fields = record as Record<string, DiagnosticsJsonValue>;
  const hasFailedResult = fields.result === "failed";
  const errorMessage = extractErrorMessage(fields.error);
  if (!hasFailedResult && !errorMessage) return [];
  return [
    {
      at: String(fields.traceId ?? `${moduleName}:${String(fields.phase ?? "unknown")}`),
      message: errorMessage ?? String(fields.reason ?? `${moduleName} failed`),
      requestId: typeof fields.requestId === "string" ? fields.requestId : undefined,
    },
  ];
}

function extractErrorMessage(error: DiagnosticsJsonValue | undefined) {
  if (!error) return undefined;
  if (typeof error === "string") return error;
  if (typeof error === "object" && !Array.isArray(error) && typeof error.message === "string") {
    return error.message;
  }
  return undefined;
}

function sanitizeDiagnosticsEntry(key: string, value: unknown) {
  if (typeof value !== "string") return value;
  return redactDiagnosticsString(key, value);
}

function redactDiagnosticsString(key: string, value: string) {
  if (sensitiveKeyPattern.test(key)) return "[redacted]";
  return value.replace(/Bearer\s+[A-Za-z0-9._~+/=-]+/gi, "Bearer ***");
}

function currentDiagnosticsTarget(): DiagnosticsTarget | null {
  return typeof window === "undefined" ? null : (window as unknown as DiagnosticsTarget);
}
