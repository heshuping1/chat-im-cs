import { mkdir, readFile, rename, stat, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";

import {
  localDataConversationKey,
  normalizeLocalDataOutboxRecord,
  searchLocalDataMessages,
  upsertLocalDataMessages,
  type LocalDataCustomerServiceThreadSnapshot,
  type LocalDataMessage,
  type LocalDataOutboxRecord,
} from "../../shared/local-data-contract.js";
import type {
  LocalDataDriver,
  LocalDataListMessagesInput,
  LocalDataUpsertMessagesInput,
} from "./local-data-driver.js";

interface FileLocalDataDriverOptions {
  rootDir: string;
}

interface LocalDataFileState {
  customerServiceThreads: LocalDataCustomerServiceThreadSnapshot[];
  messages: LocalDataMessage[];
  outbox: LocalDataOutboxRecord[];
  schemaVersion: 1;
  updatedAt: number;
}

const initialState: LocalDataFileState = {
  customerServiceThreads: [],
  messages: [],
  outbox: [],
  schemaVersion: 1,
  updatedAt: 0,
};

export class FileLocalDataDriver implements LocalDataDriver {
  private readonly filePath: string;
  private writeChain: Promise<void> = Promise.resolve();

  constructor(options: FileLocalDataDriverOptions) {
    this.filePath = join(options.rootDir, "local-data-v1.json");
  }

  async close() {}

  async clearScope(input: Parameters<LocalDataDriver["clearScope"]>[0]) {
    await this.enqueueWrite(async () => {
      const state = await this.readState();
      await this.writeState({
        ...state,
        messages: state.messages.filter((message) => message.scopeKey !== input.scopeKey),
        updatedAt: Date.now(),
      });
    });
  }

  async cleanup(input: Parameters<LocalDataDriver["cleanup"]>[0]) {
    if (input.target !== "message-index" || !input.scopeKey) {
      return {
        deletedBytes: 0,
        deletedMessages: 0,
        target: input.target,
      };
    }
    const state = await this.readState();
    const deletedMessages = state.messages.filter(
      (message) => message.scopeKey === input.scopeKey,
    ).length;
    await this.clearScope({ scopeKey: input.scopeKey });
    return {
      deletedBytes: 0,
      deletedMessages,
      target: input.target,
    };
  }

  async deleteMessage(input: Parameters<LocalDataDriver["deleteMessage"]>[0]) {
    await this.enqueueWrite(async () => {
      const state = await this.readState();
      const conversationKey = localDataConversationKey(
        input.scopeKey,
        input.conversationType,
        input.conversationId,
      );
      await this.writeState({
        ...state,
        messages: state.messages.filter(
          (message) =>
            message.conversationKey !== conversationKey ||
            message.messageId !== input.messageId,
        ),
        updatedAt: Date.now(),
      });
    });
  }

  async deleteOutbox(input: Parameters<LocalDataDriver["deleteOutbox"]>[0]) {
    await this.enqueueWrite(async () => {
      const state = await this.readState();
      await this.writeState({
        ...state,
        outbox: state.outbox.filter(
          (record) =>
            record.scopeKey !== input.scopeKey ||
            record.localMessageId !== input.localMessageId,
        ),
        updatedAt: Date.now(),
      });
    });
  }

  async getMediaVariant() {
    return null;
  }

  async getStorageStats(input: Parameters<LocalDataDriver["getStorageStats"]>[0]) {
    const state = await this.readState();
    const dbBytes = await stat(this.filePath).then((value) => value.size).catch(() => 0);
    return {
      dbBytes,
      fileBytes: 0,
      mediaBytes: 0,
      mediaCount: 0,
      messageCount: state.messages.filter((message) =>
        input.scopeKey ? message.scopeKey === input.scopeKey : true,
      ).length,
      outboxCount: state.outbox.filter((record) =>
        input.scopeKey ? record.scopeKey === input.scopeKey : true,
      ).length,
      ...(input.scopeKey ? { scopeKey: input.scopeKey } : {}),
      totalBytes: dbBytes,
    };
  }

  async listCustomerServiceThreads(input: Parameters<LocalDataDriver["listCustomerServiceThreads"]>[0]) {
    const state = await this.readState();
    return state.customerServiceThreads
      .filter((thread) => thread.scopeKey === input.scopeKey)
      .sort((left, right) => Number(right.updatedAt ?? 0) - Number(left.updatedAt ?? 0))
      .slice(0, input.limit ?? 100);
  }

  async listMessages(input: LocalDataListMessagesInput) {
    const state = await this.readState();
    const conversationKey = localDataConversationKey(
      input.scopeKey,
      input.conversationType,
      input.conversationId,
    );
    const filtered = state.messages
      .filter((message) => message.conversationKey === conversationKey)
      .filter((message) =>
        typeof input.beforeSeq === "number"
          ? (message.conversationSeq ?? Number.MAX_SAFE_INTEGER) < input.beforeSeq
          : true,
      );
    return filtered.slice(Math.max(0, filtered.length - Math.max(0, input.limit)));
  }

  async searchMessages(input: Parameters<LocalDataDriver["searchMessages"]>[0]) {
    const state = await this.readState();
    return searchLocalDataMessages(state.messages, input);
  }

  async listOutbox(input: Parameters<LocalDataDriver["listOutbox"]>[0]) {
    const state = await this.readState();
    return state.outbox
      .filter((record) => record.scopeKey === input.scopeKey)
      .filter((record) =>
        input.conversationType ? record.conversationType === input.conversationType : true,
      )
      .filter((record) => input.conversationId ? record.conversationId === input.conversationId : true)
      .sort((left, right) => Number(left.updatedAt ?? 0) - Number(right.updatedAt ?? 0));
  }

  async repair() {
    return {
      checkedAt: Date.now(),
      dbIntegrity: "ok" as const,
      ftsRebuilt: false,
      mediaVariantsChecked: 0,
      staleMediaVariants: 0,
    };
  }

  async upsertCustomerServiceThread(
    input: Parameters<LocalDataDriver["upsertCustomerServiceThread"]>[0],
  ) {
    await this.enqueueWrite(async () => {
      const state = await this.readState();
      const thread = normalizeFileCustomerServiceThread(input.thread);
      await this.writeState({
        ...state,
        customerServiceThreads: [
          ...state.customerServiceThreads.filter((item) => item.threadKey !== thread.threadKey),
          thread,
        ],
        updatedAt: Date.now(),
      });
    });
  }

  async upsertMedia() {
    // File fallback keeps message data only; desktop SQLite owns durable media metadata.
  }

  async upsertMessages(input: LocalDataUpsertMessagesInput) {
    await this.enqueueWrite(async () => {
      const state = await this.readState();
      const nextMessages = upsertLocalDataMessages(
        state.messages.filter((message) => message.scopeKey === input.scopeKey),
        input.messages,
      );
      const otherMessages = state.messages.filter((message) => message.scopeKey !== input.scopeKey);
      await this.writeState({
        ...state,
        messages: [...otherMessages, ...nextMessages],
        updatedAt: Date.now(),
      });
    });
  }

  async upsertOutbox(input: Parameters<LocalDataDriver["upsertOutbox"]>[0]) {
    await this.enqueueWrite(async () => {
      const state = await this.readState();
      const record = normalizeLocalDataOutboxRecord(input.record);
      await this.writeState({
        ...state,
        outbox: [
          ...state.outbox.filter((item) => item.outboxId !== record.outboxId),
          record,
        ],
        updatedAt: Date.now(),
      });
    });
  }

  private async enqueueWrite(operation: () => Promise<void>) {
    const next = this.writeChain.then(operation, operation);
    this.writeChain = next.catch(() => undefined);
    return next;
  }

  private async readState(): Promise<LocalDataFileState> {
    try {
      const parsed = JSON.parse(await readFile(this.filePath, "utf8")) as LocalDataFileState;
      return {
        customerServiceThreads: Array.isArray(parsed.customerServiceThreads)
          ? parsed.customerServiceThreads
          : [],
        messages: Array.isArray(parsed.messages) ? parsed.messages : [],
        outbox: Array.isArray(parsed.outbox) ? parsed.outbox : [],
        schemaVersion: 1,
        updatedAt: typeof parsed.updatedAt === "number" ? parsed.updatedAt : 0,
      };
    } catch {
      return initialState;
    }
  }

  private async writeState(state: LocalDataFileState) {
    await mkdir(dirname(this.filePath), { recursive: true });
    const tempPath = `${this.filePath}.tmp`;
    await writeFile(tempPath, JSON.stringify(state, null, 2), "utf8");
    await rename(tempPath, this.filePath);
  }
}

function normalizeFileCustomerServiceThread(
  input: Parameters<LocalDataDriver["upsertCustomerServiceThread"]>[0]["thread"],
): LocalDataCustomerServiceThreadSnapshot {
  const scopeKey = input.scopeKey.trim() || "unknown-scope";
  const threadType = input.threadType.trim() || "unknown-thread-type";
  const threadId = input.threadId.trim() || "unknown-thread";
  return {
    customerSnapshotJson: input.customerSnapshotJson ?? {},
    lastEventJson: input.lastEventJson ?? {},
    scopeKey,
    status: input.status ?? "unknown",
    threadId,
    threadKey: `${scopeKey}:${threadType}:${threadId}`,
    threadType,
    unreadCount: input.unreadCount ?? 0,
    updatedAt: input.updatedAt ?? Date.now(),
  };
}
