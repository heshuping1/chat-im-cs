import type { MessageItemDto } from "../api/types";
import { normalizeMessageType } from "../im-message-normalize";
import {
  normalizeChatMessageDeliveryState,
  type ChatMessageDeliveryState,
} from "./message-domain";
import { sendFailurePresentation } from "./message-retry-model";

export type ChatMessageReceiptState =
  | "none"
  | "unread"
  | "read"
  | "group_unread"
  | "group_partial"
  | "group_all"
  | "group_unknown";

export type ChatMessageSendStatusSlot = "none" | "sending" | "failed";

export interface ChatMessageGroupReadReceipt {
  readCount: number;
  totalCount?: number;
  ratio?: number;
}

export interface ChatMessageStatusModel {
  failureReason?: string;
  failureTooltip?: string;
  groupReadReceipt?: ChatMessageGroupReadReceipt;
  groupReadReceiptClickable: boolean;
  receiptState: ChatMessageReceiptState;
  sendStatusSlot: ChatMessageSendStatusSlot;
  sendState: ChatMessageDeliveryState;
  showFailureMarker: boolean;
  showSendingIndicator: boolean;
  statusLabel?: string;
}

export const chatSendStatusFailedRevealDelayMs = 650;

export function deriveChatMessageStatus({
  conversationType,
  groupReadReceiptTotal,
  message,
  mine,
  nowMs = Date.now(),
}: {
  conversationType?: string;
  groupReadReceiptTotal?: number;
  message: MessageItemDto;
  mine: boolean;
  nowMs?: number;
}): ChatMessageStatusModel {
  const sendState = normalizeChatMessageDeliveryState(message.status, message.isRecalled);
  const messageType = normalizeMessageType(message);
  if (mine && isCardOwnedLocalMediaMessage(messageType) && isLocalMediaSendState(sendState)) {
    return baseStatus({ receiptState: "none", sendState });
  }

  const failureReason = localError(message);
  if (mine && sendState === "failed") {
    if (!shouldShowFailedMarker({ message, nowMs })) {
      return baseStatus({
        receiptState: "none",
        sendState,
        sendStatusSlot: "sending",
        showSendingIndicator: true,
      });
    }
    const failure = sendFailurePresentation(failureReason);
    return {
      failureReason: failure.dialogHint,
      failureTooltip: failure.markerTooltip,
      groupReadReceiptClickable: false,
      receiptState: "none",
      sendStatusSlot: "failed",
      sendState,
      showFailureMarker: true,
      showSendingIndicator: false,
      statusLabel: undefined,
    };
  }

  const media = isExternalSlotMediaMessage(messageType);
  if (mine && !media && sendState === "sending") {
    if (isGroupConversation(conversationType)) {
      return baseStatus({
        receiptState: "none",
        sendState,
      });
    }
    return baseStatus({
      receiptState: "unread",
      sendState,
      statusLabel: "未读",
    });
  }

  if (mine && media) {
    if (sendState === "queued" || sendState === "uploading" || sendState === "sending") {
      return baseStatus({
        receiptState: "none",
        sendState,
        sendStatusSlot: "sending",
        showSendingIndicator: true,
        statusLabel: "上传中",
      });
    }
    if (sendState === "paused") {
      return baseStatus({ receiptState: "none", sendState, statusLabel: "已暂停" });
    }
    if (sendState === "canceled") {
      return baseStatus({ receiptState: "none", sendState, statusLabel: "已取消" });
    }
  }

  if (!mine || sendState === "recalled" || sendState === "canceled") {
    return baseStatus({ receiptState: "none", sendState });
  }

  if (isGroupConversation(conversationType)) {
    return groupReceiptStatus(message, sendState, groupReadReceiptTotal);
  }

  if (isSentLike(sendState)) {
    const read = isDirectRead(message);
    return baseStatus({
      receiptState: read ? "read" : "unread",
      sendState,
      statusLabel: read ? "已读" : "未读",
    });
  }

  return baseStatus({ receiptState: "none", sendState });
}

function baseStatus({
  groupReadReceipt,
  receiptState,
  sendState,
  sendStatusSlot = "none",
  showSendingIndicator = false,
  statusLabel,
}: {
  groupReadReceipt?: ChatMessageGroupReadReceipt;
  receiptState: ChatMessageReceiptState;
  sendState: ChatMessageDeliveryState;
  sendStatusSlot?: ChatMessageSendStatusSlot;
  showSendingIndicator?: boolean;
  statusLabel?: string;
}): ChatMessageStatusModel {
  return {
    groupReadReceipt,
    receiptState,
    groupReadReceiptClickable:
      Boolean(groupReadReceipt) &&
      (receiptState === "group_partial" ||
        receiptState === "group_unread" ||
        receiptState === "group_all"),
    sendStatusSlot,
    sendState,
    showFailureMarker: false,
    showSendingIndicator,
    statusLabel,
  };
}

function groupReceiptStatus(
  message: MessageItemDto,
  sendState: ChatMessageDeliveryState,
  groupReadReceiptTotal?: number,
): ChatMessageStatusModel {
  if (!isSentLike(sendState)) {
    return baseStatus({ receiptState: "none", sendState });
  }
  const record = message as unknown as Record<string, unknown>;
  const conversationSeq = numberField(record, "conversationSeq", "conversation_seq", "seq");
  const rawReadCount = numberFieldAllowZero(record, "readCount", "read_count");
  if (!conversationSeq) {
    return baseStatus({ receiptState: "group_unknown", sendState });
  }
  const readCount = rawReadCount ?? 0;
  const totalCount =
    typeof groupReadReceiptTotal === "number" &&
    Number.isFinite(groupReadReceiptTotal) &&
    groupReadReceiptTotal >= 0
      ? Math.floor(groupReadReceiptTotal)
      : undefined;
  const ratio =
    totalCount && totalCount > 0
      ? Math.max(0, Math.min(1, readCount / totalCount))
      : undefined;
  const receiptState: ChatMessageReceiptState =
    totalCount !== undefined && totalCount > 0 && readCount >= totalCount
      ? "group_all"
      : readCount > 0
        ? "group_partial"
        : "group_unread";
  return baseStatus({
    groupReadReceipt: {
      readCount,
      totalCount,
      ratio,
    },
    receiptState,
    sendState,
  });
}

function isDirectRead(message: MessageItemDto) {
  const record = message as unknown as Record<string, unknown>;
  const status = String(message.status ?? "").trim().toLowerCase();
  return Boolean(
    message.isRead ||
      message.readAt ||
      status === "read" ||
      status === "seen" ||
      record.deliveryStatus === "read",
  );
}

function isSentLike(sendState: ChatMessageDeliveryState) {
  return sendState === "idle" || sendState === "sent";
}

function isExternalSlotMediaMessage(type: string) {
  return type === "image";
}

function isCardOwnedLocalMediaMessage(type: string) {
  return type === "video" || type === "file";
}

function isLocalMediaSendState(sendState: ChatMessageDeliveryState) {
  return (
    sendState === "queued" ||
    sendState === "uploading" ||
    sendState === "paused" ||
    sendState === "sending" ||
    sendState === "failed" ||
    sendState === "canceled"
  );
}

export function nextChatMessageStatusRefreshDelay({
  message,
  nowMs,
}: {
  message: MessageItemDto;
  nowMs: number;
}) {
  const record = message as unknown as Record<string, unknown>;
  const status = String(message.status ?? "").trim().toLowerCase();
  const revealAt = status === "failed" ? failedMarkerRevealAt(record) : undefined;
  if (!revealAt || nowMs >= revealAt) return undefined;
  return Math.max(0, revealAt - nowMs + 16);
}

function shouldShowFailedMarker({
  message,
  nowMs,
}: {
  message: MessageItemDto;
  nowMs: number;
}) {
  const record = message as unknown as Record<string, unknown>;
  const revealAt = failedMarkerRevealAt(record);
  return !revealAt || nowMs >= revealAt;
}

function failedMarkerRevealAt(record: Record<string, unknown>) {
  const startedAt = numberField(record, "localSendStartedAt", "local_send_started_at");
  const failedAt = numberField(record, "localFailedAt", "local_failed_at");
  if (!startedAt && !failedAt) return undefined;
  return Math.max(
    startedAt ? startedAt + chatSendStatusFailedRevealDelayMs : 0,
    failedAt ?? 0,
  );
}

function isGroupConversation(conversationType?: string) {
  return String(conversationType ?? "").trim().toLowerCase() === "group";
}

function localError(message: MessageItemDto) {
  const value = (message as unknown as Record<string, unknown>).localError;
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function numberField(record: Record<string, unknown>, ...keys: string[]) {
  for (const key of keys) {
    const value = record[key];
    const number = typeof value === "number" ? value : Number(value);
    if (Number.isFinite(number) && number > 0) return Math.floor(number);
  }
  return undefined;
}

function numberFieldAllowZero(record: Record<string, unknown>, ...keys: string[]) {
  for (const key of keys) {
    if (!(key in record)) continue;
    const value = record[key];
    const number = typeof value === "number" ? value : Number(value);
    if (Number.isFinite(number) && number >= 0) return Math.floor(number);
  }
  return undefined;
}
