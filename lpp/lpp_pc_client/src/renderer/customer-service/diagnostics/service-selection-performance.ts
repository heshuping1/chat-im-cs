import type { CustomerServiceThread } from "../../data/api-client";
import { recordCsRoutingDiagnostic } from "../../data/customer-service/cs-routing-diagnostics";

type ServiceSelectionTrace = {
  recordedSteps: Map<string, string>;
  startedAtMs: number;
  threadId: string;
  traceId: string;
};

type ServiceSelectionContext = Record<string, unknown>;

const maxServiceSelectionTraces = 24;
const serviceSelectionTraces = new Map<string, ServiceSelectionTrace>();

export function startServiceThreadSelectionTrace(
  thread: Pick<CustomerServiceThread, "conversationId" | "threadId" | "threadType">,
  context: ServiceSelectionContext = {},
) {
  const threadId = thread.threadId?.trim();
  if (!threadId) return;
  createServiceSelectionTrace(threadId, "cs-select");
  recordServiceThreadSelectionStep(threadId, "thread-list.click", {
    ...context,
    conversationId: thread.conversationId,
    threadType: thread.threadType,
  });
}

export function recordServiceThreadSelectionStep(
  threadId: string | null | undefined,
  step: string,
  context: ServiceSelectionContext = {},
  options: { repeatKey?: string } = {},
) {
  const normalizedThreadId = threadId?.trim();
  if (!normalizedThreadId) return;
  const trace =
    serviceSelectionTraces.get(normalizedThreadId) ??
    createFallbackServiceSelectionTrace(normalizedThreadId, step, context);
  const repeatedStepKey = options.repeatKey ? `${step}:${options.repeatKey}` : step;
  if (trace.recordedSteps.get(step) === repeatedStepKey) return;
  trace.recordedSteps.set(step, repeatedStepKey);
  recordCsRoutingDiagnostic({
    event: "cs.ui.selection-performance",
    source: "service-selection-performance",
    phase: "selection",
    route: step,
    classification: {
      ...context,
      elapsedMs: Math.round(nowMs() - trace.startedAtMs),
      step,
      threadId: normalizedThreadId,
      traceId: trace.traceId,
    },
  });
}

function createServiceSelectionTrace(threadId: string, prefix: string) {
  const trace: ServiceSelectionTrace = {
    recordedSteps: new Map(),
    startedAtMs: nowMs(),
    threadId,
    traceId: `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
  };
  serviceSelectionTraces.set(threadId, trace);
  trimServiceSelectionTraces();
  return trace;
}

function createFallbackServiceSelectionTrace(
  threadId: string,
  firstObservedStep: string,
  context: ServiceSelectionContext,
) {
  const trace = createServiceSelectionTrace(threadId, "cs-select-fallback");
  trace.recordedSteps.set("trace.fallback-start", "trace.fallback-start");
  recordCsRoutingDiagnostic({
    event: "cs.ui.selection-performance",
    source: "service-selection-performance",
    phase: "selection",
    route: "trace.fallback-start",
    classification: {
      ...context,
      elapsedMs: 0,
      firstObservedStep,
      step: "trace.fallback-start",
      threadId,
      traceId: trace.traceId,
    },
  });
  return trace;
}

function trimServiceSelectionTraces() {
  while (serviceSelectionTraces.size > maxServiceSelectionTraces) {
    const oldestKey = serviceSelectionTraces.keys().next().value;
    if (!oldestKey) return;
    serviceSelectionTraces.delete(oldestKey);
  }
}

function nowMs() {
  if (typeof performance !== "undefined" && typeof performance.now === "function") {
    return performance.now();
  }
  return Date.now();
}
