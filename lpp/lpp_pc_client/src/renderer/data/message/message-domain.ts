import type { MessageItemDto } from "../api/types";
import {
  inferMessageType,
  messagePreviewFromBody,
  normalizeMessageBody,
  normalizeMessageType,
} from "../im-message-normalize";

export type ChatMessageSource = "im" | "customer_service";
export type ChatMessageConversationType = "direct" | "group" | "temp_session" | "im_direct" | string;
export type ChatMessageDirection = "incoming" | "outgoing" | "system" | "unknown";
export type ChatMessageDeliveryState =
  | "idle"
  | "queued"
  | "uploading"
  | "paused"
  | "sending"
  | "sent"
  | "failed"
  | "canceled"
  | "recalled";

export interface ChatMessageConversationContext {
  source: ChatMessageSource;
  conversationId: string;
  conversationType: ChatMessageConversationType;
  threadId?: string;
  threadType?: string;
}

export interface ChatMessageSenderEntity {
  userId?: string;
  senderId?: string;
  fromUserId?: string;
  platformUserId?: string;
  lppId?: string;
  displayName?: string;
  avatarUrl?: string | null;
}

export interface ChatMessageLocalState {
  localTaskId?: string;
  localSendStartedAt?: number;
  uploadPhase?: string;
  uploadProgress?: number;
  localError?: string;
  optimistic?: boolean;
}

export interface ChatMessageEntity {
  id: string;
  source: ChatMessageSource;
  conversation: ChatMessageConversationContext;
  conversationSeq?: number;
  sender: ChatMessageSenderEntity;
  type: string;
  body: Record<string, unknown>;
  preview: string;
  sentAt?: string;
  readAt?: string | null;
  readCount?: number;
  isRead?: boolean;
  direction: ChatMessageDirection;
  delivery: ChatMessageDeliveryState;
  recalled: boolean;
  local?: ChatMessageLocalState;
}

export interface ChatMessageEntityOptions {
  source: ChatMessageSource;
  conversationId?: string;
  conversationType?: ChatMessageConversationType;
  threadId?: string;
  threadType?: string;
}

type LocalMessageDto = MessageItemDto & {
  localTaskId?: string;
  localSendStartedAt?: number;
  uploadPhase?: string;
  uploadProgress?: number;
  localError?: string;
};

export function chatMessageEntityFromDto(
  message: MessageItemDto,
  options: ChatMessageEntityOptions,
): ChatMessageEntity {
  const localMessage = message as LocalMessageDto;
  const conversationId =
    message.conversationId || options.conversationId || options.threadId || "";
  const conversationType =
    options.conversationType || options.threadType || "direct";
  const type = normalizeMessageType(message) || inferMessageType(message.body ?? {}) || "text";
  const body = normalizeMessageBody(message.body, type);
  const preview = message.preview || messagePreviewFromBody(body, type) || "[消息]";
  const delivery = normalizeChatMessageDeliveryState(message.status, message.isRecalled);
  const local = normalizeLocalState(localMessage, delivery);

  return {
    id: message.messageId,
    source: options.source,
    conversation: {
      source: options.source,
      conversationId,
      conversationType,
      threadId: options.threadId,
      threadType: options.threadType,
    },
    conversationSeq: message.conversationSeq,
    sender: {
      userId: message.senderUserId,
      senderId: message.senderId,
      fromUserId: message.fromUserId,
      platformUserId: message.senderPlatformUserId || message.platformUserId,
      lppId: message.senderLppId || message.lppId,
      displayName: message.senderDisplayName,
      avatarUrl: message.senderAvatarUrl ?? message.avatarUrl,
    },
    type,
    body,
    preview,
    sentAt: message.sentAt,
    readAt: message.readAt,
    readCount: message.readCount,
    isRead: message.isRead,
    direction: normalizeChatMessageDirection(message),
    delivery,
    recalled: delivery === "recalled",
    local,
  };
}

export function chatMessageEntityToDto(
  entity: ChatMessageEntity,
  source: Partial<MessageItemDto> = {},
): MessageItemDto {
  return {
    ...source,
    messageId: entity.id,
    conversationId: entity.conversation.conversationId,
    conversationSeq: entity.conversationSeq,
    senderUserId: entity.sender.userId,
    senderId: entity.sender.senderId,
    fromUserId: entity.sender.fromUserId,
    senderPlatformUserId: entity.sender.platformUserId,
    platformUserId: entity.sender.platformUserId,
    senderLppId: entity.sender.lppId,
    lppId: entity.sender.lppId,
    senderDisplayName: entity.sender.displayName,
    senderAvatarUrl: entity.sender.avatarUrl,
    avatarUrl: entity.sender.avatarUrl,
    messageType: entity.type,
    body: entity.body,
    preview: entity.preview,
    sentAt: entity.sentAt,
    readAt: entity.readAt,
    readCount: entity.readCount,
    isRead: entity.isRead,
    status: entity.delivery === "idle" ? source.status : entity.delivery,
    isRecalled: entity.recalled || source.isRecalled,
    isSelf: entity.direction === "outgoing" ? true : source.isSelf,
    direction: entity.direction === "unknown" ? source.direction : entity.direction,
    ...(entity.local?.localTaskId ? { localTaskId: entity.local.localTaskId } : {}),
    ...(typeof entity.local?.localSendStartedAt === "number"
      ? { localSendStartedAt: entity.local.localSendStartedAt }
      : {}),
    ...(typeof entity.local?.uploadProgress === "number"
      ? { uploadProgress: entity.local.uploadProgress }
      : {}),
    ...(entity.local?.uploadPhase ? { uploadPhase: entity.local.uploadPhase } : {}),
    ...(entity.local?.localError ? { localError: entity.local.localError } : {}),
  } as MessageItemDto;
}

export function reuseStableMessageItems(
  previous: MessageItemDto[] | undefined,
  next: MessageItemDto[] | undefined,
): MessageItemDto[] | undefined {
  if (!next || !previous?.length) return next;

  const previousByKey = new Map<string, MessageItemDto>();
  const previousFingerprintByKey = new Map<string, string>();
  previous.forEach((message) => {
    const key = stableMessageKey(message);
    if (!key) return;
    previousByKey.set(key, message);
    previousFingerprintByKey.set(key, stableMessageFingerprint(message));
  });

  let reusedEveryItem = previous.length === next.length;
  const stableNext = next.map((message, index) => {
    const key = stableMessageKey(message);
    const previousMessage = key ? previousByKey.get(key) : undefined;
    const messageWithStableIdentity = previousMessage
      ? preservePreviousClientIdentity(previousMessage, message)
      : message;
    const shouldReuse =
      Boolean(previousMessage) &&
      previousFingerprintByKey.get(key) === stableMessageFingerprint(messageWithStableIdentity);
    const resolved = shouldReuse ? previousMessage! : messageWithStableIdentity;
    if (resolved !== previous[index]) reusedEveryItem = false;
    return resolved;
  });

  return reusedEveryItem ? previous : stableNext;
}

export function mergeStableMessagePage(
  previous: MessageItemDto[] | undefined,
  next: MessageItemDto[] | undefined,
): MessageItemDto[] | undefined {
  if (!next || !previous?.length) return reuseStableMessageItems(previous, next);

  const stableNext = reuseStableMessageItems(previous, next) ?? next;
  const nextIdentityKeys = new Set(stableNext.flatMap(messageIdentityKeys));
  const boundary = latestPageBoundary(stableNext);
  const retainedPrevious = previous.filter((message) => {
    if (messageIdentityKeys(message).some((key) => nextIdentityKeys.has(key))) {
      return false;
    }
    return isPendingLocalMessage(message) || isOlderThanLatestPage(message, boundary);
  });
  if (retainedPrevious.length === 0) return stableNext;
  return sortMessageItems([...retainedPrevious, ...stableNext]);
}

export function normalizeChatMessageDeliveryState(
  status?: string,
  isRecalled?: boolean,
): ChatMessageDeliveryState {
  if (isRecalled) return "recalled";
  const normalized = normalizeStatus(status);
  if (
    normalized === "queued" ||
    normalized === "uploading" ||
    normalized === "paused" ||
    normalized === "sending" ||
    normalized === "sent" ||
    normalized === "failed" ||
    normalized === "canceled" ||
    normalized === "recalled"
  ) {
    return normalized;
  }
  return "idle";
}

export function normalizeChatMessageDirection(message: MessageItemDto): ChatMessageDirection {
  if (message.isRecalled || message.status === "recalled") return "system";
  if (message.isSelf === true || message.isMine === true) return "outgoing";
  const direction = normalizeStatus(message.direction);
  if (["out", "outgoing", "sent", "mine", "self"].includes(direction)) return "outgoing";
  if (["in", "incoming", "received", "other"].includes(direction)) return "incoming";
  const type = normalizeMessageType(message);
  if (type === "event" || type === "system") return "system";
  return "unknown";
}

function normalizeLocalState(
  message: LocalMessageDto,
  delivery: ChatMessageDeliveryState,
): ChatMessageLocalState | undefined {
  const local: ChatMessageLocalState = {};
  if (message.localTaskId) local.localTaskId = message.localTaskId;
  if (typeof message.localSendStartedAt === "number") {
    local.localSendStartedAt = message.localSendStartedAt;
  }
  if (typeof message.uploadProgress === "number") local.uploadProgress = message.uploadProgress;
  if (message.uploadPhase) local.uploadPhase = message.uploadPhase;
  if (message.localError) local.localError = message.localError;
  if (["queued", "uploading", "paused", "sending", "failed", "canceled"].includes(delivery)) {
    local.optimistic = true;
  }
  return Object.keys(local).length ? local : undefined;
}

function normalizeStatus(value?: string) {
  return value?.trim().toLowerCase().replace(/-/g, "_") ?? "";
}

function stableMessageKey(message: MessageItemDto) {
  if (message.messageId) return message.messageId;
  if (message.conversationSeq !== undefined) {
    return [
      message.conversationId ?? "",
      message.conversationSeq,
      message.sentAt ?? "",
    ].join(":");
  }
  return "";
}

function preservePreviousClientIdentity(
  previous: MessageItemDto,
  next: MessageItemDto,
): MessageItemDto {
  const nextRecord = next as unknown as Record<string, unknown>;
  if (
    hasNonEmptyString(nextRecord.clientMsgId) ||
    hasNonEmptyString(nextRecord.clientMessageId) ||
    hasNonEmptyString(nextRecord.localTaskId)
  ) {
    return next;
  }

  const previousRecord = previous as unknown as Record<string, unknown>;
  const clientMsgId = stringRecordValue(previousRecord.clientMsgId);
  const clientMessageId = stringRecordValue(previousRecord.clientMessageId);
  const localTaskId = stringRecordValue(previousRecord.localTaskId);
  if (!clientMsgId && !clientMessageId && !localTaskId) return next;
  return {
    ...next,
    ...(clientMsgId ? { clientMsgId } : {}),
    ...(clientMessageId ? { clientMessageId } : {}),
    ...(localTaskId ? { localTaskId } : {}),
  };
}

function messageIdentityKeys(message: MessageItemDto) {
  const keys = new Set<string>();
  const record = message as unknown as Record<string, unknown>;
  if (message.messageId) keys.add(`message:${message.messageId}`);
  if (typeof record.clientMsgId === "string" && record.clientMsgId.trim()) {
    keys.add(`client:${record.clientMsgId.trim()}`);
  }
  if (typeof record.clientMessageId === "string" && record.clientMessageId.trim()) {
    keys.add(`client:${record.clientMessageId.trim()}`);
  }
  if (message.conversationId && typeof message.conversationSeq === "number") {
    keys.add(`seq:${message.conversationId}:${message.conversationSeq}`);
  }
  return [...keys];
}

function hasNonEmptyString(value: unknown) {
  return typeof value === "string" && Boolean(value.trim());
}

function stringRecordValue(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : "";
}

function latestPageBoundary(messages: MessageItemDto[]) {
  const seqs = messages
    .map((message) => message.conversationSeq)
    .filter((seq): seq is number => typeof seq === "number");
  if (seqs.length > 0) {
    return { kind: "seq" as const, value: Math.min(...seqs) };
  }
  const times = messages
    .map((message) => Date.parse(message.sentAt ?? ""))
    .filter((time) => Number.isFinite(time));
  if (times.length > 0) {
    return { kind: "time" as const, value: Math.min(...times) };
  }
  return undefined;
}

function isOlderThanLatestPage(
  message: MessageItemDto,
  boundary: ReturnType<typeof latestPageBoundary>,
) {
  if (!boundary) return false;
  if (boundary.kind === "seq" && typeof message.conversationSeq === "number") {
    return message.conversationSeq < boundary.value;
  }
  const sentAt = Date.parse(message.sentAt ?? "");
  return Number.isFinite(sentAt) && sentAt < boundary.value;
}

function isPendingLocalMessage(message: MessageItemDto) {
  const status = normalizeStatus(message.status);
  return (
    message.messageId?.startsWith("pc-local-") ||
    status === "queued" ||
    status === "sending" ||
    status === "uploading" ||
    status === "paused"
  );
}

function sortMessageItems(messages: MessageItemDto[]) {
  return [...messages].sort((left, right) => {
    const leftSeq = typeof left.conversationSeq === "number"
      ? left.conversationSeq
      : Number.MAX_SAFE_INTEGER;
    const rightSeq = typeof right.conversationSeq === "number"
      ? right.conversationSeq
      : Number.MAX_SAFE_INTEGER;
    if (leftSeq !== rightSeq) return leftSeq - rightSeq;
    return Date.parse(left.sentAt ?? "") - Date.parse(right.sentAt ?? "");
  });
}

function stableMessageFingerprint(message: MessageItemDto) {
  return stableStringify({
    avatarUrl: message.avatarUrl,
    body: message.body,
    conversationId: message.conversationId,
    conversationSeq: message.conversationSeq,
    direction: message.direction,
    fromUserId: message.fromUserId,
    isMine: message.isMine,
    isRead: message.isRead,
    isRecalled: message.isRecalled,
    isSelf: message.isSelf,
    lppId: message.lppId,
    localSendStartedAt: (message as unknown as { localSendStartedAt?: number }).localSendStartedAt,
    messageType: message.messageType,
    platformUserId: message.platformUserId,
    preview: message.preview,
    readAt: message.readAt,
    readCount: message.readCount,
    senderAvatarUrl: message.senderAvatarUrl,
    senderDisplayName: message.senderDisplayName,
    senderId: message.senderId,
    senderLppId: message.senderLppId,
    senderPlatformUserId: message.senderPlatformUserId,
    senderUserId: message.senderUserId,
    sentAt: message.sentAt,
    status: message.status,
  });
}

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;

  const record = value as Record<string, unknown>;
  return `{${Object.keys(record)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${stableStringify(record[key])}`)
    .join(",")}}`;
}
