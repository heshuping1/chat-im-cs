export type StartupDiagnosticEvent =
  | "startup.first-interactive"
  | "startup.renderer-entry";

export type StartupDiagnosticPhase = "entry" | "interactive";
export type StartupDiagnosticResult = "ok" | "warning";
export type StartupSurface = "authenticated-shell" | "login";

export interface StartupDiagnosticRecord {
  traceId: string;
  module: "startup";
  taskId: "P8-PERF-001B";
  event: StartupDiagnosticEvent;
  phase: StartupDiagnosticPhase;
  result: StartupDiagnosticResult;
  timestamp: number;
  durationMs: number;
  budgetMs: number;
  reason?: string;
  context?: Record<string, unknown>;
}

export interface StartupDiagnosticInput {
  event: StartupDiagnosticEvent;
  phase: StartupDiagnosticPhase;
  durationMs: number;
  budgetMs: number;
  surface?: StartupSurface;
  timestamp?: number;
}

interface StartupDiagnosticsTarget {
  __lppStartupDiagnostics?: StartupDiagnosticRecord[];
  localStorage?: {
    getItem(key: string): string | null;
  };
}

export const startupPerformanceBudgets = {
  firstInteractiveMs: 2_500,
  rendererEntryMs: 800,
} as const;

const startupDiagnosticsFlag = "lpp.startupDiagnostics";
const maxStartupDiagnostics = 80;
let firstInteractiveRecorded = false;

export function markRendererEntry() {
  logStartupDiagnostic({
    event: "startup.renderer-entry",
    phase: "entry",
    durationMs: readPerformanceNow(),
    budgetMs: startupPerformanceBudgets.rendererEntryMs,
  });
}

export function markFirstInteractive(surface: StartupSurface) {
  if (firstInteractiveRecorded) return null;
  firstInteractiveRecorded = true;
  return logStartupDiagnostic({
    event: "startup.first-interactive",
    phase: "interactive",
    durationMs: readPerformanceNow(),
    budgetMs: startupPerformanceBudgets.firstInteractiveMs,
    surface,
  });
}

export function createStartupDiagnosticRecord(
  input: StartupDiagnosticInput,
): StartupDiagnosticRecord {
  const roundedDurationMs = Math.round(input.durationMs);
  return {
    traceId: createStartupTraceId(input.phase),
    module: "startup",
    taskId: "P8-PERF-001B",
    event: input.event,
    phase: input.phase,
    result: roundedDurationMs <= input.budgetMs ? "ok" : "warning",
    timestamp: input.timestamp ?? Date.now(),
    durationMs: roundedDurationMs,
    budgetMs: input.budgetMs,
    reason: roundedDurationMs <= input.budgetMs ? undefined : "startup_budget_exceeded",
    context: input.surface ? { surface: input.surface } : undefined,
  };
}

export function appendStartupDiagnostic(
  record: StartupDiagnosticRecord,
  target: StartupDiagnosticsTarget | null = startupDiagnosticsTarget(),
) {
  if (!target) return record;
  const current = target.__lppStartupDiagnostics ?? [];
  target.__lppStartupDiagnostics = [...current, record].slice(-maxStartupDiagnostics);
  if (shouldPrintStartupDiagnostics(target)) {
    const printer = record.result === "warning" ? console.warn : console.debug;
    printer("[lpp:startup]", record);
  }
  return record;
}

export function resetStartupPerformanceForTest() {
  firstInteractiveRecorded = false;
}

function logStartupDiagnostic(input: StartupDiagnosticInput) {
  return appendStartupDiagnostic(createStartupDiagnosticRecord(input));
}

function readPerformanceNow() {
  if (typeof performance === "undefined") return 0;
  return performance.now();
}

function createStartupTraceId(phase: StartupDiagnosticPhase) {
  return `startup-${phase}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function shouldPrintStartupDiagnostics(target: StartupDiagnosticsTarget) {
  try {
    return target.localStorage?.getItem(startupDiagnosticsFlag) === "1";
  } catch {
    return false;
  }
}

function startupDiagnosticsTarget(): StartupDiagnosticsTarget | null {
  return typeof window === "undefined" ? null : window;
}
