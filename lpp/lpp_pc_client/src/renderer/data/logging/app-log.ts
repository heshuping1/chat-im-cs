import type { AppLogPayload, DiagnosticsJsonValue } from "../../../shared/desktop-api";

type RendererAppLogInput = Omit<AppLogPayload, "occurredAt" | "context" | "error"> & {
  context?: Record<string, unknown>;
  error?: unknown;
  occurredAt?: Date | string;
};

const sensitiveLogKeyPattern = /token|password|authorization|secret|credential|cookie|captcha/i;
const bearerPattern = /\bBearer\s+[A-Za-z0-9._~+/=-]+/gi;
const emailPattern = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi;
const phonePattern = /(?<!\d)1[3-9]\d{9}(?!\d)/g;
const queryTokenPattern = /([?&](?:access_?token|refresh_?token|token|authorization)=)[^&#\s]+/gi;
const maxLogObjectEntries = 80;
const maxLogArrayItems = 120;
const maxLogDepth = 6;

export function writeRendererAppLog(input: RendererAppLogInput) {
  const { context, error, occurredAt, ...rest } = input;
  const payload: AppLogPayload = {
    ...rest,
    context: context === undefined ? undefined : toLogJsonValue(context),
    error: error === undefined ? undefined : toLogJsonValue(error),
    occurredAt:
      occurredAt instanceof Date
        ? occurredAt.toISOString()
        : occurredAt ?? new Date().toISOString(),
  };
  const desktopApi = safeDesktopApi();
  if (!desktopApi?.writeAppLog) return payload;
  void desktopApi.writeAppLog(payload).catch(() => {
    // File logging must never break the user workflow.
  });
  return payload;
}

function safeDesktopApi() {
  if (typeof window === "undefined") return undefined;
  try {
    return window.desktopApi;
  } catch {
    return undefined;
  }
}

function toLogJsonValue(value: unknown, depth = 0): DiagnosticsJsonValue {
  if (depth > maxLogDepth) return "[truncated-depth]";
  if (value === null) return null;
  if (value === undefined) return null;
  if (typeof value === "string") return redactLogString(value);
  if (typeof value === "number") return Number.isFinite(value) ? value : String(value);
  if (typeof value === "boolean") return value;
  if (Array.isArray(value)) {
    return value
      .slice(0, maxLogArrayItems)
      .map((item) => toLogJsonValue(item, depth + 1));
  }
  if (typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .slice(0, maxLogObjectEntries)
        .map(([entryKey, entryValue]) => [
          entryKey,
          sensitiveLogKeyPattern.test(entryKey)
            ? "[redacted]"
            : toLogJsonValue(entryValue, depth + 1),
        ]),
    );
  }
  return String(value);
}

function redactLogString(value: string) {
  return value
    .replace(bearerPattern, "Bearer ***")
    .replace(queryTokenPattern, "$1[redacted]")
    .replace(emailPattern, "[email-redacted]")
    .replace(phonePattern, "[phone-redacted]");
}
