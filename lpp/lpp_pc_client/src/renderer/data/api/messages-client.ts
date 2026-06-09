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
  ContactCardDto,
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
import { recordCsRoutingDiagnostic } from "../customer-service/cs-routing-diagnostics";
import {
  customerServiceIndexScopeKey,
  rememberCustomerServiceConversationIndex,
} from "../customer-service/cs-conversation-index";
import { logImReadDiagnostic } from "../im-read/im-read-diagnostics";
import { recordMessageSourceObserved } from "../diagnostics/message-source-diagnostics";
import { recordMessageTraceEvent } from "../diagnostics/message-trace-diagnostics";
import { resolveConversationOwnership } from "../gateway/conversation-ownership-resolver";
import {
  normalizeCreateGroupChatPayload,
  type CreateGroupChatInput,
} from "../group-create-contract";
import { normalizeMessageBatchActionResult } from "../message/message-batch-action-result";
import { parseGroupReadReceiptsPayload } from "../message/group-read-receipts-model";

export type MediaUploadOptions = UploadRequestOptions;
export type MessageMentionPayload =
  | { type: "all"; offset: number; length: number }
  | { type: "user"; userId: string; offset: number; length: number };

export class MessagesApiClient extends ContactsApiClient {
  getConversations(params: { limit?: number; cursor?: string } = {}) {
    const search = new URLSearchParams();
    search.set("limit", String(params.limit ?? 50));
    if (params.cursor) search.set("cursor", params.cursor);
    return this.request<ConversationListResponse>(
      `${endpointPlan.conversations}?${search.toString()}`,
    ).then((page) => {
      const items = page.items ?? [];
      const scopeKey = customerServiceIndexScopeKey({
        apiBaseUrl: this.options.baseUrl,
        platformUserId: this.options.platformUserId,
        spaceType: this.options.spaceType,
        tenantId: this.options.tenantId,
        tenantToken: this.options.tenantToken,
        userId: this.options.userId,
      });
      const filtered = items.filter((item) => isPlainImConversation(item, scopeKey));
      const dropped = items.filter((item) => !isPlainImConversation(item, scopeKey));
      recordCsRoutingDiagnostic({
        event: "pc-im-conversations",
        source: "messages-client",
        phase: "filter",
        route: "conversation-list",
        classification: {
          total: items.length,
          kept: filtered.length,
          dropped: items.length - filtered.length,
        },
        summary: dropped.slice(0, 20).map((item) => ({
          ...item,
          ownership: resolveConversationOwnership({
            payload: item as unknown as Record<string, unknown>,
            scopeKey,
            source: "imList",
          }),
        })),
      });
      recordConversationListSourceDiagnostics(items, scopeKey);
      return {
        ...page,
        items: filtered
          .map(normalizeConversationSummaryFromContract)
          .filter((item): item is ConversationListItem => Boolean(item)),
      };
    });
  }

  createDirectChat(peerUserId: string) {
    return this.request<DirectChatCreatedDto>(endpointPlan.directChats, {
      method: "POST",
      body: JSON.stringify({ peerUserId }),
    });
  }

  createGroupChat(body: CreateGroupChatInput) {
    const payload = normalizeCreateGroupChatPayload(body);
    return this.request<GroupChatCreatedDto>(endpointPlan.groups, {
      method: "POST",
      body: JSON.stringify(payload),
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
      const normalized = (messages ?? [])
        .map((message, index) =>
          normalizeConversationMessageFromContract(
            message,
            validation.normalized.items[index],
            conversationId,
          ),
        )
        .filter((item): item is MessageItemDto => Boolean(item));
      recordMessageDetailSourceDiagnostic({
        conversationId,
        conversationType,
        messages: normalized,
      });
      return normalized;
    });
  }

  sendConversationTextMessage(
    conversationType: "direct" | "group",
    conversationId: string,
    text: string,
    replyToMessageId?: string | null,
    mentions: MessageMentionPayload[] = [],
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

  sendConversationContactCardMessage(
    conversationType: "direct" | "group",
    conversationId: string,
    contactCard: ContactCardDto,
    replyToMessageId?: string | null,
    options: { clientMsgId?: string } = {},
  ) {
    return this.sendConversationMessage(conversationType, conversationId, "contact_card", {
      contactCard,
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

  setConversationPinned(conversationId: string, isPinned: boolean) {
    return this.request<{ conversationId?: string; isPinned?: boolean; updatedAt?: string }>(
      endpointPlan.conversationPin.replace("{conversationId}", conversationId),
      {
        method: "PUT",
        body: JSON.stringify({ isPinned }),
      },
    );
  }

  setConversationMuted(conversationId: string, isMuted: boolean) {
    return this.request<{ conversationId?: string; isMuted?: boolean; updatedAt?: string }>(
      endpointPlan.conversationMute.replace("{conversationId}", conversationId),
      {
        method: "PUT",
        body: JSON.stringify({ isMuted }),
      },
    );
  }

  setConversationVisibility(conversationId: string, hidden: boolean) {
    return this.request<{ conversationId?: string; hidden?: boolean; updatedAt?: string }>(
      endpointPlan.conversationVisibility.replace("{conversationId}", conversationId),
      {
        method: "PUT",
        body: JSON.stringify({ hidden }),
      },
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

  batchForwardMessages(params: {
    messageIds: string[];
    targetConversationId: string;
  }) {
    return this.request<unknown>(
      endpointPlan.messageBatchForward,
      {
        method: "POST",
        body: JSON.stringify(params),
      },
    ).then((result) => normalizeMessageBatchActionResult(result, params.messageIds));
  }

  batchDeleteMessages(messageIds: string[]) {
    return this.request<unknown>(
      endpointPlan.messageBatchDelete,
      {
        method: "POST",
        body: JSON.stringify({ messageIds }),
      },
    ).then((result) => normalizeMessageBatchActionResult(result, messageIds));
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
    const path = endpointPlan.directReadStatus.replace("{conversationId}", conversationId);
    const startedAt = Date.now();
    logImReadDiagnostic({
      event: "im-read.read-status-query",
      phase: "query",
      result: "success",
      reason: "direct_read_status_start",
      context: {
        conversationId,
        conversationType: "direct",
        path,
        route: "query",
      },
    });
    return this.request<DirectReadStatusDto>(path)
      .then((status) => {
        logImReadDiagnostic({
          event: "im-read.read-status-query",
          phase: "query",
          result: "success",
          reason: "direct_read_status_done",
          context: {
            conversationId,
            conversationType: "direct",
            durationMs: Date.now() - startedAt,
            path,
            peerLastReadSeq: normalizeReadStatusSeq(status?.peerLastReadSeq),
            route: "query",
          },
        });
        return status;
      })
      .catch((error) => {
        logImReadDiagnostic({
          event: "im-read.read-status-query",
          phase: "query",
          result: "failed",
          reason: "direct_read_status_failed",
          context: {
            conversationId,
            conversationType: "direct",
            durationMs: Date.now() - startedAt,
            path,
            route: "query",
          },
          error,
        });
        throw error;
      });
  }

  getGroupReadReceipts(
    groupId: string,
    messageId: string,
    messageSeq: number,
  ) {
    const search = new URLSearchParams({ messageId });
    const path = `${endpointPlan.groupReadReceipts.replace(
      "{conversationId}",
      encodeURIComponent(groupId),
    )}?${search.toString()}`;
    return this.request<unknown>(path).then((payload) =>
      parseGroupReadReceiptsPayload(readEnvelopeData(payload), {
        currentUser: {
          displayName: this.options.displayName,
          lppId: this.options.lppId,
          platformUserId: this.options.platformUserId,
          userId: this.options.userId,
        },
        messageSeq,
      }),
    );
  }

  private sendConversationMessage(
    conversationType: "direct" | "group",
    conversationId: string,
    messageType: "text" | "image" | "video" | "file" | "contact_card",
    body: Record<string, unknown>,
    replyToMessageId?: string | null,
    mentions: MessageMentionPayload[] = [],
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

function normalizeReadStatusSeq(value: unknown) {
  const seq = Math.floor(Number(value ?? 0));
  return Number.isFinite(seq) && seq > 0 ? seq : 0;
}

function isPlainImConversation(item: ConversationListItem, scopeKey: string) {
  const record = item as unknown as Record<string, unknown>;
  const ownership = resolveConversationOwnership({
    payload: record,
    scopeKey,
    source: "imList",
  });
  if (ownership.owner === "customerService") {
    rememberCustomerServiceOwnershipEvidence(ownership);
    return false;
  }
  const conversationType = normalizeGatewayType(
    stringField(record, "conversationType", "type"),
  );
  const threadType = normalizeGatewayType(
    stringField(record, "threadType", "thread_type"),
  );
  if (conversationType === "temp_session" || threadType === "temp_session") {
    return false;
  }
  if (record.tempSession || record.temp_session) {
    return false;
  }
  if (hasCustomerServiceSource(record)) return false;
  return conversationType === "direct" || conversationType === "group";
}

function rememberCustomerServiceOwnershipEvidence(
  ownership: ReturnType<typeof resolveConversationOwnership>,
) {
  if (!ownership.conversationId || !ownership.threadId || !ownership.threadType) return;
  rememberCustomerServiceConversationIndex({
    conversationId: ownership.conversationId,
    scopeKey: ownership.scopeKey,
    source: ownership.source,
    threadId: ownership.threadId,
    threadType: ownership.threadType,
  });
}

function hasCustomerServiceSource(record: Record<string, unknown>) {
  return [
    stringField(record, "source", "from", "channel", "sourceChannel", "entryChannel"),
    stringField(record, "owner", "domain", "module"),
  ]
    .map(normalizeGatewayType)
    .some((value) =>
      [
        "customer_service",
        "customer-service",
        "cs",
        "kefu",
        "temp_session",
      ].includes(value),
    );
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

function recordConversationListSourceDiagnostics(items: ConversationListItem[], scopeKey: string) {
  items
    .filter((item) => Boolean(item.lastMessage?.messageId || item.lastMessage?.sentAt))
    .map((item) => {
      const ownership = resolveConversationOwnership({
        payload: item as unknown as Record<string, unknown>,
        scopeKey,
        source: "imList",
      });
      return { item, ownership };
    })
    .sort((left, right) =>
      Date.parse(right.item.lastMessage?.sentAt ?? "") -
      Date.parse(left.item.lastMessage?.sentAt ?? ""),
    )
    .slice(0, 10)
    .forEach(({ item, ownership }) => {
      recordMessageSourceObserved({
        conversationId: item.conversationId,
        conversationSeq: item.lastMessageSeq,
        conversationType: item.conversationType,
        messageId: item.lastMessage?.messageId,
        messageType: item.lastMessage?.messageType,
        owner: ownership.owner === "customerService" ? "customerService" : "im",
        route: "im-conversation-list",
        serverSentAt: item.lastMessage?.sentAt,
        source: "messages-client",
        sourceChannel: "http-query",
        threadId: ownership.threadId,
        threadType: ownership.threadType,
        unreadCount: item.unreadCount,
      });
      recordMessageTraceEvent({
        conversationId: item.conversationId,
        conversationSeq: item.lastMessageSeq,
        conversationType: item.conversationType,
        messageId: item.lastMessage?.messageId,
        owner: ownership.owner === "customerService" ? "customerService" : "im",
        route: "im-conversation-list",
        serverSentAt: item.lastMessage?.sentAt,
        source: "messages-client",
        sourceChannel: "http-query",
        stage: "query.message.discovered",
        threadId: ownership.threadId,
      });
    });
}

function recordMessageDetailSourceDiagnostic(input: {
  conversationId: string;
  conversationType: "direct" | "group";
  messages: MessageItemDto[];
}) {
  const latest = latestMessage(input.messages);
  if (!latest) return;
  recordMessageSourceObserved({
    clientMsgId: latest.clientMsgId || latest.clientMessageId,
    conversationId: input.conversationId,
    conversationSeq: latest.conversationSeq,
    conversationType: input.conversationType,
    itemCount: input.messages.length,
    messageId: latest.messageId,
    messageType: latest.messageType,
    owner: "im",
    route: "im-message-detail",
    serverSentAt: latest.sentAt,
    source: "messages-client",
    sourceChannel: "http-query",
  });
  recordMessageTraceEvent({
    clientMsgId: latest.clientMsgId || latest.clientMessageId,
    conversationId: input.conversationId,
    conversationSeq: latest.conversationSeq,
    conversationType: input.conversationType,
    messageId: latest.messageId,
    owner: "im",
    route: "im-message-detail",
    serverSentAt: latest.sentAt,
    source: "messages-client",
    sourceChannel: "http-query",
    stage: "query.message.discovered",
  });
}

function latestMessage(messages: MessageItemDto[]) {
  return [...messages].sort((left, right) => {
    const seqDiff = (right.conversationSeq ?? -1) - (left.conversationSeq ?? -1);
    if (seqDiff !== 0) return seqDiff;
    return Date.parse(right.sentAt ?? "") - Date.parse(left.sentAt ?? "");
  })[0];
}

function readEnvelopeData(payload: unknown) {
  if (
    payload &&
    typeof payload === "object" &&
    !Array.isArray(payload) &&
    "data" in payload
  ) {
    return (payload as { data?: unknown }).data;
  }
  return payload;
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
