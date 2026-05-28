import { ApiError } from "./base";

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
  chatId: string;
  peerUserId: string;
  peerDisplayName: string;
  peerAvatarUrl?: string | null;
  isNew?: boolean;
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

export function staffServiceHistoryItemToThread(
  item: StaffServiceHistoryItem,
): CustomerServiceThread {
  const threadType = normalizeCustomerServiceThreadType(item.threadType);
  return {
    threadType,
    threadId: item.threadId,
    conversationId: item.conversationId || item.threadId,
    status: String(item.status ?? ""),
    title: historyThreadTitle(item),
    source: item.source,
    from: item.from,
    channel: item.channel,
    sourceChannel: item.sourceChannel,
    entryChannel: item.entryChannel,
    platform: item.platform,
    provider: item.provider,
    avatarUrl: item.avatarUrl || item.customerAvatarUrl,
    customerAvatarUrl: item.customerAvatarUrl,
    lastMessagePreview:
      item.lastMessagePreview ??
      (item.closedAt
        ? `关闭时间 ${formatApiShortDateTime(item.closedAt)}`
        : item.lastMessageAt
          ? `最近活跃 ${formatApiShortDateTime(item.lastMessageAt)}`
          : item.participation === "transferred"
            ? "转接参与的历史会话"
            : "历史会话"),
    lastMessageAt: item.lastMessageAt ?? item.closedAt ?? item.acceptedAt ?? item.startedAt,
    unreadCount: item.unreadCount ?? 0,
  };
}

function historyThreadTitle(item: StaffServiceHistoryItem) {
  const raw =
    item.title ||
    readStringField(item, "customerDisplayName") ||
    readStringField(item, "customerName") ||
    readStringField(item, "customerNickname") ||
    readStringField(item, "visitorDisplayName") ||
    readStringField(item, "visitorName") ||
    readStringField(item, "visitorNickname") ||
    readStringField(item, "peerDisplayName") ||
    readStringField(item, "displayName") ||
    readStringField(item, "nickname") ||
    readStringField(item, "name");
  const value = raw?.trim();
  if (!value || value.startsWith("历史会话")) return "访客";
  return value;
}

function readStringField(source: unknown, key: string) {
  if (!source || typeof source !== "object") return undefined;
  const value = (source as Record<string, unknown>)[key];
  return typeof value === "string" && value.trim() ? value : undefined;
}

function formatApiShortDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return `${date.getMonth() + 1}/${date.getDate()} ${date
    .getHours()
    .toString()
    .padStart(2, "0")}:${date.getMinutes().toString().padStart(2, "0")}`;
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
  displayName?: string;
  avatarUrl?: string;
  isVip?: boolean;
  customerLevel?: string;
  kycStatus?: string;
  riskLevel?: string;
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
  emailMasked?: string;
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
