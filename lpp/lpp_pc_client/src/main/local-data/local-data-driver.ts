import type {
  LocalConversationType,
  LocalDataClearScopePayload,
  LocalDataCleanupPayload,
  LocalDataCleanupResult,
  LocalDataCustomerServiceThreadSnapshot,
  LocalDataDeleteMessagePayload,
  LocalDataDeleteOutboxPayload,
  LocalDataGetMediaVariantPayload,
  LocalDataListCustomerServiceThreadsPayload,
  LocalDataMessage,
  LocalDataListOutboxPayload,
  LocalDataMediaVariantProjection,
  LocalDataOutboxRecord,
  LocalDataRepairPayload,
  LocalDataRepairResult,
  LocalDataStorageStats,
  LocalDataStorageStatsPayload,
  LocalDataUpsertCustomerServiceThreadPayload,
  LocalDataUpsertMediaPayload,
  LocalDataUpsertOutboxPayload,
  LocalSearchInput,
} from "../../shared/local-data-contract.js";

export interface LocalDataListMessagesInput {
  beforeSeq?: number;
  conversationId: string;
  conversationType: LocalConversationType | string;
  limit: number;
  scopeKey: string;
}

export interface LocalDataUpsertMessagesInput {
  messages: LocalDataMessage[];
  scopeKey: string;
}

export interface LocalDataDriver {
  close(): Promise<void>;
  clearScope(input: LocalDataClearScopePayload): Promise<void>;
  cleanup(input: LocalDataCleanupPayload): Promise<LocalDataCleanupResult>;
  deleteMessage(input: LocalDataDeleteMessagePayload): Promise<void>;
  deleteOutbox(input: LocalDataDeleteOutboxPayload): Promise<void>;
  getMediaVariant(input: LocalDataGetMediaVariantPayload): Promise<LocalDataMediaVariantProjection | null>;
  getStorageStats(input: LocalDataStorageStatsPayload): Promise<LocalDataStorageStats>;
  listCustomerServiceThreads(input: LocalDataListCustomerServiceThreadsPayload): Promise<LocalDataCustomerServiceThreadSnapshot[]>;
  listMessages(input: LocalDataListMessagesInput): Promise<LocalDataMessage[]>;
  listOutbox(input: LocalDataListOutboxPayload): Promise<LocalDataOutboxRecord[]>;
  repair(input: LocalDataRepairPayload): Promise<LocalDataRepairResult>;
  searchMessages(input: LocalSearchInput): Promise<LocalDataMessage[]>;
  upsertCustomerServiceThread(input: LocalDataUpsertCustomerServiceThreadPayload): Promise<void>;
  upsertMedia(input: LocalDataUpsertMediaPayload): Promise<void>;
  upsertMessages(input: LocalDataUpsertMessagesInput): Promise<void>;
  upsertOutbox(input: LocalDataUpsertOutboxPayload): Promise<void>;
}
