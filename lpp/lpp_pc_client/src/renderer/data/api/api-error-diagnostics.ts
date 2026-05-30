import { normalizeApiError, type NormalizedApiError } from "./api-error-model";

export type ApiErrorDiagnosticPhase = "request" | "upload";

export interface ApiErrorDiagnosticRecord {
  traceId: string;
  module: "api-error";
  taskId: "P3-API-005C";
  phase: ApiErrorDiagnosticPhase;
  result: "failed";
  timestamp: number;
  method?: string;
  path?: string;
  durationMs?: number;
  error: NormalizedApiError;
}

export interface ApiErrorDiagnosticInput {
  phase: ApiErrorDiagnosticPhase;
  method?: string;
  path?: string;
  durationMs?: number;
  error: unknown;
}

const apiErrorDiagnosticsFlag = "lpp.apiErrorDiagnostics";
const apiErrorDiagnosticsMaxRecords = 160;

export function logApiErrorDiagnostic(input: ApiErrorDiagnosticInput) {
  const record = createApiErrorDiagnosticRecord(input);
  const target = apiErrorDiagnosticTarget();

  if (target) {
    const current = target.__lppApiErrorDiagnostics ?? [];
    target.__lppApiErrorDiagnostics = [...current, record].slice(
      -apiErrorDiagnosticsMaxRecords,
    );
    if (shouldPrintApiErrorDiagnostics(target)) {
      console.info("[lpp:api-error]", record);
    }
  }

  return record;
}

export function createApiErrorDiagnosticRecord(
  input: ApiErrorDiagnosticInput,
): ApiErrorDiagnosticRecord {
  return {
    traceId: createApiErrorTraceId(input.phase),
    module: "api-error",
    taskId: "P3-API-005C",
    phase: input.phase,
    result: "failed",
    timestamp: Date.now(),
    method: input.method,
    path: sanitizePath(input.path),
    durationMs: input.durationMs,
    error: normalizeApiError(input.error),
  };
}

function sanitizePath(path?: string) {
  if (!path) return undefined;
  return path.split("?")[0].replace(/Bearer\s+[A-Za-z0-9._~+/=-]+/gi, "Bearer ***");
}

function createApiErrorTraceId(phase: ApiErrorDiagnosticPhase) {
  return `api-error-${phase}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function shouldPrintApiErrorDiagnostics(target: Window) {
  try {
    return (
      import.meta.env.DEV ||
      target.localStorage?.getItem(apiErrorDiagnosticsFlag) === "1"
    );
  } catch {
    return import.meta.env.DEV;
  }
}

function apiErrorDiagnosticTarget() {
  return typeof window === "undefined" ? null : window;
}
