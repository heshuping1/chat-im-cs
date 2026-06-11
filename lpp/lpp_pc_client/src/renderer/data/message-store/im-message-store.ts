import type { MessageItemDto } from "../api/types";
import type { CurrentUserIdentity } from "../message-display";
import type { DesktopApi } from "../../../shared/desktop-api";
import type { LocalDataMessage, LocalDataMessageInput } from "../../../shared/local-data-contract";
import { recordMessageReminderDiagnostic } from "../diagnostics/message-reminder-diagnostics";
import { reduceMessageCoreEvent } from "../message-core/message-core";
import {
  imMessageConversationKey,
  imMessageRecordKey,
  imMessageScopeKey,
  parseImMessageConversationKey,
} from "./im-message-store-scope";
import {
  compareMessagesForLocalStore,
  mergeMessagesForLocalStore,
} from "./im-message-store-reducer";

export {
  imMessageConversationKey,
  imMessageRecordKey,
  imMessageScopeKey,
  parseImMessageConversationKey,
  mergeMessagesForLocalStore,
};

export interface ImMessageStoreListOptions {
  beforeSeq?: number;
  limit: number;
}

export interface ImMessageStore {
  applyReadMetadata(
    scopeKey: string,
    conversationType: string,
    conversationId: string,
    metadata: {
      identity: CurrentUserIdentity | null;
      peerReadSeq?: number;
      readSeq: number;
    },
  ): Promise<void>;
  clearScope(scopeKey: string): Promise<void>;
  deleteMessage(
    scopeKey: string,
    conversationType: string,
    conversationId: string,
    messageId: string,
  ): Promise<void>;
  listMessages(conversationKey: string, options: ImMessageStoreListOptions): Promise<MessageItemDto[]>;
  markMessageRecalled(
    scopeKey: string,
    conversationType: string,
    conversationId: string,
    messageId: string,
  ): Promise<void>;
  replaceConversationSnapshot(
    scopeKey: string,
    conversationType: string,
    conversationId: string,
    messages: MessageItemDto[],
  ): Promise<void>;
  searchMessages(
    scopeKey: string,
    conversationType: string,
    conversationId: string,
    keyword: string,
    limit: number,
  ): Promise<MessageItemDto[]>;
  upsertMessages(
    scopeKey: string,
    conversationType: string,
    conversationId: string,
    messages: MessageItemDto[],
  ): Promise<void>;
}

export interface ImMessageStoreRecord {
  conversationId: string;
  conversationKey: string;
  conversationSeq?: number;
  conversationType: string;
  id: string;
  message: MessageItemDto;
  messageId: string;
  scopeKey: string;
  sentAt?: string;
  updatedAt: number;
}

const imMessageDbName = "lpp-pc-im-message-store";
const imMessageDbVersion = 1;
const messagesStoreName = "messages";
const indexedDbMigrationJournalKey = "lpp-pc-im-message-store:indexeddb-migration-v1";
const desktopLocalDataMessagePageSize = 500;

export function createMemoryImMessageStore(): ImMessageStore {
  const records = new Map<string, ImMessageStoreRecord>();

  return {
    async applyReadMetadata(scopeKey, conversationType, conversationId, metadata) {
      const conversationKey = imMessageConversationKey(scopeKey, conversationType, conversationId);
      const messages = listRecordsForConversation(Array.from(records.values()), conversationKey, {
        limit: Number.MAX_SAFE_INTEGER,
      });
      const next = applyReadMetadataToMessages(conversationType, conversationId, messages, metadata);
      for (const record of createRecords(scopeKey, conversationType, conversationId, next)) {
        records.set(record.id, record);
      }
    },
    async clearScope(scopeKey) {
      for (const [key, record] of records) {
        if (record.scopeKey === scopeKey) records.delete(key);
      }
    },
    async deleteMessage(scopeKey, conversationType, conversationId, messageId) {
      records.delete(imMessageRecordKey(
        imMessageConversationKey(scopeKey, conversationType, conversationId),
        messageId,
      ));
    },
    async listMessages(conversationKey, options) {
      return listRecordsForConversation(Array.from(records.values()), conversationKey, options);
    },
    async markMessageRecalled(scopeKey, conversationType, conversationId, messageId) {
      const conversationKey = imMessageConversationKey(scopeKey, conversationType, conversationId);
      const messages = listRecordsForConversation(Array.from(records.values()), conversationKey, {
        limit: Number.MAX_SAFE_INTEGER,
      });
      const next = reduceMessageCoreEvent(
        { messages },
        {
          type: "message.recalled",
          conversationId,
          conversationType: conversationType === "group" ? "group" : "direct",
          messageId,
        },
      ).state.messages;
      for (const record of createRecords(scopeKey, conversationType, conversationId, next)) {
        records.set(record.id, record);
      }
    },
    async replaceConversationSnapshot(scopeKey, conversationType, conversationId, messages) {
      const conversationKey = imMessageConversationKey(scopeKey, conversationType, conversationId);
      for (const [key, record] of records) {
        if (record.conversationKey === conversationKey) records.delete(key);
      }
      for (const record of createRecords(scopeKey, conversationType, conversationId, messages)) {
        records.set(record.id, record);
      }
    },
    async searchMessages(scopeKey, conversationType, conversationId, keyword, limit) {
      const conversationKey = imMessageConversationKey(scopeKey, conversationType, conversationId);
      return listRecordsForConversation(Array.from(records.values()), conversationKey, {
        limit: Number.MAX_SAFE_INTEGER,
      })
        .filter((message) => messageMatchesSearchKeyword(message, keyword))
        .slice(0, Math.max(0, limit));
    },
    async upsertMessages(scopeKey, conversationType, conversationId, messages) {
      for (const record of createRecords(scopeKey, conversationType, conversationId, messages)) {
        const previous = records.get(record.id);
        records.set(record.id, previous ? createRecords(
          scopeKey,
          conversationType,
          conversationId,
          mergeMessagesForLocalStore([previous.message, record.message]),
        )[0] : record);
      }
    },
  };
}

export function getImMessageStore(): ImMessageStore {
  const desktopStore = getDesktopImMessageStore();
  if (desktopStore) return desktopStore;
  if (typeof indexedDB === "undefined") return memoryImMessageStore;
  return indexedDbImMessageStore;
}

const memoryImMessageStore = createMemoryImMessageStore();
let desktopImMessageStore: ImMessageStore | null = null;

function getDesktopImMessageStore() {
  const desktopApi = typeof window !== "undefined" ? window.desktopApi : undefined;
  if (
    !desktopApi?.localDataListMessages ||
    !desktopApi.localDataSearchMessages ||
    !desktopApi.localDataUpsertMessages ||
    !desktopApi.localDataDeleteMessage ||
    !desktopApi.localDataClearScope
  ) {
    return null;
  }
  desktopImMessageStore ??= createDesktopImMessageStore(desktopApi);
  void migrateIndexedDbMessagesToDesktopStore(desktopApi);
  return desktopImMessageStore;
}

export function createDesktopImMessageStore(
  desktopApi: Pick<
    DesktopApi,
    | "localDataClearScope"
    | "localDataDeleteMessage"
    | "localDataListMessages"
    | "localDataSearchMessages"
    | "localDataUpsertMessages"
  >,
): ImMessageStore {
  return {
    async applyReadMetadata(scopeKey, conversationType, conversationId, metadata) {
      const messages = await listAllDesktopMessages(
        desktopApi,
        scopeKey,
        conversationType,
        conversationId,
      );
      const next = applyReadMetadataToMessages(conversationType, conversationId, messages, metadata);
      await desktopApi.localDataUpsertMessages({
        messages: next.map((message) =>
          messageItemToLocalDataInput(scopeKey, conversationType, conversationId, message),
        ),
        scopeKey,
      });
    },
    async clearScope(scopeKey) {
      await desktopApi.localDataClearScope({ scopeKey });
    },
    async deleteMessage(scopeKey, conversationType, conversationId, messageId) {
      await desktopApi.localDataDeleteMessage({
        conversationId,
        conversationType,
        messageId,
        scopeKey,
      });
    },
    async listMessages(conversationKey, options) {
      const parsed = parseImMessageConversationKey(conversationKey);
      if (!parsed) return [];
      return (
        await desktopApi.localDataListMessages({
          beforeSeq: options.beforeSeq,
          conversationId: parsed.conversationId,
          conversationType: parsed.conversationType,
          limit: localDataMessageLimit(options.limit),
          scopeKey: parsed.scopeKey,
        })
      ).map(localDataMessageToMessageItem);
    },
    async markMessageRecalled(scopeKey, conversationType, conversationId, messageId) {
      const messages = await listAllDesktopMessages(
        desktopApi,
        scopeKey,
        conversationType,
        conversationId,
      );
      const next = reduceMessageCoreEvent(
        { messages },
        {
          type: "message.recalled",
          conversationId,
          conversationType: conversationType === "group" ? "group" : "direct",
          messageId,
        },
      ).state.messages;
      await desktopApi.localDataUpsertMessages({
        messages: next.map((message) =>
          messageItemToLocalDataInput(scopeKey, conversationType, conversationId, message),
        ),
        scopeKey,
      });
    },
    async replaceConversationSnapshot(scopeKey, conversationType, conversationId, messages) {
      const existing = await listAllDesktopMessages(
        desktopApi,
        scopeKey,
        conversationType,
        conversationId,
      );
      await Promise.all(
        existing.map((message) =>
          desktopApi.localDataDeleteMessage({
            conversationId,
            conversationType,
            messageId: message.messageId,
            scopeKey,
          }),
        ),
      );
      await desktopApi.localDataUpsertMessages({
        messages: messages.map((message) =>
          messageItemToLocalDataInput(scopeKey, conversationType, conversationId, message),
        ),
        scopeKey,
      });
    },
    async searchMessages(scopeKey, conversationType, conversationId, keyword, limit) {
      return (
        await desktopApi.localDataSearchMessages({
          conversationId,
          conversationType,
          keyword,
          limit: localDataMessageLimit(limit),
          scopeKey,
        })
      ).map(localDataMessageToMessageItem);
    },
    async upsertMessages(scopeKey, conversationType, conversationId, messages) {
      await desktopApi.localDataUpsertMessages({
        messages: messages.map((message) =>
          messageItemToLocalDataInput(scopeKey, conversationType, conversationId, message),
        ),
        scopeKey,
      });
    },
  };
}

let indexedDbMigrationPromise: Promise<void> | null = null;

export function migrateIndexedDbMessagesToDesktopStore(
  desktopApi: Pick<DesktopApi, "localDataUpsertMessages">,
) {
  if (indexedDbMigrationPromise) return indexedDbMigrationPromise;
  indexedDbMigrationPromise = migrateIndexedDbMessagesToDesktopStoreOnce(desktopApi).catch((error) => {
    indexedDbMigrationPromise = null;
    recordLocalDataMigrationDiagnostic("failed", {
      reason: error instanceof Error ? error.message : "unknown-error",
    });
  });
  return indexedDbMigrationPromise;
}

export function localDataInputsByScopeFromIndexedDbRecords(records: ImMessageStoreRecord[]) {
  const byScope = new Map<string, LocalDataMessageInput[]>();
  for (const record of records) {
    if (!record.messageId?.trim()) continue;
    const next = byScope.get(record.scopeKey) ?? [];
    next.push(
      messageItemToLocalDataInput(
        record.scopeKey,
        record.conversationType,
        record.conversationId,
        record.message,
      ),
    );
    byScope.set(record.scopeKey, next);
  }
  return byScope;
}

async function migrateIndexedDbMessagesToDesktopStoreOnce(
  desktopApi: Pick<DesktopApi, "localDataUpsertMessages">,
) {
  if (typeof indexedDB === "undefined") return;
  if (readIndexedDbMigrationJournal()?.completedAt) return;
  const records = await readIndexedDbMessageRecordsForMigration();
  if (!records) return;
  const byScope = localDataInputsByScopeFromIndexedDbRecords(records);
  let migratedCount = 0;
  for (const [scopeKey, messages] of byScope) {
    if (messages.length === 0) continue;
    await desktopApi.localDataUpsertMessages({ messages, scopeKey });
    migratedCount += messages.length;
  }
  writeIndexedDbMigrationJournal({
    completedAt: new Date().toISOString(),
    migratedCount,
    scopeCount: byScope.size,
  });
  recordLocalDataMigrationDiagnostic("ok", {
    migratedCount,
    scopeCount: byScope.size,
  });
}

async function readIndexedDbMessageRecordsForMigration() {
  try {
    const db = await openImMessageDb();
    return await getAllFromStore<ImMessageStoreRecord>(db, messagesStoreName);
  } catch (error) {
    recordLocalDataMigrationDiagnostic("failed", {
      phase: "read-indexeddb",
      reason: error instanceof Error ? error.message : "unknown-error",
    });
    return null;
  }
}

function readIndexedDbMigrationJournal() {
  try {
    const raw = globalThis.window?.localStorage?.getItem(indexedDbMigrationJournalKey);
    return raw ? JSON.parse(raw) as { completedAt?: string } : null;
  } catch {
    return null;
  }
}

function writeIndexedDbMigrationJournal(value: {
  completedAt: string;
  migratedCount: number;
  scopeCount: number;
}) {
  try {
    globalThis.window?.localStorage?.setItem(indexedDbMigrationJournalKey, JSON.stringify(value));
  } catch {
    // Migration remains idempotent through LocalDataService upsert even when localStorage is unavailable.
  }
}

function recordLocalDataMigrationDiagnostic(
  result: "ok" | "failed",
  summary: Record<string, unknown>,
) {
  recordMessageReminderDiagnostic({
    event: "local-data.indexeddb-migration",
    phase: "migration",
    route: "im-message-store",
    source: "local-data",
    summary: { ...summary, result },
  });
}

async function listAllDesktopMessages(
  desktopApi: Pick<DesktopApi, "localDataListMessages">,
  scopeKey: string,
  conversationType: string,
  conversationId: string,
) {
  let beforeSeq: number | undefined;
  let all: MessageItemDto[] = [];
  for (;;) {
    const page = (
      await desktopApi.localDataListMessages({
        ...(typeof beforeSeq === "number" ? { beforeSeq } : {}),
        conversationId,
        conversationType,
        limit: desktopLocalDataMessagePageSize,
        scopeKey,
      })
    ).map(localDataMessageToMessageItem);
    all = page.concat(all);
    if (page.length < desktopLocalDataMessagePageSize) return all;
    const nextBeforeSeq = earliestConversationSeq(page);
    if (typeof nextBeforeSeq !== "number") return all;
    beforeSeq = nextBeforeSeq;
  }
}

function localDataMessageLimit(value: number) {
  if (!Number.isFinite(value)) return desktopLocalDataMessagePageSize;
  return Math.min(desktopLocalDataMessagePageSize, Math.max(1, Math.trunc(value)));
}

function earliestConversationSeq(messages: MessageItemDto[]) {
  for (const message of messages) {
    if (typeof message.conversationSeq === "number" && Number.isFinite(message.conversationSeq)) {
      return message.conversationSeq;
    }
  }
  return undefined;
}

function messageItemToLocalDataInput(
  scopeKey: string,
  conversationType: string,
  conversationId: string,
  message: MessageItemDto,
): LocalDataMessageInput {
  const record = message as unknown as Record<string, unknown>;
  return {
    bodyJson: message.body ?? {},
    clientMsgId: message.clientMsgId ?? message.clientMessageId ?? undefined,
    conversationId: message.conversationId || conversationId,
    conversationSeq: message.conversationSeq,
    conversationType: conversationType === "group" ? "group" : "direct",
    direction: message.direction,
    fromUserId: message.fromUserId,
    isMine: message.isMine,
    isRead: message.isRead,
    isSelf: message.isSelf,
    lppId: message.lppId,
    messageId: message.messageId,
    messageType: message.messageType,
    platformUserId: message.platformUserId,
    preview: message.preview,
    scopeKey,
    avatarUrl: message.avatarUrl,
    senderAvatarUrl: message.senderAvatarUrl,
    senderDisplayName: message.senderDisplayName,
    senderId: message.senderId,
    senderLppId: message.senderLppId,
    senderPlatformUserId: message.senderPlatformUserId,
    senderUserId:
      message.senderUserId ??
      message.senderId ??
      message.fromUserId ??
      message.senderPlatformUserId,
    sentAt: message.sentAt ?? stringValue(record.serverTime),
    status: message.status,
  };
}

function localDataMessageToMessageItem(message: LocalDataMessage): MessageItemDto {
  return {
    body: message.bodyJson,
    ...(message.clientMsgId ? { clientMsgId: message.clientMsgId } : {}),
    conversationId: message.conversationId,
    conversationSeq: message.conversationSeq,
    direction: message.direction,
    fromUserId: message.fromUserId,
    isMine: message.isMine,
    isRead: message.isRead,
    isSelf: message.isSelf,
    lppId: message.lppId,
    messageId: message.messageId,
    messageType: message.messageType,
    platformUserId: message.platformUserId,
    preview: message.preview,
    avatarUrl: message.avatarUrl,
    senderAvatarUrl: message.senderAvatarUrl,
    senderDisplayName: message.senderDisplayName,
    senderId: message.senderId,
    senderLppId: message.senderLppId,
    senderPlatformUserId: message.senderPlatformUserId,
    senderUserId: message.senderUserId,
    sentAt: message.sentAt,
    status: message.status,
  };
}

function stringValue(value: unknown) {
  return typeof value === "string" ? value : undefined;
}

function createRecords(
  scopeKey: string,
  conversationType: string,
  conversationId: string,
  messages: MessageItemDto[],
) {
  const conversationKey = imMessageConversationKey(scopeKey, conversationType, conversationId);
  const now = Date.now();
  return mergeMessagesForLocalStore(messages).map((message) => {
    const messageId = message.messageId.trim();
    return {
      conversationId,
      conversationKey,
      conversationSeq: message.conversationSeq,
      conversationType,
      id: imMessageRecordKey(conversationKey, messageId),
      message: {
        ...message,
        conversationId: message.conversationId || conversationId,
      },
      messageId,
      scopeKey,
      sentAt: message.sentAt,
      updatedAt: now,
    } satisfies ImMessageStoreRecord;
  });
}

function listRecordsForConversation(
  records: ImMessageStoreRecord[],
  conversationKey: string,
  options: ImMessageStoreListOptions,
) {
  const limit = Math.max(0, options.limit);
  const filtered = records
    .filter((record) => record.conversationKey === conversationKey)
    .map((record) => record.message)
    .filter((message) =>
      typeof options.beforeSeq === "number" && typeof message.conversationSeq === "number"
        ? message.conversationSeq < options.beforeSeq
        : true,
    )
    .sort(compareMessagesForLocalStore);
  return filtered.slice(Math.max(0, filtered.length - limit));
}

const indexedDbImMessageStore: ImMessageStore = {
  async applyReadMetadata(scopeKey, conversationType, conversationId, metadata) {
    const db = await openImMessageDb();
    const conversationKey = imMessageConversationKey(scopeKey, conversationType, conversationId);
    const records = await getAllFromStore<ImMessageStoreRecord>(db, messagesStoreName);
    const messages = listRecordsForConversation(records, conversationKey, {
      limit: Number.MAX_SAFE_INTEGER,
    });
    const next = applyReadMetadataToMessages(conversationType, conversationId, messages, metadata);
    await putRecords(db, createRecords(scopeKey, conversationType, conversationId, next));
  },
  async clearScope(scopeKey) {
    const db = await openImMessageDb();
    const records = await getAllFromStore<ImMessageStoreRecord>(db, messagesStoreName);
    await Promise.all(
      records
        .filter((record) => record.scopeKey === scopeKey)
        .map((record) => deleteFromStore(db, messagesStoreName, record.id)),
    );
  },
  async deleteMessage(scopeKey, conversationType, conversationId, messageId) {
    const db = await openImMessageDb();
    await deleteFromStore(
      db,
      messagesStoreName,
      imMessageRecordKey(
        imMessageConversationKey(scopeKey, conversationType, conversationId),
        messageId,
      ),
    );
  },
  async listMessages(conversationKey, options) {
    const db = await openImMessageDb();
    const records = await getAllFromStore<ImMessageStoreRecord>(db, messagesStoreName);
    return listRecordsForConversation(records, conversationKey, options);
  },
  async markMessageRecalled(scopeKey, conversationType, conversationId, messageId) {
    const db = await openImMessageDb();
    const conversationKey = imMessageConversationKey(scopeKey, conversationType, conversationId);
    const records = await getAllFromStore<ImMessageStoreRecord>(db, messagesStoreName);
    const messages = listRecordsForConversation(records, conversationKey, {
      limit: Number.MAX_SAFE_INTEGER,
    });
    const next = reduceMessageCoreEvent(
      { messages },
      {
        type: "message.recalled",
        conversationId,
        conversationType: conversationType === "group" ? "group" : "direct",
        messageId,
      },
    ).state.messages;
    await putRecords(db, createRecords(scopeKey, conversationType, conversationId, next));
  },
  async replaceConversationSnapshot(scopeKey, conversationType, conversationId, messages) {
    const db = await openImMessageDb();
    const conversationKey = imMessageConversationKey(scopeKey, conversationType, conversationId);
    const existing = await getAllFromStore<ImMessageStoreRecord>(db, messagesStoreName);
    const transaction = db.transaction(messagesStoreName, "readwrite");
    const store = transaction.objectStore(messagesStoreName);
    for (const record of existing) {
      if (record.conversationKey === conversationKey) store.delete(record.id);
    }
    for (const record of createRecords(scopeKey, conversationType, conversationId, messages)) {
      store.put(record);
    }
    await transactionDone(transaction);
  },
  async searchMessages(scopeKey, conversationType, conversationId, keyword, limit) {
    const db = await openImMessageDb();
    const conversationKey = imMessageConversationKey(scopeKey, conversationType, conversationId);
    const records = await getAllFromStore<ImMessageStoreRecord>(db, messagesStoreName);
    return listRecordsForConversation(records, conversationKey, {
      limit: Number.MAX_SAFE_INTEGER,
    })
      .filter((message) => messageMatchesSearchKeyword(message, keyword))
      .slice(0, Math.max(0, limit));
  },
  async upsertMessages(scopeKey, conversationType, conversationId, messages) {
    const db = await openImMessageDb();
    for (const record of createRecords(scopeKey, conversationType, conversationId, messages)) {
      const previous = await getFromStore<ImMessageStoreRecord>(db, messagesStoreName, record.id);
      const [next] = previous
        ? createRecords(
            scopeKey,
            conversationType,
            conversationId,
            mergeMessagesForLocalStore([previous.message, record.message]),
          )
        : [record];
      await putToStore(db, messagesStoreName, next);
    }
  },
};

function applyReadMetadataToMessages(
  conversationType: string,
  conversationId: string,
  messages: MessageItemDto[],
  metadata: {
    identity: CurrentUserIdentity | null;
    peerReadSeq?: number;
    readSeq: number;
  },
) {
  return reduceMessageCoreEvent(
    { messages },
    {
      type: "read.updated",
      conversationId,
      conversationType: conversationType === "group" ? "group" : "direct",
      identity: metadata.identity,
      peerReadSeq: metadata.peerReadSeq,
      readSeq: metadata.readSeq,
    },
  ).state.messages;
}

async function putRecords(db: IDBDatabase, records: ImMessageStoreRecord[]) {
  const transaction = db.transaction(messagesStoreName, "readwrite");
  const store = transaction.objectStore(messagesStoreName);
  for (const record of records) {
    store.put(record);
  }
  await transactionDone(transaction);
}

let imMessageDbPromise: Promise<IDBDatabase> | null = null;

function openImMessageDb() {
  if (imMessageDbPromise) return imMessageDbPromise;
  imMessageDbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(imMessageDbName, imMessageDbVersion);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(messagesStoreName)) {
        const messages = db.createObjectStore(messagesStoreName, { keyPath: "id" });
        messages.createIndex("conversationKey", "conversationKey", { unique: false });
        messages.createIndex("scopeKey", "scopeKey", { unique: false });
        messages.createIndex("sentAt", "sentAt", { unique: false });
        messages.createIndex("conversationSeq", "conversationSeq", { unique: false });
        messages.createIndex("updatedAt", "updatedAt", { unique: false });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  return imMessageDbPromise;
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

function putToStore(db: IDBDatabase, storeName: string, value: unknown) {
  return new Promise<void>((resolve, reject) => {
    const request = db.transaction(storeName, "readwrite").objectStore(storeName).put(value);
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

function messageMatchesSearchKeyword(message: MessageItemDto, keyword: string) {
  const normalized = keyword.trim().toLowerCase();
  if (!normalized) return true;
  return [
    message.preview,
    message.senderDisplayName,
    typeof message.body?.text === "string" ? message.body.text : "",
    fileNameFromUnknown(message.body?.file),
    fileNameFromUnknown(message.body?.image),
    fileNameFromUnknown(message.body?.video),
  ]
    .filter(Boolean)
    .some((value) => String(value).toLowerCase().includes(normalized));
}

function fileNameFromUnknown(value: unknown) {
  if (!value || typeof value !== "object") return "";
  const fileName = (value as { fileName?: unknown; name?: unknown }).fileName ??
    (value as { name?: unknown }).name;
  return typeof fileName === "string" ? fileName : "";
}
