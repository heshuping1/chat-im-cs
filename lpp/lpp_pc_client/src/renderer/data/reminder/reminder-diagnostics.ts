import type { ModuleKey } from "../types";
import type { ReminderDesktopChannel } from "./reminder-types";

export type ReminderDiagnosticEvent =
  | "reminder.dismiss"
  | "reminder.dismiss-target"
  | "reminder.push"
  | "reminder.desktop-notify";

export type ReminderDiagnosticPhase = "dismiss" | "notify" | "push";
export type ReminderDiagnosticResult = "failed" | "skipped" | "success";

export interface ReminderDiagnosticRecord {
  traceId: string;
  module: "reminder";
  taskId: "P2-ST-005C";
  event: ReminderDiagnosticEvent;
  phase: ReminderDiagnosticPhase;
  result: ReminderDiagnosticResult;
  timestamp: number;
  reason?: string;
  context?: {
    reminderId?: string;
    targetModule?: ModuleKey;
    targetId?: string;
    channel?: ReminderDesktopChannel;
    desktopChannel?: "browser" | "electron";
    conversationId?: string;
    beforeCount?: number;
    afterCount?: number;
  };
  error?: {
    message: string;
    name?: string;
  };
}

export interface ReminderDiagnosticInput {
  event: ReminderDiagnosticEvent;
  phase: ReminderDiagnosticPhase;
  result: ReminderDiagnosticResult;
  reason?: string;
  context?: ReminderDiagnosticRecord["context"];
  error?: unknown;
}

const reminderDiagnosticsFlag = "lpp.reminderDiagnostics";
const reminderDiagnosticsMaxRecords = 160;

export function logReminderDiagnostic(input: ReminderDiagnosticInput) {
  const record = createReminderDiagnosticRecord(input);
  const target = reminderDiagnosticTarget();

  if (target) {
    const current = target.__lppReminderDiagnostics ?? [];
    target.__lppReminderDiagnostics = [...current, record].slice(-reminderDiagnosticsMaxRecords);
    if (shouldPrintReminderDiagnostics(target)) {
      console.info("[lpp:reminder]", record);
    }
  }

  return record;
}

export function createReminderDiagnosticRecord(
  input: ReminderDiagnosticInput,
): ReminderDiagnosticRecord {
  return {
    traceId: createReminderTraceId(input.phase),
    module: "reminder",
    taskId: "P2-ST-005C",
    event: input.event,
    phase: input.phase,
    result: input.result,
    timestamp: Date.now(),
    reason: input.reason,
    context: input.context,
    error: normalizeReminderDiagnosticError(input.error),
  };
}

function normalizeReminderDiagnosticError(
  error: unknown,
): ReminderDiagnosticRecord["error"] {
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

function createReminderTraceId(phase: ReminderDiagnosticPhase) {
  return `reminder-${phase}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function shouldPrintReminderDiagnostics(target: Window) {
  try {
    return (
      import.meta.env.DEV ||
      target.localStorage?.getItem(reminderDiagnosticsFlag) === "1"
    );
  } catch {
    return import.meta.env.DEV;
  }
}

function reminderDiagnosticTarget() {
  return typeof window === "undefined" ? null : window;
}
