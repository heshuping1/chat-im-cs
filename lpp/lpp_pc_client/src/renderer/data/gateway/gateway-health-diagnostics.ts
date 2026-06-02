import { recordMessageReminderDiagnostic } from "../diagnostics/message-reminder-diagnostics";

export type GatewayHealthPhase =
  | "start-attempt"
  | "started"
  | "start-failed"
  | "retry-scheduled"
  | "reconnecting"
  | "reconnected"
  | "closed"
  | "stopped"
  | "heartbeat";

export interface GatewayHealthDiagnosticInput {
  apiHost?: string;
  attempt?: number;
  elapsedMs?: number;
  error?: unknown;
  gatewayHost?: string;
  phase: GatewayHealthPhase;
  retryDelayMs?: number;
  route?: string;
  scopeKey?: string;
  sessionKeyPresent?: boolean;
  state?: string;
  summary?: Record<string, unknown>;
}

export function recordGatewayHealthDiagnostic(input: GatewayHealthDiagnosticInput) {
  recordMessageReminderDiagnostic({
    event: "gateway.health",
    source: "GatewayConnectionManager",
    phase: input.phase,
    route: input.route ?? "gateway",
    classification: {
      apiHost: input.apiHost,
      attempt: input.attempt,
      elapsedMs: input.elapsedMs,
      gatewayHost: input.gatewayHost,
      retryDelayMs: input.retryDelayMs,
      scopeKey: input.scopeKey,
      sessionKeyPresent: input.sessionKeyPresent,
      state: input.state,
    },
    summary: {
      ...input.summary,
      error: summarizeGatewayError(input.error),
      failureHint: gatewayFailureHint(input.error),
    },
  });
}

export function summarizeGatewayError(error: unknown) {
  if (!error) return undefined;
  if (error instanceof Error) {
    return {
      message: error.message,
      name: error.name,
      stack: error.stack,
    };
  }
  return {
    message: String(error),
    name: typeof error,
  };
}

export function gatewayFailureHint(error: unknown) {
  const message = error instanceof Error ? error.message : String(error ?? "");
  if (!message) return undefined;
  if (/Failed to complete negotiation.*Failed to fetch/i.test(message)) {
    return {
      code: "gateway.negotiate_fetch_failed",
      possibleCause:
        "Browser blocked the SignalR negotiate request or the gateway was unreachable. Check CORS credentials, token-only transport options, and network reachability.",
    };
  }
  return undefined;
}
