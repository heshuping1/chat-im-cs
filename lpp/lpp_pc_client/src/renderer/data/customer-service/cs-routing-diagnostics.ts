import type { CsRoutingDiagnosticPayload, DiagnosticsJsonValue } from "../../../shared/desktop-api";

const diagnosticsFlag = "lpp.csRoutingDiagnostics";
const plaintextDiagnosticsFlag = "lpp.diagnosticsPlaintext";
const sensitiveKeyPattern = /token|password|authorization|secret|credential|phone|mobile|email/i;
const contentKeyPattern = /^(body|content|text|messageText|rawText)$/i;
const idKeyPattern = /(^id$|id$|Id$|_id$|seq$|Seq$|session|Session|conversation|Conversation|thread|Thread|user|User|lpp|Lpp)/;
const enumKeyPattern =
  /type|Type|status|Status|channel|Channel|source|Source|role|Role|event|Event|module|Module|scene|Scene|biz|Biz|kind|Kind|route|Route|phase|Phase|target|Target/;
const maxDepth = 4;
const maxKeys = 40;
const maxArrayItems = 8;

export interface DiagnosticSummaryOptions {
  plaintext?: boolean;
}

export function recordCsRoutingDiagnostic(
  payload: Omit<CsRoutingDiagnosticPayload, "at" | "classification" | "summary"> & {
    at?: string;
    classification?: unknown;
    summary?: unknown;
  },
) {
  if (!isCsRoutingDiagnosticsEnabled()) return;
  const summaryOptions = { plaintext: isPlaintextDiagnosticsEnabled() };
  const record: CsRoutingDiagnosticPayload = {
    ...payload,
    at: payload.at ?? new Date().toISOString(),
    classification: payload.classification
      ? summarizeDiagnosticValue(payload.classification, summaryOptions)
      : undefined,
    summary: payload.summary ? summarizeDiagnosticValue(payload.summary, summaryOptions) : undefined,
  };
  void globalThis.window?.desktopApi?.recordCsRoutingDiagnostic(record).catch((error) => {
    console.warn("[cs-routing:diagnostic] persist failed", error);
  });
  console.debug("[cs-routing:diagnostic]", record);
}

export function summarizeDiagnosticValue(
  value: unknown,
  options: DiagnosticSummaryOptions = {},
): DiagnosticsJsonValue {
  return summarizeValue(value, "", 0, options);
}

export function isCsRoutingDiagnosticsEnabled() {
  if (typeof globalThis.window === "undefined") return false;
  const flag = globalThis.window.localStorage?.getItem(diagnosticsFlag);
  return flag !== "0";
}

export function isPlaintextDiagnosticsEnabled() {
  if (typeof globalThis.window === "undefined") return false;
  const flag = globalThis.window.localStorage?.getItem(plaintextDiagnosticsFlag);
  return flag !== "0";
}

function summarizeValue(
  value: unknown,
  key: string,
  depth: number,
  options: DiagnosticSummaryOptions,
): DiagnosticsJsonValue {
  if (!options.plaintext && contentKeyPattern.test(key)) return summarizeContent(value);
  if (depth > maxDepth) return "[truncated-depth]";
  if (value === null || value === undefined) return value === undefined ? "[undefined]" : null;
  if (typeof value === "number") return Number.isFinite(value) ? value : "[non-finite-number]";
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    return options.plaintext ? value : summarizeString(key, value);
  }
  if (Array.isArray(value)) {
    return value
      .slice(0, maxArrayItems)
      .map((item, index) => summarizeValue(item, `${key}.${index}`, depth + 1, options));
  }
  if (typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>).slice(0, maxKeys);
    return Object.fromEntries(
      entries.map(([entryKey, entryValue]) => [
        entryKey,
        summarizeValue(entryValue, entryKey, depth + 1, options),
      ]),
    );
  }
  return typeof value;
}

function summarizeString(key: string, value: string) {
  if (sensitiveKeyPattern.test(key)) return "[redacted]";
  if (contentKeyPattern.test(key)) return `[redacted-content len=${value.length}]`;
  if (idKeyPattern.test(key)) return summarizeIdentifier(value);
  if (enumKeyPattern.test(key) && value.length <= 96) return value;
  if (value.length <= 24 && /^[A-Za-z0-9._:-]+$/.test(value)) return value;
  return `[string len=${value.length}]`;
}

function summarizeIdentifier(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return "";
  const suffix = trimmed.slice(-6);
  return trimmed.length > 6 ? `...${suffix}` : suffix;
}

function summarizeContent(value: unknown) {
  if (typeof value === "string") return `[redacted-content len=${value.length}]`;
  if (value && typeof value === "object") {
    try {
      return `[redacted-content len=${JSON.stringify(value).length}]`;
    } catch {
      return "[redacted-content]";
    }
  }
  return "[redacted-content]";
}
