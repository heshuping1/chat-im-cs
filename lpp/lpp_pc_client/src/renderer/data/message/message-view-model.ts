import type { MessageItemDto } from "../api/types";
import {
  messagePreviewFromBody,
  normalizeMessageType,
} from "../im-message-normalize";
import {
  normalizeChatMessageDeliveryState,
  type ChatMessageDeliveryState,
} from "./message-domain";

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
    statusText?: string;
    timeText: string;
  };
  actions: {
    contextMenuEnabled: boolean;
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
  translationText?: string;
  contextMenuEnabled?: boolean;
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
  const senderName = input.mine
    ? "我"
    : input.senderFallback || message.senderDisplayName || "对方";

  return {
    id: message.messageId,
    ownership: input.mine ? "mine" : "other",
    sender: {
      name: senderName,
      avatarUrl: input.mine
        ? input.mineAvatarUrl
        : message.senderAvatarUrl || message.avatarUrl || input.senderAvatarUrl,
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
      statusText: input.statusText ?? defaultStatusText(delivery, message),
      timeText: input.timeText,
    },
    actions: {
      contextMenuEnabled: input.contextMenuEnabled ?? true,
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
    sender: stringField(record, "sender", "senderDisplayName", "name") || "引用消息",
    preview,
  };
}

function defaultStatusText(
  delivery: ChatMessageDeliveryState,
  message: LocalMessageRecord,
) {
  if (delivery === "sending") return "发送中";
  if (delivery === "uploading") return "上传中";
  if (delivery === "paused") return "已暂停";
  if (delivery === "canceled") return "已取消";
  if (delivery === "failed") return message.localError ? "发送失败" : "发送失败";
  return undefined;
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
