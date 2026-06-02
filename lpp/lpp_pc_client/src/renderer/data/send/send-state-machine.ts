import type { ChatMessageDeliveryState } from "../message/message-domain";
import { normalizeApiError } from "../api/api-error-model";

export type ChatSendChannel = "im" | "customer_service";
export type ChatSendMessageKind = "text" | "image" | "video" | "file" | "contact_card";

export type ChatSendStatus = Exclude<ChatMessageDeliveryState, "idle">;

export type ChatSendAction =
  | "enqueue_text"
  | "enqueue_contact_card"
  | "enqueue_media"
  | "start_upload"
  | "cache_local_media"
  | "upload_progress"
  | "upload_succeeded"
  | "start_send"
  | "send_succeeded"
  | "send_failed"
  | "pause"
  | "resume_upload"
  | "cancel"
  | "retry_upload"
  | "retry_send"
  | "recall_succeeded";

export interface ChatSendTransitionEvent {
  type: ChatSendAction;
  reason?: string;
}

export interface ChatSendTransitionResult {
  accepted: boolean;
  changed: boolean;
  state: ChatSendStatus;
  reason?: "invalid_transition" | string;
}

export type ChatSendDiagnosticPhase =
  | "local_echo"
  | "transition"
  | "upload"
  | "send"
  | "cache";

export interface ChatSendDiagnosticRecord {
  traceId: string;
  module: "send";
  taskId: "P4-MSG-005B" | "P4-MSG-005C" | "P4-MSG-005D" | "P24-CONTACT-001";
  channel: ChatSendChannel;
  phase: ChatSendDiagnosticPhase;
  result: "ok" | "failed" | "ignored";
  timestamp: number;
  action?: ChatSendAction;
  from?: ChatSendStatus;
  to?: ChatSendStatus;
  reason?: string;
  context?: Record<string, unknown>;
}

export interface ChatSendDiagnosticInput {
  taskId?: ChatSendDiagnosticRecord["taskId"];
  channel: ChatSendChannel;
  phase: ChatSendDiagnosticPhase;
  result: ChatSendDiagnosticRecord["result"];
  action?: ChatSendAction;
  from?: ChatSendStatus;
  to?: ChatSendStatus;
  reason?: string;
  context?: Record<string, unknown>;
}

export type UploadProgressDiagnosticPhase = "uploading_media" | "uploading_poster";

export type UploadProgressDiagnosticSummaryInput = {
  completedAt: number;
  fileSize?: number;
  localTaskId: string;
  messageKind: ChatSendMessageKind;
  percents: number[];
  phase: UploadProgressDiagnosticPhase;
  startedAt: number;
};

export type UploadProgressDiagnosticLogInput = UploadProgressDiagnosticSummaryInput & {
  channel: ChatSendChannel;
  taskId?: ChatSendDiagnosticRecord["taskId"];
};

export type UploadProgressDiagnosticTracker = {
  readonly percents: number[];
  readonly startedAt: number;
  track(percent: number): void;
};

export function chatSendFailureContext(
  error: unknown,
  context: Record<string, unknown> = {},
) {
  const normalized = normalizeApiError(error);
  return {
    ...context,
    ...(normalized.status ? { status: normalized.status } : {}),
    ...(normalized.code ? { code: normalized.code } : {}),
    ...(normalized.requestId ? { requestId: normalized.requestId } : {}),
  };
}

export function createUploadProgressDiagnosticSummary({
  completedAt,
  fileSize,
  localTaskId,
  messageKind,
  percents,
  phase,
  startedAt,
}: UploadProgressDiagnosticSummaryInput) {
  const normalizedPercents = percents.filter((value) => Number.isFinite(value));
  const eventCount = normalizedPercents.length;
  const firstPercent = normalizedPercents[0];
  const lastPercent = normalizedPercents[eventCount - 1];
  const durationMs = Math.max(0, Math.round(completedAt - startedAt));
  const completedByProgress = typeof lastPercent === "number" && lastPercent >= 100;
  const fastCompleted =
    durationMs < 300 &&
    completedByProgress &&
    (eventCount === 1 ||
      (eventCount === 2 && normalizedPercents[0] === 0 && normalizedPercents[1] === 100));
  return {
    completedByProgress,
    durationMs,
    eventCount,
    ...(typeof fileSize === "number" && Number.isFinite(fileSize) ? { fileSize } : {}),
    ...(typeof firstPercent === "number" ? { firstPercent } : {}),
    fastCompleted,
    ...(typeof lastPercent === "number" ? { lastPercent } : {}),
    localTaskId,
    messageKind,
    phase,
    progressSparse: durationMs >= 800 && eventCount <= 1,
  };
}

export function createUploadProgressDiagnosticTracker(
  startedAt = Date.now(),
): UploadProgressDiagnosticTracker {
  const percents: number[] = [];
  return {
    percents,
    startedAt,
    track(percent) {
      if (Number.isFinite(percent)) percents.push(percent);
    },
  };
}

export function logUploadProgressDiagnostic(input: UploadProgressDiagnosticLogInput) {
  return logChatSendDiagnostic({
    taskId: input.taskId,
    channel: input.channel,
    phase: "upload",
    result: "ok",
    action: "upload_progress",
    context: createUploadProgressDiagnosticSummary(input),
  });
}

export function logUploadProgressDiagnosticFromTracker(
  input: Omit<UploadProgressDiagnosticLogInput, "completedAt" | "percents" | "startedAt"> & {
    completedAt?: number;
    tracker: UploadProgressDiagnosticTracker;
  },
) {
  return logUploadProgressDiagnostic({
    ...input,
    completedAt: input.completedAt ?? Date.now(),
    percents: input.tracker.percents,
    startedAt: input.tracker.startedAt,
  });
}

const terminalSendStatuses = new Set<ChatSendStatus>(["sent", "canceled", "recalled"]);
const sendDiagnosticsFlag = "lpp.sendDiagnostics";
const maxBufferedSendDiagnostics = 200;
const maxPersistedSendDiagnostics = 80;
export const persistedSendDiagnosticsStorageKey = "lpp.sendDiagnostics.buffer.v1";

const transitionTable: Record<ChatSendStatus, Partial<Record<ChatSendAction, ChatSendStatus>>> = {
  queued: {
    start_upload: "uploading",
    start_send: "sending",
    cancel: "canceled",
    send_failed: "failed",
  },
  uploading: {
    upload_progress: "uploading",
    upload_succeeded: "sending",
    pause: "paused",
    cancel: "canceled",
    send_failed: "failed",
  },
  paused: {
    resume_upload: "uploading",
    retry_upload: "uploading",
    cancel: "canceled",
  },
  sending: {
    send_succeeded: "sent",
    send_failed: "failed",
  },
  failed: {
    retry_upload: "uploading",
    retry_send: "sending",
    cancel: "canceled",
  },
  canceled: {
    retry_upload: "uploading",
    retry_send: "sending",
  },
  sent: {
    recall_succeeded: "recalled",
  },
  recalled: {},
};

export function initialChatSendStatusForKind(
  kind: ChatSendMessageKind,
  options: { queued?: boolean } = {},
): ChatSendStatus {
  if (options.queued) return "queued";
  return kind === "text" ? "sending" : "uploading";
}

export function reduceChatSendState(
  current: ChatSendStatus,
  event: ChatSendTransitionEvent,
): ChatSendTransitionResult {
  const next = transitionTable[current]?.[event.type];
  if (!next) {
    return {
      accepted: false,
      changed: false,
      state: current,
      reason: event.reason || "invalid_transition",
    };
  }
  return {
    accepted: true,
    changed: next !== current,
    state: next,
    reason: event.reason,
  };
}

export function isTerminalChatSendStatus(status: ChatSendStatus) {
  return terminalSendStatuses.has(status);
}

export function canTransitionChatSendState(
  current: ChatSendStatus,
  action: ChatSendAction,
) {
  return Boolean(transitionTable[current]?.[action]);
}

export function createChatSendDiagnosticRecord(
  input: ChatSendDiagnosticInput,
): ChatSendDiagnosticRecord {
  return {
    traceId: createSendTraceId(input.channel, input.phase),
    module: "send",
    taskId: input.taskId ?? "P4-MSG-005B",
    channel: input.channel,
    phase: input.phase,
    result: input.result,
    timestamp: Date.now(),
    action: input.action,
    from: input.from,
    to: input.to,
    reason: input.reason,
    context: sanitizeSendDiagnosticContext(input.context),
  };
}

export function logChatSendDiagnostic(input: ChatSendDiagnosticInput) {
  const record = createChatSendDiagnosticRecord(input);
  const target = typeof window === "undefined" ? null : window;
  if (!target) return record;

  const current = target.__lppSendDiagnostics ?? [];
  target.__lppSendDiagnostics = [...current, record].slice(-maxBufferedSendDiagnostics);
  persistSendDiagnostics(target, target.__lppSendDiagnostics);
  if (shouldPrintSendDiagnostics(target)) {
    const printer = record.result === "failed" ? console.warn : console.debug;
    printer("[lpp:send]", record);
  }
  return record;
}

function createSendTraceId(channel: ChatSendChannel, phase: ChatSendDiagnosticPhase) {
  return `send-${channel}-${phase}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function shouldPrintSendDiagnostics(target: Window) {
  try {
    return import.meta.env.DEV || target.localStorage?.getItem(sendDiagnosticsFlag) === "1";
  } catch {
    return import.meta.env.DEV;
  }
}

function sanitizeSendDiagnosticContext(
  context?: Record<string, unknown>,
): Record<string, unknown> | undefined {
  if (!context) return undefined;
  return sanitizeSendDiagnosticValue(context) as Record<string, unknown>;
}

function sanitizeSendDiagnosticValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sanitizeSendDiagnosticValue);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, entry]) => [
        key,
        sanitizeSendDiagnosticEntry(key, entry),
      ]),
    );
  }
  if (typeof value === "string") return sanitizeSendDiagnosticText("", value);
  return value;
}

function sanitizeSendDiagnosticEntry(key: string, value: unknown): unknown {
  if (typeof value === "string") return sanitizeSendDiagnosticText(key, value);
  return sanitizeSendDiagnosticValue(value);
}

function sanitizeSendDiagnosticText(key: string, value: string) {
  const normalizedKey = key.toLowerCase();
  if (
    normalizedKey.includes("token") ||
    normalizedKey.includes("secret") ||
    normalizedKey.includes("password") ||
    normalizedKey.includes("authorization") ||
    normalizedKey.includes("apikey") ||
    normalizedKey.includes("api_key")
  ) {
    return "[redacted]";
  }
  if (
    normalizedKey.includes("filename") ||
    normalizedKey === "filepath" ||
    normalizedKey === "localpath" ||
    looksLikeLocalFilePath(value)
  ) {
    return "[local-path]";
  }
  return value.replace(/Bearer\s+[A-Za-z0-9._~+/=-]+/gi, "Bearer ***");
}

function persistSendDiagnostics(
  target: Window,
  records: ChatSendDiagnosticRecord[],
) {
  try {
    target.localStorage?.setItem(
      persistedSendDiagnosticsStorageKey,
      JSON.stringify(records.slice(-maxPersistedSendDiagnostics)),
    );
  } catch {
    // Diagnostics must never affect the send path.
  }
}

function looksLikeLocalFilePath(value: string) {
  return /^(file:\/\/|\/Users\/|\/private\/|\/var\/|\/tmp\/|[A-Za-z]:[\\/]|\\\\)/.test(
    value,
  );
}
