export type LocalConversationType = "direct" | "group" | "customer_service";
export type LocalDataMediaKind = "image" | "video" | "file";
export type LocalDataMediaVariantKind = "original" | "thumbnail" | "poster" | "display";
export type LocalDataMediaVariantStatus = "cached" | "stale" | "failed";
export type LocalMessageStatus =
  | "sending"
  | "sent"
  | "read"
  | "failed"
  | "recalled"
  | "deleted";
export type LocalDataOutboxStatus =
  | "queued"
  | "uploading"
  | "paused"
  | "sending"
  | "failed"
  | "canceled"
  | "archived";

export interface LocalDataMessageInput {
  bodyJson?: Record<string, unknown>;
  clientMsgId?: string | null;
  conversationId: string;
  conversationSeq?: number | null;
  conversationType: LocalConversationType | string;
  isRead?: boolean | null;
  isSelf?: boolean | null;
  isMine?: boolean | null;
  direction?: string | null;
  messageId: string;
  messageType?: string | null;
  preview?: string | null;
  scopeKey: string;
  senderAvatarUrl?: string | null;
  senderDisplayName?: string | null;
  senderId?: string | null;
  senderLppId?: string | null;
  senderPlatformUserId?: string | null;
  senderUserId?: string | null;
  fromUserId?: string | null;
  platformUserId?: string | null;
  lppId?: string | null;
  avatarUrl?: string | null;
  sentAt?: string | null;
  status?: LocalMessageStatus | string | null;
}

export interface LocalDataMessage {
  bodyJson: Record<string, unknown>;
  clientMsgId?: string;
  conversationId: string;
  conversationKey: string;
  conversationSeq?: number;
  conversationType: LocalConversationType;
  id: string;
  isRead: boolean;
  isSelf?: boolean;
  isMine?: boolean;
  direction?: string;
  messageId: string;
  messageType: string;
  preview: string;
  scopeKey: string;
  senderAvatarUrl?: string;
  senderDisplayName?: string;
  senderId?: string;
  senderLppId?: string;
  senderPlatformUserId?: string;
  senderUserId?: string;
  fromUserId?: string;
  platformUserId?: string;
  lppId?: string;
  avatarUrl?: string;
  sentAt?: string;
  status: LocalMessageStatus;
  updatedAt: number;
}

export interface LocalSearchInput {
  conversationId?: string;
  conversationType?: LocalConversationType | string;
  keyword?: string;
  limit: number;
  scopeKey: string;
}

export interface LocalDataListMessagesPayload {
  beforeSeq?: number;
  conversationId: string;
  conversationType: LocalConversationType | string;
  limit: number;
  scopeKey: string;
}

export interface LocalDataSearchMessagesPayload extends LocalSearchInput {}

export interface LocalDataUpsertMessagesPayload {
  messages: LocalDataMessageInput[];
  scopeKey: string;
}

export interface LocalDataDeleteMessagePayload {
  conversationId: string;
  conversationType: LocalConversationType | string;
  messageId: string;
  scopeKey: string;
}

export interface LocalDataClearScopePayload {
  scopeKey: string;
}

export interface LocalDataStorageStatsPayload {
  scopeKey?: string;
}

export interface LocalDataStorageStats {
  dbBytes: number;
  fileBytes: number;
  mediaBytes: number;
  mediaCount: number;
  messageCount: number;
  outboxCount: number;
  scopeKey?: string;
  totalBytes: number;
}

export interface LocalDataCleanupPayload {
  scopeKey?: string;
  target: "media-cache" | "message-index" | "orphan-files";
}

export interface LocalDataCleanupResult {
  deletedBytes: number;
  deletedMessages: number;
  deletedMediaVariants?: number;
  failedJobs?: number;
  target: LocalDataCleanupPayload["target"];
}

export interface LocalDataMediaAssetInput {
  fileName?: string | null;
  identitySource?: string | null;
  kind: LocalDataMediaKind | string;
  mediaIdentity: string;
  metadataJson?: Record<string, unknown>;
  mimeType?: string | null;
  serverUrl?: string | null;
  sizeBytes?: number | null;
}

export interface LocalDataMediaVariantInput {
  bytes?: number | null;
  errorReason?: string | null;
  localUrl?: string | null;
  mediaIdentity: string;
  serverUrl?: string | null;
  status?: LocalDataMediaVariantStatus | string | null;
  variantKind?: LocalDataMediaVariantKind | string | null;
}

export interface LocalDataMessageMediaRefInput {
  mediaIdentity: string;
  messageId: string;
  refKind?: string | null;
}

export interface LocalDataUpsertMediaPayload {
  asset: LocalDataMediaAssetInput;
  messageRefs?: LocalDataMessageMediaRefInput[];
  variants?: LocalDataMediaVariantInput[];
}

export interface LocalDataGetMediaVariantPayload {
  mediaIdentity: string;
  variantKind?: LocalDataMediaVariantKind | string;
}

export interface LocalDataMediaVariantProjection {
  bytes?: number;
  fileUrl?: string;
  mediaIdentity: string;
  serverUrl?: string;
  status: LocalDataMediaVariantStatus;
  updatedAt: number;
  variantKind: LocalDataMediaVariantKind;
}

export interface LocalDataOutboxInput {
  bodyJson?: Record<string, unknown>;
  clientMsgId: string;
  conversationId: string;
  conversationType: LocalConversationType | string;
  localMessageId: string;
  messageType: string;
  retryCount?: number | null;
  scopeKey: string;
  status: LocalDataOutboxStatus | string;
  updatedAt?: number | null;
}

export interface LocalDataOutboxRecord extends Required<LocalDataOutboxInput> {
  outboxId: string;
}

export interface LocalDataUpsertOutboxPayload {
  record: LocalDataOutboxInput;
}

export interface LocalDataListOutboxPayload {
  conversationId?: string;
  conversationType?: LocalConversationType | string;
  scopeKey: string;
}

export interface LocalDataDeleteOutboxPayload {
  localMessageId: string;
  scopeKey: string;
}

export interface LocalDataCustomerServiceThreadInput {
  customerSnapshotJson?: Record<string, unknown>;
  lastEventJson?: Record<string, unknown>;
  scopeKey: string;
  status?: string | null;
  threadId: string;
  threadType: string;
  unreadCount?: number | null;
  updatedAt?: number | null;
}

export interface LocalDataCustomerServiceThreadSnapshot
  extends Required<LocalDataCustomerServiceThreadInput> {
  threadKey: string;
}

export interface LocalDataUpsertCustomerServiceThreadPayload {
  thread: LocalDataCustomerServiceThreadInput;
}

export interface LocalDataListCustomerServiceThreadsPayload {
  limit?: number;
  scopeKey: string;
}

export interface LocalDataRepairPayload {
  rebuildFts?: boolean;
  scopeKey?: string;
}

export interface LocalDataRepairResult {
  checkedAt: number;
  dbIntegrity: "ok" | "failed";
  ftsRebuilt: boolean;
  mediaVariantsChecked: number;
  staleMediaVariants: number;
}

export interface LocalConversationProjectionInput {
  conversationId: string;
  conversationType: LocalConversationType | string;
  messages: LocalDataMessage[];
  scopeKey: string;
}

export interface LocalConversationProjection {
  conversationId: string;
  conversationType: LocalConversationType;
  lastMessage: LocalDataMessage | null;
  scopeKey: string;
  unreadCount: number;
  updatedAt: number;
}

export interface LocalReminderProjection {
  conversationId: string;
  conversationType: LocalConversationType;
  shouldNotify: boolean;
  unreadCount: number;
}

export function localDataConversationKey(
  scopeKey: string,
  conversationType: string,
  conversationId: string,
) {
  return [
    normalizeKeyPart(scopeKey, "unknown-scope"),
    normalizeConversationType(conversationType),
    normalizeKeyPart(conversationId, "unknown-conversation"),
  ].join(":");
}

export function localDataMessageKey(
  scopeKey: string,
  conversationType: string,
  conversationId: string,
  messageId: string,
) {
  return [
    localDataConversationKey(scopeKey, conversationType, conversationId),
    normalizeKeyPart(messageId, "unknown-message"),
  ].join(":");
}

export function normalizeLocalDataMessage(input: LocalDataMessageInput): LocalDataMessage {
  const conversationType = normalizeConversationType(input.conversationType);
  const messageId = normalizeKeyPart(input.messageId, "unknown-message");
  return {
    bodyJson: input.bodyJson ?? {},
    ...(normalizeOptional(input.clientMsgId) ? { clientMsgId: normalizeOptional(input.clientMsgId) } : {}),
    conversationId: normalizeKeyPart(input.conversationId, "unknown-conversation"),
    conversationKey: localDataConversationKey(
      input.scopeKey,
      conversationType,
      input.conversationId,
    ),
    ...(typeof input.conversationSeq === "number"
      ? { conversationSeq: input.conversationSeq }
      : {}),
    conversationType,
    id: localDataMessageKey(input.scopeKey, conversationType, input.conversationId, messageId),
    isRead: Boolean(input.isRead),
    ...(typeof input.isSelf === "boolean" ? { isSelf: input.isSelf } : {}),
    ...(typeof input.isMine === "boolean" ? { isMine: input.isMine } : {}),
    ...(normalizeOptional(input.direction) ? { direction: normalizeOptional(input.direction) } : {}),
    messageId,
    messageType: normalizeOptional(input.messageType) ?? "text",
    preview: normalizeOptional(input.preview) ?? "",
    scopeKey: normalizeKeyPart(input.scopeKey, "unknown-scope"),
    ...(normalizeOptional(input.senderAvatarUrl)
      ? { senderAvatarUrl: normalizeOptional(input.senderAvatarUrl) }
      : {}),
    ...(normalizeOptional(input.senderDisplayName)
      ? { senderDisplayName: normalizeOptional(input.senderDisplayName) }
      : {}),
    ...(normalizeOptional(input.senderId)
      ? { senderId: normalizeOptional(input.senderId) }
      : {}),
    ...(normalizeOptional(input.senderLppId)
      ? { senderLppId: normalizeOptional(input.senderLppId) }
      : {}),
    ...(normalizeOptional(input.senderPlatformUserId)
      ? { senderPlatformUserId: normalizeOptional(input.senderPlatformUserId) }
      : {}),
    ...(normalizeOptional(input.senderUserId)
      ? { senderUserId: normalizeOptional(input.senderUserId) }
      : {}),
    ...(normalizeOptional(input.fromUserId)
      ? { fromUserId: normalizeOptional(input.fromUserId) }
      : {}),
    ...(normalizeOptional(input.platformUserId)
      ? { platformUserId: normalizeOptional(input.platformUserId) }
      : {}),
    ...(normalizeOptional(input.lppId)
      ? { lppId: normalizeOptional(input.lppId) }
      : {}),
    ...(normalizeOptional(input.avatarUrl) ? { avatarUrl: normalizeOptional(input.avatarUrl) } : {}),
    ...(normalizeOptional(input.sentAt) ? { sentAt: normalizeOptional(input.sentAt) } : {}),
    status: normalizeMessageStatus(input.status),
    updatedAt: Date.now(),
  };
}

export function localDataOutboxKey(scopeKey: string, localMessageId: string) {
  return [
    normalizeKeyPart(scopeKey, "unknown-scope"),
    normalizeKeyPart(localMessageId, "unknown-local-message"),
  ].join(":");
}

export function normalizeLocalDataOutboxRecord(input: LocalDataOutboxInput): LocalDataOutboxRecord {
  const updatedAt = typeof input.updatedAt === "number" ? input.updatedAt : Date.now();
  const retryCount = typeof input.retryCount === "number" ? input.retryCount : 0;
  return {
    bodyJson: input.bodyJson ?? {},
    clientMsgId: normalizeKeyPart(input.clientMsgId, "unknown-client-message"),
    conversationId: normalizeKeyPart(input.conversationId, "unknown-conversation"),
    conversationType: normalizeConversationType(input.conversationType),
    localMessageId: normalizeKeyPart(input.localMessageId, "unknown-local-message"),
    messageType: normalizeOptional(input.messageType) ?? "text",
    outboxId: localDataOutboxKey(input.scopeKey, input.localMessageId),
    retryCount,
    scopeKey: normalizeKeyPart(input.scopeKey, "unknown-scope"),
    status: normalizeOutboxStatus(input.status),
    updatedAt,
  };
}

export function upsertLocalDataMessages(
  current: LocalDataMessage[],
  incoming: LocalDataMessage[],
) {
  const byMessageId = new Map<string, LocalDataMessage>();
  const clientToMessageId = new Map<string, string>();
  for (const message of current) {
    byMessageId.set(message.messageId, message);
    if (message.clientMsgId) clientToMessageId.set(message.clientMsgId, message.messageId);
  }

  for (const message of incoming) {
    const clientMsgId = message.clientMsgId;
    const existingMessageId = clientMsgId ? clientToMessageId.get(clientMsgId) : undefined;
    if (existingMessageId && existingMessageId !== message.messageId) {
      const previous = byMessageId.get(existingMessageId);
      byMessageId.delete(existingMessageId);
      byMessageId.set(message.messageId, previous ? chooseNewerLocalMessage(previous, message) : message);
      if (clientMsgId) clientToMessageId.set(clientMsgId, message.messageId);
      continue;
    }
    const previous = byMessageId.get(message.messageId);
    byMessageId.set(
      message.messageId,
      previous ? chooseNewerLocalMessage(previous, message) : message,
    );
    if (message.clientMsgId) clientToMessageId.set(message.clientMsgId, message.messageId);
  }

  return Array.from(byMessageId.values()).sort(compareLocalDataMessages);
}

export function searchLocalDataMessages(
  messages: LocalDataMessage[],
  input: LocalSearchInput,
) {
  const keyword = normalizeOptional(input.keyword)?.toLowerCase();
  return messages
    .filter((message) => message.scopeKey === input.scopeKey)
    .filter((message) =>
      input.conversationType
        ? message.conversationType === normalizeConversationType(input.conversationType)
        : true,
    )
    .filter((message) => input.conversationId ? message.conversationId === input.conversationId : true)
    .filter((message) => {
      if (!keyword) return true;
      return searchableText(message).includes(keyword);
    })
    .sort(compareLocalDataMessages)
    .slice(0, Math.max(0, input.limit));
}

export function buildLocalConversationProjection(
  input: LocalConversationProjectionInput,
): LocalConversationProjection {
  const conversationType = normalizeConversationType(input.conversationType);
  const messages = input.messages
    .filter((message) => message.scopeKey === input.scopeKey)
    .filter((message) => message.conversationId === input.conversationId)
    .filter((message) => message.conversationType === conversationType)
    .sort(compareLocalDataMessages);
  const lastMessage = messages.at(-1) ?? null;
  return {
    conversationId: normalizeKeyPart(input.conversationId, "unknown-conversation"),
    conversationType,
    lastMessage,
    scopeKey: normalizeKeyPart(input.scopeKey, "unknown-scope"),
    unreadCount: messages.filter((message) => !message.isRead && message.status !== "deleted").length,
    updatedAt: lastMessage?.updatedAt ?? 0,
  };
}

export function buildLocalReminderProjection(
  conversation: LocalConversationProjection,
): LocalReminderProjection {
  return {
    conversationId: conversation.conversationId,
    conversationType: conversation.conversationType,
    shouldNotify: conversation.unreadCount > 0,
    unreadCount: conversation.unreadCount,
  };
}

function chooseNewerLocalMessage(left: LocalDataMessage, right: LocalDataMessage) {
  const leftSeq = comparableSeq(left);
  const rightSeq = comparableSeq(right);
  if (leftSeq !== rightSeq) return rightSeq > leftSeq ? { ...left, ...right } : left;
  const leftTime = comparableTime(left);
  const rightTime = comparableTime(right);
  if (leftTime !== rightTime) return rightTime > leftTime ? { ...left, ...right } : left;
  return { ...left, ...right };
}

function compareLocalDataMessages(left: LocalDataMessage, right: LocalDataMessage) {
  return (
    comparableSeq(left) - comparableSeq(right) ||
    comparableTime(left) - comparableTime(right) ||
    left.messageId.localeCompare(right.messageId)
  );
}

function searchableText(message: LocalDataMessage) {
  return [
    message.preview,
    message.messageId,
    message.clientMsgId,
    message.messageType,
    message.senderDisplayName,
    message.senderUserId,
    message.senderId,
    message.senderPlatformUserId,
    message.senderLppId,
    JSON.stringify(message.bodyJson),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function comparableSeq(message: LocalDataMessage) {
  return typeof message.conversationSeq === "number"
    ? message.conversationSeq
    : Number.MAX_SAFE_INTEGER;
}

function comparableTime(message: LocalDataMessage) {
  if (!message.sentAt) return Number.MAX_SAFE_INTEGER;
  const time = Date.parse(message.sentAt);
  return Number.isFinite(time) ? time : Number.MAX_SAFE_INTEGER;
}

function normalizeConversationType(value: string): LocalConversationType {
  if (value === "group") return "group";
  if (value === "customer_service") return "customer_service";
  return "direct";
}

function normalizeMessageStatus(value: LocalMessageStatus | string | null | undefined): LocalMessageStatus {
  if (
    value === "sending" ||
    value === "read" ||
    value === "failed" ||
    value === "recalled" ||
    value === "deleted"
  ) {
    return value;
  }
  return "sent";
}

function normalizeOutboxStatus(value: LocalDataOutboxStatus | string): LocalDataOutboxStatus {
  if (
    value === "queued" ||
    value === "uploading" ||
    value === "paused" ||
    value === "sending" ||
    value === "failed" ||
    value === "canceled" ||
    value === "archived"
  ) {
    return value;
  }
  return "failed";
}

function normalizeKeyPart(value: string, fallback: string) {
  return value.trim() || fallback;
}

function normalizeOptional(value: string | null | undefined) {
  const normalized = value?.trim();
  return normalized || undefined;
}
