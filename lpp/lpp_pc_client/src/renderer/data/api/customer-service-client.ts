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
  StaffServiceHistoryItem,
  StaffServiceHistoryResponse,
} from "./types";
import { logApiContractDiagnostic } from "../api-contract/contract-diagnostics";
import {
  normalizeAiSuggestion,
  normalizeAiSuggestionsResponse,
} from "./ai-suggestion-normalizers";
import {
  customerProfileEntityToDto,
  customerServiceThreadEntityToDto,
  normalizeCustomerProfileDto,
  normalizeCustomerServiceThreadDto,
} from "../customer-service/cs-contract";
import {
  applyCustomerServiceThreadOverlay,
  customerServiceIndexScopeKey,
} from "../customer-service/cs-conversation-index";
import { recordCsRoutingDiagnostic } from "../customer-service/cs-routing-diagnostics";
import { recordMessageSourceObserved } from "../diagnostics/message-source-diagnostics";
import { recordMessageTraceEvent } from "../diagnostics/message-trace-diagnostics";
import {
  customerServiceMessageEntityToDto,
  normalizeCustomerServiceMessageDto,
} from "../customer-service/cs-message-contract";

export class CustomerServiceApiClient extends MessagesApiClient {
  getWorkbenchThreads() {
    if (this.shouldUseAdminConversationManagement()) {
      return this.getManagedCustomerServiceThreads();
    }
    return this.request<CustomerServiceThreadsResponse>(
      endpointPlan.customerServiceThreads,
    ).then((response) =>
      normalizeCustomerServiceThreadsResponse(
        response,
        customerServiceIndexScopeKey(apiClientIndexScopeInput(this.options)),
      ),
    );
  }

  private async getManagedCustomerServiceThreads() {
    const adminToken = await this.issueAdminToken();
    this.options.adminToken = adminToken;
    const search = new URLSearchParams({
      page: "1",
      pageSize: "50",
    });
    return this.request<AdminTempSessionsResponse>(
      `${endpointPlan.adminCustomerServiceTempSessions}?${search.toString()}`,
      {},
      true,
    ).then((response) =>
      normalizeCustomerServiceThreadsResponse(
        normalizeAdminTempSessionsResponse(response),
        customerServiceIndexScopeKey(apiClientIndexScopeInput(this.options)),
      ),
    );
  }

  private shouldUseAdminConversationManagement() {
    return (
      (this.options.membershipRole ?? 0) >= 3 &&
      Boolean(this.options.platformToken && this.options.tenantId)
    );
  }

  private async issueAdminToken() {
    const tenantId = this.options.tenantId?.trim();
    if (!tenantId) throw new Error("缺少租户 ID，无法签发管理端 Token");
    const cacheKey = adminTokenCacheKey({
      baseUrl: this.options.baseUrl,
      platformToken: this.options.platformToken,
      tenantId,
    });
    const cached = adminTokenCache.get(cacheKey);
    if (cached) return cached;
    const response = await this.platformRequest<AdminTokenIssueResponse>(
      endpointPlan.adminToken,
      {
        method: "POST",
        body: JSON.stringify({ tenantId }),
      },
    );
    const accessToken = readString(response.accessToken);
    if (!accessToken) throw new Error("管理端 Token 签发响应缺少 accessToken");
    adminTokenCache.set(cacheKey, accessToken);
    return accessToken;
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
    ).then(normalizeStaffServiceHistoryResponse);
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
    if (this.shouldUseAdminConversationManagement()) {
      return this.getManagedTempSessionDetail(threadId);
    }
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

  private async getManagedTempSessionDetail(sessionId: string) {
    const adminToken = await this.issueAdminToken();
    this.options.adminToken = adminToken;
    return this.request<AdminTempSessionDetailResponse>(
      endpointPlan.adminCustomerServiceTempSession.replace("{sessionId}", sessionId),
      {},
      true,
    ).then((detail) => normalizeAdminTempSessionDetail(detail, sessionId));
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
    return this.request<unknown>(
      endpointPlan.aiSuggestion
        .replace("{threadType}", aiSuggestionPathType(threadType))
        .replace("{threadId}", threadId),
      {
        method: "POST",
        body: JSON.stringify(
          customerMessageId ? { customerMessageId } : {},
        ),
      },
    ).then((payload) => normalizeAiSuggestion(payload) ?? emptyAiSuggestion());
  }

  getAiSuggestions(
    threadType: CustomerServiceThreadType,
    threadId: string,
    limit = 20,
  ) {
    return this.request<unknown>(
      `${endpointPlan.aiSuggestions
        .replace("{threadType}", aiSuggestionPathType(threadType))
        .replace("{threadId}", threadId)}?limit=${limit}`,
    ).then(normalizeAiSuggestionsResponse);
  }

  adoptAiSuggestion(suggestionId: string) {
    return this.request<unknown>(
      endpointPlan.aiSuggestionAdopt.replace("{suggestionId}", suggestionId),
      { method: "POST" },
    ).then((payload) => normalizeAiSuggestion(payload) ?? emptyAiSuggestion(suggestionId));
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

function emptyAiSuggestion(suggestionId = ""): AiSuggestionDto {
  return {
    suggestionId,
    sources: [],
    text: null,
  };
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

type AdminTokenIssueResponse = {
  accessToken?: string;
};

type AdminConversationManagementResponse =
  | CustomerServiceThreadsResponse
  | CustomerServiceThread[]
  | {
      activeItems?: unknown[];
      data?: unknown[];
      items?: unknown[];
      queueItems?: unknown[];
      threads?: unknown[];
    };

type AdminTempSessionsResponse = AdminConversationManagementResponse;

type AdminTempSessionDetailResponse = {
  session?: Record<string, unknown>;
  visitor?: Record<string, unknown>;
  messages?: MessageItemDto[];
};

const adminTokenCache = new Map<string, string>();

function normalizeCustomerServiceThreadsResponse(
  response: CustomerServiceThreadsResponse,
  scopeKey?: string,
): CustomerServiceThreadsResponse {
  recordCsRoutingDiagnostic({
    event: "pc-cs-workbench-threads",
    source: "customer-service-client",
    phase: "raw",
    route: "thread-list",
    classification: {
      active: response.activeItems?.length ?? 0,
      queue: response.queueItems?.length ?? 0,
    },
    summary: {
      activeItems: (response.activeItems ?? []).slice(0, 20),
      queueItems: (response.queueItems ?? []).slice(0, 20),
      summary: response.summary,
    },
  });
  const rawQueueItems = (response.queueItems ?? []);
  const rawActiveItems = (response.activeItems ?? []);
  const queueItems = rawQueueItems
    .filter(isCustomerServiceThreadSnapshot)
    .map((item) => normalizeCustomerServiceThreadFromContract(item, "pc-cs-workbench-threads"))
    .filter((item): item is CustomerServiceThread => Boolean(item))
    .map((item) => applyCustomerServiceThreadOverlay(item, scopeKey));
  const activeItems = rawActiveItems
    .filter(isCustomerServiceThreadSnapshot)
    .map((item) => normalizeCustomerServiceThreadFromContract(item, "pc-cs-workbench-threads"))
    .filter((item): item is CustomerServiceThread => Boolean(item))
    .map((item) => applyCustomerServiceThreadOverlay(item, scopeKey));
  recordCsRoutingDiagnostic({
    event: "pc-cs-workbench-threads",
    source: "customer-service-client",
    phase: "overlay",
    route: "thread-list",
    classification: {
      active: activeItems.length,
      droppedActive: rawActiveItems.length - activeItems.length,
      droppedQueue: rawQueueItems.length - queueItems.length,
      queue: queueItems.length,
    },
    summary: {
      activeItems: activeItems.slice(0, 20),
      queueItems: queueItems.slice(0, 20),
      summary: response.summary,
    },
  });
  recordWorkbenchSourceDiagnostics([...activeItems, ...queueItems]);
  return {
    ...response,
    activeItems,
    queueItems,
  };
}

function apiClientIndexScopeInput(options: {
  baseUrl?: string;
  platformUserId?: string;
  spaceType?: number;
  tenantId?: string;
  tenantToken?: string;
  userId?: string;
}) {
  return {
    apiBaseUrl: options.baseUrl,
    platformUserId: options.platformUserId,
    spaceType: options.spaceType,
    tenantId: options.tenantId,
    tenantToken: options.tenantToken,
    userId: options.userId,
  };
}

function isCustomerServiceThreadSnapshot(item: CustomerServiceThread | StaffServiceHistoryItem) {
  const record = item as unknown as Record<string, unknown>;
  const type = normalizeResponseWireType(
    readString(record.threadType) ||
      readString(record.thread_type) ||
      readString(record.conversationType) ||
      readString(record.conversation_type) ||
      readString(record.type),
  );
  if (type === "direct" || type === "group" || type === "im_group" || type === "group_chat") {
    return false;
  }
  if (type === "temp_session" || type === "im_direct") return true;
  if (asRecord(record.tempSession ?? record.temp_session)) return true;
  if (readString(record.sessionId) || readString(record.session_id)) return true;
  return Boolean(readString(record.threadId) || readString(record.thread_id));
}

function normalizeResponseWireType(value?: string | null) {
  return String(value ?? "").trim().toLowerCase().replace(/-/g, "_");
}

function normalizeStaffServiceHistoryResponse(
  response: StaffServiceHistoryResponse,
): StaffServiceHistoryResponse {
  const items = (response.items ?? []).filter(isCustomerServiceThreadSnapshot);
  recordCsRoutingDiagnostic({
    event: "pc-cs-service-history",
    source: "customer-service-client",
    phase: "filter",
    route: "service-history",
    classification: {
      dropped: (response.items ?? []).length - items.length,
      kept: items.length,
      total: response.items?.length ?? 0,
    },
    summary: {
      dropped: (response.items ?? [])
        .filter((item) => !isCustomerServiceThreadSnapshot(item))
        .slice(0, 20),
    },
  });
  return {
    ...response,
    items,
  };
}

function normalizeAdminTempSessionsResponse(
  response: AdminTempSessionsResponse,
): CustomerServiceThreadsResponse {
  const items = readAdminConversationItems(response)
    .map(adminTempSessionItemToCustomerServiceThread)
    .filter((item): item is CustomerServiceThread => Boolean(item));
  return {
    activeItems: items,
    queueItems: [],
    summary: {
      activeCount: 0,
      allCount: 0,
      queuedCount: 0,
      vipCount: 0,
    },
  };
}

function normalizeAdminTempSessionDetail(
  detail: AdminTempSessionDetailResponse,
  fallbackSessionId: string,
) {
  const session = asRecord(detail.session) ?? {};
  const visitor = asRecord(detail.visitor) ?? {};
  const thread = adminTempSessionItemToCustomerServiceThread({
    ...session,
    visitorName:
      readString(session.visitorName) ||
      readString(visitor.displayName) ||
      readString(visitor.visitorName),
  }) ?? {
    accessMode: "management_readonly" as const,
    conversationId: fallbackSessionId,
    status: "closed_timeout",
    threadId: fallbackSessionId,
    threadType: "temp_session" as const,
    title: "访客",
  };
  const rawMessages = readMessages(detail.messages) ?? [];
  const messages = normalizeCustomerServiceMessagesFromContract(rawMessages, {
    conversationId: thread.conversationId,
    threadId: thread.threadId,
    threadType: thread.threadType,
  });
  return {
    ...detail,
    ...thread,
    messages,
  };
}

function adminTempSessionItemToCustomerServiceThread(
  value: unknown,
): CustomerServiceThread | null {
  const item = asRecord(value);
  if (!item) return null;
  const threadId = readString(item.sessionId) || readString(item.threadId);
  const conversationId = readString(item.conversationId) || threadId;
  if (!threadId || !conversationId) return null;
  return {
    accessMode: "management_readonly",
    assignedAt: readString(item.assignedAt) || null,
    avatarUrl: readString(item.avatarUrl) ?? null,
    conversationId,
    customerAvatarUrl: readString(item.customerAvatarUrl) ?? null,
    lastMessageAt: readString(item.lastMessageAt) || readString(item.updatedAt) || null,
    lastMessagePreview: readString(item.lastMessagePreview),
    priority: readString(item.priority),
    source: readString(item.source),
    sourceChannel: readString(item.sourceChannel) || readString(item.channel),
    status: readString(item.status) || "closed_timeout",
    threadId,
    threadType: "temp_session",
    title:
      readString(item.visitorName) ||
      readString(item.title) ||
      readString(item.displayName) ||
      "访客",
    unreadCount: readNumber(item.unreadCount),
    updatedAt: readString(item.updatedAt) || readString(item.createdAt) || null,
  };
}

function readAdminConversationItems(response: AdminConversationManagementResponse) {
  if (Array.isArray(response)) return response;
  const record = asRecord(response);
  if (!record) return [];
  if (Array.isArray(record.items)) return record.items;
  if (Array.isArray(record.threads)) return record.threads;
  if (Array.isArray(record.data)) return record.data;
  if (Array.isArray(record.activeItems) || Array.isArray(record.queueItems)) {
    return [
      ...(Array.isArray(record.queueItems) ? record.queueItems : []),
      ...(Array.isArray(record.activeItems) ? record.activeItems : []),
    ];
  }
  return [];
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
  recordThreadDetailSourceDiagnostic({
    detail: normalizedDetail,
    latest,
    messageCount: messages.length,
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

function aiSuggestionPathType(threadType: CustomerServiceThreadType) {
  return threadType === "temp_session" ? "temp_session" : "im_direct";
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

function recordWorkbenchSourceDiagnostics(items: CustomerServiceThread[]) {
  items
    .filter((item) => Boolean(item.lastMessageAt || item.lastMessagePreview || item.unreadCount))
    .sort((left, right) =>
      Date.parse(right.lastMessageAt ?? right.updatedAt ?? "") -
      Date.parse(left.lastMessageAt ?? left.updatedAt ?? ""),
    )
    .slice(0, 10)
    .forEach((item) => {
      recordMessageSourceObserved({
        conversationId: item.conversationId,
        messageId: lastMessageId(item),
        messageType: undefined,
        owner: "customerService",
        route: "cs-workbench",
        serverSentAt: item.lastMessageAt ?? item.updatedAt ?? undefined,
        source: "customer-service-client",
        sourceChannel: "http-query",
        threadId: item.threadId,
        threadType: item.threadType,
        unreadCount: item.unreadCount,
      });
      recordMessageTraceEvent({
        conversationId: item.conversationId,
        messageId: lastMessageId(item),
        owner: "customerService",
        route: "cs-workbench",
        serverSentAt: item.lastMessageAt ?? item.updatedAt ?? undefined,
        source: "customer-service-client",
        sourceChannel: "http-query",
        stage: "query.message.discovered",
        threadId: item.threadId,
      });
    });
}

function recordThreadDetailSourceDiagnostic(input: {
  detail: CustomerServiceThreadDetailResponse & {
    conversationId: string;
    messages: MessageItemDto[];
    threadId: string;
    threadType: CustomerServiceThreadType;
  };
  latest?: MessageItemDto;
  messageCount: number;
}) {
  const latest = input.latest;
  if (!latest) return;
  recordMessageSourceObserved({
    clientMsgId: latest.clientMsgId || latest.clientMessageId,
    conversationId: input.detail.conversationId,
    conversationSeq: latest.conversationSeq,
    itemCount: input.messageCount,
    messageId: latest.messageId,
    messageType: latest.messageType,
    owner: "customerService",
    route: "cs-thread-detail",
    serverSentAt: latest.sentAt,
    source: "customer-service-client",
    sourceChannel: "http-query",
    threadId: input.detail.threadId,
    threadType: input.detail.threadType,
  });
  recordMessageTraceEvent({
    clientMsgId: latest.clientMsgId || latest.clientMessageId,
    conversationId: input.detail.conversationId,
    conversationSeq: latest.conversationSeq,
    messageId: latest.messageId,
    owner: "customerService",
    route: "cs-thread-detail",
    serverSentAt: latest.sentAt,
    source: "customer-service-client",
    sourceChannel: "http-query",
    stage: "query.message.discovered",
    threadId: input.detail.threadId,
  });
}

function lastMessageId(item: CustomerServiceThread) {
  const record = item as unknown as Record<string, unknown>;
  const value = record.lastMessageId ?? record.messageId;
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function readString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function readNumber(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value !== "string" || !value.trim()) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function adminTokenCacheKey(input: {
  baseUrl: string;
  platformToken?: string;
  tenantId: string;
}) {
  return `${input.baseUrl}|${input.tenantId}|${input.platformToken ?? ""}`;
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
