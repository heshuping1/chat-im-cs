import type { GatewayDispatchError } from "./gateway-dispatcher";
import type {
  GatewayHandledEvent,
  GatewayTypedEvent,
} from "./gateway-event-types";

export type GatewayDiagnosticLevel = "debug" | "warning" | "error";
export type GatewayDiagnosticResult = "ok" | "degraded" | "ignored" | "invalid" | "failed";
export type GatewayDiagnosticPhase =
  | "received"
  | "adapted"
  | "handled"
  | "cache.updated"
  | "ignored"
  | "failed";

export type GatewayDiagnosticContext = Record<string, unknown>;

export interface GatewayDiagnosticErrorSummary {
  name?: string;
  message?: string;
  code?: string;
  stack?: string;
}

export interface GatewayDiagnosticContractIssue {
  code: string;
  level: "warning" | "error";
}

export interface GatewayDiagnosticContract {
  status: "degraded" | "invalid" | "ignored";
  issues: GatewayDiagnosticContractIssue[];
}

export interface GatewayDiagnosticRecord {
  traceId: string;
  module: "gateway";
  taskId: "P1-OBS-001" | "P3-API-006C";
  event: GatewayTypedEvent["kind"];
  phase: GatewayDiagnosticPhase;
  result: GatewayDiagnosticResult;
  timestamp: number;
  reason?: string;
  context?: GatewayDiagnosticContext;
  durationMs?: number;
  contract?: GatewayDiagnosticContract;
  error?: GatewayDiagnosticErrorSummary;
}

export interface GatewayDiagnostic {
  level: GatewayDiagnosticLevel;
  record: GatewayDiagnosticRecord;
}

type GatewayDiagnosticRecordInput = Omit<
  GatewayDiagnosticRecord,
  "traceId" | "module" | "taskId" | "event" | "timestamp"
> & {
  taskId?: GatewayDiagnosticRecord["taskId"];
};

export function diagnosticFromGatewayEvent(
  event: GatewayTypedEvent,
): GatewayDiagnostic | null {
  if (event.kind === "ignored") {
    return {
      level: "debug",
      record: baseGatewayDiagnosticRecord(event, {
        phase: "ignored",
        result: "ignored",
        taskId: "P3-API-006C",
        reason: event.reason,
        context: {
          eventName: event.eventName,
          diagnostics: event.diagnostics,
        },
        contract: contractFromDiagnostics("ignored", event.diagnostics, "warning"),
      }),
    };
  }

  if (event.kind === "invalid") {
    return {
      level: "warning",
      record: baseGatewayDiagnosticRecord(event, {
        phase: "adapted",
        result: "invalid",
        taskId: "P3-API-006C",
        reason: event.reason,
        context: {
          eventName: event.eventName,
          diagnostics: event.diagnostics,
        },
        contract: contractFromDiagnostics("invalid", event.diagnostics, "error"),
      }),
    };
  }

  return null;
}

export function diagnosticFromHandledGatewayEvent(
  event: GatewayHandledEvent,
): GatewayDiagnostic {
  const degradedDiagnostics =
    (event.kind === "im.message.received" || event.kind === "cs.message.received") &&
    event.contractStatus === "degraded"
      ? event.diagnostics
      : undefined;
  return {
    level: degradedDiagnostics?.length ? "warning" : "debug",
    record: baseGatewayDiagnosticRecord(event, {
      phase: "handled",
      result: degradedDiagnostics?.length ? "degraded" : "ok",
      taskId: degradedDiagnostics?.length ? "P3-API-006C" : "P1-OBS-001",
      reason: degradedDiagnostics?.length ? "contract_degraded" : undefined,
      context: contextFromHandledEvent(event),
      contract: degradedDiagnostics?.length
        ? contractFromDiagnostics("degraded", degradedDiagnostics, "warning")
        : undefined,
    }),
  };
}

export function diagnosticFromDispatchError(
  dispatchError: GatewayDispatchError,
): GatewayDiagnostic {
  const event = dispatchError.event;
  return {
    level: "error",
    record: baseGatewayDiagnosticRecord(event, {
      phase: "failed",
      result: "failed",
      reason: "handler_error",
      context: contextFromHandledEvent(event),
      error: summarizeDiagnosticError(dispatchError.error),
    }),
  };
}

export function logGatewayDiagnostic(diagnostic: GatewayDiagnostic) {
  if (!shouldLogGatewayDiagnostic()) return;
  const payload = diagnostic.record;
  rememberGatewayDiagnostic(payload);
  if (diagnostic.level === "error") {
    console.warn("[gateway:diagnostic]", payload);
    return;
  }
  if (diagnostic.level === "warning") {
    console.warn("[gateway:diagnostic]", payload);
    return;
  }
  console.debug("[gateway:diagnostic]", payload);
}

let traceCounter = 0;
const maxBufferedGatewayDiagnostics = 200;

export function createGatewayTraceId(eventName: string, receivedAt = Date.now()) {
  traceCounter += 1;
  const normalizedEventName = eventName
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "") || "event";
  return `gw-${normalizedEventName}-${receivedAt}-${traceCounter}`;
}

export function sanitizeDiagnosticContext(
  context: GatewayDiagnosticContext | undefined,
): GatewayDiagnosticContext | undefined {
  if (!context) return undefined;
  return sanitizeDiagnosticValue(context) as GatewayDiagnosticContext;
}

export function getBufferedGatewayDiagnostics() {
  return globalThis.window?.__lppGatewayDiagnostics ?? [];
}

function baseGatewayDiagnosticRecord(
  event: GatewayTypedEvent,
  input: GatewayDiagnosticRecordInput,
): GatewayDiagnosticRecord {
  return {
    traceId: event.traceId ?? createGatewayTraceId(event.eventName, event.receivedAt),
    module: "gateway",
    taskId: input.taskId ?? "P1-OBS-001",
    event: event.kind,
    timestamp: event.receivedAt,
    ...input,
    context: sanitizeDiagnosticContext(input.context),
    error: input.error ? sanitizeDiagnosticErrorSummary(input.error) : undefined,
  };
}

function contextFromHandledEvent(event: GatewayHandledEvent): GatewayDiagnosticContext {
  if (event.kind === "im.message.received") {
    return {
      eventName: event.eventName,
      conversationId: event.conversationId,
      conversationType: event.conversationType,
      messageId: event.message.messageId,
      conversationSeq: event.message.conversationSeq,
      senderUserId: event.message.senderUserId,
      senderPlatformUserId: event.message.senderPlatformUserId,
      senderLppId: event.message.senderLppId,
      contractStatus: event.contractStatus,
      diagnostics: event.diagnostics,
    };
  }

  if (event.kind === "im.read.received") {
    return {
      eventName: event.eventName,
      conversationId: event.conversationId,
      conversationType: event.conversationType,
      readSeq: event.readSeq,
      readerUserId: event.readerIdentity.userId,
      readerPlatformUserId: event.readerIdentity.platformUserId,
      readerLppId: event.readerIdentity.lppId,
    };
  }

  if (event.kind === "cs.message.received") {
    return {
      eventName: event.eventName,
      threadId: event.threadId,
      threadType: event.threadType,
      messageId: event.message.messageId,
      conversationSeq: event.message.conversationSeq,
      senderUserId: event.message.senderUserId,
      senderPlatformUserId: event.message.senderPlatformUserId,
      senderLppId: event.message.senderLppId,
      contractStatus: event.contractStatus,
      diagnostics: event.diagnostics,
    };
  }

  if (event.kind === "cs.typing.preview") {
    return {
      eventName: event.eventName,
      threadId: event.threadId,
      threadType: event.threadType,
      isTyping: event.isTyping,
      senderRole: event.senderRole,
      senderUserId: event.senderUserId,
    };
  }

  return {
    eventName: event.eventName,
    changeKind: event.changeKind,
    threadId: event.threadId,
    serviceStatus: event.serviceStatus,
    threadStatus: event.threadStatus,
    shouldNotifyQueue: event.shouldNotifyQueue,
  };
}

function shouldLogGatewayDiagnostic() {
  if (import.meta.env.DEV) return true;
  try {
    return globalThis.localStorage?.getItem("lpp.gatewayDiagnostics") === "1";
  } catch {
    return false;
  }
}

function rememberGatewayDiagnostic(record: GatewayDiagnosticRecord) {
  if (!globalThis.window) return;
  const diagnostics = globalThis.window.__lppGatewayDiagnostics ?? [];
  diagnostics.push(record);
  if (diagnostics.length > maxBufferedGatewayDiagnostics) {
    diagnostics.splice(0, diagnostics.length - maxBufferedGatewayDiagnostics);
  }
  globalThis.window.__lppGatewayDiagnostics = diagnostics;
}

function summarizeDiagnosticError(error: unknown): GatewayDiagnosticErrorSummary {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      code: errorCode(error),
      stack: firstStackLine(error.stack),
    };
  }

  if (error && typeof error === "object") {
    const record = error as Record<string, unknown>;
    return {
      name: stringValue(record.name),
      message: stringValue(record.message) || "Non-Error object thrown",
      code: stringValue(record.code),
    };
  }

  return {
    message: typeof error === "string" ? error : String(error),
  };
}

function sanitizeDiagnosticErrorSummary(
  error: GatewayDiagnosticErrorSummary,
): GatewayDiagnosticErrorSummary {
  return sanitizeDiagnosticValue(error) as GatewayDiagnosticErrorSummary;
}

function sanitizeDiagnosticValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sanitizeDiagnosticValue);
  if (!value || typeof value !== "object") return value;

  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).map(([key, entry]) => [
      key,
      isSensitiveDiagnosticKey(key) ? "[redacted]" : sanitizeDiagnosticValue(entry),
    ]),
  );
}

function isSensitiveDiagnosticKey(key: string) {
  const normalized = key.toLowerCase();
  return (
    normalized.includes("token") ||
    normalized.includes("password") ||
    normalized.includes("authorization") ||
    normalized.includes("secret") ||
    normalized.includes("credential")
  );
}

function errorCode(error: Error) {
  return stringValue((error as Error & { code?: unknown }).code);
}

function stringValue(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function firstStackLine(stack: string | undefined) {
  if (!stack) return undefined;
  return stack.split("\n").find((line) => line.trim())?.trim();
}

function contractFromDiagnostics(
  status: GatewayDiagnosticContract["status"],
  diagnostics: string[] | undefined,
  level: GatewayDiagnosticContractIssue["level"],
): GatewayDiagnosticContract | undefined {
  if (!diagnostics?.length) return undefined;
  return {
    status,
    issues: diagnostics.map((code) => ({ code, level })),
  };
}
