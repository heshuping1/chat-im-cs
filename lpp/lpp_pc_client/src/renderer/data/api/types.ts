import { ApiError } from "./base";
import { staffServiceHistoryItemToThread } from "../customer-service/cs-history-model";

export interface PlatformTenant {
  tenantId: string;
  tenantCode?: string;
  tenantName: string;
  logoUrl?: string | null;
  membershipRole?: number;
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
  accessToken: string;
  refreshToken?: string;
  expiresIn?: number;
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

export interface TenantInfoDto {
  tenantId?: string;
  tenantCode?: string;
  tenantName?: string;
  logoUrl?: string | null;
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
  lppId?: string;
  lppNo?: string;
  lppNumber?: string;
}

export interface FriendProfileUpdateDto {
  remarkName?: string | null;
  groupName?: string | null;
  tags?: string[] | null;
  note?: string | null;
  source?: string | null;
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
  avatarUrl?: string | null;
  role?: string | null;
  memberRole?: string | null;
  isMuted?: boolean;
  joinedAt?: string | null;
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

const terminalCustomerServiceThreadStatuses = new Set([
  "closed",
  "closed_by_visitor",
  "closed_by_staff",
  "closed_timeout",
  "closed_system",
  "archived",
  "ended",
  "finished",
  "resolved",
  "terminated",
  "cancelled",
  "canceled",
  "expired",
  "5",
  "6",
  "7",
  "8",
  "9",
]);

export function normalizeCustomerServiceThreadStatus(status?: string | null) {
  return (status ?? "").trim().toLowerCase().replace(/-/g, "_");
}

export function isTerminalCustomerServiceThreadStatus(status?: string | null) {
  const normalized = normalizeCustomerServiceThreadStatus(status);
  return (
    terminalCustomerServiceThreadStatuses.has(normalized) ||
    normalized.startsWith("closed")
  );
}

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

export { staffServiceHistoryItemToThread };

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
