import { ContactsApiClient } from "./contacts-client";
import { endpointPlan } from "./endpoints";
import type { UploadRequestOptions } from "./base";
import type {
  ConversationListItem,
  ConversationListResponse,
  DirectReadStatusDto,
  DirectChatCreatedDto,
  GroupChatCreatedDto,
  MediaResourceDto,
  MessageItemDto,
} from "./types";
import {
  validateConversationSummaryContract,
  validateMessagePageContract,
} from "../im-api-contract";
import { normalizeMessageItem } from "../im-message-normalize";
import { logApiContractDiagnostic } from "../api-contract/contract-diagnostics";
import {
  imConversationEntityToListItem,
  normalizeImConversationDto,
} from "../im/im-conversation-contract";
import {
  imMessageEntityToDto,
  normalizeImMessageDto,
} from "../im/im-message-contract";

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
        .map(normalizeConversationSummaryFromContract)
        .filter((item): item is ConversationListItem => Boolean(item)),
    }));
  }

  createDirectChat(peerUserId: string) {
    return this.request<DirectChatCreatedDto>(endpointPlan.directChats, {
      method: "POST",
      body: JSON.stringify({ peerUserId }),
    });
  }

  createGroupChat(body: { name: string; memberUserIds: string[] }) {
    return this.request<GroupChatCreatedDto>(endpointPlan.groups, {
      method: "POST",
      body: JSON.stringify({
        name: body.name.trim(),
        memberUserIds: body.memberUserIds,
      }),
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
      return (messages ?? [])
        .map((message, index) =>
          normalizeConversationMessageFromContract(
            message,
            validation.normalized.items[index],
            conversationId,
          ),
        )
        .filter((item): item is MessageItemDto => Boolean(item));
    });
  }

  sendConversationTextMessage(
    conversationType: "direct" | "group",
    conversationId: string,
    text: string,
    replyToMessageId?: string | null,
    mentions: Array<{ userId?: string; displayName?: string }> = [],
    options: { clientMsgId?: string } = {},
  ) {
    return this.sendConversationMessage(conversationType, conversationId, "text", {
      text,
    }, replyToMessageId, mentions, options);
  }

  uploadMedia(
    file: File,
    mediaKind: "image" | "file" | "voice" | "video",
    options: MediaUploadOptions = {},
  ) {
    const form = new FormData();
    form.append("file", mediaKind === "file" ? fileWithUploadSafeName(file) : file);
    form.append("mediaKind", mediaKind);
    return this.uploadFormData<MediaResourceDto>(endpointPlan.mediaUpload, form, options);
  }

  sendConversationMediaMessage(
    conversationType: "direct" | "group",
    conversationId: string,
    messageType: "image" | "video" | "file",
    media: MediaResourceDto,
    replyToMessageId?: string | null,
    options: { clientMsgId?: string } = {},
  ) {
    return this.sendConversationMessage(conversationType, conversationId, messageType, {
      [messageType]: media,
    }, replyToMessageId, [], options);
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
    options: { clientMsgId?: string } = {},
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
        clientMsgId:
          options.clientMsgId || `pc-${Date.now()}-${Math.random().toString(16).slice(2)}`,
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
): ConversationListItem | null {
  const result = normalizeImConversationDto(item);
  logApiContractDiagnostic({
    api: "pc-im-conversations",
    phase: "normalize",
    status: result.status,
    issues: result.issues,
    context: {
      conversationId: result.data?.id ?? item.conversationId,
    },
    error: result.error,
  });
  if (!result.data) return null;
  const summaryReadValidation = validateConversationSummaryContract(item);
  return {
    ...imConversationEntityToListItem(result.data, item),
    imReadContractLevel:
      summaryReadValidation.level === "blocking"
        ? "blocking"
        : result.status === "ok"
          ? "ok"
          : "degraded",
    imReadContractDiagnostics: [
      ...summaryReadValidation.diagnostics,
      ...result.issues.map((issue) => issue.code),
    ],
  };
}

function normalizeConversationMessageFromContract(
  item: MessageItemDto,
  contractMessage: ReturnType<typeof validateMessagePageContract>["normalized"]["items"][number] | undefined,
  conversationId: string,
): MessageItemDto | null {
  const result = normalizeImMessageDto(
    {
      ...item,
      ...contractMessage,
      conversationId: item.conversationId || contractMessage?.conversationId || conversationId,
    },
    { fallbackConversationId: conversationId },
  );
  logApiContractDiagnostic({
    api: "pc-im-messages",
    phase: "normalize",
    status: result.status,
    issues: result.issues,
    context: {
      conversationId: result.data?.conversationId ?? conversationId,
      messageId: result.data?.id ?? item.messageId,
    },
    error: result.error,
  });
  if (!result.data) return null;
  return normalizeMessageItem(imMessageEntityToDto(result.data, item));
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

function fileWithUploadSafeName(file: File) {
  const extension = file.name.split(".").pop()?.toLowerCase() ?? "";
  const broadlyAcceptedExtensions = new Set([
    "7z",
    "csv",
    "doc",
    "docx",
    "pdf",
    "ppt",
    "pptx",
    "rar",
    "txt",
    "xls",
    "xlsx",
    "zip",
  ]);
  if (broadlyAcceptedExtensions.has(extension)) return file;
  return new File([file], `${file.name}.txt`, {
    type: file.type || "application/octet-stream",
    lastModified: file.lastModified,
  });
}
