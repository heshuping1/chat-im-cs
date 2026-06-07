import type { MessageItemDto } from "../api/types";
import type { CurrentUserIdentity } from "../message-display";
import { reduceMessageCoreEvent } from "../message-core/message-core";
import {
  imMessageConversationKey,
  imMessageRecordKey,
  imMessageScopeKey,
} from "./im-message-store-scope";
import {
  compareMessagesForLocalStore,
  mergeMessagesForLocalStore,
} from "./im-message-store-reducer";

export {
  imMessageConversationKey,
  imMessageRecordKey,
  imMessageScopeKey,
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
  upsertMessages(
    scopeKey: string,
    conversationType: string,
    conversationId: string,
    messages: MessageItemDto[],
  ): Promise<void>;
}

interface ImMessageStoreRecord {
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
  if (typeof indexedDB === "undefined") return memoryImMessageStore;
  return indexedDbImMessageStore;
}

const memoryImMessageStore = createMemoryImMessageStore();

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
