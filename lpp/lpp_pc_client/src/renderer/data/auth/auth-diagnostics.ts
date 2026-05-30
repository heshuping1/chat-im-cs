export type AuthDiagnosticEvent =
  | "auth.session.clear"
  | "auth.session.parse"
  | "auth.session.persist"
  | "auth.session.restore";

export type AuthDiagnosticPhase = "clear" | "parse" | "persist" | "restore";
export type AuthDiagnosticResult = "failed" | "skipped" | "success";

export interface AuthDiagnosticRecord {
  traceId: string;
  module: "auth";
  taskId: "P2-ST-001F";
  event: AuthDiagnosticEvent;
  phase: AuthDiagnosticPhase;
  result: AuthDiagnosticResult;
  timestamp: number;
  reason?: string;
  context?: Record<string, unknown>;
  error?: {
    message: string;
    name?: string;
  };
}

export interface AuthDiagnosticInput {
  event: AuthDiagnosticEvent;
  phase: AuthDiagnosticPhase;
  result: AuthDiagnosticResult;
  reason?: string;
  context?: Record<string, unknown>;
  error?: unknown;
}

const authDiagnosticsFlag = "lpp.authDiagnostics";
const authDiagnosticsMaxRecords = 100;
const sensitiveKeyPattern = /token|password|authorization|secret|credential/i;

export function logAuthDiagnostic(input: AuthDiagnosticInput) {
  const record = createAuthDiagnosticRecord(input);
  const target = authDiagnosticTarget();

  if (target) {
    const current = target.__lppAuthDiagnostics ?? [];
    target.__lppAuthDiagnostics = [...current, record].slice(-authDiagnosticsMaxRecords);
    if (shouldPrintAuthDiagnostics(target)) {
      console.info("[lpp:auth]", record);
    }
  }

  return record;
}

export function createAuthDiagnosticRecord(
  input: AuthDiagnosticInput,
): AuthDiagnosticRecord {
  return {
    traceId: createAuthTraceId(input.phase),
    module: "auth",
    taskId: "P2-ST-001F",
    event: input.event,
    phase: input.phase,
    result: input.result,
    timestamp: Date.now(),
    reason: input.reason,
    context: sanitizeAuthDiagnosticContext(input.context),
    error: normalizeAuthDiagnosticError(input.error),
  };
}

export function sanitizeAuthDiagnosticContext(
  context?: Record<string, unknown>,
): Record<string, unknown> | undefined {
  if (!context) return undefined;
  return Object.fromEntries(
    Object.entries(context).map(([key, value]) => [
      key,
      sensitiveKeyPattern.test(key) && typeof value === "string"
        ? "[redacted]"
        : sanitizeAuthDiagnosticValue(value),
    ]),
  );
}

function sanitizeAuthDiagnosticValue(value: unknown): unknown {
  if (!value || typeof value !== "object") return value;
  if (Array.isArray(value)) return value.map(sanitizeAuthDiagnosticValue);
  return sanitizeAuthDiagnosticContext(value as Record<string, unknown>);
}

function normalizeAuthDiagnosticError(error: unknown): AuthDiagnosticRecord["error"] {
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

function createAuthTraceId(phase: AuthDiagnosticPhase) {
  return `auth-${phase}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function shouldPrintAuthDiagnostics(target: Window) {
  try {
    return (
      import.meta.env.DEV ||
      target.localStorage?.getItem(authDiagnosticsFlag) === "1"
    );
  } catch {
    return import.meta.env.DEV;
  }
}

function authDiagnosticTarget() {
  return typeof window === "undefined" ? null : window;
}
