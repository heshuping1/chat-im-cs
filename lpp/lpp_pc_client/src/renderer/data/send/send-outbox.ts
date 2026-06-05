import type { MessageItemDto } from "../api/types";
import type { AuthSession } from "../auth/auth-session";

export type SendOutboxChannel = "im" | "customer_service";
export type SendOutboxMessageType = "text" | "image" | "video" | "file" | "contact_card";
export type SendOutboxStatus =
  | "queued"
  | "uploading"
  | "paused"
  | "sending"
  | "failed"
  | "canceled";
export type SendOutboxUploadPhase =
  | "preparing"
  | "uploading_media"
  | "uploading_poster"
  | "sending"
  | "failed"
  | "sent";

export interface SendOutboxRecord {
  body: Record<string, unknown>;
  channel: SendOutboxChannel;
  clientMsgId: string;
  createdAt: number;
  fileBlobId?: string;
  fileName?: string;
  localError?: string;
  localFailedAt?: number;
  localMessageId: string;
  localTaskId?: string;
  messageType: SendOutboxMessageType;
  mimeType?: string;
  posterBlobId?: string;
  reply?: unknown;
  scopeKey: string;
  status: SendOutboxStatus;
  targetId: string;
  targetType: string;
  updatedAt: number;
  uploadPhase?: SendOutboxUploadPhase;
  uploadProgress?: number;
}

export interface SendOutboxListFilter {
  scopeKey?: string;
  targetKey?: string;
}

export interface SendOutboxStorage {
  cleanupExpired(now?: number): Promise<void>;
  deleteRecord(scopeKey: string, localMessageId: string): Promise<void>;
  getBlob(blobId: string): Promise<Blob | null>;
  listRecords(filter?: SendOutboxListFilter): Promise<SendOutboxRecord[]>;
  patchRecord(
    scopeKey: string,
    localMessageId: string,
    patch: Partial<SendOutboxRecord>,
  ): Promise<void>;
  putBlob(blobId: string, blob: Blob): Promise<void>;
  removeBlob(blobId: string): Promise<void>;
  upsertRecord(record: SendOutboxRecord): Promise<void>;
}

export const sendOutboxRetentionMs = 30 * 24 * 60 * 60 * 1000;
export const sendOutboxInterruptedGraceMs = 10_000;
const outboxDbName = "lpp-pc-send-outbox";
const outboxDbVersion = 1;
const recordsStoreName = "records";
const blobsStoreName = "blobs";

export function sendOutboxScopeKey(session: AuthSession | null | undefined) {
  return [
    session?.apiBaseUrl || "unknown-base",
    session?.tenantId || "unknown-tenant",
    session?.userId || session?.platformUserId || session?.lppId || "unknown-user",
  ].join("|");
}

export function sendOutboxTargetKey(
  channel: SendOutboxChannel,
  targetType: string,
  targetId: string,
) {
  return `${channel}:${targetType}:${targetId}`;
}

export function sendOutboxRecordKey(scopeKey: string, localMessageId: string) {
  return `${scopeKey}:${localMessageId}`;
}

export function sendOutboxBlobId(
  scopeKey: string,
  localMessageId: string,
  kind: "file" | "poster",
) {
  return `${scopeKey}:${localMessageId}:${kind}`;
}

export function expiredOutboxCutoff(now = Date.now()) {
  return now - sendOutboxRetentionMs;
}

export function sendOutboxRecordToMessage(
  record: SendOutboxRecord,
  identity?: {
    avatarUrl?: string | null;
    displayName?: string | null;
    lppId?: string | null;
    platformUserId?: string | null;
    userId?: string | null;
  } | null,
): MessageItemDto {
  const message = {
    body: record.body,
    conversationId: record.targetId,
    direction: "out",
    isMine: true,
    isSelf: true,
    localError: record.localError,
    localFailedAt: record.localFailedAt,
    localTaskId: record.localTaskId,
    messageId: record.localMessageId,
    messageType: record.messageType,
    preview: previewFromOutboxBody(record.messageType, record.body),
    senderAvatarUrl: identity?.avatarUrl ?? null,
    senderDisplayName: identity?.displayName || "我",
    senderLppId: identity?.lppId ?? undefined,
    senderUserId: identity?.userId || identity?.platformUserId || undefined,
    sentAt: new Date(record.createdAt).toISOString(),
    status: record.status,
    uploadPhase: record.uploadPhase,
    uploadProgress: record.uploadProgress,
  } as MessageItemDto;
  return interruptedOutboxMessage(message);
}

export function interruptedOutboxMessage(message: MessageItemDto): MessageItemDto {
  const record = message as unknown as Record<string, unknown>;
  const status = typeof record.status === "string" ? record.status : "";
  if (!["queued", "uploading", "sending", "paused"].includes(status)) {
    return message;
  }
  return {
    ...message,
    localError: "发送中断，点击重试",
    status: "failed",
    uploadPhase: "failed",
    uploadProgress: undefined,
  } as MessageItemDto;
}

export function shouldMarkOutboxRecordInterrupted(
  record: Pick<SendOutboxRecord, "createdAt" | "status" | "updatedAt">,
  now = Date.now(),
) {
  if (!["queued", "uploading", "sending", "paused"].includes(record.status)) return false;
  const latestActivityAt = Math.max(record.createdAt, record.updatedAt);
  return now - latestActivityAt >= sendOutboxInterruptedGraceMs;
}

export async function createOutboxFile(
  storage: Pick<SendOutboxStorage, "getBlob">,
  record: SendOutboxRecord,
) {
  if (!record.fileBlobId) return null;
  const blob = await storage.getBlob(record.fileBlobId);
  if (!blob) return null;
  return new File([blob], record.fileName || "upload.bin", {
    type: record.mimeType || blob.type || "application/octet-stream",
  });
}

export function createMemorySendOutboxStorage(): SendOutboxStorage {
  const records = new Map<string, SendOutboxRecord>();
  const blobs = new Map<string, Blob>();

  const storage: SendOutboxStorage = {
    async cleanupExpired(now = Date.now()) {
      const cutoff = expiredOutboxCutoff(now);
      for (const [key, record] of records) {
        if (record.updatedAt >= cutoff && record.createdAt >= cutoff) continue;
        records.delete(key);
        await deleteRecordBlobs(storage, record);
      }
    },
    async deleteRecord(scopeKey, localMessageId) {
      const key = sendOutboxRecordKey(scopeKey, localMessageId);
      const record = records.get(key);
      records.delete(key);
      if (record) await deleteRecordBlobs(storage, record);
    },
    async getBlob(blobId) {
      return blobs.get(blobId) ?? null;
    },
    async listRecords(filter = {}) {
      return Array.from(records.values())
        .filter((record) => recordMatchesFilter(record, filter))
        .sort(sortOutboxRecords);
    },
    async patchRecord(scopeKey, localMessageId, patch) {
      const key = sendOutboxRecordKey(scopeKey, localMessageId);
      const existing = records.get(key);
      if (!existing) return;
      records.set(key, { ...existing, ...patch });
    },
    async putBlob(blobId, blob) {
      blobs.set(blobId, blob);
    },
    async removeBlob(blobId) {
      blobs.delete(blobId);
    },
    async upsertRecord(record) {
      records.set(sendOutboxRecordKey(record.scopeKey, record.localMessageId), record);
    },
  };

  return storage;
}

function previewFromOutboxBody(
  messageType: SendOutboxMessageType,
  body: Record<string, unknown>,
) {
  if (messageType === "text") {
    const text = body.text;
    return typeof text === "string" ? text : "";
  }
  if (messageType === "image") return "[图片]";
  if (messageType === "video") return "[视频]";
  if (messageType === "file") return "[文件]";
  if (messageType === "contact_card") return "[名片]";
  return "[消息]";
}

export function getSendOutboxStorage(): SendOutboxStorage {
  if (typeof indexedDB === "undefined") return createMemorySendOutboxStorage();
  return indexedDbSendOutboxStorage;
}

async function deleteRecordBlobs(storage: SendOutboxStorage, record: SendOutboxRecord) {
  await Promise.all(
    [record.fileBlobId, record.posterBlobId]
      .filter((id): id is string => Boolean(id))
      .map((id) => storage.removeBlob(id)),
  );
}

function recordMatchesFilter(record: SendOutboxRecord, filter: SendOutboxListFilter) {
  if (filter.scopeKey && record.scopeKey !== filter.scopeKey) return false;
  if (
    filter.targetKey &&
    sendOutboxTargetKey(record.channel, record.targetType, record.targetId) !== filter.targetKey
  ) {
    return false;
  }
  return true;
}

function sortOutboxRecords(left: SendOutboxRecord, right: SendOutboxRecord) {
  return left.createdAt - right.createdAt || left.localMessageId.localeCompare(right.localMessageId);
}

const indexedDbSendOutboxStorage: SendOutboxStorage = {
  async cleanupExpired(now = Date.now()) {
    const expired = (await this.listRecords()).filter(
      (record) => record.createdAt < expiredOutboxCutoff(now) || record.updatedAt < expiredOutboxCutoff(now),
    );
    await Promise.all(expired.map((record) => this.deleteRecord(record.scopeKey, record.localMessageId)));
  },
  async deleteRecord(scopeKey, localMessageId) {
    const db = await openOutboxDb();
    const key = sendOutboxRecordKey(scopeKey, localMessageId);
    const record = await getFromStore<SendOutboxRecord>(db, recordsStoreName, key);
    const transaction = db.transaction([recordsStoreName, blobsStoreName], "readwrite");
    transaction.objectStore(recordsStoreName).delete(key);
    if (record?.fileBlobId) transaction.objectStore(blobsStoreName).delete(record.fileBlobId);
    if (record?.posterBlobId) transaction.objectStore(blobsStoreName).delete(record.posterBlobId);
    await transactionDone(transaction);
  },
  async getBlob(blobId) {
    const db = await openOutboxDb();
    return (await getFromStore<Blob>(db, blobsStoreName, blobId)) ?? null;
  },
  async listRecords(filter = {}) {
    const db = await openOutboxDb();
    const records = await getAllFromStore<SendOutboxRecord>(db, recordsStoreName);
    return records.filter((record) => recordMatchesFilter(record, filter)).sort(sortOutboxRecords);
  },
  async patchRecord(scopeKey, localMessageId, patch) {
    const db = await openOutboxDb();
    const key = sendOutboxRecordKey(scopeKey, localMessageId);
    const existing = await getFromStore<SendOutboxRecord>(db, recordsStoreName, key);
    if (!existing) return;
    await putToStore(db, recordsStoreName, { ...existing, ...patch });
  },
  async putBlob(blobId, blob) {
    const db = await openOutboxDb();
    await putToStore(db, blobsStoreName, blob, blobId);
  },
  async removeBlob(blobId) {
    const db = await openOutboxDb();
    await deleteFromStore(db, blobsStoreName, blobId);
  },
  async upsertRecord(record) {
    const db = await openOutboxDb();
    await putToStore(db, recordsStoreName, {
      ...record,
      id: sendOutboxRecordKey(record.scopeKey, record.localMessageId),
      targetKey: sendOutboxTargetKey(record.channel, record.targetType, record.targetId),
    });
  },
};

let outboxDbPromise: Promise<IDBDatabase> | null = null;

function openOutboxDb() {
  if (outboxDbPromise) return outboxDbPromise;
  outboxDbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(outboxDbName, outboxDbVersion);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(recordsStoreName)) {
        const records = db.createObjectStore(recordsStoreName, { keyPath: "id" });
        records.createIndex("scopeKey", "scopeKey", { unique: false });
        records.createIndex("targetKey", "targetKey", { unique: false });
        records.createIndex("updatedAt", "updatedAt", { unique: false });
      }
      if (!db.objectStoreNames.contains(blobsStoreName)) {
        db.createObjectStore(blobsStoreName);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  return outboxDbPromise;
}

function getFromStore<T>(db: IDBDatabase, storeName: string, key: IDBValidKey) {
  return new Promise<T | undefined>((resolve, reject) => {
    const request = db.transaction(storeName, "readonly").objectStore(storeName).get(key);
    request.onsuccess = () => resolve(request.result as T | undefined);
    request.onerror = () => reject(request.error);
  });
}

function getAllFromStore<T>(db: IDBDatabase, storeName: string) {
  return new Promise<T[]>((resolve, reject) => {
    const request = db.transaction(storeName, "readonly").objectStore(storeName).getAll();
    request.onsuccess = () => resolve(request.result as T[]);
    request.onerror = () => reject(request.error);
  });
}

function putToStore(
  db: IDBDatabase,
  storeName: string,
  value: unknown,
  key?: IDBValidKey,
) {
  return new Promise<void>((resolve, reject) => {
    const request = key === undefined
      ? db.transaction(storeName, "readwrite").objectStore(storeName).put(value)
      : db.transaction(storeName, "readwrite").objectStore(storeName).put(value, key);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

function deleteFromStore(db: IDBDatabase, storeName: string, key: IDBValidKey) {
  return new Promise<void>((resolve, reject) => {
    const request = db.transaction(storeName, "readwrite").objectStore(storeName).delete(key);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

function transactionDone(transaction: IDBTransaction) {
  return new Promise<void>((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
    transaction.onabort = () => reject(transaction.error);
  });
}
