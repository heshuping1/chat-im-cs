import type { ChatMessageDeliveryState } from "../message/message-domain";

export type ChatSendChannel = "im" | "customer_service";
export type ChatSendMessageKind = "text" | "image" | "video" | "file";

export type ChatSendStatus = Exclude<ChatMessageDeliveryState, "idle">;

export type ChatSendAction =
  | "enqueue_text"
  | "enqueue_media"
  | "start_upload"
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
  taskId: "P4-MSG-005B" | "P4-MSG-005C" | "P4-MSG-005D";
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

const terminalSendStatuses = new Set<ChatSendStatus>(["sent", "canceled", "recalled"]);
const sendDiagnosticsFlag = "lpp.sendDiagnostics";
const maxBufferedSendDiagnostics = 200;

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
  if (normalizedKey.includes("path") || normalizedKey.includes("filename")) {
    return "[local-path]";
  }
  return value.replace(/Bearer\s+[A-Za-z0-9._~+/=-]+/gi, "Bearer ***");
}
