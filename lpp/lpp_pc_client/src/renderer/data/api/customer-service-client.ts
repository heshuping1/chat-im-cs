import { endpointPlan } from "./endpoints";
import { MessagesApiClient } from "./messages-client";
import { ApiError, deriveAdminApiBaseUrl } from "./base";
import type {
  AiSuggestionDto,
  CustomerServiceExportType,
  CustomerServiceMonitorDashboardDto,
  CustomerServiceMonitorThreadsResponse,
  CustomerServiceReadStatusDto,
  CustomerServiceSlaDashboardDto,
  CustomerServiceStaffStatusDto,
  CustomerProfileCard,
  CreateCustomerServiceSessionNoteRequest,
  CustomerServiceSessionNoteDto,
  CustomerServiceThread,
  CustomerServiceThreadType,
  CustomerServiceThreadsResponse,
  ExportTaskDownloadResult,
  ExportTaskDto,
  MediaResourceDto,
  MessageItemDto,
  StaffReceptionStatusDto,
  StaffServiceHistoryResponse,
  TempSessionStatsDto,
  WorkbenchSummary,
} from "./types";
import { getAppInstanceHeaders } from "../app-instance/app-instance";
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
import { staffServiceHistoryItemToThread } from "../customer-service/cs-history-model";
import { normalizeStaffServiceHistoryResponse } from "../customer-service/cs-history-response";
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

  async getTempSessionStats(params: { from?: string; to?: string } = {}) {
    const adminToken = await this.issueAdminToken();
    this.options.adminToken = adminToken;
    const search = new URLSearchParams();
    appendOptionalSearchParams(search, params, ["from", "to"]);
    const query = search.toString();
    return this.request<TempSessionStatsDto>(
      `${endpointPlan.adminCustomerServiceTempSessionStats}${query ? `?${query}` : ""}`,
      {},
      true,
    );
  }

  async getCustomerServiceMonitorDashboard() {
    const adminToken = await this.issueAdminToken();
    this.options.adminToken = adminToken;
    return this.request<CustomerServiceMonitorDashboardDto>(
      endpointPlan.adminCustomerServiceCenterDashboard,
      {},
      true,
    );
  }

  async getCustomerServiceMonitorStaffStatuses() {
    const adminToken = await this.issueAdminToken();
    this.options.adminToken = adminToken;
    return this.request<CustomerServiceStaffStatusDto[]>(
      endpointPlan.adminCustomerServiceCenterStaffStatuses,
      {},
      true,
    );
  }

  async getCustomerServiceMonitorSlaDashboard() {
    const adminToken = await this.issueAdminToken();
    this.options.adminToken = adminToken;
    return this.request<CustomerServiceSlaDashboardDto>(
      endpointPlan.adminCustomerServiceCenterSlaDashboard,
      {},
      true,
    );
  }

  async getCustomerServiceMonitorThreads(params: {
    assignedStaffUserId?: string;
    keyword?: string;
    pageSize?: number;
    slaRisk?: string;
    status?: string;
    threadType?: CustomerServiceThreadType;
  } = {}): Promise<CustomerServiceMonitorThreadsResponse> {
    const adminToken = await this.issueAdminToken();
    this.options.adminToken = adminToken;
    const fetchStatus = async (status?: string) => {
      const search = new URLSearchParams({
        page: "1",
        pageSize: String(params.pageSize ?? 50),
      });
      appendOptionalSearchParams(search, params, [
        "assignedStaffUserId",
        "keyword",
        "slaRisk",
      ]);
      if (status) search.set("status", status);
      appendOptionalSearchParams(search, params, ["threadType"]);
      const response = await this.request<AdminConversationManagementResponse>(
        `${endpointPlan.adminCustomerServiceCenterThreads}?${search.toString()}`,
        {},
        true,
      );
      return normalizeCustomerServiceThreadsResponse(
        normalizeAdminCenterThreadsResponse(response),
        customerServiceIndexScopeKey(apiClientIndexScopeInput(this.options)),
      );
    };
    const normalized = await fetchStatus(params.status);
    return {
      items: [...normalized.queueItems, ...normalized.activeItems],
      nextCursor: null,
      summary: normalized.summary,
    };
  }

  async getCustomerServiceMonitorThreadDetail(
    threadType: CustomerServiceThreadType,
    threadId: string,
  ) {
    const adminToken = await this.issueAdminToken();
    this.options.adminToken = adminToken;
    return this.request<CustomerServiceThreadDetailResponse>(
      endpointPlan.adminCustomerServiceCenterThread
        .replace("{threadType}", threadType)
        .replace("{threadId}", threadId),
      {},
      true,
    ).then((detail) => ({
      ...normalizeWorkbenchThreadDetail(detail, {
        fallbackThreadId: threadId,
        fallbackThreadType: threadType,
      }),
      accessMode: "management_readonly" as const,
    }));
  }

  private shouldUseAdminConversationManagement() {
    return (
      isTenantAdminOrOwner(this.options.membershipRole) &&
      Boolean(this.options.platformToken && this.options.tenantId)
    );
  }

  private async issueAdminToken() {
    const tenantId = this.options.tenantId?.trim();
    if (!tenantId) throw new Error("Missing tenant ID. Cannot issue admin token.");
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
    if (!accessToken) throw new Error("Admin token issue response is missing accessToken.");
    adminTokenCache.set(cacheKey, accessToken);
    return accessToken;
  }

  getStaffServiceHistory(params: {
    threadType?: CustomerServiceThreadType;
    status?: string | number;
    limit?: number;
    cursor?: string | null;
    from?: string;
    to?: string;
    customerId?: string;
    customerUserId?: string;
    visitorUserId?: string;
    keyword?: string;
    assignedStaffUserId?: string;
    staffUserId?: string;
    locale?: string;
    conversationId?: string;
    senderUserId?: string;
    sourcePlatform?: string;
    sourceChannel?: string;
    country?: string;
    region?: string;
    rating?: string | number;
    minRating?: string | number;
    maxRating?: string | number;
    minRiskLevel?: string | number;
    slaRisk?: string;
  } = {}) {
    const search = new URLSearchParams();
    if (params.threadType) search.set("threadType", params.threadType);
    if (params.status !== undefined) search.set("status", String(params.status));
    if (params.limit !== undefined) search.set("limit", String(params.limit));
    if (params.cursor) search.set("cursor", params.cursor);
    appendOptionalSearchParams(search, params, [
      "from",
      "to",
      "customerId",
      "customerUserId",
      "visitorUserId",
      "keyword",
      "assignedStaffUserId",
      "staffUserId",
      "locale",
      "conversationId",
      "senderUserId",
      "sourcePlatform",
      "sourceChannel",
      "country",
      "region",
      "minRating",
      "maxRating",
      "minRiskLevel",
      "slaRisk",
    ]);
    const query = search.toString();
    return this.request<StaffServiceHistoryResponse>(
      `${endpointPlan.staffServiceHistory}${query ? `?${query}` : ""}`,
    ).then((response) =>
      normalizeStaffServiceHistoryResponse(
        response,
        customerServiceIndexScopeKey(apiClientIndexScopeInput(this.options)),
      ),
    );
  }

  async getCustomerServiceHistoryThreads(params: {
    threadType?: CustomerServiceThreadType;
    status?: string | number;
    limit?: number;
    cursor?: string | null;
    from?: string;
    to?: string;
    customerId?: string;
    customerUserId?: string;
    visitorUserId?: string;
    keyword?: string;
    assignedStaffUserId?: string;
    staffUserId?: string;
    locale?: string;
    conversationId?: string;
    senderUserId?: string;
    sourcePlatform?: string;
    sourceChannel?: string;
    country?: string;
    region?: string;
    rating?: string | number;
    minRating?: string | number;
    maxRating?: string | number;
    minRiskLevel?: string | number;
    slaRisk?: string;
  } = {}) {
    if (!this.shouldUseAdminConversationManagement()) {
      const history = await this.getStaffServiceHistory(params);
      return {
        items: history.items.map(staffServiceHistoryItemToThread),
        nextCursor: history.nextCursor,
        summary: history.summary,
      };
    }

    const adminHistory = await this.getAdminCustomerServiceHistory(params);
    if (adminHistory) return adminHistory;

    return {
      items: [],
      nextCursor: null,
    };
  }

  private async getAdminCustomerServiceHistory(params: {
    threadType?: CustomerServiceThreadType;
    status?: string | number;
    limit?: number;
    cursor?: string | null;
    from?: string;
    to?: string;
    customerId?: string;
    customerUserId?: string;
    visitorUserId?: string;
    keyword?: string;
    assignedStaffUserId?: string;
    staffUserId?: string;
    locale?: string;
    conversationId?: string;
    senderUserId?: string;
    sourcePlatform?: string;
    sourceChannel?: string;
    country?: string;
    region?: string;
    rating?: string | number;
    minRating?: string | number;
    maxRating?: string | number;
    minRiskLevel?: string | number;
    slaRisk?: string;
  }) {
    const adminToken = await this.issueAdminToken();
    this.options.adminToken = adminToken;
    const search = new URLSearchParams();
    if (params.threadType) search.set("threadType", params.threadType);
    if (params.status !== undefined) search.set("status", String(params.status));
    if (params.limit !== undefined) search.set("limit", String(params.limit));
    if (params.cursor) search.set("cursor", params.cursor);
    if (params.cursor) search.set("includeSummary", "false");
    appendOptionalSearchParams(search, params, [
      "from",
      "to",
      "customerId",
      "customerUserId",
      "visitorUserId",
      "keyword",
      "locale",
      "staffUserId",
      "sourcePlatform",
      "sourceChannel",
      "country",
      "region",
      "minRating",
      "maxRating",
      "minRiskLevel",
    ]);
    const query = search.toString();
    const response = await this.request<StaffServiceHistoryResponse>(
      `${endpointPlan.adminCustomerServiceCenterHistorySessions}${query ? `?${query}` : ""}`,
      {},
      true,
    );
    const history = normalizeStaffServiceHistoryResponse(
      response,
      customerServiceIndexScopeKey(apiClientIndexScopeInput(this.options)),
    );
    return {
      items: history.items.map(staffServiceHistoryItemToThread),
      nextCursor: history.nextCursor,
      summary: history.summary,
    };
  }

  private async getAdminCustomerServiceRealtimeThreads(
    params: {
      threadType?: CustomerServiceThreadType;
      status?: string | number;
      limit?: number;
      keyword?: string;
      assignedStaffUserId?: string;
      locale?: string;
    },
    status: "queued" | "active",
  ) {
    const search = new URLSearchParams({
      page: "1",
      pageSize: String(params.limit ?? 50),
      status,
    });
    if (params.threadType) search.set("threadType", params.threadType);
    appendOptionalSearchParams(search, params, [
      "keyword",
      "assignedStaffUserId",
      "locale",
    ]);
    const response = await this.request<AdminConversationManagementResponse>(
      `${endpointPlan.adminCustomerServiceCenterThreads}?${search.toString()}`,
      {},
      true,
    );
    const normalized = normalizeCustomerServiceThreadsResponse(
      normalizeAdminCenterThreadsResponse(response),
      customerServiceIndexScopeKey(apiClientIndexScopeInput(this.options)),
    );
    return {
      items: [...normalized.queueItems, ...normalized.activeItems],
      nextCursor: null,
      summary: normalized.summary,
    };
  }

  async createCustomerServiceExportTask(params: {
    exportType: CustomerServiceExportType;
    filters: Record<string, unknown>;
  }) {
    const adminToken = await this.issueAdminToken();
    this.options.adminToken = adminToken;
    return this.request<ExportTaskDto>(
      endpointPlan.adminExportTasks,
      {
        method: "POST",
        body: JSON.stringify(params),
      },
      true,
    );
  }

  async getCustomerServiceExportTasks(params: {
    exportType?: CustomerServiceExportType;
  } = {}) {
    const adminToken = await this.issueAdminToken();
    this.options.adminToken = adminToken;
    const response = await this.request<ExportTaskDto[] | { items?: ExportTaskDto[] }>(
      endpointPlan.adminExportTasks,
      {},
      true,
    );
    const items = Array.isArray(response) ? response : response.items ?? [];
    return params.exportType
      ? items.filter((item) => item.exportType === params.exportType)
      : items;
  }

  async downloadCustomerServiceExportTask(taskId: string): Promise<ExportTaskDownloadResult> {
    const adminToken = await this.issueAdminToken();
    this.options.adminToken = adminToken;
    const path = `${endpointPlan.adminExportTasks}/${encodeURIComponent(taskId)}/download`;
    const headers = new Headers();
    headers.set("X-Client-Trace-Id", this.options.traceId);
    Object.entries(await getAppInstanceHeaders()).forEach(([key, value]) => {
      headers.set(key, value);
    });
    if (this.options.tenantId) {
      headers.set("X-Tenant-Id", this.options.tenantId);
    }
    headers.set("Authorization", `Bearer ${adminToken}`);
    const baseUrl =
      this.options.adminBaseUrl?.trim() || deriveAdminApiBaseUrl(this.options.baseUrl);
    const response = await fetch(`${baseUrl}${path}`, {
      credentials: "omit",
      headers,
    });
    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as {
        code?: string;
        message?: string;
        requestId?: string;
      } | null;
      throw new ApiError(
        payload?.message ?? `HTTP ${response.status} ${path}`,
        payload?.code,
        payload?.requestId,
        response.status,
      );
    }
    return {
      blob: await response.blob(),
      fileName:
        exportFileNameFromDisposition(response.headers.get("content-disposition")) ||
        `customer-service-export-${taskId}.csv`,
    };
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

  async forceCloseCustomerServiceThread(
    threadType: CustomerServiceThreadType,
    threadId: string,
  ) {
    const adminToken = await this.issueAdminToken();
    this.options.adminToken = adminToken;
    return this.request<{
      threadType?: CustomerServiceThreadType;
      threadId?: string;
      status?: string;
      closed?: boolean;
    }>(
      endpointPlan.adminCustomerServiceCenterThreadForceClose
        .replace("{threadType}", threadType)
        .replace("{threadId}", encodeURIComponent(threadId)),
      { method: "POST" },
      true,
    );
  }

  recallCustomerServiceMessage(messageId: string) {
    return this.request<{ messageId?: string; silent?: boolean }>(
      endpointPlan.messageRecallSilent.replace("{messageId}", messageId),
      { method: "POST" },
    );
  }

  transferCustomerServiceThread(
    threadType: CustomerServiceThreadType,
    threadId: string,
    payload: { reason?: string; toStaffUserId: string },
  ) {
    const reason = payload.reason?.trim();
    return this.request<{
      status?: string;
      threadId?: string;
      transferred?: boolean;
      transferredAt?: string;
    }>(
      transferEndpoint(threadType).replace(
        threadType === "temp_session" ? "{sessionId}" : "{threadId}",
        encodeURIComponent(threadId),
      ),
      {
        method: "POST",
        body: JSON.stringify({
          toStaffUserId: payload.toStaffUserId,
          ...(reason ? { reason } : {}),
        }),
      },
    );
  }

  async assignCustomerServiceThread(
    threadType: CustomerServiceThreadType,
    threadId: string,
    payload: { staffUserId: string },
  ) {
    const adminToken = await this.issueAdminToken();
    this.options.adminToken = adminToken;
    return this.request<{
      threadType?: CustomerServiceThreadType;
      threadId?: string;
      status?: string;
      assignedStaffUserId?: string | null;
    }>(
      endpointPlan.adminCustomerServiceCenterThreadAssign
        .replace("{threadType}", threadType)
        .replace("{threadId}", encodeURIComponent(threadId)),
      {
        method: "POST",
        body: JSON.stringify({ staffUserId: payload.staffUserId }),
      },
      true,
    );
  }

  getTempSessionNotes(sessionId: string) {
    return this.request<unknown>(
      endpointPlan.customerServiceTempSessionNotes.replace(
        "{sessionId}",
        encodeURIComponent(sessionId),
      ),
    ).then(normalizeCustomerServiceSessionNotes);
  }

  createTempSessionNote(
    sessionId: string,
    payload: CreateCustomerServiceSessionNoteRequest,
  ) {
    const content = normalizeSessionNoteContent(payload.content);
    return this.request<unknown>(
      endpointPlan.customerServiceTempSessionNotes.replace(
        "{sessionId}",
        encodeURIComponent(sessionId),
      ),
      {
        method: "POST",
        body: JSON.stringify({
          content,
          isPinned: Boolean(payload.isPinned),
        }),
      },
    ).then(normalizeCustomerServiceSessionNote);
  }

  setTempSessionNotePinned(
    sessionId: string,
    noteId: string,
    pinned: boolean,
  ) {
    return this.request<unknown>(
      endpointPlan.customerServiceTempSessionNotePin
        .replace("{sessionId}", encodeURIComponent(sessionId))
        .replace("{noteId}", encodeURIComponent(noteId)),
      {
        method: "PUT",
        body: JSON.stringify({ pinned }),
      },
    ).then(normalizeCustomerServiceSessionNote);
  }

  deleteTempSessionNote(sessionId: string, noteId: string) {
    return this.request<void>(
      endpointPlan.customerServiceTempSessionNote
        .replace("{sessionId}", encodeURIComponent(sessionId))
        .replace("{noteId}", encodeURIComponent(noteId)),
      { method: "DELETE" },
    );
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
  notes?: unknown;
  readStatus?: unknown;
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
  notes?: unknown;
  readStatus?: unknown;
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

function isCustomerServiceThreadSnapshot(item: CustomerServiceThread) {
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

function normalizeAdminCenterThreadsResponse(
  response: AdminConversationManagementResponse,
): CustomerServiceThreadsResponse {
  const allItems = readAdminConversationItems(response)
    .map(adminCenterThreadItemToCustomerServiceThread)
    .filter((item): item is CustomerServiceThread => Boolean(item));
  const queueItems = allItems.filter((item) => isQueuedThreadStatus(item.status));
  const activeItems = allItems.filter((item) => !isQueuedThreadStatus(item.status));
  return {
    activeItems,
    queueItems,
    summary: readAdminThreadSummary(response, {
      activeItems,
      queueItems,
    }),
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
      "Visitor",
    unreadCount: readNumber(item.unreadCount),
    updatedAt: readString(item.updatedAt) || readString(item.createdAt) || null,
  };
}

function adminCenterThreadItemToCustomerServiceThread(
  value: unknown,
): CustomerServiceThread | null {
  const item = asRecord(value);
  if (!item) return null;
  const threadType = normalizeResponseThreadType(
    readString(item.threadType) ||
      readString(item.thread_type) ||
      readString(item.type),
  );
  const threadId =
    readString(item.threadId) ||
    readString(item.thread_id) ||
    readString(item.sessionId) ||
    readString(item.session_id) ||
    readString(item.id);
  const conversationId =
    readString(item.conversationId) ||
    readString(item.conversation_id) ||
    threadId;
  if (!threadId || !conversationId) return null;
  return {
    accessMode: "management_readonly",
    assignedAt: readString(item.assignedAt) || readString(item.acceptedAt) || null,
    avatarUrl: readString(item.avatarUrl) ?? null,
    conversationId,
    customerAvatarUrl:
      readString(item.customerAvatarUrl) ||
      readString(item.visitorAvatarUrl) ||
      null,
    lastMessageAt:
      readString(item.lastMessageAt) ||
      readString(item.updatedAt) ||
      readString(item.last_message_at) ||
      null,
    lastMessagePreview:
      readString(item.lastMessagePreview) ||
      readString(item.preview) ||
      readString(item.lastMessage),
    priority: readString(item.priority) || readString(item.riskLevel),
    source: readString(item.source) || readString(item.sourcePlatform),
    sourceChannel:
      readString(item.sourceChannel) ||
      readString(item.channel) ||
      readString(item.entryChannel),
    status: readString(item.status) || "active",
    threadId,
    threadType,
    title:
      readString(item.title) ||
      readString(item.customerName) ||
      readString(item.customerDisplayName) ||
      readString(item.visitorName) ||
      readString(item.displayName) ||
      "Visitor",
    unreadCount: readNumber(item.unreadCount),
    updatedAt: readString(item.updatedAt) || readString(item.createdAt) || null,
  };
}

function readAdminThreadSummary(
  response: AdminConversationManagementResponse,
  fallback: {
    activeItems: CustomerServiceThread[];
    queueItems: CustomerServiceThread[];
  },
): WorkbenchSummary {
  const record = asRecord(response);
  const summary = asRecord(record?.summary);
  const allItems = [...fallback.queueItems, ...fallback.activeItems];
  return {
    activeCount:
      readNumber(summary?.activeCount) ??
      fallback.activeItems.filter((item) => !isClosedThreadStatus(item.status)).length,
    allCount: readNumber(summary?.allCount) ?? allItems.length,
    queuedCount: readNumber(summary?.queuedCount) ?? fallback.queueItems.length,
    vipCount:
      readNumber(summary?.vipCount) ??
      allItems.filter((item) => item.isVip || item.priority === "vip").length,
  };
}

function isQueuedThreadStatus(status?: string | null) {
  const normalized = normalizeResponseWireType(status);
  return normalized === "queued" || normalized === "queueing" || normalized === "waiting";
}

function isClosedThreadStatus(status?: string | null) {
  const normalized = normalizeResponseWireType(status);
  return normalized.startsWith("closed") || normalized === "ended" || normalized === "archived";
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

function readResponseCursor(response: unknown) {
  const record = asRecord(response);
  if (!record) return null;
  return (
    readString(record.nextCursor) ||
    readString(record.next_cursor) ||
    readString(record.cursor) ||
    null
  );
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

function normalizeCustomerServiceSessionNotes(
  payload: unknown,
): CustomerServiceSessionNoteDto[] {
  const record = asRecord(payload);
  const items = Array.isArray(payload)
    ? payload
    : Array.isArray(record?.items)
      ? record.items
      : Array.isArray(record?.notes)
        ? record.notes
        : Array.isArray(record?.data)
          ? record.data
          : [];
  return items
    .map(normalizeCustomerServiceSessionNoteRecord)
    .filter((note): note is CustomerServiceSessionNoteDto => Boolean(note))
    .sort(compareCustomerServiceSessionNotes);
}

function normalizeCustomerServiceSessionNote(
  payload: unknown,
): CustomerServiceSessionNoteDto {
  const record = asRecord(payload);
  const note =
    normalizeCustomerServiceSessionNoteRecord(payload) ??
    normalizeCustomerServiceSessionNoteRecord(record?.note) ??
    normalizeCustomerServiceSessionNoteRecord(record?.data);
  if (!note) {
    throw new Error("Customer service session note response is missing noteId or content.");
  }
  return note;
}

function normalizeCustomerServiceSessionNoteRecord(
  payload: unknown,
): CustomerServiceSessionNoteDto | null {
  const record = asRecord(payload);
  if (!record) return null;
  const noteId =
    readString(record.noteId) ||
    readString(record.note_id) ||
    readString(record.id);
  const content = readString(record.content);
  if (!noteId || !content) return null;
  return {
    noteId,
    staffDisplayName:
      readString(record.staffDisplayName) ||
      readString(record.staff_display_name) ||
      readString(record.createdByDisplayName) ||
      readString(record.creatorDisplayName) ||
      "",
    content,
    isPinned:
      readBoolean(record.isPinned) ??
      readBoolean(record.is_pinned) ??
      readBoolean(record.pinned) ??
      false,
    createdAt:
      readString(record.createdAt) ||
      readString(record.created_at) ||
      null,
  };
}

function normalizeCustomerServiceReadStatus(
  payload: unknown,
): CustomerServiceReadStatusDto | null {
  const record = asRecord(payload);
  if (!record) return null;
  const rawMembers = Array.isArray(record.members) ? record.members : [];
  const members: CustomerServiceReadStatusDto["members"] = rawMembers
    .flatMap((item) => {
      const member = asRecord(item);
      const userId =
        readString(member?.userId) ||
        readString(member?.user_id) ||
        readString(member?.memberUserId) ||
        readString(member?.member_user_id);
      if (!userId) return [];
      return [{
        userId,
        lastReadSeq:
          readNumber(member?.lastReadSeq) ??
          readNumber(member?.last_read_seq) ??
          0,
        lastReadAt:
          readString(member?.lastReadAt) ||
          readString(member?.last_read_at) ||
          null,
      }];
    });
  if (members.length === 0) return null;
  return {
    sessionId:
      readString(record.sessionId) ||
      readString(record.session_id),
    conversationId:
      readString(record.conversationId) ||
      readString(record.conversation_id),
    visitorUserId:
      readString(record.visitorUserId) ||
      readString(record.visitor_user_id),
    members,
  };
}

function normalizeSessionNoteContent(content: string) {
  const normalized = content.trim();
  if (!normalized) {
    throw new Error("Customer service session note content is required.");
  }
  if (normalized.length > 2000) {
    throw new Error("Customer service session note content cannot exceed 2000 characters.");
  }
  return normalized;
}

function compareCustomerServiceSessionNotes(
  left: CustomerServiceSessionNoteDto,
  right: CustomerServiceSessionNoteDto,
) {
  if (Boolean(left.isPinned) !== Boolean(right.isPinned)) {
    return left.isPinned ? -1 : 1;
  }
  const rightTime = Date.parse(right.createdAt ?? "");
  const leftTime = Date.parse(left.createdAt ?? "");
  return (Number.isFinite(rightTime) ? rightTime : 0) -
    (Number.isFinite(leftTime) ? leftTime : 0);
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
  const sourceRecord = nested ?? {};
  const threadType = normalizeResponseThreadType(detail.threadType || options.fallbackThreadType);
  const threadId = detail.threadId || options.fallbackThreadId;
  const conversationId = detail.conversationId || detail.threadId || options.fallbackThreadId;
  const rawMessages = readMessages(detail.messages) ?? readMessages(nested?.messages) ?? [];
  const notes = normalizeCustomerServiceSessionNotes(
    detail.notes ?? nested?.notes,
  );
  const readStatus = normalizeCustomerServiceReadStatus(
    detail.readStatus ?? sourceRecord.readStatus,
  );
  const messages = normalizeCustomerServiceMessagesFromContract(rawMessages, {
    conversationId,
    threadId,
    threadType,
  });
  const latest = latestMessage(messages);

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
    notes,
    readStatus,
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

function normalizeCustomerServiceHistoryStatusParam(
  status?: string | number,
): "queued" | "active" | null {
  const normalized = String(status ?? "").trim().toLowerCase().replace(/-/g, "_");
  if (normalized === "queued" || normalized === "queue") return "queued";
  if (normalized === "active" || normalized === "open" || normalized === "serving") {
    return "active";
  }
  return null;
}

function hasAdminCustomerServiceHistoryScope(params: {
  conversationId?: string;
  customerId?: string;
  customerUserId?: string;
  senderUserId?: string;
  visitorUserId?: string;
}) {
  return [
    params.conversationId,
    params.customerId,
    params.customerUserId,
    params.senderUserId,
    params.visitorUserId,
  ].some((value) => String(value ?? "").trim());
}

function aiSuggestionPathType(threadType: CustomerServiceThreadType) {
  return threadType === "temp_session" ? "temp_session" : "im_direct";
}

function threadActionPathType(threadType: CustomerServiceThreadType) {
  return threadRoutePathType(threadType);
}

function transferEndpoint(threadType: CustomerServiceThreadType) {
  return threadType === "temp_session"
    ? endpointPlan.customerServiceTempSessionTransfer
    : endpointPlan.customerServiceImDirectTransfer;
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

function readBoolean(value: unknown) {
  if (typeof value === "boolean") return value;
  if (typeof value !== "string" || !value.trim()) return undefined;
  const normalized = value.trim().toLowerCase();
  if (normalized === "true" || normalized === "1") return true;
  if (normalized === "false" || normalized === "0") return false;
  return undefined;
}

function appendOptionalSearchParams<T extends Record<string, unknown>>(
  search: URLSearchParams,
  params: T,
  keys: Array<keyof T & string>,
) {
  keys.forEach((key) => {
    const value = params[key];
    if (value === undefined || value === null) return;
    const text = String(value).trim();
    if (!text) return;
    search.set(key, text);
  });
}

function exportFileNameFromDisposition(value: string | null) {
  if (!value) return undefined;
  const utf8Match = /filename\*=UTF-8''([^;]+)/i.exec(value);
  if (utf8Match?.[1]) {
    try {
      return decodeURIComponent(utf8Match[1].replace(/^"|"$/g, ""));
    } catch {
      return utf8Match[1].replace(/^"|"$/g, "");
    }
  }
  const fallbackMatch = /filename="?([^";]+)"?/i.exec(value);
  return fallbackMatch?.[1]?.trim() || undefined;
}

function adminTokenCacheKey(input: {
  baseUrl: string;
  platformToken?: string;
  tenantId: string;
}) {
  return `${input.baseUrl}|${input.tenantId}|${input.platformToken ?? ""}`;
}

function isTenantAdminOrOwner(role?: number) {
  return role === 3 || role === 4;
}

function previewFromMessage(message?: MessageItemDto) {
  if (!message) return undefined;
  if (message.preview?.trim()) return message.preview.trim();
  const body = message.body ?? {};
  const text = body.text;
  if (typeof text === "string" && text.trim()) return text.trim();
  const type = String(message.messageType ?? body.messageType ?? "").toLowerCase();
  if (type === "image" || body.image) return "[Image]";
  if (type === "file" || body.file) return "[File]";
  if (type === "voice" || body.voice) return "[Voice]";
  if (type === "video" || body.video) return "[Video]";
  return "[Message]";
}
