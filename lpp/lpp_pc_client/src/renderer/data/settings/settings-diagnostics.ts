export type SettingsDiagnosticEvent =
  | "settings.parse"
  | "settings.persist"
  | "settings.restore"
  | "settings.update";

export type SettingsDiagnosticPhase = "parse" | "persist" | "restore" | "update";
export type SettingsDiagnosticResult = "failed" | "skipped" | "success";

export interface SettingsDiagnosticRecord {
  traceId: string;
  module: "settings";
  taskId: "P2-ST-002D";
  event: SettingsDiagnosticEvent;
  phase: SettingsDiagnosticPhase;
  result: SettingsDiagnosticResult;
  timestamp: number;
  reason?: string;
  context?: Record<string, unknown>;
  error?: {
    message: string;
    name?: string;
  };
}

export interface SettingsDiagnosticInput {
  event: SettingsDiagnosticEvent;
  phase: SettingsDiagnosticPhase;
  result: SettingsDiagnosticResult;
  reason?: string;
  context?: Record<string, unknown>;
  error?: unknown;
}

const settingsDiagnosticsFlag = "lpp.settingsDiagnostics";
const settingsDiagnosticsMaxRecords = 100;

export function logSettingsDiagnostic(input: SettingsDiagnosticInput) {
  const record = createSettingsDiagnosticRecord(input);
  const target = settingsDiagnosticTarget();

  if (target) {
    const current = target.__lppSettingsDiagnostics ?? [];
    target.__lppSettingsDiagnostics = [...current, record].slice(-settingsDiagnosticsMaxRecords);
    if (shouldPrintSettingsDiagnostics(target)) {
      console.info("[lpp:settings]", record);
    }
  }

  return record;
}

export function createSettingsDiagnosticRecord(
  input: SettingsDiagnosticInput,
): SettingsDiagnosticRecord {
  return {
    traceId: createSettingsTraceId(input.phase),
    module: "settings",
    taskId: "P2-ST-002D",
    event: input.event,
    phase: input.phase,
    result: input.result,
    timestamp: Date.now(),
    reason: input.reason,
    context: input.context,
    error: normalizeSettingsDiagnosticError(input.error),
  };
}

function normalizeSettingsDiagnosticError(
  error: unknown,
): SettingsDiagnosticRecord["error"] {
  if (!error) return undefined;
  if (error instanceof Error) {
    return {
      message: error.message,
      name: error.name,
    };
  }
  return {
    message: String(error),
  };
}

function createSettingsTraceId(phase: SettingsDiagnosticPhase) {
  return `settings-${phase}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function shouldPrintSettingsDiagnostics(target: Window) {
  try {
    return (
      import.meta.env.DEV ||
      target.localStorage?.getItem(settingsDiagnosticsFlag) === "1"
    );
  } catch {
    return import.meta.env.DEV;
  }
}

function settingsDiagnosticTarget() {
  return typeof window === "undefined" ? null : window;
}
