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

export interface ChatMessageStatusModel {
  failureReason?: string;
  failureTooltip?: string;
  groupReadReceiptClickable: boolean;
  receiptState: ChatMessageReceiptState;
  sendStatusSlot: ChatMessageSendStatusSlot;
  sendState: ChatMessageDeliveryState;
  showFailureMarker: boolean;
  showSendingIndicator: boolean;
  statusLabel?: string;
}

export const chatTextSendingIndicatorDelayMs = 700;
export const chatSendStatusFailedRevealDelayMs = 650;

export function deriveChatMessageStatus({
  conversationType,
  message,
  mine,
  nowMs = Date.now(),
}: {
  conversationType?: string;
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
    const showDelayedSendingIndicator = shouldShowDelayedSendingIndicator({
      message,
      nowMs,
    });
    if (isGroupConversation(conversationType)) {
      return baseStatus({
        receiptState: "none",
        sendState,
        sendStatusSlot: showDelayedSendingIndicator ? "sending" : "none",
        showSendingIndicator: showDelayedSendingIndicator,
      });
    }
    return baseStatus({
      receiptState: "unread",
      sendState,
      sendStatusSlot: showDelayedSendingIndicator ? "sending" : "none",
      showSendingIndicator: showDelayedSendingIndicator,
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
    return groupReceiptStatus(message, sendState);
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
  receiptState,
  sendState,
  sendStatusSlot = "none",
  showSendingIndicator = false,
  statusLabel,
}: {
  receiptState: ChatMessageReceiptState;
  sendState: ChatMessageDeliveryState;
  sendStatusSlot?: ChatMessageSendStatusSlot;
  showSendingIndicator?: boolean;
  statusLabel?: string;
}): ChatMessageStatusModel {
  return {
    receiptState,
    groupReadReceiptClickable:
      receiptState === "group_partial" || receiptState === "group_unread",
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
): ChatMessageStatusModel {
  if (!isSentLike(sendState)) {
    return baseStatus({ receiptState: "none", sendState });
  }
  const record = message as unknown as Record<string, unknown>;
  const conversationSeq = numberField(record, "conversationSeq", "conversation_seq", "seq");
  const readCount = numberFieldAllowZero(record, "readCount", "read_count");
  if (!conversationSeq || readCount === undefined) {
    return baseStatus({ receiptState: "group_unknown", sendState });
  }
  if (readCount > 0) {
    return baseStatus({
      receiptState: "group_partial",
      sendState,
      statusLabel: `已读 ${readCount} 人`,
    });
  }
  return baseStatus({ receiptState: "group_unread", sendState, statusLabel: "未读" });
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
  const messageType = normalizeMessageType(message);
  const revealAt =
    status === "failed"
      ? failedMarkerRevealAt(record)
      : status === "sending" && isDelayedSendingIndicatorMessage(messageType)
        ? delayedSendingIndicatorRevealAt(record)
        : undefined;
  if (!revealAt || nowMs >= revealAt) return undefined;
  return Math.max(0, revealAt - nowMs + 16);
}

function shouldShowDelayedSendingIndicator({
  message,
  nowMs,
}: {
  message: MessageItemDto;
  nowMs: number;
}) {
  const revealAt = delayedSendingIndicatorRevealAt(
    message as unknown as Record<string, unknown>,
  );
  return !revealAt || nowMs >= revealAt;
}

function delayedSendingIndicatorRevealAt(record: Record<string, unknown>) {
  const startedAt = numberField(record, "localSendStartedAt", "local_send_started_at");
  return startedAt ? startedAt + chatTextSendingIndicatorDelayMs : undefined;
}

function isDelayedSendingIndicatorMessage(type: string) {
  return !isExternalSlotMediaMessage(type) && !isCardOwnedLocalMediaMessage(type);
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
