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
  type ChatMessageGroupReadReceipt,
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
    groupReadReceipt?: ChatMessageGroupReadReceipt;
    groupReadReceiptClickable: boolean;
    receipt: ChatMessageReceiptState;
    sendStatusSlot: ChatMessageSendStatusSlot;
    showFailureMarker: boolean;
    showSendingIndicator: boolean;
    readReceiptText?: string;
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
  mineSenderName?: string | null;
  timeText: string;
  statusText?: string;
  readReceiptText?: string;
  conversationType?: string;
  translationText?: string;
  contextMenuEnabled?: boolean;
  groupReadReceiptTotal?: number;
  nowMs?: number;
  suppressMissingSenderNameFallback?: boolean;
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
  const delivery = normalizeChatMessageDeliveryState(
    message.status,
    message.isRecalled,
  );
  const status = deriveChatMessageStatus({
    conversationType: input.conversationType,
    groupReadReceiptTotal: input.groupReadReceiptTotal,
    message,
    mine: input.mine,
    nowMs: input.nowMs,
  });
  const senderName = chatMessageSenderName(input, message);

  return {
    id: message.messageId,
    ownership: input.mine ? "mine" : "other",
    sender: {
      name: senderName,
      avatarUrl: input.mine
        ? input.mineAvatarUrl
        : input.senderAvatarUrl || message.senderAvatarUrl || message.avatarUrl,
      fallbackName: input.mine
        ? senderName
        : senderName ||
          (input.suppressMissingSenderNameFallback
            ? ""
            : input.conversationFallbackName),
      mine: input.mine,
    },
    bubble: {
      className: `pc-chat-message ${input.mine ? "mine" : "other"}`,
      reply: replyViewModelFromMessage(message),
    },
    content: {
      type,
      preview:
        message.preview ||
        messagePreviewFromBody(message.body ?? {}, type) ||
        "[娑堟伅]",
      translationText: input.translationText,
    },
    status: {
      delivery,
      failureTooltip: status.failureTooltip,
      groupReadReceipt: status.groupReadReceipt,
      groupReadReceiptClickable: status.groupReadReceiptClickable,
      receipt: status.receiptState,
      sendStatusSlot: status.sendStatusSlot,
      showFailureMarker: status.showFailureMarker,
      showSendingIndicator: status.showSendingIndicator,
      readReceiptText: undefined,
      statusText: visibleStatusText({
        allowReceiptStatusText:
          isCustomerServiceConversation(input.conversationType) &&
          Boolean(input.statusText),
        mine: input.mine,
        receipt: status.receiptState,
        statusText: input.statusText ?? status.statusLabel,
      }),
      timeText: input.timeText,
    },
    actions: {
      contextMenuEnabled: input.contextMenuEnabled ?? true,
      failureRetryAction: failedMessageRetryAction(message),
      uploadActionTaskId: uploadActionTaskId(message, delivery),
    },
  };
}


function chatMessageSenderName(
  input: CreateChatMessageViewModelInput,
  message: LocalMessageRecord,
) {
  if (input.mine) {
    if (input.mineSenderName?.trim()) return input.mineSenderName.trim();
    if (input.suppressMissingSenderNameFallback) return "";
    return "我";
  }
  if (message.senderDisplayName) return message.senderDisplayName;
  if (input.suppressMissingSenderNameFallback) return "";
  return input.senderFallback || "联系人";
}

export function replyViewModelFromMessage(
  message: MessageItemDto,
): ChatMessageReplyViewModel | undefined {
  const body = message.body ?? {};
  const record = (body.reply ||
    body.replyTo ||
    body.quotedMessage ||
    body.quote ||
    (message as unknown as Record<string, unknown>).reply) as
    | Record<string, unknown>
    | undefined;
  if (!record || typeof record !== "object") return undefined;
  const preview = stringField(record, "preview", "text", "content", "message");
  if (!preview) return undefined;
  return {
    sender:
      stringField(record, "sender", "senderDisplayName", "name") ||
      "Referenced message",
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

function visibleStatusText({
  allowReceiptStatusText,
  mine,
  receipt,
  statusText,
}: {
  allowReceiptStatusText?: boolean;
  mine: boolean;
  receipt: ChatMessageReceiptState;
  statusText: string | undefined;
}) {
  if (!mine) return undefined;
  if (allowReceiptStatusText && statusText) return statusText;
  return receipt === "read" ||
    receipt === "unread" ||
    receipt === "group_unread" ||
    receipt === "group_partial" ||
    receipt === "group_all"
    ? undefined
    : statusText;
}

function isCustomerServiceConversation(conversationType?: string | null) {
  const normalized = String(conversationType ?? "")
    .trim()
    .toLowerCase()
    .replace(/-/g, "_");
  return normalized === "temp_session" || normalized === "im_direct";
}

function stringField(record: Record<string, unknown>, ...keys: string[]) {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return undefined;
}
