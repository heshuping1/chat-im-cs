import electronLog from 'electron-log/main';
import { appendFile, mkdir, rename, rm, stat } from 'node:fs/promises';
import { dirname, join } from 'node:path';

import type { AppLogPayload, DiagnosticsJsonValue } from '../shared/desktop-api.js';

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
  logsDir: string;
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

export interface FileAppLogRecord extends MainAppLogRecord {
  module: AppLogPayload['module'];
}

export const mainAppLogBackend = electronLog as unknown as ElectronLogBackendLike;

const sensitiveKeyPattern = /token|password|authorization|secret|credential|cookie|captcha/i;
const sensitiveTextPattern =
  /Bearer\s+[A-Za-z0-9._~+/=-]+|([?&](?:access_?token|refresh_?token|token|authorization)=)[^&#\s]+|(?:token|password)=[^&\s]+|\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b|(?<!\d)1[3-9]\d{9}(?!\d)/gi;
const maxObjectEntries = 80;
const maxArrayItems = 200;
const maxDepth = 8;
const rootLogFileName = 'root.log';
const errorLogFileName = 'error.log';
const mainLogMaxSize = 2 * 1024 * 1024;
const appLogMaxSize = 2 * 1024 * 1024;
const consoleTransportKey = 'console';
let configuredLogsDir: string | null = null;

export function configureMainAppLogBackend(
  backend: ElectronLogBackendLike,
  options: MainAppLogBackendOptions,
) {
  backend.initialize?.();
  configuredLogsDir = options.logsDir;

  if (backend.transports?.file) {
    backend.transports.file.level = options.isDev ? 'debug' : 'info';
    backend.transports.file.fileName = rootLogFileName;
    backend.transports.file.maxSize = mainLogMaxSize;
    backend.transports.file.resolvePathFn = () => join(options.logsDir, rootLogFileName);
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
  if (backend === mainAppLogBackend) {
    void writeErrorAppLogRecordToFileIfNeeded(record).catch(() => {
      // File logging must never break the app runtime.
    });
  }
  return record;
}

export function recordDefaultMainAppLog(input: MainAppLogInput): MainAppLogRecord {
  return recordMainAppLog(mainAppLogBackend, input);
}

export async function writeAppLogToFile(payload: AppLogPayload): Promise<FileAppLogRecord> {
  const logsDir = configuredLogsDir;
  if (!logsDir) throw new Error('App logging is not configured');
  const record = createFileAppLogRecord(payload);
  await writeFileAppLogRecordToFiles(record);
  return record;
}

export function createFileAppLogRecord(payload: AppLogPayload): FileAppLogRecord {
  const occurredAt = payload.occurredAt ? new Date(payload.occurredAt) : new Date();
  const validOccurredAt = Number.isFinite(occurredAt.getTime()) ? occurredAt : new Date();
  return {
    ...createMainAppLogRecord({
      context: payload.context ? jsonValueToUnknownRecord(payload.context) : undefined,
      error: payload.error,
      event: payload.event,
      level: payload.level,
      module: payload.module,
      occurredAt: validOccurredAt,
      phase: payload.phase,
      reason: payload.reason,
      result: payload.result,
      traceId: payload.traceId,
    }),
    module: payload.module,
  };
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
  return value.replace(sensitiveTextPattern, (match, queryPrefix: string | undefined) => {
    if (match.startsWith('Bearer')) return 'Bearer ***';
    if (queryPrefix) return `${queryPrefix}[redacted]`;
    if (match.includes('@')) return '[email-redacted]';
    if (/^1[3-9]\d{9}$/.test(match)) return '[phone-redacted]';
    return '[redacted]';
  });
}

function formatMainAppLogMessage(message: ElectronLogFormatMessage) {
  const timestamp = message.date?.toISOString() ?? new Date().toISOString();
  const level = message.level ?? 'info';
  const body = (message.data ?? []).map(formatMainAppLogData).join(' ');
  return `${timestamp} [${level}] ${body}`;
}

async function writeFileAppLogRecordToFiles(record: FileAppLogRecord) {
  const logsDir = configuredLogsDir;
  if (!logsDir) throw new Error('App logging is not configured');
  const line = `${formatFileAppLogRecord(record)}\n`;
  await appendRotatingLogLine(join(logsDir, rootLogFileName), line);
  if (isErrorAppLogRecord(record)) {
    await appendRotatingLogLine(join(logsDir, errorLogFileName), line);
  }
}

async function writeErrorAppLogRecordToFileIfNeeded(record: MainAppLogRecord) {
  if (!configuredLogsDir || !isErrorAppLogRecord(record)) return;
  await appendRotatingLogLine(
    join(configuredLogsDir, errorLogFileName),
    `${formatFileAppLogRecord(record)}\n`,
  );
}

function isErrorAppLogRecord(record: MainAppLogRecord) {
  return record.level === 'error' || record.result === 'failed' || record.result === 'invalid';
}

async function appendRotatingLogLine(filePath: string, line: string) {
  await mkdir(dirname(filePath), { recursive: true });
  await rotateLogFileIfNeeded(filePath, Buffer.byteLength(line, 'utf8'));
  await appendFile(filePath, line, 'utf8');
}

async function rotateLogFileIfNeeded(filePath: string, nextBytes: number) {
  try {
    const current = await stat(filePath);
    if (current.size + nextBytes <= appLogMaxSize) return;
    const rotatedPath = `${filePath}.1`;
    await rm(rotatedPath, { force: true });
    await rename(filePath, rotatedPath);
  } catch (error) {
    const code = typeof error === 'object' && error && 'code' in error
      ? String((error as { code?: unknown }).code)
      : '';
    if (code !== 'ENOENT') throw error;
  }
}

function formatFileAppLogRecord(record: MainAppLogRecord) {
  return [
    record.occurredAt,
    `[${record.level}]`,
    `[${record.module}]`,
    record.event,
    `result=${record.result}`,
    `phase=${record.phase}`,
    `trace=${record.traceId}`,
    record.reason ? `reason=${formatLogToken(record.reason)}` : undefined,
    ...formatContextTokens(record.context),
    ...formatErrorTokens(record.error),
  ].filter(Boolean).join(' ');
}

function formatContextTokens(context: DiagnosticsJsonValue | undefined): string[] {
  if (!context || typeof context !== 'object' || Array.isArray(context)) return [];
  return Object.entries(context)
    .filter(([, value]) => value !== undefined)
    .map(([key, value]) => `${key}=${formatLogToken(value)}`);
}

function formatErrorTokens(error: MainAppLogRecord['error']): string[] {
  if (!error) return [];
  return [
    error.name ? `errorName=${formatLogToken(error.name)}` : undefined,
    `errorMessage=${formatLogToken(error.message)}`,
  ].filter(Boolean) as string[];
}

function formatLogToken(value: DiagnosticsJsonValue | string) {
  if (typeof value === 'string') {
    const text = redactMainAppLogText(value);
    return /\s/.test(text) ? JSON.stringify(text) : text;
  }
  return JSON.stringify(value);
}

function jsonValueToUnknownRecord(value: DiagnosticsJsonValue): Record<string, unknown> | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined;
  return value as Record<string, unknown>;
}

function formatMainAppLogData(value: unknown) {
  if (typeof value === 'string') return redactMainAppLogText(value);
  return JSON.stringify(sanitizeMainAppLogValue(value));
}
