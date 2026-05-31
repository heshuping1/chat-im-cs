export type MessageCenterDiagnosticEvent =
  | "conversation.selected"
  | "command.invoked"
  | "command.failed"
  | "message-list.windowed"
  | "video.open_attempt"
  | "video.open_failed"
  | "video.open_prepare"
  | "video.open_success"
  | "video.poster_ignored";

export type MessageCenterDiagnosticPhase = "selection" | "command" | "media" | "render";
export type MessageCenterDiagnosticResult = "ok" | "ignored" | "failed";

export interface MessageCenterDiagnosticRecord {
  traceId: string;
  module: "message-center";
  taskId: "P5-IM-001E";
  event: MessageCenterDiagnosticEvent;
  phase: MessageCenterDiagnosticPhase;
  result: MessageCenterDiagnosticResult;
  timestamp: number;
  reason?: string;
  context?: Record<string, unknown>;
}

export interface MessageCenterDiagnosticInput {
  event: MessageCenterDiagnosticEvent;
  phase: MessageCenterDiagnosticPhase;
  result: MessageCenterDiagnosticResult;
  reason?: string;
  context?: Record<string, unknown>;
}

const diagnosticsFlag = "lpp.messageCenterDiagnostics";
const maxBufferedDiagnostics = 160;

export function createMessageCenterDiagnosticRecord(
  input: MessageCenterDiagnosticInput,
): MessageCenterDiagnosticRecord {
  return {
    traceId: createTraceId(input.event),
    module: "message-center",
    taskId: "P5-IM-001E",
    event: input.event,
    phase: input.phase,
    result: input.result,
    timestamp: Date.now(),
    reason: input.reason ? sanitizeText("reason", input.reason) : undefined,
    context: sanitizeContext(input.context),
  };
}

export function logMessageCenterDiagnostic(input: MessageCenterDiagnosticInput) {
  const record = createMessageCenterDiagnosticRecord(input);
  const target = typeof window === "undefined" ? null : window;
  if (!target) return record;

  const current = target.__lppMessageCenterDiagnostics ?? [];
  target.__lppMessageCenterDiagnostics = [...current, record].slice(-maxBufferedDiagnostics);
  if (shouldPrintDiagnostics(target)) {
    const printer = record.result === "failed" ? console.warn : console.debug;
    printer("[lpp:message-center]", record);
  }
  return record;
}

function createTraceId(event: MessageCenterDiagnosticEvent) {
  return `msg-center-${event.replace(/\./g, "-")}-${Date.now()}-${Math.random()
    .toString(16)
    .slice(2)}`;
}

function shouldPrintDiagnostics(target: Window) {
  try {
    return import.meta.env.DEV || target.localStorage?.getItem(diagnosticsFlag) === "1";
  } catch {
    return import.meta.env.DEV;
  }
}

function sanitizeContext(context?: Record<string, unknown>) {
  if (!context) return undefined;
  return sanitizeValue(context) as Record<string, unknown>;
}

function sanitizeValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sanitizeValue);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, entry]) => [
        key,
        sanitizeEntry(key, entry),
      ]),
    );
  }
  if (typeof value === "string") return sanitizeText("", value);
  return value;
}

function sanitizeEntry(key: string, value: unknown): unknown {
  if (typeof value === "string") return sanitizeText(key, value);
  return sanitizeValue(value);
}

function sanitizeText(key: string, value: string) {
  const normalizedKey = key.toLowerCase();
  if (normalizedKey.includes("path") || normalizedKey.includes("filename")) {
    return "[local-path]";
  }
  return value
    .replace(/Bearer\s+[A-Za-z0-9._~+/=-]+/gi, "Bearer ***")
    .replace(/file:\/\/\S+/gi, "file://[local-path]")
    .replace(/https?:\/\/\S+/gi, "https://[remote-url]");
}
