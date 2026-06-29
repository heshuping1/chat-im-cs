export const endpointPlan = {
  platformLogin: "/api/platform/v1/auth/login",
  platformRegister: "/api/platform/v1/auth/register",
  platformInvitation: "/api/platform/v1/invitations/{code}",
  platformInvitationAccept: "/api/platform/v1/invitations/{code}/accept",
  adminToken: "/api/platform/v1/auth/admin-token",
  refreshPlatformTokenByRefreshToken:
    "/api/platform/v1/auth/refresh-platform-token-by-refresh-token",
  selectTenant: "/api/platform/v1/auth/select-tenant",
  selectPersonalSpace: "/api/platform/v1/auth/select-personal-space",
  deviceSessionExchange: "/api/platform/v1/auth/device-session/exchange",
  platformTenants: "/api/platform/v1/my/tenants",
  platformSpaceUnreadSummary: "/api/platform/v1/my/spaces/unread-summary",
  tenantSearch: "/api/platform/v1/tenants/search",
  tenantByCode: "/api/platform/v1/tenants/by-code/{code}",
  tenantJoinByCode: "/api/platform/v1/tenants/join-by-code",
  tenantJoinRequest: "/api/platform/v1/tenants/{tenantId}/join-request",
  tenantJoinRequests: "/api/platform/v1/my/join-requests",
  accountDeactivate: "/api/platform/v1/account/deactivate",
  accountDevices: "/api/platform/v1/account/devices",
  accountDevice: "/api/platform/v1/account/devices/{deviceId}",
  captchaGenerate: "/api/client/v1/auth/captcha/generate",
  tenantTokenRefresh: "/api/client/v1/auth/refresh",
  conversations: "/api/client/v1/conversations",
  conversationPin: "/api/client/v1/conversations/{conversationId}/pin",
  conversationMute: "/api/client/v1/conversations/{conversationId}/mute",
  conversationVisibility: "/api/client/v1/conversations/{conversationId}/visibility",
  profileMe: "/api/client/v1/profile/me",
  profilePrivacy: "/api/client/v1/profile/me/privacy",
  notificationSettings: "/api/client/v1/notification-settings",
  tenantInfo: "/api/client/v1/tenant/info",
  tenantInvitations: "/api/client/v1/tenant/invitations",
  tenantInvitation: "/api/client/v1/tenant/invitations/{invitationId}",
  changePassword: "/api/client/v1/auth/change-password",
  blocklist: "/api/client/v1/blocklist",
  blocklistItem: "/api/client/v1/blocklist/{blockedUserId}",
  feedback: "/api/client/v1/feedback",
  userProfile: "/api/client/v1/users/{userId}/profile",
  friendInviteQr: "/api/client/v1/friends/invite-qr",
  favoritesSummary: "/api/client/v1/favorites/summary",
  favoritesList: "/api/client/v1/favorites/list",
  enterpriseAnnouncements: "/api/client/v1/announcements",
  enterpriseAnnouncementRead:
    "/api/client/v1/enterprise/announcements/{announcementId}/read",
  friends: "/api/client/v1/friends",
  friendRequest: "/api/client/v1/friends/request",
  friendRequests: "/api/client/v1/friends/requests",
  friendRequestHandle: "/api/client/v1/friends/requests/{requestId}/handle",
  friendItem: "/api/client/v1/friends/{friendUserId}",
  friendProfileExtra: "/api/client/v1/friends/{friendUserId}/profile-extra",
  searchUsers: "/api/client/v1/search/users",
  tenantMembers: "/api/client/v1/tenant/members",
  departments: "/api/client/v1/departments/",
  departmentMembers: "/api/client/v1/departments/{departmentId}/members",
  directChats: "/api/client/v1/direct-chats/",
  groups: "/api/client/v1/groups/",
  groupDetail: "/api/client/v1/groups/{conversationId}",
  directMessages: "/api/client/v1/direct-chats/{conversationId}/messages",
  directRead: "/api/client/v1/direct-chats/{conversationId}/read",
  directReadStatus: "/api/client/v1/direct-chats/{conversationId}/read-status",
  groupMessages: "/api/client/v1/groups/{conversationId}/messages",
  groupMembers: "/api/client/v1/groups/{conversationId}/members",
  groupMember: "/api/client/v1/groups/{conversationId}/members/{userId}",
  groupMemberAlias: "/api/client/v1/groups/{groupId}/members/{targetUserId}/alias",
  groupTransferOwner: "/api/client/v1/groups/{conversationId}/transfer-owner",
  groupMemberRole: "/api/client/v1/groups/{conversationId}/members/{userId}/role",
  groupMemberMute: "/api/client/v1/groups/{conversationId}/members/{userId}/mute",
  groupSettings: "/api/client/v1/groups/{conversationId}/settings",
  groupMuteMode: "/api/client/v1/groups/{conversationId}/mute-mode",
  groupAnnouncements: "/api/client/v1/groups/{conversationId}/announcements",
  groupAnnouncement: "/api/client/v1/groups/{conversationId}/announcements/{announcementId}",
  groupJoinRequests: "/api/client/v1/groups/{conversationId}/join-requests",
  groupJoinRequestApprove:
    "/api/client/v1/groups/{conversationId}/join-requests/{requestId}/approve",
  groupJoinRequestReject:
    "/api/client/v1/groups/{conversationId}/join-requests/{requestId}/reject",
  groupFiles: "/api/client/v1/groups/{conversationId}/files",
  groupLeave: "/api/client/v1/groups/{conversationId}/leave",
  groupPin: "/api/client/v1/groups/{conversationId}/pin",
  groupMute: "/api/client/v1/groups/{conversationId}/mute",
  groupRead: "/api/client/v1/groups/{conversationId}/read",
  groupReadReceipts: "/api/client/v1/groups/{conversationId}/read-receipts",
  mediaUpload: "/api/client/v1/media/upload",
  messageRecall: "/api/client/v1/messages/{messageId}/recall",
  messageRecallSilent: "/api/client/v1/messages/{messageId}/recall-silent",
  messageDelete: "/api/client/v1/messages/{messageId}/delete",
  messageForward: "/api/client/v1/messages/forward",
  messageBatchDelete: "/api/client/v1/messages/batch-delete",
  messageBatchForward: "/api/client/v1/messages/batch-forward",
  messageVoiceToText: "/api/client/v1/messages/voice-to-text",
  messageTranslate: "/api/client/v1/translate/message",
  textTranslate: "/api/client/v1/translate/text",
  favorites: "/api/client/v1/favorites",
  customerServiceThreads: "/api/client/v1/customer-service/workbench/threads",
  staffServiceHistory: "/api/client/v1/customer-service/staff/service-history",
  customerServiceReceptionStatus:
    "/api/client/v1/customer-service/reception/status",
  customerServiceThreadDetail:
    "/api/client/v1/customer-service/workbench/threads/{threadType}/{threadId}",
  customerServiceThreadMessages:
    "/api/client/v1/customer-service/workbench/threads/{threadType}/{threadId}/messages",
  customerServiceThreadAction:
    "/api/client/v1/customer-service/workbench/threads/{threadActionType}/{threadId}/{action}",
  customerServiceImDirectTransfer:
    "/api/client/v1/customer-service/im-direct/{threadId}/transfer",
  customerServiceTempSessionTransfer:
    "/api/client/v1/customer-service/temp-sessions/{sessionId}/transfer",
  customerServiceTempSessionReadStatus:
    "/api/client/v1/customer-service/temp-sessions/{sessionId}/read-status",
  customerServiceTempSessionNotes:
    "/api/client/v1/customer-service/temp-sessions/{sessionId}/notes",
  customerServiceTempSessionNotePin:
    "/api/client/v1/customer-service/temp-sessions/{sessionId}/notes/{noteId}/pin",
  customerServiceTempSessionNote:
    "/api/client/v1/customer-service/temp-sessions/{sessionId}/notes/{noteId}",
  customerServiceTempSessionVisitorRemark:
    "/api/client/v1/customer-service/temp-sessions/{sessionId}/visitor-remark",
  adminCustomerServiceTempSessions:
    "/api/admin/v1/customer-service/temp-sessions",
  adminCustomerServiceTempSession:
    "/api/admin/v1/customer-service/temp-sessions/{sessionId}",
  adminCustomerServiceTempSessionClaim:
    "/api/admin/v1/customer-service/temp-sessions/{sessionId}/claim",
  adminCustomerServiceTempSessionTakeover:
    "/api/admin/v1/customer-service/temp-sessions/{sessionId}/takeover",
  adminCustomerServiceTempSessionStats:
    "/api/admin/v1/customer-service/temp-sessions/stats",
  adminCustomerServiceCenterDashboard:
    "/api/admin/v1/customer-service/center/dashboard",
  adminCustomerServiceCenterThreads:
    "/api/admin/v1/customer-service/center/threads",
  adminCustomerServiceCenterThread:
    "/api/admin/v1/customer-service/center/threads/{threadType}/{threadId}",
  adminCustomerServiceCenterThreadAssign:
    "/api/admin/v1/customer-service/center/threads/{threadType}/{threadId}/assign",
  adminCustomerServiceCenterThreadFreeze:
    "/api/admin/v1/customer-service/center/threads/{threadType}/{threadId}/freeze",
  adminCustomerServiceCenterThreadForceClose:
    "/api/admin/v1/customer-service/center/threads/{threadType}/{threadId}/force-close",
  adminCustomerServiceCenterThreadUnfreeze:
    "/api/admin/v1/customer-service/center/threads/{threadType}/{threadId}/unfreeze",
  adminCustomerServiceCenterCustomersServiceHistory:
    "/api/admin/v1/customer-service/center/customers/service-history",
  adminCustomerServiceCenterStaffServiceHistory:
    "/api/admin/v1/customer-service/center/staff/{staffUserId}/service-history",
  adminCustomerServiceCenterStaffStatuses:
    "/api/admin/v1/customer-service/center/staff-statuses",
  adminCustomerServiceCenterSlaDashboard:
    "/api/admin/v1/customer-service/center/sla/dashboard",
  adminCustomerServiceCenterHistorySessions:
    "/api/admin/v1/customer-service/center/history-sessions",
  adminExportTasks: "/api/admin/v1/export-tasks",
  threadProfileCard:
    "/api/client/v1/customer-service/workbench/threads/{threadType}/{threadId}/profile-card",
  clientErrors: "/api/client/v1/client-errors",
  scheduledMessages: "/api/client/v1/scheduled-messages",
  quickReplies: "/api/client/v1/customer-service/quick-replies",
  knowledgeSearch: "/api/client/v1/customer-service/knowledge/search",
  knowledgeBases: "/api/client/v1/customer-service/knowledge/bases",
  knowledgeDocuments:
    "/api/client/v1/customer-service/knowledge/bases/{knowledgeBaseId}/documents",
  aiSuggestion:
    "/api/client/v1/customer-service/workbench/threads/{threadType}/{threadId}/ai-suggestion",
  aiSuggestions:
    "/api/client/v1/customer-service/workbench/threads/{threadType}/{threadId}/ai-suggestions",
  aiSuggestionAdopt:
    "/api/client/v1/customer-service/workbench/ai-suggestions/{suggestionId}/adopt",
  enterpriseBroadcasts: "/api/admin/v1/enterprise-broadcasts",
  enterpriseBroadcastPreview: "/api/admin/v1/enterprise-broadcasts/preview",
  customerManagementSummary: "/api/admin/v1/customer-management/summary",
  customerManagementCustomers: "/api/admin/v1/customer-management/customers",
  conversationManagementSummary:
    "/api/admin/v1/conversation-management/summary",
  conversationManagementConversations:
    "/api/admin/v1/conversation-management/conversations",
  gateway: "/ws/client",
};
