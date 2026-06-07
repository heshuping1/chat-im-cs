import type { AuthSession } from "../auth/auth-session";
import {
  getSendOutboxStorage,
  sendOutboxBlobId,
  sendOutboxScopeKey,
  sendOutboxTargetKey,
  type SendOutboxMessageType,
  type SendOutboxRecord,
  type SendOutboxStatus,
  type SendOutboxStorage,
  type SendOutboxUploadPhase,
} from "./send-outbox";
import {
  logChatSendDiagnostic,
  type ChatSendChannel,
  type ChatSendDiagnosticInput,
  type ChatSendDiagnosticRecord,
} from "./send-state-machine";

export interface ChatSendInput<TTarget> {
  body: Record<string, unknown>;
  localMessageId: string;
  target: TTarget;
}

export interface ChatSendRuntimeAdapter<TTarget, TResult> {
  channel: ChatSendChannel;
  buildLocalMessage(input: ChatSendInput<TTarget>): unknown;
  sendToServer(input: ChatSendInput<TTarget>): Promise<TResult>;
  mergeSucceeded(result: TResult): void;
  mergeFailed(error: unknown): void;
}

export interface ChatSendLocalIdentity {
  clientMsgId: string;
  createdAt: number;
  localMessageId: string;
}

export interface ChatSendRuntime {
  readonly channel: ChatSendChannel;
  readonly scopeKey: string;
  readonly storage: SendOutboxStorage;
  blobId(localMessageId: string, kind: "file" | "poster"): string;
  createLocalIdentity(prefix: string): ChatSendLocalIdentity;
  deleteOutboxRecord(localMessageId: string): Promise<void>;
  log(input: Omit<ChatSendDiagnosticInput, "channel" | "taskId">): ChatSendDiagnosticRecord;
  patchOutboxRecord(
    localMessageId: string,
    patch: Partial<SendOutboxRecord>,
  ): Promise<void>;
  targetKey(targetType: string, targetId: string): string;
  upsertOutboxRecord(input: ChatSendRuntimeOutboxInput): Promise<void>;
}

export interface ChatSendRuntimeOutboxInput {
  body: Record<string, unknown>;
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
  status: SendOutboxStatus;
  targetId: string;
  targetType: string;
  updatedAt?: number;
  uploadPhase?: SendOutboxUploadPhase;
  uploadProgress?: number;
}

export function createChatSendRuntime({
  channel,
  session,
  storage = getSendOutboxStorage(),
  taskId,
}: {
  channel: ChatSendChannel;
  session: AuthSession | null | undefined;
  storage?: SendOutboxStorage;
  taskId?: ChatSendDiagnosticInput["taskId"];
}): ChatSendRuntime {
  const scopeKey = sendOutboxScopeKey(session);
  return {
    channel,
    scopeKey,
    storage,
    blobId(localMessageId, kind) {
      return sendOutboxBlobId(scopeKey, localMessageId, kind);
    },
    createLocalIdentity(prefix) {
      const createdAt = Date.now();
      const localMessageId = `${prefix}-${createdAt}-${Math.random().toString(16).slice(2)}`;
      return {
        clientMsgId: localMessageId,
        createdAt,
        localMessageId,
      };
    },
    deleteOutboxRecord(localMessageId) {
      void deleteLocalDataOutbox(scopeKey, localMessageId).catch(() => undefined);
      return storage.deleteRecord(scopeKey, localMessageId);
    },
    log(input) {
      return logChatSendDiagnostic({
        ...input,
        channel,
        taskId,
      });
    },
    patchOutboxRecord(localMessageId, patch) {
      void patchLocalDataOutbox(storage, scopeKey, localMessageId, patch).catch(() => undefined);
      return storage.patchRecord(scopeKey, localMessageId, patch);
    },
    targetKey(targetType, targetId) {
      return sendOutboxTargetKey(channel, targetType, targetId);
    },
    upsertOutboxRecord(input) {
      const record = {
        ...input,
        channel,
        scopeKey,
        updatedAt: input.updatedAt ?? input.createdAt,
      };
      void upsertLocalDataOutbox(record).catch(() => undefined);
      return storage.upsertRecord(record);
    },
  };
}

async function patchLocalDataOutbox(
  storage: SendOutboxStorage,
  scopeKey: string,
  localMessageId: string,
  patch: Partial<SendOutboxRecord>,
) {
  if (!desktopLocalDataOutboxAvailable()) return;
  const existing = (await storage.listRecords({ scopeKey }))
    .find((record) => record.localMessageId === localMessageId);
  if (!existing) return;
  await upsertLocalDataOutbox({
    ...existing,
    ...patch,
    updatedAt: patch.updatedAt ?? Date.now(),
  });
}

async function upsertLocalDataOutbox(record: SendOutboxRecord) {
  if (!desktopLocalDataOutboxAvailable()) return;
  const desktopApi = window.desktopApi;
  if (!desktopApi) return;
  await desktopApi.localDataUpsertOutbox({
    record: {
      bodyJson: record.body,
      clientMsgId: record.clientMsgId,
      conversationId: record.targetId,
      conversationType: localDataConversationTypeForOutbox(record.channel, record.targetType),
      localMessageId: record.localMessageId,
      messageType: record.messageType,
      scopeKey: record.scopeKey,
      status: record.status,
      updatedAt: record.updatedAt,
    },
  });
}

async function deleteLocalDataOutbox(scopeKey: string, localMessageId: string) {
  if (!desktopLocalDataOutboxAvailable()) return;
  const desktopApi = window.desktopApi;
  if (!desktopApi) return;
  await desktopApi.localDataDeleteOutbox({ localMessageId, scopeKey });
}

function desktopLocalDataOutboxAvailable() {
  return typeof window !== "undefined" && Boolean(
    window.desktopApi?.localDataDeleteOutbox && window.desktopApi.localDataUpsertOutbox,
  );
}

function localDataConversationTypeForOutbox(
  channel: ChatSendChannel,
  targetType: string,
) {
  if (channel === "customer_service") return "customer_service";
  return targetType === "group" ? "group" : "direct";
}
