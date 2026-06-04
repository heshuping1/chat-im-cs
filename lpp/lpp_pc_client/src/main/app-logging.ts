import electronLog from 'electron-log/main';
import { join } from 'node:path';

import type { DiagnosticsJsonValue } from '../shared/desktop-api.js';

export type MainAppLogLevel = 'debug' | 'info' | 'warn' | 'error';
export type MainAppLogResult = 'ok' | 'degraded' | 'ignored' | 'invalid' | 'failed';

export interface ElectronLogLike {
  debug(message: string, record: MainAppLogRecord): void;
  error(message: string, record: MainAppLogRecord): void;
  info(message: string, record: MainAppLogRecord): void;
  warn(message: string, record: MainAppLogRecord): void;
}

export interface ElectronLogBackendLike extends ElectronLogLike {
  initialize?: () => void;
  transports?: {
    console?: ElectronLogTransportLike | null;
    file?: ElectronLogTransportLike | null;
  };
}

export interface ElectronLogTransportLike {
  fileName?: string;
  format?: string | ((message: ElectronLogFormatMessage) => string);
  level?: false | string;
  maxSize?: number;
  resolvePathFn?: () => string;
}

export interface ElectronLogFormatMessage {
  data?: unknown[];
  date?: Date;
  level?: string;
}

export interface MainAppLogBackendOptions {
  diagnosticsDir: string;
  isDev: boolean;
}

export interface MainAppLogInput {
  module: string;
  event: string;
  phase: string;
  result: MainAppLogResult;
  level?: MainAppLogLevel;
  traceId?: string;
  occurredAt?: Date;
  reason?: string;
  context?: Record<string, unknown>;
  error?: unknown;
}

export interface MainAppLogRecord {
  module: string;
  event: string;
  phase: string;
  result: MainAppLogResult;
  level: MainAppLogLevel;
  traceId: string;
  occurredAt: string;
  reason?: string;
  context?: DiagnosticsJsonValue;
  error?: {
    name?: string;
    message: string;
  };
}

export const mainAppLogBackend = electronLog as unknown as ElectronLogBackendLike;

const sensitiveKeyPattern = /token|password|authorization|secret|credential/i;
const sensitiveTextPattern = /Bearer\s+[A-Za-z0-9._~+/=-]+|(?:token|password)=[^&\s]+/gi;
const maxObjectEntries = 80;
const maxArrayItems = 200;
const maxDepth = 8;
const mainLogFileName = 'lpp-main.log';
const mainLogMaxSize = 2 * 1024 * 1024;
const consoleTransportKey = 'console';

export function configureMainAppLogBackend(
  backend: ElectronLogBackendLike,
  options: MainAppLogBackendOptions,
) {
  backend.initialize?.();

  if (backend.transports?.file) {
    backend.transports.file.level = options.isDev ? 'debug' : 'info';
    backend.transports.file.fileName = mainLogFileName;
    backend.transports.file.maxSize = mainLogMaxSize;
    backend.transports.file.resolvePathFn = () => join(options.diagnosticsDir, mainLogFileName);
    backend.transports.file.format = formatMainAppLogMessage;
  }

  const consoleTransport = backend.transports?.[consoleTransportKey];
  if (consoleTransport) {
    consoleTransport.level = options.isDev ? 'debug' : 'warn';
    consoleTransport.format = '{text}';
  }
}

export function configureDefaultMainAppLogging(options: MainAppLogBackendOptions) {
  configureMainAppLogBackend(mainAppLogBackend, options);
}

export function createMainAppLogRecord(input: MainAppLogInput): MainAppLogRecord {
  const occurredAt = input.occurredAt ?? new Date();
  const level = input.level ?? levelFromResult(input.result);
  return {
    module: input.module,
    event: input.event,
    phase: input.phase,
    result: input.result,
    level,
    traceId: input.traceId ?? createMainAppLogTraceId(input.module, input.event, occurredAt),
    occurredAt: occurredAt.toISOString(),
    reason: input.reason ? redactMainAppLogText(input.reason) : undefined,
    context: input.context ? sanitizeMainAppLogValue(input.context) : undefined,
    error: normalizeMainAppLogError(input.error),
  };
}

export function recordMainAppLog(
  backend: ElectronLogLike,
  input: MainAppLogInput,
): MainAppLogRecord {
  const record = createMainAppLogRecord(input);
  backend[record.level](`[${record.module}] ${record.event}`, record);
  return record;
}

export function recordDefaultMainAppLog(input: MainAppLogInput): MainAppLogRecord {
  return recordMainAppLog(mainAppLogBackend, input);
}

function levelFromResult(result: MainAppLogResult): MainAppLogLevel {
  if (result === 'failed' || result === 'invalid') return 'error';
  if (result === 'degraded') return 'warn';
  return 'info';
}

function createMainAppLogTraceId(moduleName: string, event: string, occurredAt: Date) {
  const normalized = `${moduleName}-${event}`
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '') || 'main-log';
  return `${normalized}-${occurredAt.getTime()}`;
}

function normalizeMainAppLogError(error: unknown): MainAppLogRecord['error'] {
  if (!error) return undefined;
  if (error instanceof Error) {
    return {
      name: redactMainAppLogText(error.name),
      message: redactMainAppLogText(error.message),
    };
  }
  if (typeof error === 'object' && 'message' in error && typeof error.message === 'string') {
    const errorLike = error as { message: string; name?: unknown };
    return {
      name: typeof errorLike.name === 'string' ? redactMainAppLogText(errorLike.name) : undefined,
      message: redactMainAppLogText(errorLike.message),
    };
  }
  return {
    message: redactMainAppLogText(String(error)),
  };
}

function sanitizeMainAppLogValue(value: unknown, depth = 0): DiagnosticsJsonValue {
  if (depth > maxDepth) return '[truncated-depth]';
  if (value === null) return null;
  if (typeof value === 'string') return redactMainAppLogText(value);
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value === 'boolean') return value;
  if (Array.isArray(value)) {
    return value
      .slice(0, maxArrayItems)
      .map((item) => sanitizeMainAppLogValue(item, depth + 1));
  }
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .filter(([, entry]) => entry !== undefined)
        .slice(0, maxObjectEntries)
        .map(([key, entry]) => [
          key,
          sensitiveKeyPattern.test(key)
            ? '[redacted]'
            : sanitizeMainAppLogValue(entry, depth + 1),
        ]),
    );
  }
  return String(value);
}

function redactMainAppLogText(value: string) {
  return value.replace(sensitiveTextPattern, (match) =>
    match.startsWith('Bearer') ? 'Bearer ***' : '[redacted]',
  );
}

function formatMainAppLogMessage(message: ElectronLogFormatMessage) {
  const timestamp = message.date?.toISOString() ?? new Date().toISOString();
  const level = message.level ?? 'info';
  const body = (message.data ?? []).map(formatMainAppLogData).join(' ');
  return `${timestamp} [${level}] ${body}`;
}

function formatMainAppLogData(value: unknown) {
  if (typeof value === 'string') return redactMainAppLogText(value);
  return JSON.stringify(sanitizeMainAppLogValue(value));
}
