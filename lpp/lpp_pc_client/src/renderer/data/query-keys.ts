import type { AuthSession } from "./auth/auth-session";
import { workspaceScopeKeyFromSession } from "./workspace-scope";

export function sessionKey(apiBaseUrl?: string, tenantToken?: string) {
  return [apiBaseUrl ?? "", tenantToken ?? ""] as const;
}

export const pcQueryKeys = {
  imConversations: (apiBaseUrl?: string, tenantToken?: string, limit = 100) =>
    ["pc-im-conversations", ...sessionKey(apiBaseUrl, tenantToken), limit] as const,
  imConversationsForSession: (session?: AuthSession | null, limit = 100) =>
    ["pc-im-conversations", workspaceScopeKeyFromSession(session), limit] as const,
  imMessages: (
    apiBaseUrl?: string,
    tenantToken?: string,
    conversationType?: string,
    conversationId?: string,
  ) =>
    [
      "pc-im-messages",
      ...sessionKey(apiBaseUrl, tenantToken),
      conversationType ?? "",
      conversationId ?? "",
    ] as const,
  imMessagesForSession: (
    session?: AuthSession | null,
    conversationType?: string,
    conversationId?: string,
  ) =>
    [
      "pc-im-messages",
      workspaceScopeKeyFromSession(session),
      conversationType ?? "",
      conversationId ?? "",
    ] as const,
  imDirectReadStatus: (
    apiBaseUrl?: string,
    tenantToken?: string,
    conversationId?: string,
  ) =>
    [
      "pc-im-direct-read-status",
      ...sessionKey(apiBaseUrl, tenantToken),
      conversationId ?? "",
    ] as const,
  customerServiceThreads: (apiBaseUrl?: string, tenantToken?: string) =>
    ["pc-cs-workbench-threads", ...sessionKey(apiBaseUrl, tenantToken)] as const,
  customerServiceHistory: (apiBaseUrl?: string, tenantToken?: string, limit = 50) =>
    ["pc-cs-staff-service-history", ...sessionKey(apiBaseUrl, tenantToken), limit] as const,
  customerServiceReception: (apiBaseUrl?: string, tenantToken?: string) =>
    ["pc-cs-reception-status", ...sessionKey(apiBaseUrl, tenantToken)] as const,
  customerServiceThreadDetail: (
    apiBaseUrl?: string,
    tenantToken?: string,
    threadType?: string,
    threadId?: string,
  ) =>
    [
      "pc-cs-thread-detail",
      ...sessionKey(apiBaseUrl, tenantToken),
      threadType ?? "",
      threadId ?? "",
    ] as const,
  customerServiceThreadProfile: (
    apiBaseUrl?: string,
    tenantToken?: string,
    threadType?: string,
    threadId?: string,
  ) =>
    [
      "pc-cs-thread-profile",
      ...sessionKey(apiBaseUrl, tenantToken),
      threadType ?? "",
      threadId ?? "",
    ] as const,
  friendProfileExtra: (apiBaseUrl?: string, tenantToken?: string, friendUserId?: string) =>
    ["pc-friend-profile-extra", ...sessionKey(apiBaseUrl, tenantToken), friendUserId ?? ""] as const,
  tenantMemberProfile: (apiBaseUrl?: string, tenantToken?: string, userId?: string) =>
    ["pc-tenant-member-profile", ...sessionKey(apiBaseUrl, tenantToken), userId ?? ""] as const,
  accountProfile: (apiBaseUrl?: string, tenantToken?: string) =>
    ["pc-account-profile", ...sessionKey(apiBaseUrl, tenantToken)] as const,
  accountTenant: (apiBaseUrl?: string, tenantToken?: string) =>
    ["pc-account-tenant", ...sessionKey(apiBaseUrl, tenantToken)] as const,
  tenantInvitations: (apiBaseUrl?: string, tenantToken?: string) =>
    ["pc-tenant-invitations", ...sessionKey(apiBaseUrl, tenantToken)] as const,
  accountInviteQrs: (apiBaseUrl?: string, tenantToken?: string) =>
    ["pc-account-invite-qrs", ...sessionKey(apiBaseUrl, tenantToken)] as const,
  accountFavoritesSummary: (apiBaseUrl?: string, tenantToken?: string) =>
    ["pc-account-favorites-summary", ...sessionKey(apiBaseUrl, tenantToken)] as const,
  accountFavorites: (
    apiBaseUrl?: string,
    tenantToken?: string,
    limit = 5,
    category = "all",
    keyword = "",
  ) =>
    [
      "pc-account-favorites",
      ...sessionKey(apiBaseUrl, tenantToken),
      limit,
      category,
      keyword,
    ] as const,
  accountPrivacy: (apiBaseUrl?: string, tenantToken?: string) =>
    ["pc-account-privacy", ...sessionKey(apiBaseUrl, tenantToken)] as const,
  accountNotificationSettings: (apiBaseUrl?: string, tenantToken?: string) =>
    ["pc-account-notification-settings", ...sessionKey(apiBaseUrl, tenantToken)] as const,
  accountBlocklist: (apiBaseUrl?: string, tenantToken?: string) =>
    ["pc-account-blocklist", ...sessionKey(apiBaseUrl, tenantToken)] as const,
  accountSpaces: (apiBaseUrl?: string, platformToken?: string) =>
    ["pc-account-spaces", apiBaseUrl ?? "", platformToken ?? ""] as const,
  tenantJoinRequests: (apiBaseUrl?: string, platformToken?: string) =>
    ["pc-tenant-join-requests", apiBaseUrl ?? "", platformToken ?? ""] as const,
  accountSpaceUnreadSummary: (apiBaseUrl?: string, platformToken?: string) =>
    ["pc-account-space-unread-summary", apiBaseUrl ?? "", platformToken ?? ""] as const,
  accountDevices: (apiBaseUrl?: string, platformToken?: string) =>
    ["pc-account-devices", apiBaseUrl ?? "", platformToken ?? ""] as const,
  workbenchAnnouncements: (apiBaseUrl?: string, tenantToken?: string) =>
    ["pc-workbench-announcements", ...sessionKey(apiBaseUrl, tenantToken)] as const,
  quickReplies: (apiBaseUrl?: string, tenantToken?: string) =>
    ["pc-cs-quick-replies", ...sessionKey(apiBaseUrl, tenantToken)] as const,
  knowledgeBases: (apiBaseUrl?: string, tenantToken?: string) =>
    ["pc-knowledge-bases", ...sessionKey(apiBaseUrl, tenantToken)] as const,
  knowledgeDocuments: (
    apiBaseUrl?: string,
    tenantToken?: string,
    knowledgeBaseId?: string,
  ) =>
    [
      "pc-knowledge-documents",
      ...sessionKey(apiBaseUrl, tenantToken),
      knowledgeBaseId ?? "",
    ] as const,
  knowledgeSearch: (
    apiBaseUrl?: string,
    tenantToken?: string,
    query?: string,
    knowledgeBaseId?: string,
  ) =>
    [
      "pc-knowledge-search",
      ...sessionKey(apiBaseUrl, tenantToken),
      query ?? "",
      knowledgeBaseId ?? "",
    ] as const,
  aiSuggestions: (
    apiBaseUrl?: string,
    tenantToken?: string,
    threadType?: string,
    threadId?: string,
    limit = 20,
  ) =>
    [
      "pc-ai-suggestions",
      ...sessionKey(apiBaseUrl, tenantToken),
      threadType ?? "",
      threadId ?? "",
      limit,
    ] as const,
};
