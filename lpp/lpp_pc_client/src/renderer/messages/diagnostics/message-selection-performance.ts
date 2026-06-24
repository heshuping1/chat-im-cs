import type { ConversationListItem } from "../../data/api-client";
import type { ContactMessageOpenTrace } from "../../data/diagnostics/contact-message-open-diagnostics";
import { recordMessageReminderDiagnostic } from "../../data/diagnostics/message-reminder-diagnostics";

type SelectionTrace = {
  conversationId: string;
  startedAtMs: number;
  traceId: string;
  recordedSteps: Set<string>;
};

type SelectionTraceContext = Record<string, unknown>;

const maxSelectionTraces = 80;
const tracesByConversation = new Map<string, SelectionTrace>();

export function startConversationSelectionTrace(
  conversation: Pick<
    ConversationListItem,
    "conversationId" | "conversationType" | "lastMessageSeq" | "lastReadSeq" | "unreadCount"
  >,
  context?: SelectionTraceContext,
) {
  const trace = createSelectionTrace(conversation.conversationId, "im-select");
  recordConversationSelectionStep(conversation.conversationId, "list.click", {
    conversationType: conversation.conversationType,
    lastMessageSeq: conversation.lastMessageSeq,
    lastReadSeq: conversation.lastReadSeq,
    unreadCount: conversation.unreadCount,
    ...context,
  });
  return trace.traceId;
}

export function startConversationTargetActionTrace({
  action,
  activeConversationId,
  targetId,
  targetKind,
}: {
  action: string;
  activeConversationId?: string;
  targetId: string;
  targetKind: "direct-contact" | "group-contact" | "forward-conversation";
}): ContactMessageOpenTrace {
  const trace = createSelectionTrace(targetId, "im-target");
  recordMessageReminderDiagnostic({
    event: "im.ui.selection-performance",
    source: "message-selection-performance",
    phase: "selection",
    route: action,
    classification: {
      activeConversationId,
      elapsedMs: 0,
      step: action,
      targetId,
      targetKind,
      traceId: trace.traceId,
    },
  });
  return {
    contactId: targetKind === "direct-contact" ? targetId : undefined,
    startedAt: trace.startedAtMs,
    traceId: trace.traceId,
  };
}

export function conversationSelectionOpenTraceFor(
  conversationId: string | undefined,
): ContactMessageOpenTrace | undefined {
  if (!conversationId) return undefined;
  const trace = tracesByConversation.get(conversationId);
  if (!trace) return undefined;
  return {
    startedAt: trace.startedAtMs,
    targetConversationId: conversationId,
    traceId: trace.traceId,
  };
}

export function recordConversationSelectionStep(
  conversationId: string | undefined,
  step: string,
  context?: SelectionTraceContext,
  options?: { repeatKey?: string },
) {
  if (!conversationId) return undefined;
  const trace =
    tracesByConversation.get(conversationId) ??
    createFallbackSelectionTrace(conversationId, step, context);
  const stepKey = `${step}:${options?.repeatKey ?? ""}`;
  if (trace.recordedSteps.has(stepKey)) return trace.traceId;
  trace.recordedSteps.add(stepKey);
  const elapsedMs = Math.max(0, Math.round((nowMs() - trace.startedAtMs) * 10) / 10);
  recordMessageReminderDiagnostic({
    event: "im.ui.selection-performance",
    source: "message-selection-performance",
    phase: "selection",
    route: step,
    classification: {
      conversationId,
      elapsedMs,
      step,
      traceId: trace.traceId,
      ...context,
    },
  });
  return trace.traceId;
}

function createSelectionTrace(conversationId: string, prefix: string) {
  const trace: SelectionTrace = {
    conversationId,
    recordedSteps: new Set(),
    startedAtMs: nowMs(),
    traceId: `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`,
  };
  tracesByConversation.set(conversationId, trace);
  trimSelectionTraces();
  return trace;
}

function createFallbackSelectionTrace(
  conversationId: string,
  firstObservedStep: string,
  context?: SelectionTraceContext,
) {
  const trace = createSelectionTrace(conversationId, "im-select-fallback");
  trace.recordedSteps.add("trace.fallback-start:");
  recordMessageReminderDiagnostic({
    event: "im.ui.selection-performance",
    source: "message-selection-performance",
    phase: "selection",
    route: "trace.fallback-start",
    classification: {
      conversationId,
      elapsedMs: 0,
      firstObservedStep,
      step: "trace.fallback-start",
      traceId: trace.traceId,
      ...context,
    },
  });
  return trace;
}

function trimSelectionTraces() {
  while (tracesByConversation.size > maxSelectionTraces) {
    const oldest = tracesByConversation.keys().next().value;
    if (!oldest) return;
    tracesByConversation.delete(oldest);
  }
}

function nowMs() {
  return typeof performance !== "undefined" && typeof performance.now === "function"
    ? performance.now()
    : Date.now();
}
