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
      return storage.patchRecord(scopeKey, localMessageId, patch);
    },
    targetKey(targetType, targetId) {
      return sendOutboxTargetKey(channel, targetType, targetId);
    },
    upsertOutboxRecord(input) {
      return storage.upsertRecord({
        ...input,
        channel,
        scopeKey,
        updatedAt: input.updatedAt ?? input.createdAt,
      });
    },
  };
}
