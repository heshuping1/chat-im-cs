export interface RuntimeErrorDiagnosticRecord {
  module: 'runtime-error';
  event: 'renderer.error' | 'renderer.unhandled_rejection';
  level: 'error';
  result: 'failed';
  traceId: string;
  occurredAt: string;
  error: {
    name?: string;
    message: string;
    source?: string;
    lineno?: number;
    colno?: number;
  };
}

type RuntimeErrorTarget = Window & {
  __lppRuntimeErrorDiagnostics?: RuntimeErrorDiagnosticRecord[];
  __lppRuntimeErrorDiagnosticsInstalled?: boolean;
};

const maxRuntimeErrorDiagnostics = 120;
const sensitiveRuntimePattern = /Bearer\s+[A-Za-z0-9._~+/=-]+|token=[^&\s]+|password=[^&\s]+/gi;

export function installRuntimeErrorDiagnostics(target: Window = window) {
  const runtimeTarget = target as RuntimeErrorTarget;
  if (runtimeTarget.__lppRuntimeErrorDiagnosticsInstalled) return;
  runtimeTarget.__lppRuntimeErrorDiagnosticsInstalled = true;
  target.addEventListener('error', (event) => {
    logRuntimeErrorDiagnostic(
      {
        event: 'renderer.error',
        error: event.error,
        message: event.message,
        source: event.filename,
        lineno: event.lineno,
        colno: event.colno,
      },
      runtimeTarget,
    );
  });
  target.addEventListener('unhandledrejection', (event) => {
    logRuntimeErrorDiagnostic(
      {
        event: 'renderer.unhandled_rejection',
        error: event.reason,
      },
      runtimeTarget,
    );
  });
}

export function createRuntimeErrorDiagnosticRecord({
  colno,
  error,
  event,
  lineno,
  message,
  now = new Date(),
  source,
}: {
  colno?: number;
  error?: unknown;
  event: RuntimeErrorDiagnosticRecord['event'];
  lineno?: number;
  message?: string;
  now?: Date;
  source?: string;
}): RuntimeErrorDiagnosticRecord {
  const normalizedError = normalizeRuntimeError(error, message);
  return {
    module: 'runtime-error',
    event,
    level: 'error',
    result: 'failed',
    traceId: `runtime-error-${event}-${now.getTime()}`,
    occurredAt: now.toISOString(),
    error: {
      ...normalizedError,
      source: source ? redactRuntimeText(source) : undefined,
      lineno,
      colno,
    },
  };
}

export function logRuntimeErrorDiagnostic(
  input: Parameters<typeof createRuntimeErrorDiagnosticRecord>[0],
  target: RuntimeErrorTarget = window as RuntimeErrorTarget,
) {
  const record = createRuntimeErrorDiagnosticRecord(input);
  const diagnostics = target.__lppRuntimeErrorDiagnostics ?? [];
  diagnostics.push(record);
  if (diagnostics.length > maxRuntimeErrorDiagnostics) {
    diagnostics.splice(0, diagnostics.length - maxRuntimeErrorDiagnostics);
  }
  target.__lppRuntimeErrorDiagnostics = diagnostics;
  console.error('[runtime-error:diagnostic]', record);
  return record;
}

function normalizeRuntimeError(error: unknown, fallback?: string) {
  if (error instanceof Error) {
    return {
      name: redactRuntimeText(error.name),
      message: redactRuntimeText(error.message),
    };
  }
  return {
    message: redactRuntimeText(fallback || String(error ?? 'Unknown runtime error')),
  };
}

function redactRuntimeText(value: string) {
  return value.replace(sensitiveRuntimePattern, (match) =>
    match.startsWith('Bearer') ? 'Bearer ***' : '[redacted]',
  );
}
