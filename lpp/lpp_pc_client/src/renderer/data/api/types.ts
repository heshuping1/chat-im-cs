import { ApiError } from "./base";

export interface PlatformTenant {
  tenantId: string;
  tenantCode?: string;
  tenantName: string;
  logoUrl?: string | null;
  membershipRole?: number;
}

export interface SpaceUnreadSummaryDto {
  spaceType: number;
  tenantId?: string | null;
  spaceName?: string;
  tenantCode?: string | null;
  logoUrl?: string | null;
  unreadConversationCount?: number;
  unreadMessageCount?: number;
  hasUnread?: boolean;
}

export interface PlatformSpaceUnreadSummaryDto {
  spaces?: SpaceUnreadSummaryDto[];
  unreadSpaceCount?: number;
  totalUnreadConversationCount?: number;
  totalUnreadMessageCount?: number;
}

export interface PlatformLoginResult {
  platformUserId: string;
  lppId: string;
  displayName: string;
  userType?: number | null;
  platformToken?: string;
  platformRefreshToken?: string;
  accessToken?: string;
  refreshToken?: string;
  expiresIn?: number;
  tenantId?: string;
  userId?: string;
  tenants?: PlatformTenant[];
  spaceContext?: {
    spaceType: number;
    tenantId?: string | null;
  };
}

export interface PlatformRegisterRequest {
  displayName: string;
  password: string;
  avatarUrl?: string | null;
  email?: string | null;
  mobile?: string | null;
  captchaToken?: string | null;
  captchaAnswer?: string | null;
  verificationCode?: string | null;
  tenantId?: string | null;
}

export interface PlatformRegisterResult extends Partial<PlatformLoginResult> {
  message?: string;
  pendingApproval?: boolean;
  tenantId?: string;
}

export interface PlatformInvitationPreviewDto {
  tenantId?: string;
  tenantName?: string;
  tenantCode?: string | null;
  logoUrl?: string | null;
  tenantDescription?: string | null;
  industry?: string | null;
  expiresAt?: string | null;
  alreadyMember?: boolean;
  identityMatched?: boolean;
  targetMembershipRole?: number | null;
}

export interface CaptchaChallenge {
  token: string;
  question: string;
  expiresIn?: number;
}

export interface TenantAuthResult {
  tenantId: string;
  userId: string;
  platformUserId: string;
  lppId: string;
  displayName: string;
  avatarUrl?: string | null;
  membershipRole?: number;
  accessToken: string;
  refreshToken?: string;
  expiresIn?: number;
  spaceContext?: {
    spaceType: number;
    tenantId?: string | null;
  };
}

export interface UserProfileDto {
  userId: string;
  platformUserId?: string;
  userNo?: number;
  loginName?: string;
  lppId?: string;
  displayName: string;
  userType?: number;
  avatarUrl?: string | null;
  signature?: string | null;
  gender?: string | null;
  birthday?: string | null;
  location?: string | null;
  bio?: string | null;
  mobile?: string | null;
  email?: string | null;
  tapTapText?: string | null;
  createdAt?: string | null;
}

export interface UserProfileUpdateDto {
  displayName?: string;
  avatarUrl?: string | null;
  signature?: string | null;
  gender?: string | null;
  birthday?: string | null;
  location?: string | null;
  bio?: string | null;
}

export interface TenantInfoDto {
  tenantId?: string;
  tenantCode?: string;
  tenantName?: string;
  logoUrl?: string | null;
}

export interface CreateTenantInvitationRequest {
  maxUses: number;
  expireHours: number;
  targetIdentifier?: string | null;
  targetMembershipRole?: number | null;
}

export interface TenantInvitationDto {
  invitationId?: string;
  code?: string | null;
  token?: string | null;
  inviteCode?: string | null;
  invitationCode?: string | null;
  inviteUrl?: string | null;
  invitationUrl?: string | null;
  url?: string | null;
  targetIdentifier?: string | null;
  targetMembershipRole?: number | null;
  targetRole?: number | string | null;
  target_role?: number | string | null;
  target_membership_role?: number | string | null;
  membershipRole?: number | string | null;
  role?: number | string | null;
  maxUses?: number | null;
  usedCount?: number | null;
  remainingUses?: number | null;
  expireHours?: number | null;
  expiresAt?: string | null;
  expiredAt?: string | null;
  createdAt?: string | null;
  status?: string | number | null;
  createdByDisplayName?: string | null;
}

export interface AccountDeviceDto {
  deviceId: string;
  tenantId?: string | null;
  tenantName?: string | null;
  deviceName?: string | null;
  deviceType?: string | null;
  lastActiveAt?: string | null;
  isCurrent?: boolean;
  activeSessionCount?: number;
}

export interface RevokeAccountDeviceResultDto {
  deviceId: string;
  revokedSessionCount?: number;
  revokedAt?: string | null;
}

export interface FriendInviteQrDto {
  tokenId: string;
  token?: string;
  qrPayload?: string;
  maxUses?: number;
  usedCount?: number;
  message?: string | null;
  status?: string;
  expiresAt?: string | null;
  createdAt?: string | null;
}

export interface FavoriteSummaryDto {
  totalCount?: number;
  textCount?: number;
  imageCount?: number;
  videoCount?: number;
  voiceCount?: number;
  fileCount?: number;
  otherCount?: number;
}

export interface FavoriteItemDto {
  favoriteId: string;
  messageId?: string;
  conversationId?: string;
  conversationType?: string;
  messageType?: string;
  favoriteCategory?: string;
  preview?: string | null;
  senderDisplayName?: string | null;
  conversationTitle?: string | null;
  favoritedAt?: string | null;
  isRecalled?: boolean;
  tags?: string[];
  tagNames?: string[];
}

export interface ProfilePrivacySettingsDto {
  searchableByMobile?: boolean;
  searchableByLppId?: boolean;
  allowFriendRequest?: "everyone" | "friends_of_friends" | "nobody" | string;
  profileVisibility?: "everyone" | "friends" | "nobody" | string;
}

export interface NotificationSettingsDto {
  globalMute?: boolean;
  dndStartTime?: string | null;
  dndEndTime?: string | null;
  soundEnabled?: boolean;
  vibrationEnabled?: boolean;
  previewEnabled?: boolean;
  imEnabled?: boolean;
  serviceQueueEnabled?: boolean;
  slaEnabled?: boolean;
  desktopEnabled?: boolean;
}

export type FeedbackTypeDto =
  | "complaint"
  | "suggestion"
  | "bug"
  | "experience"
  | string;

export interface FeedbackSubmitRequestDto {
  type: FeedbackTypeDto;
  title: string;
  content: string;
  contact?: string | null;
  diagnosticsIncluded?: boolean;
  clientContext?: Record<string, unknown>;
}

export interface FeedbackSubmitResultDto {
  feedbackId?: string;
  requestId?: string;
  createdAt?: string | null;
}

export interface BlockedUserDto {
  blockedUserId: string;
  displayName?: string;
  avatarUrl?: string | null;
  createdAt?: string | null;
}

export interface JoinableTenantDto {
  tenantId: string;
  tenantCode: string;
  tenantName: string;
  logoUrl?: string | null;
  industry?: string | null;
  memberCount?: number | null;
  description?: string | null;
  alreadyMember?: boolean;
  canJoinByTenantId?: boolean;
}

export interface TenantCodePreviewDto {
  tenantId: string;
  tenantCode: string;
  tenantName: string;
  logoUrl?: string | null;
  tenantDescription?: string | null;
  industry?: string | null;
  memberCount?: number | null;
  joinApprovalMode: "auto" | "manual" | string;
  alreadyMember: boolean;
}

export interface PlatformJoinResultDto {
  tenantId?: string;
  userId?: string;
  platformUserId?: string;
  lppId?: string;
  displayName?: string;
  avatarUrl?: string | null;
  accessToken?: string;
  refreshToken?: string;
  expiresIn?: number;
  message?: string;
  requestId?: string;
}

export interface TenantJoinRequestDto {
  requestId?: string;
  tenantId?: string;
  tenantName?: string;
  name?: string;
  tenantCode?: string | null;
  logoUrl?: string | null;
  status?: string | number | null;
  message?: string | null;
  reason?: string | null;
  rejectReason?: string | null;
  reviewReason?: string | null;
  submittedAt?: string | null;
  createdAt?: string | null;
  reviewedAt?: string | null;
  updatedAt?: string | null;
}

export interface KnowledgeBaseDto {
  knowledgeBaseId: string;
  id?: string;
  name?: string;
  title?: string;
  description?: string | null;
  summary?: string | null;
  documentCount?: number | null;
  updatedAt?: string | null;
}

export interface KnowledgeDocumentDto {
  documentId: string;
  id?: string;
  knowledgeBaseId?: string;
  title?: string;
  name?: string;
  summary?: string | null;
  contentPreview?: string | null;
  updatedAt?: string | null;
}

export interface KnowledgeSearchResultDto {
  chunkId?: string;
  knowledgeBaseId?: string;
  knowledgeBaseName?: string;
  documentId?: string;
  documentTitle?: string;
  title?: string;
  headingPath?: string | string[] | null;
  snippet?: string | null;
  summary?: string | null;
  contentPreview?: string | null;
  content?: string | null;
  score?: number | null;
}

export interface KnowledgeSearchResponseDto {
  items?: KnowledgeSearchResultDto[];
}

export type CustomerServiceQuickReplyScope =
  | "all"
  | "temp_session"
  | "direct_customer"
  | string;

export interface CustomerServiceQuickReplyDto {
  quickReplyId: string;
  scope: CustomerServiceQuickReplyScope;
  locale?: string | null;
  category?: string | null;
  title: string;
  content: string;
  tags?: string[];
  sortOrder?: number | null;
  enabled?: boolean;
  createdAt?: string | null;
  updatedAt?: string | null;
  deletedAt?: string | null;
}

export interface QuickReplyInsertPayload {
  quickReplyId: string;
  title: string;
  text: string;
  category?: string | null;
  tags?: string[];
  scope?: CustomerServiceQuickReplyScope;
}

export interface KnowledgeInsertPayload {
  title: string;
  text: string;
  sourceLabel?: string;
  knowledgeBaseId?: string;
  knowledgeBaseName?: string;
  documentId?: string;
  documentTitle?: string;
  chunkId?: string;
}

export interface AiSuggestionSourceDto {
  knowledgeBaseName?: string | null;
  documentTitle?: string | null;
  headingPath?: string | string[] | null;
  snippet?: string | null;
  score?: number | null;
}

export interface AiSuggestionDto {
  suggestionId: string;
  threadType?: CustomerServiceThreadType | string;
  threadId?: string;
  customerMessageId?: string | null;
  text?: string | null;
  confidence?: number | null;
  source?: string | null;
  sources?: AiSuggestionSourceDto[];
  model?: string | null;
  status?: string | number;
  createdAt?: string | null;
  adoptedAt?: string | null;
}

export interface EnterpriseAnnouncementDto {
  announcementId: string;
  title: string;
  content: string;
  priority?: "normal" | "important" | string;
  publishedAt?: string | null;
  expiresAt?: string | null;
  readAt?: string | null;
}

export interface ConversationListItem {
  conversationId: string;
  conversationType: "direct" | "group" | "temp_session" | string;
  title: string;
  avatarUrl?: string | null;
  groupAvatarUrl?: string | null;
  groupIconUrl?: string | null;
  iconUrl?: string | null;
  memberAvatarUrls?: string[];
  memberAvatars?: string[];
  avatarVisible?: boolean | null;
  memberAvatarVisible?: boolean | null;
  canViewMemberAvatars?: boolean | null;
  memberListVisible?: boolean | null;
  canViewMemberList?: boolean | null;
  membersVisible?: boolean | null;
  members?: Array<{
    avatarUrl?: string | null;
    displayName?: string | null;
    role?: string | null;
    memberRole?: string | null;
    joinedAt?: string | null;
  }>;
  lastMessage?: {
    messageId?: string;
    messageType?: string;
    preview?: string;
    sentAt?: string;
    senderUserId?: string;
    senderId?: string;
    fromUserId?: string;
    senderPlatformUserId?: string;
    platformUserId?: string;
    senderLppId?: string;
    lppId?: string;
    senderDisplayName?: string;
    isSelf?: boolean;
    isMine?: boolean;
    direction?: string;
  } | null;
  unreadCount?: number;
  lastReadSeq?: number;
  lastMessageSeq?: number;
  peerReadSeq?: number;
  imReadContractLevel?: "ok" | "degraded" | "blocking";
  imReadContractDiagnostics?: string[];
  isPinned?: boolean;
  isMuted?: boolean;
  peerUserId?: string | null;
  peerLppId?: string | null;
  peerLppNo?: string | null;
  peerLppNumber?: string | null;
  peerUserNo?: string | number | null;
  peerDisplayName?: string | null;
  peerPhoneMasked?: string | null;
  peerEmailMasked?: string | null;
  peerUserType?: number | null;
  memberCount?: number | null;
  ownerDisplayName?: string | null;
  myRole?: string | null;
}

export interface ConversationListResponse {
  items: ConversationListItem[];
  nextCursor?: string | null;
}

export interface DirectReadStatusDto {
  peerLastReadSeq?: number;
  peerLastReadAt?: string | null;
}

export interface FriendDto {
  friendUserId: string;
  displayName: string;
  avatarUrl?: string | null;
  remarkName?: string | null;
  groupName?: string | null;
  createdAt?: string;
  userType?: number;
  greenBubbleNo?: string | null;
}

export interface FriendProfileUpdateDto {
  remarkName?: string | null;
  groupName?: string | null;
  tags?: string[] | null;
  note?: string | null;
  source?: string | null;
}

export interface FriendProfileExtraDto {
  friendUserId: string;
  displayName?: string | null;
  avatarUrl?: string | null;
  remarkName?: string | null;
  groupName?: string | null;
  note?: string | null;
  tags?: string[] | null;
  source?: string | null;
  addedAt?: string | null;
  createdAt?: string | null;
  userType?: number | null;
  lppId?: string | null;
  mobile?: string | null;
  email?: string | null;
  signature?: string | null;
  bio?: string | null;
  location?: string | null;
  genderValue?: number | string | null;
  birthday?: string | null;
}

export interface SearchUserDto {
  userId: string;
  displayName: string;
  avatarUrl?: string | null;
  signature?: string | null;
  lppId?: string | null;
  userType?: number | null;
  matchType?: string | null;
}

export interface ContactCardDto {
  userId: string;
  displayName: string;
  avatarUrl?: string | null;
  mobile?: string | null;
  email?: string | null;
}

export interface FriendRequestDto {
  requestId: string;
  fromUserId: string;
  fromDisplayName: string;
  fromAvatarUrl?: string | null;
  toUserId?: string;
  toDisplayName?: string;
  toAvatarUrl?: string | null;
  message?: string | null;
  status?: string;
  createdAt?: string;
}

export interface TenantMemberDto {
  userId: string;
  platformUserId?: string;
  greenBubbleNo?: string | null;
  displayName: string;
  avatarUrl?: string | null;
  membershipRole?: number;
  joinMethod?: number;
  joinedAt?: string | null;
}

export interface GroupMemberDto {
  userId: string;
  platformUserId?: string;
  lppId?: string;
  displayName: string;
  groupNickname?: string | null;
  nickname?: string | null;
  avatarUrl?: string | null;
  role?: string | null;
  memberRole?: string | null;
  isMuted?: boolean;
  joinedAt?: string | null;
}

export interface GroupDetailDto {
  groupId?: string;
  conversationId?: string;
  title: string;
  avatarUrl?: string | null;
  ownerUserId?: string | null;
  ownerDisplayName?: string | null;
  memberCount?: number | null;
  muteMode?: "normal" | "all_muted" | 0 | 1 | string | null;
  settings?: GroupSettingsDto | null;
  isPinned?: boolean;
  isMuted?: boolean;
  myRole?: "owner" | "admin" | "member" | string | null;
  unreadCount?: number;
  lastMessageSeq?: number;
  lastReadSeq?: number;
  createdAt?: string | null;
}

export interface GroupSettingsDto {
  allowMemberInvite?: boolean;
  allowMemberModifyTitle?: boolean;
  allowMemberAtAll?: boolean;
  allowMemberViewMemberList?: boolean;
  allowQrCodeJoin?: boolean;
  requireApproval?: boolean;
  allowMemberAddFriend?: boolean;
}

export interface GroupAnnouncementDto {
  announcementId: string;
  title?: string | null;
  content: string;
  isPinned?: boolean;
  createdAt?: string | null;
  updatedAt?: string | null;
  creatorDisplayName?: string | null;
}

export interface GroupJoinRequestDto {
  requestId: string;
  applicantUserId?: string;
  applicantDisplayName?: string;
  applicantAvatarUrl?: string | null;
  message?: string | null;
  status?: string;
  createdAt?: string | null;
}

export interface ChatFileDto {
  mediaId: string;
  mediaKind: "image" | "video" | "voice" | "file" | string;
  fileName: string;
  mimeType?: string | null;
  sizeBytes?: number;
  url: string;
  createdAt?: string | null;
}

export interface DepartmentDto {
  departmentId: string;
  parentId?: string | null;
  departmentName: string;
  departmentCode?: string | null;
  sortOrder?: number;
  leaderUserId?: string | null;
  memberCount?: number;
}

export interface DepartmentMemberDto {
  userId: string;
  displayName: string;
  avatarUrl?: string | null;
  isPrimary?: boolean;
  position?: string | null;
}

export interface DirectChatCreatedDto {
  conversationId?: string;
  chatId: string;
  id?: string;
  peerUserId: string;
  peerDisplayName: string;
  peerAvatarUrl?: string | null;
  isNew?: boolean;
}

export interface GroupChatCreatedDto {
  conversationId?: string;
  chatId?: string;
  groupId?: string;
  id?: string;
  title?: string;
  name?: string;
  memberCount?: number;
}

export interface MediaResourceDto {
  url?: string;
  fileName?: string;
  mimeType?: string;
  sizeBytes?: number;
  width?: number;
  height?: number;
  durationSeconds?: number;
  thumbnailUrl?: string;
}

export interface MessageItemDto {
  messageId: string;
  conversationId?: string;
  conversationSeq?: number;
  clientMsgId?: string;
  clientMessageId?: string;
  localTaskId?: string;
  senderUserId?: string;
  senderId?: string;
  fromUserId?: string;
  senderPlatformUserId?: string;
  platformUserId?: string;
  senderLppId?: string;
  lppId?: string;
  senderDisplayName?: string;
  senderAvatarUrl?: string | null;
  avatarUrl?: string | null;
  messageType?: string;
  body?: Record<string, unknown>;
  preview?: string;
  sentAt?: string;
  readAt?: string | null;
  readCount?: number;
  isRead?: boolean;
  status?: string;
  isRecalled?: boolean;
  isSelf?: boolean;
  isMine?: boolean;
  direction?: string;
}

export interface WorkbenchSummary {
  allCount: number;
  queuedCount: number;
  activeCount: number;
  vipCount: number;
}

export type CustomerServiceThreadType = "temp_session" | "im_direct";

export function normalizeCustomerServiceThreadType(
  threadType?: string | null,
): CustomerServiceThreadType {
  const normalized = (threadType ?? "").trim().toLowerCase().replace(/-/g, "_");
  if (normalized === "temp_session") return "temp_session";
  return "im_direct";
}

export function isTerminalCustomerServiceWriteError(error: unknown) {
  if (!(error instanceof ApiError)) return false;
  return (
    error.status === 401 ||
    [
      "TEMP_SESSION_CLOSED",
      "TEMP_SESSION_ENDED",
      "TEMP_SESSION_NOT_ACTIVE",
      "INVALID_SESSION_STATUS",
    ].includes(error.code ?? "")
  );
}

export interface CustomerServiceThread {
  threadType: CustomerServiceThreadType;
  threadId: string;
  conversationId: string;
  status: string;
  title: string;
  appId?: string;
  appCode?: string;
  appName?: string;
  appDisplayName?: string;
  packageName?: string;
  brandName?: string;
  tenantAppName?: string;
  source?: string;
  from?: string;
  channel?: string;
  sourceChannel?: string;
  entryChannel?: string;
  platform?: string;
  provider?: string;
  avatarUrl?: string | null;
  customerAvatarUrl?: string | null;
  isVip?: boolean;
  customerLevel?: string;
  priority?: string;
  tags?: string[];
  lastMessagePreview?: string;
  lastMessageAt?: string | null;
  updatedAt?: string | null;
  assignedAt?: string | null;
  unreadCount?: number;
  accessMode?: "workbench" | "management_readonly";
}

export interface CustomerServiceThreadsResponse {
  queueItems: CustomerServiceThread[];
  activeItems: CustomerServiceThread[];
  summary?: WorkbenchSummary;
}

export interface StaffServiceHistoryItem {
  threadType: CustomerServiceThreadType | "direct" | string;
  threadId: string;
  conversationId?: string;
  tenantId?: string;
  staffUserId?: string | null;
  status: string | number;
  title?: string;
  appId?: string;
  appCode?: string;
  appName?: string;
  appDisplayName?: string;
  packageName?: string;
  brandName?: string;
  tenantAppName?: string;
  source?: string;
  from?: string;
  channel?: string;
  sourceChannel?: string;
  entryChannel?: string;
  platform?: string;
  provider?: string;
  avatarUrl?: string | null;
  customerAvatarUrl?: string | null;
  lastMessagePreview?: string;
  unreadCount?: number;
  startedAt?: string | null;
  acceptedAt?: string | null;
  firstResponseAt?: string | null;
  closedAt?: string | null;
  lastMessageAt?: string | null;
  riskLevel?: string | number;
  riskReasonsJson?: string | null;
  participation?: "current_owner" | "transferred" | string;
}

export interface StaffServiceHistoryResponse {
  items: StaffServiceHistoryItem[];
  nextCursor?: string | null;
}

export interface StaffReceptionStatusDto {
  staffUserId?: string;
  displayName?: string;
  serviceStatus: "online" | "busy" | "break" | "offline" | string;
  queueAcceptEnabled?: boolean;
  maxConcurrentSessions?: number;
  reservedSessionCount?: number;
  activeSessionCount?: number;
  lastOnlineAt?: string | null;
  lastAssignedAt?: string | null;
  lastHeartbeatAt?: string | null;
  statusChangedAt?: string | null;
}

export interface CustomerProfileCard {
  customerUserId?: string;
  customerId?: string;
  userId?: string;
  platformUserId?: string;
  lppId?: string;
  lppNo?: string;
  lppNumber?: string;
  userNo?: string | number;
  customerLppId?: string;
  customerLppNo?: string;
  greenBubbleId?: string;
  greenBubbleNo?: string;
  displayName?: string;
  customerName?: string;
  customerDisplayName?: string;
  nickname?: string;
  avatarUrl?: string;
  isVip?: boolean;
  customerLevel?: string;
  level?: string;
  grade?: string;
  rank?: string;
  kycStatus?: string;
  kyc?: string;
  kycLevel?: string;
  complianceStatus?: string;
  riskLevel?: string;
  risk?: string;
  riskStatus?: string;
  accountBalance?: string | number;
  totalDeposit?: string | number;
  netDeposit?: string | number;
  language?: string;
  appId?: string;
  appCode?: string;
  appName?: string;
  appDisplayName?: string;
  packageName?: string;
  brandName?: string;
  tenantAppName?: string;
  source?: string;
  from?: string;
  channel?: string;
  sourceChannel?: string;
  entryChannel?: string;
  platform?: string;
  provider?: string;
  tags?: string[];
  phoneMasked?: string;
  mobileMasked?: string;
  mobile?: string;
  phone?: string;
  emailMasked?: string;
  email?: string;
  country?: string;
  lastActiveAt?: string;
  assignedAgentName?: string;
  registeredAt?: string;
  ib?: string;
  accountStatus?: string;
  tabCounts?: Record<string, number>;
  tradingSummary?: Record<string, unknown>;
  temporaryOrders?: Array<Record<string, unknown>>;
  tickets?: Array<Record<string, unknown>>;
  externalSections?: Array<{
    type?: string;
    sectionType?: string;
    title?: string;
    fields?: Record<string, unknown> | Array<Record<string, unknown>>;
    items?: Array<Record<string, unknown>>;
    [key: string]: unknown;
  }>;
}

export interface EnterpriseBroadcastPreview {
  recipientCount: number;
  sampleDisplayNames: string[];
  sampleGroupTitles: string[];
  sender?: {
    officialAccountId?: string;
    displayName: string;
    avatarUrl?: string;
  };
}
