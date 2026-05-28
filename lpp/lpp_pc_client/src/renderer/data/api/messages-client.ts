import { ContactsApiClient } from "./contacts-client";
import { endpointPlan } from "./endpoints";
import type { UploadRequestOptions } from "./base";
import type {
  ConversationListItem,
  ConversationListResponse,
  DirectReadStatusDto,
  DirectChatCreatedDto,
  MediaResourceDto,
  MessageItemDto,
} from "./types";
import {
  validateConversationSummaryContract,
  validateMessagePageContract,
} from "../im-api-contract";
import { normalizeMessageItem } from "../im-message-normalize";

export type MediaUploadOptions = UploadRequestOptions;

export class MessagesApiClient extends ContactsApiClient {
  getConversations(params: { limit?: number; cursor?: string } = {}) {
    const search = new URLSearchParams();
    search.set("limit", String(params.limit ?? 50));
    if (params.cursor) search.set("cursor", params.cursor);
    return this.request<ConversationListResponse>(
      `${endpointPlan.conversations}?${search.toString()}`,
    ).then((page) => ({
      ...page,
      items: (page.items ?? [])
        .filter(isPlainImConversation)
        .map(normalizeConversationSummaryFromContract),
    }));
  }

  createDirectChat(peerUserId: string) {
    return this.request<DirectChatCreatedDto>(endpointPlan.directChats, {
      method: "POST",
      body: JSON.stringify({ peerUserId }),
    });
  }

  getConversationMessages(
    conversationType: "direct" | "group",
    conversationId: string,
    limit = 50,
  ) {
    const base =
      conversationType === "group"
        ? endpointPlan.groupMessages
        : endpointPlan.directMessages;
    return this.request<MessageItemDto[]>(
      `${base.replace("{conversationId}", conversationId)}?limit=${limit}`,
    ).then((messages) => {
      const validation = validateMessagePageContract({
        conversationId,
        conversationType,
        items: messages ?? [],
        page: { isLatestPage: true },
      });
      return validation.normalized.items.map((message, index) =>
        normalizeMessageItem({
          ...(messages?.[index] ?? {}),
          ...message,
          conversationId: message.conversationId || conversationId,
        }),
      );
    });
  }

  sendConversationTextMessage(
    conversationType: "direct" | "group",
    conversationId: string,
    text: string,
    replyToMessageId?: string | null,
    mentions: Array<{ userId?: string; displayName?: string }> = [],
  ) {
    return this.sendConversationMessage(conversationType, conversationId, "text", {
      text,
    }, replyToMessageId, mentions);
  }

  uploadMedia(
    file: File,
    mediaKind: "image" | "file" | "voice" | "video",
    options: MediaUploadOptions = {},
  ) {
    const form = new FormData();
    form.append("file", file);
    form.append("mediaKind", mediaKind);
    return this.uploadFormData<MediaResourceDto>(endpointPlan.mediaUpload, form, options);
  }

  sendConversationMediaMessage(
    conversationType: "direct" | "group",
    conversationId: string,
    messageType: "image" | "video" | "file",
    media: MediaResourceDto,
    replyToMessageId?: string | null,
  ) {
    return this.sendConversationMessage(conversationType, conversationId, messageType, {
      [messageType]: media,
    }, replyToMessageId);
  }

  recallMessage(messageId: string) {
    return this.request<{ messageId?: string }>(
      endpointPlan.messageRecall.replace("{messageId}", messageId),
      { method: "POST" },
    );
  }

  deleteMessage(messageId: string) {
    return this.request<{ messageId?: string }>(
      endpointPlan.messageDelete.replace("{messageId}", messageId),
      { method: "POST" },
    );
  }

  addFavoriteMessage(params: { messageId: string; conversationId: string }) {
    return this.request<{ favoriteId?: string; messageId?: string }>(
      endpointPlan.favorites,
      {
        method: "POST",
        body: JSON.stringify(params),
      },
    );
  }

  translateMessage(messageId: string, targetLanguage = "zh-CN") {
    return this.request<Record<string, unknown> | string>(
      endpointPlan.messageTranslate,
      {
        method: "POST",
        body: JSON.stringify({ messageId, targetLanguage, model: "quality" }),
      },
    );
  }

  translateText(content: string, targetLanguage = "zh-CN") {
    return this.request<Record<string, unknown> | string>(
      endpointPlan.textTranslate,
      {
        method: "POST",
        body: JSON.stringify({ content, targetLanguage, model: "quality" }),
      },
    );
  }

  voiceToText(messageId: string) {
    return this.request<Record<string, unknown> | string>(
      endpointPlan.messageVoiceToText,
      {
        method: "POST",
        body: JSON.stringify({ messageId }),
      },
    );
  }

  forwardMessage(params: {
    sourceMessageId: string;
    targetConversationId: string;
  }) {
    return this.request<Record<string, unknown>>(
      endpointPlan.messageForward,
      {
        method: "POST",
        body: JSON.stringify({
          ...params,
          clientMsgId: `pc-fwd-${Date.now()}-${Math.random().toString(16).slice(2)}`,
        }),
      },
    );
  }

  markConversationRead(
    conversationType: "direct" | "group",
    conversationId: string,
    readSeq = 0,
  ) {
    const endpoint =
      conversationType === "group"
        ? endpointPlan.groupRead
        : endpointPlan.directRead;
    return this.request<{ readSeq?: number; lastReadSeq?: number; unreadCount?: number }>(
      endpoint.replace("{conversationId}", conversationId),
      {
        method: "POST",
        body: JSON.stringify({ readSeq }),
      },
    );
  }

  getDirectReadStatus(conversationId: string) {
    return this.request<DirectReadStatusDto>(
      endpointPlan.directReadStatus.replace("{conversationId}", conversationId),
    );
  }

  private sendConversationMessage(
    conversationType: "direct" | "group",
    conversationId: string,
    messageType: "text" | "image" | "video" | "file",
    body: Record<string, unknown>,
    replyToMessageId?: string | null,
    mentions: Array<{ userId?: string; displayName?: string }> = [],
  ) {
    const base =
      conversationType === "group"
        ? endpointPlan.groupMessages
        : endpointPlan.directMessages;
    return this.request<{
      messageId: string;
      conversationId: string;
      conversationSeq?: number;
      serverTime?: string;
    }>(base.replace("{conversationId}", conversationId), {
      method: "POST",
      body: JSON.stringify({
        clientMsgId: `pc-${Date.now()}-${Math.random().toString(16).slice(2)}`,
        messageType,
        body,
        replyToMessageId: replyToMessageId ?? null,
        ...(conversationType === "group" ? { mentions } : {}),
      }),
    });
  }
}

function isPlainImConversation(item: ConversationListItem) {
  const record = item as unknown as Record<string, unknown>;
  const conversationType = normalizeGatewayType(
    stringField(record, "conversationType", "type"),
  );
  const threadType = normalizeGatewayType(
    stringField(record, "threadType", "thread_type"),
  );
  if (conversationType === "temp_session" || threadType === "temp_session") {
    return false;
  }
  if (
    record.tempSession ||
    record.temp_session ||
    stringField(record, "sessionId", "visitorSessionId", "tempSessionId")
  ) {
    return false;
  }
  return [
    "direct",
    "im_direct",
    "direct_chat",
    "direct_customer",
    "customer_direct",
    "group",
    "im_group",
    "group_chat",
  ].includes(conversationType);
}

function normalizeConversationSummaryFromContract(
  item: ConversationListItem,
): ConversationListItem {
  const validation = validateConversationSummaryContract(item);
  const normalized = validation.normalized;
  const lastMessage =
    normalized.lastMessage || item.lastMessage
      ? {
          ...(item.lastMessage ?? {}),
          ...(normalized.lastMessage ?? {}),
        }
      : item.lastMessage;
  return {
    ...item,
    conversationId: normalized.conversationId || item.conversationId,
    conversationType: normalized.conversationType || item.conversationType,
    lastMessage,
    lastMessageSeq: normalized.lastMessageSeq,
    lastReadSeq: normalized.lastReadSeq,
    peerReadSeq: normalized.peerReadSeq,
    unreadCount: validation.level === "blocking" ? 0 : normalized.unreadCount,
    imReadContractLevel: validation.level,
    imReadContractDiagnostics: validation.diagnostics,
  };
}

function stringField(record: Record<string, unknown>, ...keys: string[]) {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) return value.trim();
    if (typeof value === "number") return String(value);
  }
  return "";
}

function normalizeGatewayType(value: string) {
  return value.trim().toLowerCase().replace(/-/g, "_");
}
