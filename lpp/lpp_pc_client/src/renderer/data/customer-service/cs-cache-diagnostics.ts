export interface CustomerServiceCacheDiagnosticRecord {
  taskId: "P6-CS-004C";
  event:
    | "cache.invalidate"
    | "cache.message.merge"
    | "cache.message.remove"
    | "cache.local_message.append"
    | "cache.local_message.patch"
    | "cache.local_message.remove"
    | "cache.thread.merge_detail"
    | "cache.thread.read"
    | "cache.thread.claimed"
    | "cache.thread.closed"
    | "cache.thread.transferred";
  phase: "cache";
  result: "ok" | "ignored";
  timestamp: number;
  reason?: string;
  context?: Record<string, unknown>;
}

export function logCustomerServiceCacheDiagnostic(
  input: Omit<
    CustomerServiceCacheDiagnosticRecord,
    "taskId" | "phase" | "timestamp"
  >,
) {
  const record: CustomerServiceCacheDiagnosticRecord = {
    taskId: "P6-CS-004C",
    phase: "cache",
    timestamp: Date.now(),
    ...input,
    context: sanitizeCacheDiagnosticContext(input.context),
  };
  rememberCustomerServiceCacheDiagnostic(record);
  if (!shouldPrintCustomerServiceCacheDiagnostics()) return;
  console.debug("[cs-cache:diagnostic]", record);
}

function rememberCustomerServiceCacheDiagnostic(
  record: CustomerServiceCacheDiagnosticRecord,
) {
  if (!globalThis.window) return;
  const diagnostics = globalThis.window.__lppCustomerServiceCacheDiagnostics ?? [];
  diagnostics.push(record);
  if (diagnostics.length > 180) {
    diagnostics.splice(0, diagnostics.length - 180);
  }
  globalThis.window.__lppCustomerServiceCacheDiagnostics = diagnostics;
}

function shouldPrintCustomerServiceCacheDiagnostics() {
  if (import.meta.env.DEV) return true;
  try {
    return globalThis.localStorage?.getItem("lpp.customerServiceCacheDiagnostics") === "1";
  } catch {
    return false;
  }
}

function sanitizeCacheDiagnosticContext(context: Record<string, unknown> | undefined) {
  if (!context) return undefined;
  return Object.fromEntries(
    Object.entries(context).filter(([, value]) => value !== undefined),
  );
}
