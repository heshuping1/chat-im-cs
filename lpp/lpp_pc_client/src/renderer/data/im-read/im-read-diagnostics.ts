import type { ImConversationType } from "../im-read-model";

export type ImReadDiagnosticEvent =
  | "im-read.clear-pending"
  | "im-read.mark-local"
  | "im-read.mark-peer"
  | "im-read.upsert-state";

export type ImReadDiagnosticPhase = "clear" | "mark" | "upsert";
export type ImReadDiagnosticResult = "failed" | "skipped" | "success";

export interface ImReadDiagnosticRecord {
  traceId: string;
  module: "im-read";
  taskId: "P2-ST-004D";
  event: ImReadDiagnosticEvent;
  phase: ImReadDiagnosticPhase;
  result: ImReadDiagnosticResult;
  timestamp: number;
  reason?: string;
  context?: {
    conversationId?: string;
    conversationType?: ImConversationType;
    readSeq?: number;
    peerReadSeq?: number;
    myReadSeq?: number;
    lastMessageSeq?: number;
    unreadCount?: number;
  };
  error?: {
    message: string;
    name?: string;
  };
}

export interface ImReadDiagnosticInput {
  event: ImReadDiagnosticEvent;
  phase: ImReadDiagnosticPhase;
  result: ImReadDiagnosticResult;
  reason?: string;
  context?: ImReadDiagnosticRecord["context"];
  error?: unknown;
}

const imReadDiagnosticsFlag = "lpp.imReadDiagnostics";
const imReadDiagnosticsMaxRecords = 120;

export function logImReadDiagnostic(input: ImReadDiagnosticInput) {
  const record = createImReadDiagnosticRecord(input);
  const target = imReadDiagnosticTarget();

  if (target) {
    const current = target.__lppImReadDiagnostics ?? [];
    target.__lppImReadDiagnostics = [...current, record].slice(-imReadDiagnosticsMaxRecords);
    if (shouldPrintImReadDiagnostics(target)) {
      console.info("[lpp:im-read]", record);
    }
  }

  return record;
}

export function createImReadDiagnosticRecord(
  input: ImReadDiagnosticInput,
): ImReadDiagnosticRecord {
  return {
    traceId: createImReadTraceId(input.phase),
    module: "im-read",
    taskId: "P2-ST-004D",
    event: input.event,
    phase: input.phase,
    result: input.result,
    timestamp: Date.now(),
    reason: input.reason,
    context: input.context,
    error: normalizeImReadDiagnosticError(input.error),
  };
}

function normalizeImReadDiagnosticError(error: unknown): ImReadDiagnosticRecord["error"] {
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

function createImReadTraceId(phase: ImReadDiagnosticPhase) {
  return `im-read-${phase}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function shouldPrintImReadDiagnostics(target: Window) {
  try {
    return (
      import.meta.env.DEV ||
      target.localStorage?.getItem(imReadDiagnosticsFlag) === "1"
    );
  } catch {
    return import.meta.env.DEV;
  }
}

function imReadDiagnosticTarget() {
  return typeof window === "undefined" ? null : window;
}
