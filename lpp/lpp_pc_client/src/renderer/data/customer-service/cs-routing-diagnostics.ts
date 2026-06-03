import type { CsRoutingDiagnosticPayload, DiagnosticsJsonValue } from "../../../shared/desktop-api";

const diagnosticsFlag = "lpp.csRoutingDiagnostics";
const plaintextDiagnosticsFlag = "lpp.diagnosticsPlaintext";
const sensitiveKeyPattern = /token|password|authorization|secret|credential|phone|mobile|email/i;
const contentKeyPattern = /^(body|content|messageText|rawText)$/i;
const scopeKeyPattern = /^scopeKey$/i;
const idKeyPattern = /(^id$|id$|Id$|_id$|seq$|Seq$|session|Session|conversation|Conversation|thread|Thread|user|User|lpp|Lpp)/;
const enumKeyPattern =
  /type|Type|status|Status|channel|Channel|source|Source|role|Role|event|Event|module|Module|scene|Scene|biz|Biz|kind|Kind|route|Route|phase|Phase|target|Target/;
const maxDepth = 4;
const maxKeys = 40;
const maxArrayItems = 8;
const maxBufferedCsRoutingDiagnostics = 200;

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
  rememberCsRoutingDiagnostic(record);
  void globalThis.window?.desktopApi?.recordCsRoutingDiagnostic(record).catch((error) => {
    console.warn("[cs-routing:diagnostic] persist failed", error);
  });
  console.debug("[cs-routing:diagnostic]", record);
}

function rememberCsRoutingDiagnostic(record: CsRoutingDiagnosticPayload) {
  if (typeof globalThis.window === "undefined") return;
  const diagnostics = globalThis.window.__lppCsRoutingDiagnostics ?? [];
  diagnostics.push(record);
  if (diagnostics.length > maxBufferedCsRoutingDiagnostics) {
    diagnostics.splice(0, diagnostics.length - maxBufferedCsRoutingDiagnostics);
  }
  globalThis.window.__lppCsRoutingDiagnostics = diagnostics;
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
  if (depth > maxDepth) return "[truncated-depth]";
  if (value === null || value === undefined) return value === undefined ? "[undefined]" : null;
  if (sensitiveKeyPattern.test(key)) return "[redacted]";
  if (contentKeyPattern.test(key)) return summarizeContent(value);
  if (scopeKeyPattern.test(key) && typeof value === "string") return summarizeScopeKey(value);
  if (typeof value === "number") return Number.isFinite(value) ? value : "[non-finite-number]";
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    if (looksLikeSensitiveString(value)) return "[redacted]";
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
  if (scopeKeyPattern.test(key)) return summarizeScopeKey(value);
  if (contentKeyPattern.test(key)) return `[redacted-content len=${value.length}]`;
  if (looksLikeSensitiveString(value)) return "[redacted]";
  if (idKeyPattern.test(key)) return summarizeIdentifier(value);
  if (enumKeyPattern.test(key) && value.length <= 96) return value;
  if (value.length <= 24 && /^[A-Za-z0-9._:-]+$/.test(value)) return value;
  return `[string len=${value.length}]`;
}

function summarizeScopeKey(value: string) {
  return `[scope-key len=${value.length} hash=${hashString(value)}]`;
}

function looksLikeSensitiveString(value: string) {
  return /\bBearer\s+[A-Za-z0-9._~+/=-]+/i.test(value) || /\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/.test(value);
}

function hashString(value: string) {
  let hash = 0xcbf29ce484222325n;
  const prime = 0x100000001b3n;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= BigInt(value.charCodeAt(index));
    hash = BigInt.asUintN(64, hash * prime);
  }
  return hash.toString(16).padStart(16, "0").slice(0, 12);
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
