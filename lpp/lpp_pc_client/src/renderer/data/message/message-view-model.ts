import type { MessageItemDto } from "../api/types";
import {
  messagePreviewFromBody,
  normalizeMessageType,
} from "../im-message-normalize";
import {
  normalizeChatMessageDeliveryState,
  type ChatMessageDeliveryState,
} from "./message-domain";
import {
  deriveChatMessageStatus,
  type ChatMessageReceiptState,
  type ChatMessageSendStatusSlot,
} from "./message-status-model";
import {
  failedMessageRetryAction,
  type FailedMessageRetryAction,
} from "./message-retry-model";

export type ChatMessageOwnership = "mine" | "other";

export interface ChatMessageViewModel {
  id: string;
  ownership: ChatMessageOwnership;
  sender: {
    name: string;
    avatarUrl?: string | null;
    fallbackName: string;
    mine: boolean;
  };
  bubble: {
    className: string;
    reply?: ChatMessageReplyViewModel;
  };
  content: {
    type: string;
    preview: string;
    translationText?: string;
  };
  status: {
    delivery: ChatMessageDeliveryState;
    failureTooltip?: string;
    groupReadReceiptClickable: boolean;
    receipt: ChatMessageReceiptState;
    sendStatusSlot: ChatMessageSendStatusSlot;
    showFailureMarker: boolean;
    showSendingIndicator: boolean;
    statusText?: string;
    timeText: string;
  };
  actions: {
    contextMenuEnabled: boolean;
    failureRetryAction?: FailedMessageRetryAction;
    uploadActionTaskId?: string;
  };
}

export interface ChatMessageReplyViewModel {
  sender: string;
  preview: string;
}

export interface CreateChatMessageViewModelInput {
  message: MessageItemDto;
  mine: boolean;
  conversationFallbackName: string;
  senderFallback: string;
  senderAvatarUrl?: string | null;
  mineAvatarUrl?: string | null;
  timeText: string;
  statusText?: string;
  conversationType?: string;
  translationText?: string;
  contextMenuEnabled?: boolean;
  nowMs?: number;
}

type LocalMessageRecord = MessageItemDto & {
  localTaskId?: string;
  localError?: string;
};

export function createChatMessageViewModel(
  input: CreateChatMessageViewModelInput,
): ChatMessageViewModel {
  const message = input.message as LocalMessageRecord;
  const type = normalizeMessageType(message) || "text";
  const delivery = normalizeChatMessageDeliveryState(message.status, message.isRecalled);
  const status = deriveChatMessageStatus({
    conversationType: input.conversationType,
    message,
    mine: input.mine,
    nowMs: input.nowMs,
  });
  const senderName = input.mine
    ? "我"
    : input.senderFallback || message.senderDisplayName || "联系人";

  return {
    id: message.messageId,
    ownership: input.mine ? "mine" : "other",
    sender: {
      name: senderName,
      avatarUrl: input.mine
        ? input.mineAvatarUrl
        : input.senderAvatarUrl || message.senderAvatarUrl || message.avatarUrl,
      fallbackName: input.mine ? senderName : senderName || input.conversationFallbackName,
      mine: input.mine,
    },
    bubble: {
      className: `pc-chat-message ${input.mine ? "mine" : "other"}`,
      reply: replyViewModelFromMessage(message),
    },
    content: {
      type,
      preview: message.preview || messagePreviewFromBody(message.body ?? {}, type) || "[消息]",
      translationText: input.translationText,
    },
    status: {
      delivery,
      failureTooltip: status.failureTooltip,
      groupReadReceiptClickable: status.groupReadReceiptClickable,
      receipt: status.receiptState,
      sendStatusSlot: status.sendStatusSlot,
      showFailureMarker: status.showFailureMarker,
      showSendingIndicator: status.showSendingIndicator,
      statusText: input.statusText ?? status.statusLabel,
      timeText: input.timeText,
    },
    actions: {
      contextMenuEnabled: input.contextMenuEnabled ?? true,
      failureRetryAction: failedMessageRetryAction(message),
      uploadActionTaskId: uploadActionTaskId(message, delivery),
    },
  };
}

export function replyViewModelFromMessage(
  message: MessageItemDto,
): ChatMessageReplyViewModel | undefined {
  const body = message.body ?? {};
  const record = (
    body.reply ||
    body.replyTo ||
    body.quotedMessage ||
    body.quote ||
    (message as unknown as Record<string, unknown>).reply
  ) as Record<string, unknown> | undefined;
  if (!record || typeof record !== "object") return undefined;
  const preview = stringField(record, "preview", "text", "content", "message");
  if (!preview) return undefined;
  return {
    sender: stringField(record, "sender", "senderDisplayName", "name") || "Referenced message",
    preview,
  };
}

function uploadActionTaskId(
  message: LocalMessageRecord,
  delivery: ChatMessageDeliveryState,
) {
  if (!message.localTaskId) return undefined;
  return ["uploading", "paused", "failed", "canceled"].includes(delivery)
    ? message.localTaskId
    : undefined;
}

function stringField(record: Record<string, unknown>, ...keys: string[]) {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return undefined;
}
