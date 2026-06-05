export type CustomerServiceThreadStateKind =
  | "queued"
  | "serving"
  | "ai"
  | "closed"
  | "rated"
  | "readonly";

export type CustomerServiceReplyGate = "claim" | "takeover" | "open" | "readonly";

export interface CustomerServiceThreadState {
  kind: CustomerServiceThreadStateKind;
  label: string;
  normalizedStatus: string;
  rawStatus: string;
  readOnly: boolean;
  replyGate: CustomerServiceReplyGate;
  terminal: boolean;
}

export interface CustomerServiceThreadStateTransition {
  changed: boolean;
  from?: CustomerServiceThreadState;
  to: CustomerServiceThreadState;
}

export interface CustomerServiceThreadStateDiagnosticRecord {
  taskId: "P6-CS-002D";
  event: "state.transition";
  phase: "state";
  result: "ok" | "ignored";
  timestamp: number;
  reason?: string;
  from?: {
    kind: CustomerServiceThreadStateKind;
    status: string;
  };
  to: {
    kind: CustomerServiceThreadStateKind;
    status: string;
  };
  context?: Record<string, unknown>;
}

const terminalStatuses = new Set([
  "closed",
  "closed_by_visitor",
  "closed_by_staff",
  "closed_timeout",
  "closed_system",
  "archived",
  "ended",
  "finished",
  "resolved",
  "terminated",
  "cancelled",
  "canceled",
  "expired",
  "5",
  "6",
  "7",
  "8",
  "9",
]);

const ratedStatuses = new Set(["rated", "reviewed", "evaluated"]);

export function createCustomerServiceThreadState(
  status?: string | number | null,
): CustomerServiceThreadState {
  const rawStatus = String(status ?? "");
  const normalizedStatus = normalizeCustomerServiceThreadStateStatus(rawStatus);

  if (isRatedStatus(normalizedStatus)) {
    return state("rated", "Rated", rawStatus, normalizedStatus, true, "readonly");
  }

  if (isTerminalStatus(normalizedStatus)) {
    return state("closed", "History conversation", rawStatus, normalizedStatus, true, "readonly");
  }

  if (isQueuedStatus(normalizedStatus)) {
    return state("queued", "Waiting for agent", rawStatus, normalizedStatus, false, "claim");
  }

  if (isAiStatus(normalizedStatus)) {
    return state("ai", "AI transfer", rawStatus, normalizedStatus, false, "takeover");
  }

  if (isReadonlyStatus(normalizedStatus)) {
    return state("readonly", "Read-only", rawStatus, normalizedStatus, true, "readonly");
  }

  return state("serving", "Agent serving", rawStatus, normalizedStatus, false, "open");
}

export function transitionCustomerServiceThreadState(
  fromStatus: string | number | null | undefined,
  toStatus: string | number | null | undefined,
): CustomerServiceThreadStateTransition {
  const from =
    fromStatus === undefined || fromStatus === null
      ? undefined
      : createCustomerServiceThreadState(fromStatus);
  const to = createCustomerServiceThreadState(toStatus);
  return {
    changed: !from || from.normalizedStatus !== to.normalizedStatus || from.kind !== to.kind,
    from,
    to,
  };
}

export function normalizeCustomerServiceThreadStateStatus(status?: string | number | null) {
  return String(status ?? "").trim().toLowerCase().replace(/-/g, "_");
}

export function isTerminalCustomerServiceThreadStatus(status?: string | number | null) {
  const normalized = normalizeCustomerServiceThreadStateStatus(status);
  return isTerminalStatus(normalized);
}

export function logCustomerServiceThreadStateTransition(
  transition: CustomerServiceThreadStateTransition,
  context: Record<string, unknown> = {},
) {
  const record: CustomerServiceThreadStateDiagnosticRecord = {
    taskId: "P6-CS-002D",
    event: "state.transition",
    phase: "state",
    result: transition.changed ? "ok" : "ignored",
    timestamp: Date.now(),
    reason: transition.changed ? "status_changed" : "status_unchanged",
    from: transition.from
      ? {
          kind: transition.from.kind,
          status: transition.from.normalizedStatus,
        }
      : undefined,
    to: {
      kind: transition.to.kind,
      status: transition.to.normalizedStatus,
    },
    context: sanitizeCustomerServiceStateDiagnosticContext(context),
  };
  rememberCustomerServiceStateDiagnostic(record);
  if (!shouldPrintCustomerServiceStateDiagnostics()) return;
  console.debug("[cs-thread-state:diagnostic]", record);
}

function state(
  kind: CustomerServiceThreadStateKind,
  label: string,
  rawStatus: string,
  normalizedStatus: string,
  readOnly: boolean,
  replyGate: CustomerServiceReplyGate,
): CustomerServiceThreadState {
  return {
    kind,
    label,
    normalizedStatus,
    rawStatus,
    readOnly,
    replyGate,
    terminal: readOnly,
  };
}

function isQueuedStatus(status: string) {
  return (
    status === "queued" ||
    status === "queue" ||
    status === "waiting" ||
    status === "pending" ||
    status.includes("queue") ||
    status.includes("waiting")
  );
}

function isAiStatus(status: string) {
  return status === "bot" || status.includes("ai") || status.includes("assist");
}

function isRatedStatus(status: string) {
  return ratedStatuses.has(status) || status.includes("rated");
}

function isReadonlyStatus(status: string) {
  return status === "readonly" || status === "read_only" || status === "history";
}

function isTerminalStatus(status: string) {
  return terminalStatuses.has(status) || status.startsWith("closed");
}

function rememberCustomerServiceStateDiagnostic(
  record: CustomerServiceThreadStateDiagnosticRecord,
) {
  if (!globalThis.window) return;
  const diagnostics = globalThis.window.__lppCustomerServiceStateDiagnostics ?? [];
  diagnostics.push(record);
  if (diagnostics.length > 160) {
    diagnostics.splice(0, diagnostics.length - 160);
  }
  globalThis.window.__lppCustomerServiceStateDiagnostics = diagnostics;
}

function shouldPrintCustomerServiceStateDiagnostics() {
  if (import.meta.env.DEV) return true;
  try {
    return globalThis.localStorage?.getItem("lpp.customerServiceStateDiagnostics") === "1";
  } catch {
    return false;
  }
}

function sanitizeCustomerServiceStateDiagnosticContext(
  context: Record<string, unknown>,
) {
  return Object.fromEntries(
    Object.entries(context).filter(([, value]) => value !== undefined),
  );
}
