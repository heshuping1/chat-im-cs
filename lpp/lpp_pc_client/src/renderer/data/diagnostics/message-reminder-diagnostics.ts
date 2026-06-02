import type {
  DiagnosticsJsonValue,
  MessageReminderDiagnosticPayload,
} from "../../../shared/desktop-api";
import {
  isPlaintextDiagnosticsEnabled,
  summarizeDiagnosticValue,
  type DiagnosticSummaryOptions,
} from "../customer-service/cs-routing-diagnostics";

const diagnosticsFlag = "lpp.messageReminderDiagnostics";

export function recordMessageReminderDiagnostic(
  payload: Omit<MessageReminderDiagnosticPayload, "at" | "classification" | "summary"> & {
    at?: string;
    classification?: unknown;
    summary?: unknown;
  },
) {
  if (!isMessageReminderDiagnosticsEnabled()) return;
  const summaryOptions = { plaintext: isPlaintextDiagnosticsEnabled() };
  const record: MessageReminderDiagnosticPayload = {
    ...payload,
    at: payload.at ?? new Date().toISOString(),
    classification: payload.classification
      ? summarizeDiagnosticValue(payload.classification, summaryOptions)
      : undefined,
    summary: payload.summary ? summarizeDiagnosticValue(payload.summary, summaryOptions) : undefined,
  };
  void globalThis.window?.desktopApi
    ?.recordMessageReminderDiagnostic(record)
    .catch((error) => {
      console.warn("[message-reminder:diagnostic] persist failed", error);
    });
  console.debug("[message-reminder:diagnostic]", record);
}

export function summarizeMessageReminderDiagnosticValue(
  value: unknown,
  options?: DiagnosticSummaryOptions,
): DiagnosticsJsonValue {
  return summarizeDiagnosticValue(value, options);
}

export function isMessageReminderDiagnosticsEnabled() {
  if (typeof globalThis.window === "undefined") return false;
  const flag = globalThis.window.localStorage?.getItem(diagnosticsFlag);
  return flag !== "0";
}
