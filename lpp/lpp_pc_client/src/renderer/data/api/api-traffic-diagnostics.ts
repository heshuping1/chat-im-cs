import type {
  ApiTrafficDiagnosticPayload,
  DiagnosticsJsonValue,
} from "../../../shared/desktop-api";
import { writeRendererAppLog } from "../logging/app-log";
import { getPcSettingsSnapshot } from "../settings/settings-store";

export type ApiTrafficLogLevel = "off" | "errors" | "summary" | "body";
export type ApiTrafficPhase = "request" | "upload";
export type ApiTrafficResult = "success" | "failed";

export type ApiTrafficDiagnosticRecord = ApiTrafficDiagnosticPayload;

export interface ApiTrafficDiagnosticInput {
  phase: ApiTrafficPhase;
  result: ApiTrafficResult;
  method: string;
  path: string;
  status?: number;
  durationMs: number;
  requestId?: string;
  requestBody?: unknown;
  responseBody?: unknown;
  error?: unknown;
}

export type ApiTrafficPayloadSummary = Record<string, DiagnosticsJsonValue>;

const maxApiTrafficDiagnostics = 240;
const maxStringLength = 4000;
const maxArrayItems = 80;
const maxObjectEntries = 80;
const maxDepth = 6;
const sensitiveKeyPattern = /token|authorization|cookie|password|secret|credential|captcha/i;

export function getApiTrafficLogLevel(): ApiTrafficLogLevel {
  try {
    return getPcSettingsSnapshot().apiTrafficLogLevel;
  } catch {
    return "summary";
  }
}

export function logApiTrafficDiagnostic(input: ApiTrafficDiagnosticInput) {
  const level = getApiTrafficLogLevel();
  if (level === "off") return undefined;
  if (level === "errors" && input.result !== "failed") return undefined;

  const record = createApiTrafficDiagnosticRecord(input, level);
  const target = apiTrafficDiagnosticTarget();
  if (!target) return record;

  const current = target.__lppApiTrafficDiagnostics ?? [];
  target.__lppApiTrafficDiagnostics = [...current, record].slice(-maxApiTrafficDiagnostics);
  writeRendererAppLog({
    module: "api",
    event: record.event,
    phase: record.phase,
    result: record.result === "success" ? "ok" : "failed",
    level: record.level,
    traceId: record.traceId,
    occurredAt: record.at,
    context: {
      method: record.method,
      path: record.path,
      status: record.status ?? null,
      durationMs: record.durationMs,
      requestId: record.requestId ?? null,
      route: record.route ?? null,
      request: diagnosticObjectValue(record.request, "body") ?? record.request ?? null,
      response: diagnosticObjectValue(record.response, "body") ?? record.response ?? null,
      errorSummary: diagnosticObjectValue(record.error, "summary") ?? null,
    },
  });
  void target.desktopApi?.recordApiTrafficDiagnostic(record).catch((error) => {
    console.warn("[lpp:api-traffic] persist failed", error);
  });
  if (level === "body") {
    console.info("[lpp:api-traffic]", record);
  } else {
    console.info("[lpp:api-traffic]", {
      traceId: record.traceId,
      method: record.method,
      path: record.path,
      status: record.status,
      result: record.result,
      durationMs: record.durationMs,
      requestId: record.requestId,
    });
  }
  return record;
}

export function createApiTrafficDiagnosticRecord(
  input: ApiTrafficDiagnosticInput,
  level: ApiTrafficLogLevel,
): ApiTrafficDiagnosticRecord {
  const includeBody = true;
  const timestamp = Date.now();
  const request = summarizePayload(input.requestBody, includeBody);
  const response = summarizePayload(input.responseBody, includeBody);
  const error = summarizePayload(input.error, includeBody);
  const content = compactPayloadSummary({
    request,
    response,
    error,
  });
  return {
    at: new Date(timestamp).toISOString(),
    level: input.result === "failed" ? "error" : "info",
    event: input.result === "failed" ? "api.request.failed" : "api.request.completed",
    source: "api-base-client",
    traceId: createApiTrafficTraceId(input.phase),
    module: "api-traffic",
    phase: input.phase,
    result: input.result,
    route: sanitizePath(input.path),
    timestamp,
    method: input.method,
    path: sanitizePath(input.path),
    status: input.status,
    durationMs: input.durationMs,
    requestId: input.requestId,
    content: Object.keys(content).length ? content : undefined,
    request,
    response,
    error,
  };
}

export function summarizeRequestBody(body: BodyInit | null | undefined) {
  if (body === undefined || body === null) return undefined;
  if (typeof body === "string") return parseJsonLike(body) ?? body;
  if (body instanceof FormData) {
    return {
      kind: "FormData",
      fields: Array.from(body.keys()),
    };
  }
  if (body instanceof URLSearchParams) return body.toString();
  if (body instanceof Blob) {
    return {
      kind: "Blob",
      size: body.size,
      type: body.type,
    };
  }
  return {
    kind: Object.prototype.toString.call(body),
  };
}

function summarizePayload(value: unknown, includeBody: boolean): ApiTrafficPayloadSummary | undefined {
  if (value === undefined) return undefined;
  if (value === null) return { kind: "null" };
  if (typeof value === "string") {
    return compactPayloadSummary({
      body: includeBody ? sanitizeValue(value) : undefined,
      kind: "string",
      size: value.length,
      summary: sanitizeString(value).slice(0, 240),
    });
  }
  if (typeof value === "number" || typeof value === "boolean") {
    return compactPayloadSummary({
      body: includeBody ? value : undefined,
      kind: typeof value,
      summary: String(value),
    });
  }
  if (value instanceof Error) {
    return compactPayloadSummary({
      body: includeBody ? sanitizeValue(errorToObject(value)) : undefined,
      kind: value.name || "Error",
      summary: sanitizeString(value.message),
    });
  }
  const envelope = summarizeApiEnvelope(value);
  const highlights = summarizeObjectHighlights(value);
  return compactPayloadSummary({
    body: includeBody ? sanitizeValue(value) : undefined,
    code: envelope.code,
    identifier: highlights.identifier,
    kind: Array.isArray(value) ? "array" : "object",
    message: envelope.message,
    requestId: envelope.requestId,
    summary: summarizeObject(value),
  });
}

function compactPayloadSummary(
  value: Record<string, DiagnosticsJsonValue | undefined>,
): ApiTrafficPayloadSummary {
  return Object.fromEntries(
    Object.entries(value).filter(([, entry]) => entry !== undefined),
  ) as ApiTrafficPayloadSummary;
}

function diagnosticObjectValue(
  value: DiagnosticsJsonValue | undefined,
  key: string,
): DiagnosticsJsonValue | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;
  return value[key];
}

function sanitizeValue(value: unknown, depth = 0): DiagnosticsJsonValue {
  if (depth > maxDepth) return "[truncated-depth]";
  if (value === null) return null;
  if (typeof value === "string") return sanitizeString(value);
  if (typeof value === "number" || typeof value === "boolean") return value;
  if (Array.isArray(value)) {
    return value.slice(0, maxArrayItems).map((item) => sanitizeValue(item, depth + 1));
  }
  if (value instanceof Error) return sanitizeValue(errorToObject(value), depth + 1);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .slice(0, maxObjectEntries)
        .map(([key, entry]) => [
          key,
          sensitiveKeyPattern.test(key)
            ? "[redacted]"
            : key === "identifier"
              ? loginIdentifierSummaryValue(entry) ?? null
              : sanitizeValue(entry, depth + 1),
        ]),
    );
  }
  return String(value);
}

function summarizeObject(value: unknown) {
  if (!value || typeof value !== "object") return undefined;
  if (Array.isArray(value)) return `array(${value.length})`;
  const keys = Object.keys(value as Record<string, unknown>);
  return keys.length ? `keys=${keys.slice(0, 12).join(",")}` : "empty object";
}

function summarizeApiEnvelope(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }
  const record = value as Record<string, unknown>;
  return {
    code: primitiveSummaryValue(record.code),
    message: primitiveSummaryValue(record.message),
    requestId: primitiveSummaryValue(record.requestId),
  };
}

function summarizeObjectHighlights(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }
  const record = value as Record<string, unknown>;
  return {
    identifier: loginIdentifierSummaryValue(record.identifier),
  };
}

function primitiveSummaryValue(value: unknown): DiagnosticsJsonValue | undefined {
  if (typeof value === "string" && value.trim()) return sanitizeString(value.trim());
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "boolean") return value;
  return undefined;
}

function loginIdentifierSummaryValue(value: unknown): DiagnosticsJsonValue | undefined {
  if (typeof value !== "string") return primitiveSummaryValue(value);
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  return sanitizeLoginIdentifier(trimmed);
}

function sanitizeString(value: string) {
  return value
    .replace(/Bearer\s+[A-Za-z0-9._~+/=-]+/gi, "Bearer ***")
    .replace(/\b1[3-9]\d{9}\b/g, (phone) => `${phone.slice(0, 3)}****${phone.slice(-4)}`)
    .slice(0, maxStringLength);
}

function sanitizeLoginIdentifier(value: string) {
  const sanitized = sanitizeString(value);
  const atIndex = sanitized.indexOf("@");
  if (atIndex <= 0) return sanitized;
  const local = sanitized.slice(0, atIndex);
  const domain = sanitized.slice(atIndex);
  const maskedLocal = local.length <= 2 ? `${local[0] ?? ""}*` : `${local.slice(0, 2)}***`;
  return `${maskedLocal}${domain}`.slice(0, maxStringLength);
}

function sanitizePath(path: string) {
  return path.split("?")[0].replace(/Bearer\s+[A-Za-z0-9._~+/=-]+/gi, "Bearer ***");
}

function parseJsonLike(value: string) {
  try {
    return JSON.parse(value) as unknown;
  } catch {
    return undefined;
  }
}

function errorToObject(error: Error) {
  return {
    name: error.name,
    message: error.message,
  };
}

function createApiTrafficTraceId(phase: ApiTrafficPhase) {
  return `api-traffic-${phase}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function apiTrafficDiagnosticTarget() {
  return typeof window === "undefined" ? null : window;
}
