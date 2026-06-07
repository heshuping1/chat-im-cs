import {
  normalizeLocalDataMessage,
  type LocalConversationType,
  type LocalDataClearScopePayload,
  type LocalDataCleanupPayload,
  type LocalDataDeleteMessagePayload,
  type LocalDataDeleteOutboxPayload,
  type LocalDataGetMediaVariantPayload,
  type LocalDataListCustomerServiceThreadsPayload,
  type LocalDataListMessagesPayload,
  type LocalDataListOutboxPayload,
  type LocalDataRepairPayload,
  type LocalDataSearchMessagesPayload,
  type LocalDataStorageStatsPayload,
  type LocalDataUpsertCustomerServiceThreadPayload,
  type LocalDataUpsertMediaPayload,
  type LocalDataUpsertMessagesPayload,
  type LocalDataUpsertOutboxPayload,
} from "./local-data-contract.js";

const maxShortTextLength = 4_096;

export function validateLocalDataListMessagesPayload(value: unknown): LocalDataListMessagesPayload {
  const record = objectValue(value, "localData.listMessages");
  return {
    beforeSeq: optionalBoundedInteger(record.beforeSeq, "localData.beforeSeq", 1, Number.MAX_SAFE_INTEGER),
    conversationId: safeRequiredString(record.conversationId, "localData.conversationId"),
    conversationType: validateLocalConversationType(record.conversationType, "localData.conversationType"),
    limit: boundedInteger(record.limit, "localData.limit", 1, 500),
    scopeKey: safeRequiredString(record.scopeKey, "localData.scopeKey"),
  };
}

export function validateLocalDataDeleteMessagePayload(value: unknown): LocalDataDeleteMessagePayload {
  const record = objectValue(value, "localData.deleteMessage");
  return {
    conversationId: safeRequiredString(record.conversationId, "localData.conversationId"),
    conversationType: validateLocalConversationType(record.conversationType, "localData.conversationType"),
    messageId: safeRequiredString(record.messageId, "localData.messageId"),
    scopeKey: safeRequiredString(record.scopeKey, "localData.scopeKey"),
  };
}

export function validateLocalDataClearScopePayload(value: unknown): LocalDataClearScopePayload {
  const record = objectValue(value, "localData.clearScope");
  return { scopeKey: safeRequiredString(record.scopeKey, "localData.scopeKey") };
}

export function validateLocalDataStorageStatsPayload(value: unknown): LocalDataStorageStatsPayload {
  if (value === undefined || value === null) return {};
  const record = objectValue(value, "localData.storageStats");
  return { scopeKey: optionalString(record.scopeKey, "localData.scopeKey") };
}

export function validateLocalDataCleanupPayload(value: unknown): LocalDataCleanupPayload {
  const record = objectValue(value, "localData.cleanup");
  const target = safeRequiredString(record.target, "localData.cleanup.target", 64);
  if (target !== "media-cache" && target !== "message-index" && target !== "orphan-files") {
    throw new Error("localData.cleanup.target must be media-cache, message-index or orphan-files");
  }
  return { scopeKey: optionalString(record.scopeKey, "localData.scopeKey"), target };
}

export function validateLocalDataSearchMessagesPayload(value: unknown): LocalDataSearchMessagesPayload {
  const record = objectValue(value, "localData.searchMessages");
  return {
    conversationId: optionalString(record.conversationId, "localData.conversationId"),
    conversationType:
      record.conversationType === undefined || record.conversationType === null
        ? undefined
        : validateLocalConversationType(record.conversationType, "localData.conversationType"),
    keyword: optionalString(record.keyword, "localData.keyword"),
    limit: boundedInteger(record.limit, "localData.limit", 1, 500),
    scopeKey: safeRequiredString(record.scopeKey, "localData.scopeKey"),
  };
}

export function validateLocalDataUpsertMessagesPayload(value: unknown): LocalDataUpsertMessagesPayload {
  const record = objectValue(value, "localData.upsertMessages");
  const scopeKey = safeRequiredString(record.scopeKey, "localData.scopeKey");
  const messages = arrayValue(record.messages, "localData.messages", 500).map((item, index) => {
    const message = objectValue(item, `localData.messages.${index}`);
    return normalizeLocalDataMessage({
      bodyJson: optionalJsonRecord(message.bodyJson, `localData.messages.${index}.bodyJson`),
      clientMsgId: optionalString(message.clientMsgId, `localData.messages.${index}.clientMsgId`),
      conversationId: safeRequiredString(message.conversationId, `localData.messages.${index}.conversationId`),
      conversationSeq: optionalBoundedInteger(message.conversationSeq, `localData.messages.${index}.conversationSeq`, 1, Number.MAX_SAFE_INTEGER),
      conversationType: validateLocalConversationType(message.conversationType, `localData.messages.${index}.conversationType`),
      isRead: typeof message.isRead === "boolean" ? message.isRead : undefined,
      messageId: safeRequiredString(message.messageId, "localData.messageId"),
      messageType: optionalString(message.messageType, `localData.messages.${index}.messageType`),
      preview: optionalString(message.preview, `localData.messages.${index}.preview`),
      scopeKey,
      senderUserId: optionalString(message.senderUserId, `localData.messages.${index}.senderUserId`),
      sentAt: optionalString(message.sentAt, `localData.messages.${index}.sentAt`),
      status: optionalString(message.status, `localData.messages.${index}.status`),
    });
  });
  return { messages, scopeKey };
}

export function validateLocalDataGetMediaVariantPayload(value: unknown): LocalDataGetMediaVariantPayload {
  const record = objectValue(value, "localData.getMediaVariant");
  return {
    mediaIdentity: safeRequiredString(record.mediaIdentity, "localData.mediaIdentity", 512),
    variantKind: optionalVariantKind(record.variantKind, "localData.variantKind"),
  };
}

export function validateLocalDataUpsertMediaPayload(value: unknown): LocalDataUpsertMediaPayload {
  const record = objectValue(value, "localData.upsertMedia");
  const asset = objectValue(record.asset, "localData.media.asset");
  const mediaIdentity = safeRequiredString(asset.mediaIdentity, "localData.mediaIdentity", 512);
  return {
    asset: {
      fileName: optionalString(asset.fileName, "localData.media.fileName", 512),
      identitySource: optionalString(asset.identitySource, "localData.media.identitySource", 64),
      kind: validateMediaKind(asset.kind, "localData.media.kind"),
      mediaIdentity,
      metadataJson: optionalJsonRecord(asset.metadataJson, "localData.media.metadataJson"),
      mimeType: optionalString(asset.mimeType, "localData.media.mimeType", 128),
      serverUrl: optionalString(asset.serverUrl, "localData.media.serverUrl", 4096),
      sizeBytes: optionalBoundedInteger(asset.sizeBytes, "localData.media.sizeBytes", 0, Number.MAX_SAFE_INTEGER),
    },
    messageRefs: arrayValue(record.messageRefs ?? [], "localData.media.messageRefs", 100).map((item, index) => {
      const ref = objectValue(item, `localData.media.messageRefs.${index}`);
      return {
        mediaIdentity: safeRequiredString(ref.mediaIdentity, `localData.media.messageRefs.${index}.mediaIdentity`, 512),
        messageId: safeRequiredString(ref.messageId, `localData.media.messageRefs.${index}.messageId`, 256),
        refKind: optionalString(ref.refKind, `localData.media.messageRefs.${index}.refKind`, 64),
      };
    }),
    variants: arrayValue(record.variants ?? [], "localData.media.variants", 20).map((item, index) => {
      const variant = objectValue(item, `localData.media.variants.${index}`);
      return {
        bytes: optionalBoundedInteger(variant.bytes, `localData.media.variants.${index}.bytes`, 0, Number.MAX_SAFE_INTEGER),
        errorReason: optionalString(variant.errorReason, `localData.media.variants.${index}.errorReason`, 512),
        localUrl: optionalString(variant.localUrl, `localData.media.variants.${index}.localUrl`, 4096),
        mediaIdentity: safeRequiredString(variant.mediaIdentity ?? mediaIdentity, `localData.media.variants.${index}.mediaIdentity`, 512),
        serverUrl: optionalString(variant.serverUrl, `localData.media.variants.${index}.serverUrl`, 4096),
        status: optionalVariantStatus(variant.status, `localData.media.variants.${index}.status`),
        variantKind: optionalVariantKind(variant.variantKind, `localData.media.variants.${index}.variantKind`),
      };
    }),
  };
}

export function validateLocalDataUpsertOutboxPayload(value: unknown): LocalDataUpsertOutboxPayload {
  const record = objectValue(value, "localData.upsertOutbox");
  const outbox = objectValue(record.record, "localData.outbox.record");
  return {
    record: {
      bodyJson: optionalJsonRecord(outbox.bodyJson, "localData.outbox.bodyJson"),
      clientMsgId: safeRequiredString(outbox.clientMsgId, "localData.outbox.clientMsgId", 256),
      conversationId: safeRequiredString(outbox.conversationId, "localData.outbox.conversationId", 256),
      conversationType: validateLocalConversationType(outbox.conversationType, "localData.outbox.conversationType"),
      localMessageId: safeRequiredString(outbox.localMessageId, "localData.outbox.localMessageId", 256),
      messageType: safeRequiredString(outbox.messageType, "localData.outbox.messageType", 64),
      retryCount: optionalBoundedInteger(outbox.retryCount, "localData.outbox.retryCount", 0, 100),
      scopeKey: safeRequiredString(outbox.scopeKey, "localData.outbox.scopeKey"),
      status: safeRequiredString(outbox.status, "localData.outbox.status", 64),
      updatedAt: optionalBoundedInteger(outbox.updatedAt, "localData.outbox.updatedAt", 0, Number.MAX_SAFE_INTEGER),
    },
  };
}

export function validateLocalDataListOutboxPayload(value: unknown): LocalDataListOutboxPayload {
  const record = objectValue(value, "localData.listOutbox");
  return {
    conversationId: optionalString(record.conversationId, "localData.outbox.conversationId"),
    conversationType:
      record.conversationType === undefined || record.conversationType === null
        ? undefined
        : validateLocalConversationType(record.conversationType, "localData.outbox.conversationType"),
    scopeKey: safeRequiredString(record.scopeKey, "localData.outbox.scopeKey"),
  };
}

export function validateLocalDataDeleteOutboxPayload(value: unknown): LocalDataDeleteOutboxPayload {
  const record = objectValue(value, "localData.deleteOutbox");
  return {
    localMessageId: safeRequiredString(record.localMessageId, "localData.outbox.localMessageId", 256),
    scopeKey: safeRequiredString(record.scopeKey, "localData.outbox.scopeKey"),
  };
}

export function validateLocalDataUpsertCustomerServiceThreadPayload(
  value: unknown,
): LocalDataUpsertCustomerServiceThreadPayload {
  const record = objectValue(value, "localData.upsertCustomerServiceThread");
  const thread = objectValue(record.thread, "localData.customerService.thread");
  return {
    thread: {
      customerSnapshotJson: optionalJsonRecord(thread.customerSnapshotJson, "localData.customerService.customerSnapshotJson"),
      lastEventJson: optionalJsonRecord(thread.lastEventJson, "localData.customerService.lastEventJson"),
      scopeKey: safeRequiredString(thread.scopeKey, "localData.customerService.scopeKey"),
      status: optionalString(thread.status, "localData.customerService.status", 64),
      threadId: safeRequiredString(thread.threadId, "localData.customerService.threadId", 256),
      threadType: safeRequiredString(thread.threadType, "localData.customerService.threadType", 128),
      unreadCount: optionalBoundedInteger(thread.unreadCount, "localData.customerService.unreadCount", 0, 9999),
      updatedAt: optionalBoundedInteger(thread.updatedAt, "localData.customerService.updatedAt", 0, Number.MAX_SAFE_INTEGER),
    },
  };
}

export function validateLocalDataListCustomerServiceThreadsPayload(
  value: unknown,
): LocalDataListCustomerServiceThreadsPayload {
  const record = objectValue(value, "localData.listCustomerServiceThreads");
  return {
    limit: optionalBoundedInteger(record.limit, "localData.customerService.limit", 1, 500),
    scopeKey: safeRequiredString(record.scopeKey, "localData.customerService.scopeKey"),
  };
}

export function validateLocalDataRepairPayload(value: unknown): LocalDataRepairPayload {
  if (value === undefined || value === null) return {};
  const record = objectValue(value, "localData.repair");
  return {
    rebuildFts: typeof record.rebuildFts === "boolean" ? record.rebuildFts : undefined,
    scopeKey: optionalString(record.scopeKey, "localData.repair.scopeKey"),
  };
}

function objectValue(value: unknown, label: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${label} must be an object`);
  }
  return value as Record<string, unknown>;
}

function arrayValue(value: unknown, label: string, maxLength: number) {
  if (!Array.isArray(value)) throw new Error(`${label} must be an array`);
  if (value.length > maxLength) throw new Error(`${label} exceeds ${maxLength} items`);
  return value;
}

function safeRequiredString(value: unknown, label: string, maxLength = maxShortTextLength) {
  if (typeof value !== "string") throw new Error(`${label} must be a string`);
  const text = value.trim();
  if (!text) throw new Error(`${label} is required`);
  if (text.length > maxLength) throw new Error(`${label} is too long`);
  return text;
}

function optionalString(value: unknown, label: string, maxLength = maxShortTextLength) {
  if (value === undefined || value === null) return undefined;
  if (typeof value !== "string") throw new Error(`${label} must be a string`);
  const text = value.trim();
  if (!text) return undefined;
  if (text.length > maxLength) throw new Error(`${label} is too long`);
  return text;
}

function optionalJsonRecord(value: unknown, label: string) {
  if (value === undefined || value === null) return {};
  return objectValue(value, label);
}

function validateLocalConversationType(value: unknown, label: string): LocalConversationType {
  const type = safeRequiredString(value, label, 64);
  if (type === "direct" || type === "group" || type === "customer_service") return type;
  throw new Error(`${label} must be direct, group or customer_service`);
}

function validateMediaKind(value: unknown, label: string) {
  const kind = safeRequiredString(value, label, 64);
  if (kind === "image" || kind === "video" || kind === "file") return kind;
  throw new Error(`${label} must be image, video or file`);
}

function optionalVariantKind(value: unknown, label: string) {
  if (value === undefined || value === null) return undefined;
  const kind = safeRequiredString(value, label, 64);
  if (kind === "original" || kind === "thumbnail" || kind === "poster" || kind === "display") return kind;
  throw new Error(`${label} must be original, thumbnail, poster or display`);
}

function optionalVariantStatus(value: unknown, label: string) {
  if (value === undefined || value === null) return undefined;
  const status = safeRequiredString(value, label, 64);
  if (status === "cached" || status === "stale" || status === "failed") return status;
  throw new Error(`${label} must be cached, stale or failed`);
}

function boundedInteger(value: unknown, label: string, min: number, max: number) {
  const numberValue = Number(value);
  if (!Number.isInteger(numberValue) || numberValue < min || numberValue > max) {
    throw new Error(`${label} must be an integer between ${min} and ${max}`);
  }
  return numberValue;
}

function optionalBoundedInteger(value: unknown, label: string, min: number, max: number) {
  if (value === undefined || value === null) return undefined;
  return boundedInteger(value, label, min, max);
}
