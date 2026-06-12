import { recordMessageReminderDiagnostic } from "./message-reminder-diagnostics";

export interface ContactMessageOpenTrace {
  contactId?: string;
  startedAt: number;
  targetConversationId?: string;
  traceId: string;
}

const tracesByConversationId = new Map<string, ContactMessageOpenTrace>();
let latestTrace: ContactMessageOpenTrace | null = null;
const maxRememberedTraces = 40;

export function createContactMessageOpenTrace(contactId?: string): ContactMessageOpenTrace {
  const timestamp = Date.now();
  const random =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID().slice(0, 8)
      : Math.random().toString(16).slice(2, 10);
  const trace = {
    contactId,
    startedAt: nowMs(),
    traceId: `contacts-message-${timestamp}-${random}`,
  };
  latestTrace = trace;
  return trace;
}

export function rememberContactMessageOpenTrace(
  conversationId: string | undefined,
  trace?: ContactMessageOpenTrace,
) {
  if (!conversationId || !trace) return;
  const next = { ...trace, targetConversationId: conversationId };
  latestTrace = next;
  tracesByConversationId.set(conversationId, next);
  while (tracesByConversationId.size > maxRememberedTraces) {
    const oldestKey = tracesByConversationId.keys().next().value;
    if (!oldestKey) break;
    tracesByConversationId.delete(oldestKey);
  }
}

export function contactMessageOpenTraceForConversation(
  conversationId?: string | null,
) {
  if (conversationId) {
    return tracesByConversationId.get(conversationId) ?? null;
  }
  return latestTrace;
}

export function recordContactMessageOpenDiagnostic(
  phase: string,
  classification: Record<string, unknown>,
  trace?: ContactMessageOpenTrace | null,
) {
  recordMessageReminderDiagnostic({
    event: "contacts.message-open.trace",
    source: "contacts-message-open",
    phase,
    route: "contacts-to-messages",
    classification: {
      ...traceClassification(trace),
      ...classification,
    },
  });
}

export function elapsedMsFromTrace(trace?: ContactMessageOpenTrace | null) {
  return trace ? elapsedMs(trace.startedAt) : undefined;
}

export function nowMs() {
  return typeof performance !== "undefined" ? performance.now() : Date.now();
}

export function elapsedMs(startedAt: number) {
  return Math.round(nowMs() - startedAt);
}

function traceClassification(trace?: ContactMessageOpenTrace | null) {
  if (!trace) return {};
  return {
    contactId: trace.contactId,
    elapsedMs: elapsedMsFromTrace(trace),
    targetConversationId: trace.targetConversationId,
    traceId: trace.traceId,
  };
}
