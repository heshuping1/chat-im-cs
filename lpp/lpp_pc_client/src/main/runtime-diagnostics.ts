import { appendFile, mkdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';

import type {
  DiagnosticsJsonValue,
  DiagnosticsModuleSnapshot,
  DiagnosticsPayload,
} from '../shared/desktop-api.js';

export type ElectronRuntimeDiagnosticEvent =
  | 'app.child_process_gone'
  | 'main.uncaught_exception'
  | 'main.unhandled_rejection'
  | 'renderer.render_process_gone';

export interface ElectronRuntimeDiagnosticInput {
  event: ElectronRuntimeDiagnosticEvent;
  occurredAt?: Date;
  reason?: string;
  exitCode?: number;
  processType?: string;
  error?: unknown;
  windowId?: number;
}

export interface ElectronRuntimeDiagnosticRecord {
  module: 'electron-runtime';
  event: ElectronRuntimeDiagnosticEvent;
  level: 'error';
  result: 'failed';
  traceId: string;
  occurredAt: string;
  reason?: string;
  exitCode?: number;
  processType?: string;
  windowId?: number;
  error?: {
    name?: string;
    message: string;
  };
}

export interface ElectronRuntimeAppLike {
  getPath(name: 'userData'): string;
  on(
    event: 'child-process-gone',
    listener: (
      event: unknown,
      details: { exitCode?: number; reason?: string; type?: string },
    ) => void,
  ): void;
}

const maxRuntimeDiagnostics = 120;
const sensitiveRuntimePattern = /Bearer\s+[A-Za-z0-9._~+/=-]+|token=[^&\s]+|password=[^&\s]+/gi;
const runtimeDiagnostics: ElectronRuntimeDiagnosticRecord[] = [];
let runtimeDiagnosticsFilePath: string | null = null;
let processDiagnosticsInstalled = false;
let appDiagnosticsInstalled = false;

export function installElectronProcessDiagnostics() {
  if (processDiagnosticsInstalled) return;
  processDiagnosticsInstalled = true;
  process.on('uncaughtExceptionMonitor', (error) => {
    recordElectronRuntimeDiagnostic({
      event: 'main.uncaught_exception',
      error,
    });
  });
  process.on('unhandledRejection', (reason) => {
    recordElectronRuntimeDiagnostic({
      event: 'main.unhandled_rejection',
      error: reason,
    });
  });
}

export function installElectronAppDiagnostics(app: ElectronRuntimeAppLike) {
  if (appDiagnosticsInstalled) return;
  appDiagnosticsInstalled = true;
  setElectronRuntimeDiagnosticsFilePath(join(app.getPath('userData'), 'diagnostics', 'electron-runtime.jsonl'));
  app.on('child-process-gone', (_event, details) => {
    recordElectronRuntimeDiagnostic({
      event: 'app.child_process_gone',
      exitCode: details.exitCode,
      processType: details.type,
      reason: details.reason,
    });
  });
}

export function setElectronRuntimeDiagnosticsFilePath(filePath: string | null) {
  runtimeDiagnosticsFilePath = filePath;
}

export function recordRendererProcessGone(
  details: { exitCode?: number; reason?: string },
  windowId?: number,
) {
  recordElectronRuntimeDiagnostic({
    event: 'renderer.render_process_gone',
    exitCode: details.exitCode,
    reason: details.reason,
    windowId,
  });
}

export function recordElectronRuntimeDiagnostic(
  input: ElectronRuntimeDiagnosticInput,
): ElectronRuntimeDiagnosticRecord {
  const record = createElectronRuntimeDiagnosticRecord(input);
  runtimeDiagnostics.push(record);
  if (runtimeDiagnostics.length > maxRuntimeDiagnostics) {
    runtimeDiagnostics.splice(0, runtimeDiagnostics.length - maxRuntimeDiagnostics);
  }
  void persistElectronRuntimeDiagnostic(record);
  return record;
}

export function createElectronRuntimeDiagnosticRecord({
  error,
  event,
  exitCode,
  occurredAt = new Date(),
  processType,
  reason,
  windowId,
}: ElectronRuntimeDiagnosticInput): ElectronRuntimeDiagnosticRecord {
  const timestamp = occurredAt.toISOString();
  return {
    module: 'electron-runtime',
    event,
    level: 'error',
    result: 'failed',
    traceId: `electron-runtime-${event}-${occurredAt.getTime()}`,
    occurredAt: timestamp,
    reason: reason ? redactRuntimeText(reason) : undefined,
    exitCode,
    processType: processType ? redactRuntimeText(processType) : undefined,
    windowId,
    error: normalizeRuntimeError(error),
  };
}

export function createElectronRuntimeDiagnosticsSnapshot(): DiagnosticsModuleSnapshot {
  return {
    recordCount: runtimeDiagnostics.length,
    records: runtimeDiagnostics
      .slice(-maxRuntimeDiagnostics)
      .map((record) => record as unknown as DiagnosticsJsonValue),
    truncated: runtimeDiagnostics.length > maxRuntimeDiagnostics ? true : undefined,
  };
}

export function mergeElectronRuntimeDiagnosticsPayload(
  payload: DiagnosticsPayload,
): DiagnosticsPayload {
  const snapshot = createElectronRuntimeDiagnosticsSnapshot();
  const errors = snapshot.records.map((record) => {
    const fields = record as unknown as ElectronRuntimeDiagnosticRecord;
    return {
      at: fields.traceId,
      message: fields.error?.message ?? fields.reason ?? fields.event,
    };
  });
  return {
    ...payload,
    breadcrumbs: [...payload.breadcrumbs, `electron-runtime:${snapshot.recordCount}`],
    diagnostics: {
      ...payload.diagnostics,
      'electron-runtime': snapshot,
    },
    errors: [...payload.errors, ...errors].slice(0, 200),
  };
}

export function resetElectronRuntimeDiagnosticsForTest() {
  runtimeDiagnostics.splice(0, runtimeDiagnostics.length);
  runtimeDiagnosticsFilePath = null;
  processDiagnosticsInstalled = false;
  appDiagnosticsInstalled = false;
}

function normalizeRuntimeError(error: unknown): ElectronRuntimeDiagnosticRecord['error'] {
  if (!error) return undefined;
  if (error instanceof Error) {
    return {
      name: redactRuntimeText(error.name),
      message: redactRuntimeText(error.message),
    };
  }
  return {
    message: redactRuntimeText(String(error)),
  };
}

function redactRuntimeText(value: string) {
  return value.replace(sensitiveRuntimePattern, (match) =>
    match.startsWith('Bearer') ? 'Bearer ***' : '[redacted]',
  );
}

async function persistElectronRuntimeDiagnostic(record: ElectronRuntimeDiagnosticRecord) {
  if (!runtimeDiagnosticsFilePath) return;
  try {
    await mkdir(dirname(runtimeDiagnosticsFilePath), { recursive: true });
    await appendFile(runtimeDiagnosticsFilePath, `${JSON.stringify(record)}\n`, 'utf8');
  } catch (error) {
    console.warn('[electron-runtime:diagnostic] persist failed', error);
  }
}
