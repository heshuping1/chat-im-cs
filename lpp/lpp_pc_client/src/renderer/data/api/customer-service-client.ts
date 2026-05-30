import { endpointPlan } from "./endpoints";
import { MessagesApiClient } from "./messages-client";
import type {
  AiSuggestionDto,
  CustomerProfileCard,
  CustomerServiceThread,
  CustomerServiceThreadType,
  CustomerServiceThreadsResponse,
  MediaResourceDto,
  MessageItemDto,
  StaffReceptionStatusDto,
  StaffServiceHistoryResponse,
} from "./types";
import { logApiContractDiagnostic } from "../api-contract/contract-diagnostics";
import {
  customerProfileEntityToDto,
  customerServiceThreadEntityToDto,
  normalizeCustomerProfileDto,
  normalizeCustomerServiceThreadDto,
} from "../customer-service/cs-contract";
import {
  customerServiceMessageEntityToDto,
  normalizeCustomerServiceMessageDto,
} from "../customer-service/cs-message-contract";

export class CustomerServiceApiClient extends MessagesApiClient {
  getWorkbenchThreads() {
    return this.request<CustomerServiceThreadsResponse>(
      endpointPlan.customerServiceThreads,
    ).then(normalizeCustomerServiceThreadsResponse);
  }

  getStaffServiceHistory(params: {
    threadType?: CustomerServiceThreadType;
    status?: string | number;
    limit?: number;
    cursor?: string | null;
  } = {}) {
    const search = new URLSearchParams();
    if (params.threadType) search.set("threadType", params.threadType);
    if (params.status !== undefined) search.set("status", String(params.status));
    if (params.limit !== undefined) search.set("limit", String(params.limit));
    if (params.cursor) search.set("cursor", params.cursor);
    const query = search.toString();
    return this.request<StaffServiceHistoryResponse>(
      `${endpointPlan.staffServiceHistory}${query ? `?${query}` : ""}`,
    );
  }

  getReceptionStatus() {
    return this.request<StaffReceptionStatusDto>(
      endpointPlan.customerServiceReceptionStatus,
    );
  }

  updateReceptionStatus(params: {
    serviceStatus: StaffReceptionStatusDto["serviceStatus"];
    queueAcceptEnabled?: boolean;
    maxConcurrentSessions?: number;
  }) {
    return this.request<StaffReceptionStatusDto>(
      endpointPlan.customerServiceReceptionStatus,
      {
        method: "PUT",
        body: JSON.stringify({
          serviceStatus: params.serviceStatus,
          ...(params.queueAcceptEnabled !== undefined
            ? { queueAcceptEnabled: params.queueAcceptEnabled }
            : {}),
          ...(params.maxConcurrentSessions !== undefined
            ? { maxConcurrentSessions: params.maxConcurrentSessions }
            : {}),
        }),
      },
    );
  }

  getThreadProfileCard(
    threadType: CustomerServiceThreadType,
    threadId: string,
  ) {
    return this.request<CustomerProfileCard>(
      endpointPlan.threadProfileCard
        .replace("{threadType}", threadRoutePathType(threadType))
        .replace("{threadId}", threadId),
    ).then((profile) => normalizeCustomerProfileFromContract(profile, threadId));
  }

  getWorkbenchThreadDetail(
    threadType: CustomerServiceThreadType,
    threadId: string,
  ) {
    return this.request<CustomerServiceThreadDetailResponse>(
      endpointPlan.customerServiceThreadDetail
        .replace("{threadType}", threadRoutePathType(threadType))
        .replace("{threadId}", threadId),
    ).then((detail) =>
      normalizeWorkbenchThreadDetail(detail, {
        fallbackThreadId: threadId,
        fallbackThreadType: threadType,
      }),
    );
  }

  private sendWorkbenchMessage(
    threadType: CustomerServiceThreadType,
    threadId: string,
    messageType: "text" | "image" | "video" | "file",
    body: Record<string, unknown>,
    options: { clientMsgId?: string } = {},
  ) {
    return this.request<{
      threadType: CustomerServiceThreadType;
      threadId?: string;
      conversationId: string;
      messageId?: string;
      conversationSeq?: number;
      sentAt?: string;
      serverTime?: string;
      message?: MessageItemDto;
    }>(
      endpointPlan.customerServiceThreadMessages
        .replace("{threadType}", threadRoutePathType(threadType))
        .replace("{threadId}", threadId),
      {
        method: "POST",
        body: JSON.stringify({
          clientMsgId:
            options.clientMsgId ||
            `pc-cs-${Date.now()}-${Math.random().toString(16).slice(2)}`,
          messageType,
          body,
          replyToMessageId: null,
        }),
      },
    );
  }

  sendWorkbenchTextMessage(
    threadType: CustomerServiceThreadType,
    threadId: string,
    text: string,
    options: { clientMsgId?: string } = {},
  ) {
    return this.sendWorkbenchMessage(threadType, threadId, "text", { text }, options);
  }

  sendWorkbenchMediaMessage(
    threadType: CustomerServiceThreadType,
    threadId: string,
    messageType: "image" | "video" | "file",
    media: MediaResourceDto,
    options: { clientMsgId?: string } = {},
  ) {
    return this.sendWorkbenchMessage(threadType, threadId, messageType, {
      [messageType]: media,
    }, options);
  }

  claimCustomerServiceThread(
    threadType: CustomerServiceThreadType,
    threadId: string,
  ) {
    return this.customerServiceThreadAction(threadType, threadId, "claim");
  }

  takeoverCustomerServiceThread(
    threadType: CustomerServiceThreadType,
    threadId: string,
  ) {
    return this.customerServiceThreadAction(threadType, threadId, "takeover");
  }

  closeCustomerServiceThread(
    threadType: CustomerServiceThreadType,
    threadId: string,
  ) {
    return this.customerServiceThreadAction(threadType, threadId, "close");
  }

  generateAiSuggestion(
    threadType: CustomerServiceThreadType,
    threadId: string,
    customerMessageId?: string | null,
  ) {
    return this.request<AiSuggestionDto>(
      endpointPlan.aiSuggestion
        .replace("{threadType}", threadRoutePathType(threadType))
        .replace("{threadId}", threadId),
      {
        method: "POST",
        body: JSON.stringify(
          customerMessageId ? { customerMessageId } : {},
        ),
      },
    );
  }

  getAiSuggestions(
    threadType: CustomerServiceThreadType,
    threadId: string,
    limit = 20,
  ) {
    return this.request<{ items?: AiSuggestionDto[] } | AiSuggestionDto[]>(
      `${endpointPlan.aiSuggestions
        .replace("{threadType}", threadRoutePathType(threadType))
        .replace("{threadId}", threadId)}?limit=${limit}`,
    );
  }

  adoptAiSuggestion(suggestionId: string) {
    return this.request<AiSuggestionDto>(
      endpointPlan.aiSuggestionAdopt.replace("{suggestionId}", suggestionId),
      { method: "POST" },
    );
  }

  private customerServiceThreadAction(
    threadType: CustomerServiceThreadType,
    threadId: string,
    action: "claim" | "takeover" | "close",
  ) {
    return this.request<{
      threadType?: CustomerServiceThreadType;
      threadId?: string;
      conversationId?: string;
      status?: string;
      closed?: boolean;
    }>(
      endpointPlan.customerServiceThreadAction
        .replace("{threadActionType}", threadActionPathType(threadType))
        .replace("{threadId}", threadId)
        .replace("{action}", action),
      { method: "POST" },
    );
  }

}

type NestedThreadPayload = {
  messages?: MessageItemDto[];
  lastMessagePreview?: string | null;
  lastMessageAt?: string | null;
  updatedAt?: string | null;
  source?: string | null;
  from?: string | null;
  channel?: string | null;
  sourceChannel?: string | null;
  entryChannel?: string | null;
  platform?: string | null;
  provider?: string | null;
  customerDisplayName?: string | null;
  visitorDisplayName?: string | null;
  displayName?: string | null;
  title?: string | null;
  customerAvatarUrl?: string | null;
  visitorAvatarUrl?: string | null;
  avatarUrl?: string | null;
};

type CustomerServiceThreadDetailResponse = NestedThreadPayload & {
  threadType?: CustomerServiceThreadType | string;
  threadId?: string;
  conversationId?: string;
  status?: string;
  title?: string;
  avatarUrl?: string | null;
  source?: string;
  from?: string;
  channel?: string;
  sourceChannel?: string;
  entryChannel?: string;
  platform?: string;
  provider?: string;
  isVip?: boolean;
  tempSession?: NestedThreadPayload | null;
  temp_session?: NestedThreadPayload | null;
  directChat?: NestedThreadPayload | null;
  direct_chat?: NestedThreadPayload | null;
};

function normalizeCustomerServiceThreadsResponse(
  response: CustomerServiceThreadsResponse,
): CustomerServiceThreadsResponse {
  return {
    ...response,
    queueItems: (response.queueItems ?? [])
      .map((item) => normalizeCustomerServiceThreadFromContract(item, "pc-cs-workbench-threads"))
      .filter((item): item is CustomerServiceThread => Boolean(item)),
    activeItems: (response.activeItems ?? [])
      .map((item) => normalizeCustomerServiceThreadFromContract(item, "pc-cs-workbench-threads"))
      .filter((item): item is CustomerServiceThread => Boolean(item)),
  };
}

function normalizeCustomerServiceThreadFromContract(
  item: CustomerServiceThread,
  api: string,
): CustomerServiceThread | null {
  const result = normalizeCustomerServiceThreadDto(item);
  logApiContractDiagnostic({
    api,
    phase: "normalize",
    status: result.status,
    issues: result.issues,
    context: {
      conversationId: result.data?.conversationId ?? item.conversationId,
      threadId: result.data?.id ?? item.threadId,
      itemCount: 1,
    },
    error: result.error,
  });
  return result.data ? customerServiceThreadEntityToDto(result.data, item) : null;
}

function normalizeCustomerProfileFromContract(
  profile: CustomerProfileCard,
  threadId: string,
): CustomerProfileCard {
  const result = normalizeCustomerProfileDto(profile);
  logApiContractDiagnostic({
    api: "pc-cs-thread-profile",
    phase: "normalize",
    status: result.status,
    issues: result.issues,
    context: { threadId },
    error: result.error,
  });
  return result.data ? customerProfileEntityToDto(result.data, profile) : profile;
}

function normalizeWorkbenchThreadDetail(
  detail: CustomerServiceThreadDetailResponse,
  options: {
    fallbackThreadId: string;
    fallbackThreadType: CustomerServiceThreadType;
  },
) {
  const tempSession = asRecord(detail.tempSession ?? detail.temp_session);
  const directChat = asRecord(detail.directChat ?? detail.direct_chat);
  const nested = asNestedPayload(tempSession) ?? asNestedPayload(directChat);
  const threadType = normalizeResponseThreadType(detail.threadType || options.fallbackThreadType);
  const threadId = detail.threadId || options.fallbackThreadId;
  const conversationId = detail.conversationId || detail.threadId || options.fallbackThreadId;
  const rawMessages = readMessages(detail.messages) ?? readMessages(nested?.messages) ?? [];
  const messages = normalizeCustomerServiceMessagesFromContract(rawMessages, {
    conversationId,
    threadId,
    threadType,
  });
  const latest = latestMessage(messages);
  const sourceRecord = nested ?? {};

  const normalizedDetail = {
    ...detail,
    threadType,
    threadId,
    conversationId,
    title:
      readString(detail.title) ||
      readString(sourceRecord.title) ||
      readString(sourceRecord.customerDisplayName) ||
      readString(sourceRecord.visitorDisplayName) ||
      readString(sourceRecord.displayName),
    avatarUrl:
      readString(detail.avatarUrl) ||
      readString(sourceRecord.customerAvatarUrl) ||
      readString(sourceRecord.visitorAvatarUrl) ||
      readString(sourceRecord.avatarUrl) ||
      null,
    source:
      readString(detail.source) ||
      readString(sourceRecord.source) ||
      readString(sourceRecord.from) ||
      undefined,
    from: readString(detail.from) || readString(sourceRecord.from) || undefined,
    channel: readString(detail.channel) || readString(sourceRecord.channel) || undefined,
    sourceChannel:
      readString(detail.sourceChannel) ||
      readString(sourceRecord.sourceChannel) ||
      readString(sourceRecord.channel) ||
      undefined,
    entryChannel:
      readString(detail.entryChannel) ||
      readString(sourceRecord.entryChannel) ||
      undefined,
    platform:
      readString(detail.platform) ||
      readString(sourceRecord.platform) ||
      readString(sourceRecord.provider) ||
      undefined,
    provider:
      readString(detail.provider) ||
      readString(sourceRecord.provider) ||
      undefined,
    lastMessagePreview:
      readString(detail.lastMessagePreview) ||
      readString(sourceRecord.lastMessagePreview) ||
      latest?.preview ||
      previewFromMessage(latest),
    lastMessageAt:
      readString(detail.lastMessageAt) ||
      readString(sourceRecord.lastMessageAt) ||
      latest?.sentAt ||
      readString(detail.updatedAt) ||
      readString(sourceRecord.updatedAt),
    messages,
  };
  const result = normalizeCustomerServiceThreadDto(normalizedDetail);
  logApiContractDiagnostic({
    api: "pc-cs-thread-detail",
    phase: "normalize",
    status: result.status,
    issues: result.issues,
    context: {
      conversationId: result.data?.conversationId ?? normalizedDetail.conversationId,
      threadId: result.data?.id ?? normalizedDetail.threadId,
      itemCount: messages.length,
    },
    error: result.error,
  });
  return result.data
    ? {
        ...normalizedDetail,
        ...customerServiceThreadEntityToDto(result.data, normalizedDetail),
      }
    : normalizedDetail;
}

function normalizeCustomerServiceMessagesFromContract(
  messages: MessageItemDto[],
  options: {
    conversationId: string;
    threadId: string;
    threadType: CustomerServiceThreadType;
  },
) {
  return messages
    .map((message, index) => {
      const result = normalizeCustomerServiceMessageDto(message, {
        threadId: options.threadId,
        threadType: options.threadType,
        fallbackConversationId: options.conversationId,
        fallbackMessageId: `${options.threadId}:message:${index}`,
      });
      logApiContractDiagnostic({
        api: "pc-cs-thread-messages",
        phase: "normalize",
        status: result.status,
        issues: result.issues,
        context: {
          conversationId: result.data?.conversation.conversationId ?? options.conversationId,
          threadId: options.threadId,
          itemCount: 1,
        },
        error: result.error,
      });
      return result.data ? customerServiceMessageEntityToDto(result.data, message) : message;
    });
}

function threadRoutePathType(threadType: CustomerServiceThreadType) {
  return threadType === "temp_session" ? "temp-session" : "direct-customer";
}

function threadActionPathType(threadType: CustomerServiceThreadType) {
  return threadRoutePathType(threadType);
}

function normalizeResponseThreadType(value?: string | null): CustomerServiceThreadType {
  return String(value ?? "").trim().toLowerCase().replace(/-/g, "_") === "temp_session"
    ? "temp_session"
    : "im_direct";
}

function asRecord(value: unknown) {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : undefined;
}

function asNestedPayload(value?: Record<string, unknown>): NestedThreadPayload | undefined {
  return value as NestedThreadPayload | undefined;
}

function readMessages(value: unknown) {
  return Array.isArray(value) ? (value as MessageItemDto[]) : undefined;
}

function latestMessage(messages: MessageItemDto[]) {
  return [...messages].sort((a, b) => {
    const seqA = a.conversationSeq ?? 0;
    const seqB = b.conversationSeq ?? 0;
    if (seqA !== seqB) return seqB - seqA;
    return Date.parse(b.sentAt ?? "") - Date.parse(a.sentAt ?? "");
  })[0];
}

function readString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function previewFromMessage(message?: MessageItemDto) {
  if (!message) return undefined;
  if (message.preview?.trim()) return message.preview.trim();
  const body = message.body ?? {};
  const text = body.text;
  if (typeof text === "string" && text.trim()) return text.trim();
  const type = String(message.messageType ?? body.messageType ?? "").toLowerCase();
  if (type === "image" || body.image) return "[图片]";
  if (type === "file" || body.file) return "[文件]";
  if (type === "voice" || body.voice) return "[语音]";
  if (type === "video" || body.video) return "[视频]";
  return "[消息]";
}
