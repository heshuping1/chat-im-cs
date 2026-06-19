import Database from "better-sqlite3";
import { existsSync, mkdirSync, rmSync, statSync } from "node:fs";
import { dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import {
  localDataConversationKey,
  localDataOutboxKey,
  normalizeLocalDataOutboxRecord,
  searchLocalDataMessages,
  upsertLocalDataMessages,
  type LocalDataCustomerServiceThreadSnapshot,
  type LocalDataMessage,
  type LocalDataMediaVariantProjection,
  type LocalDataOutboxRecord,
} from "../../shared/local-data-contract.js";
import type {
  LocalDataDriver,
  LocalDataListMessagesInput,
  LocalDataUpsertMessagesInput,
} from "./local-data-driver.js";

interface SqliteLocalDataDriverOptions {
  dbPath: string;
  recordDiagnostic?: (record: SqliteLocalDataDiagnostic) => void;
}

export interface SqliteLocalDataDiagnostic {
  context?: Record<string, unknown>;
  event:
    | "migration"
    | "clear_scope"
    | "cleanup"
    | "delete_message"
    | "delete_outbox"
    | "get_media_variant"
    | "list_cs_threads"
    | "list_messages"
    | "list_outbox"
    | "repair"
    | "search_messages"
    | "upsert_cs_thread"
    | "upsert_media"
    | "upsert_outbox"
    | "upsert_messages";
  phase: "start" | "commit" | "failed";
  reason?: string;
  result: "ok" | "failed" | "ignored";
}

interface MessageRow {
  message_json: string;
}

interface OutboxRow {
  outbox_id: string;
  scope_key: string;
  conversation_type: string;
  conversation_id: string;
  client_msg_id: string;
  local_message_id: string;
  message_type: string;
  status: string;
  payload_json: string;
  retry_count: number;
  updated_at: number;
}

interface CustomerServiceThreadRow {
  thread_key: string;
  scope_key: string;
  thread_type: string;
  thread_id: string;
  status: string;
  unread_count: number;
  customer_snapshot_json: string;
  last_event_json: string;
  updated_at: number;
}

export class SqliteLocalDataDriver implements LocalDataDriver {
  private readonly db: Database.Database;
  private readonly dbPath: string;
  private readonly recordDiagnostic?: (record: SqliteLocalDataDiagnostic) => void;
  private closed = false;

  constructor(options: SqliteLocalDataDriverOptions) {
    mkdirSync(dirname(options.dbPath), { recursive: true });
    this.dbPath = options.dbPath;
    this.recordDiagnostic = options.recordDiagnostic;
    this.db = new Database(options.dbPath);
    this.db.pragma("journal_mode = WAL");
    this.db.pragma("foreign_keys = ON");
    try {
      this.migrate();
      this.record({
        event: "migration",
        phase: "commit",
        result: "ok",
        context: { schemaVersion: localDataSchemaVersion },
      });
    } catch (error) {
      this.record({
        event: "migration",
        phase: "failed",
        result: "failed",
        reason: errorReason(error),
        context: { schemaVersion: localDataSchemaVersion },
      });
      throw error;
    }
  }

  async close() {
    if (this.closed) return;
    this.db.close();
    this.closed = true;
  }

  async clearScope(input: Parameters<LocalDataDriver["clearScope"]>[0]) {
    try {
      const transaction = this.db.transaction(() => {
        const ids = this.db
          .prepare("SELECT id FROM messages WHERE scope_key = ?")
          .all(input.scopeKey) as Array<{ id: string }>;
        for (const row of ids) this.deleteMessageFts(row.id);
        this.db.prepare("DELETE FROM messages WHERE scope_key = ?").run(input.scopeKey);
      });
      transaction();
      this.record({ event: "clear_scope", phase: "commit", result: "ok" });
    } catch (error) {
      this.record({
        event: "clear_scope",
        phase: "failed",
        result: "failed",
        reason: errorReason(error),
      });
      throw error;
    }
  }

  async cleanup(input: Parameters<LocalDataDriver["cleanup"]>[0]) {
    if (input.target === "media-cache") {
      const result = this.cleanupMediaCache(input.scopeKey);
      this.record({
        event: "cleanup",
        phase: "commit",
        result: "ok",
        context: result,
      });
      return {
        deletedBytes: result.deletedBytes,
        deletedMessages: 0,
        deletedMediaVariants: result.deletedMediaVariants,
        target: input.target,
      };
    }
    if (input.target === "orphan-files") {
      this.record({
        event: "cleanup",
        phase: "commit",
        result: "ignored",
        reason: "orphan-scan-not-available",
      });
      return {
        deletedBytes: 0,
        deletedMessages: 0,
        deletedMediaVariants: 0,
        target: input.target,
      };
    }
    if (!input.scopeKey) {
      this.record({
        event: "cleanup",
        phase: "commit",
        result: "ignored",
        reason: "missing-scope",
      });
      return {
        deletedBytes: 0,
        deletedMessages: 0,
        target: input.target,
      };
    }
    const before = this.countMessages(input.scopeKey);
    await this.clearScope({ scopeKey: input.scopeKey });
    this.record({
      event: "cleanup",
      phase: "commit",
      result: "ok",
      context: { deletedMessages: before },
    });
    return {
      deletedBytes: 0,
      deletedMessages: before,
      target: input.target,
    };
  }

  async deleteMessage(input: Parameters<LocalDataDriver["deleteMessage"]>[0]) {
    try {
      const conversationKey = localDataConversationKey(
        input.scopeKey,
        input.conversationType,
        input.conversationId,
      );
      const row = this.db
        .prepare("SELECT id FROM messages WHERE conversation_key = ? AND message_id = ?")
        .get(conversationKey, input.messageId) as { id: string } | undefined;
      if (!row) {
        this.record({
          event: "delete_message",
          phase: "commit",
          result: "ignored",
          reason: "not-found",
        });
        return;
      }
      const transaction = this.db.transaction(() => {
        this.deleteMessageFts(row.id);
        this.db.prepare("DELETE FROM messages WHERE id = ?").run(row.id);
      });
      transaction();
      this.record({ event: "delete_message", phase: "commit", result: "ok" });
    } catch (error) {
      this.record({
        event: "delete_message",
        phase: "failed",
        result: "failed",
        reason: errorReason(error),
      });
      throw error;
    }
  }

  async deleteOutbox(input: Parameters<LocalDataDriver["deleteOutbox"]>[0]) {
    try {
      this.db
        .prepare("DELETE FROM send_outbox WHERE outbox_id = ?")
        .run(localDataOutboxKey(input.scopeKey, input.localMessageId));
      this.record({ event: "delete_outbox", phase: "commit", result: "ok" });
    } catch (error) {
      this.record({
        event: "delete_outbox",
        phase: "failed",
        result: "failed",
        reason: errorReason(error),
      });
      throw error;
    }
  }

  async getMediaVariant(input: Parameters<LocalDataDriver["getMediaVariant"]>[0]) {
    try {
      const row = this.db
        .prepare(
          `
          SELECT media_identity, variant_kind, local_path, server_url, bytes, status, updated_at
          FROM media_variants
          WHERE media_identity = ? AND variant_kind = ?
          `,
        )
        .get(input.mediaIdentity, normalizeVariantKind(input.variantKind)) as
        | {
            bytes?: number | null;
            local_path?: string | null;
            media_identity: string;
            server_url?: string | null;
            status: string;
            updated_at: number;
            variant_kind: string;
          }
        | undefined;
      if (!row) return null;
      return mediaVariantProjectionFromRow(row);
    } catch (error) {
      this.record({
        event: "get_media_variant",
        phase: "failed",
        result: "failed",
        reason: errorReason(error),
      });
      throw error;
    }
  }

  async getStorageStats(input: Parameters<LocalDataDriver["getStorageStats"]>[0]) {
    const dbBytes = this.dbBytes();
    const messageCount = this.countMessages(input.scopeKey);
    const mediaStats = this.mediaStats(input.scopeKey);
    const outboxCount = this.countOutbox(input.scopeKey);
    return {
      dbBytes,
      fileBytes: mediaStats.mediaBytes,
      mediaBytes: mediaStats.mediaBytes,
      mediaCount: mediaStats.mediaCount,
      messageCount,
      outboxCount,
      ...(input.scopeKey ? { scopeKey: input.scopeKey } : {}),
      totalBytes: dbBytes + mediaStats.mediaBytes,
    };
  }

  async listCustomerServiceThreads(
    input: Parameters<LocalDataDriver["listCustomerServiceThreads"]>[0],
  ) {
    try {
      const rows = this.db
        .prepare(
          `
          SELECT thread_key, scope_key, thread_type, thread_id, status, unread_count,
                 customer_snapshot_json, last_event_json, updated_at
          FROM cs_threads
          WHERE scope_key = ?
          ORDER BY updated_at DESC
          LIMIT ?
          `,
        )
        .all(input.scopeKey, Math.max(1, Math.min(input.limit ?? 100, 500))) as CustomerServiceThreadRow[];
      return rows.map(customerServiceThreadFromRow);
    } catch (error) {
      this.record({
        event: "list_cs_threads",
        phase: "failed",
        result: "failed",
        reason: errorReason(error),
      });
      throw error;
    }
  }

  async listMessages(input: LocalDataListMessagesInput) {
    try {
      const conversationKey = localDataConversationKey(
        input.scopeKey,
        input.conversationType,
        input.conversationId,
      );
      const rows = this.db
        .prepare(
          `
          SELECT message_json
          FROM messages
          WHERE conversation_key = ?
            AND (? IS NULL OR conversation_seq < ?)
          ORDER BY COALESCE(conversation_seq, 9223372036854775807) DESC, sent_at DESC, message_id DESC
          LIMIT ?
          `,
        )
        .all(
          conversationKey,
          input.beforeSeq ?? null,
          input.beforeSeq ?? null,
          Math.max(0, input.limit),
        ) as MessageRow[];
      return rows.map(rowToMessage).reverse();
    } catch (error) {
      this.record({
        event: "list_messages",
        phase: "failed",
        result: "failed",
        reason: errorReason(error),
      });
      throw error;
    }
  }

  async searchMessages(input: Parameters<LocalDataDriver["searchMessages"]>[0]) {
    try {
      const keyword = input.keyword?.trim().toLowerCase();
      if (!keyword) {
        const rows = this.db
          .prepare(
            `
            SELECT message_json
            FROM messages
            WHERE scope_key = ?
              AND (? IS NULL OR conversation_type = ?)
              AND (? IS NULL OR conversation_id = ?)
            ORDER BY COALESCE(conversation_seq, 9223372036854775807), sent_at, message_id
            LIMIT ?
            `,
          )
          .all(
            input.scopeKey,
            input.conversationType ?? null,
            input.conversationType ?? null,
            input.conversationId ?? null,
            input.conversationId ?? null,
            Math.max(0, input.limit),
          ) as MessageRow[];
        return rows.map(rowToMessage);
      }
      const rows = this.db
        .prepare(
          `
          SELECT message_json
          FROM messages
          WHERE scope_key = ?
            AND (? IS NULL OR conversation_type = ?)
            AND (? IS NULL OR conversation_id = ?)
            AND lower(search_text) LIKE ? ESCAPE '\\'
          ORDER BY COALESCE(conversation_seq, 9223372036854775807), sent_at, message_id
          LIMIT ?
          `,
        )
        .all(
          input.scopeKey,
          input.conversationType ?? null,
          input.conversationType ?? null,
          input.conversationId ?? null,
          input.conversationId ?? null,
          `%${escapeLike(keyword)}%`,
          Math.max(0, input.limit),
        ) as MessageRow[];
      return searchLocalDataMessages(rows.map(rowToMessage), input);
    } catch (error) {
      this.record({
        event: "search_messages",
        phase: "failed",
        result: "failed",
        reason: errorReason(error),
      });
      throw error;
    }
  }

  async listOutbox(input: Parameters<LocalDataDriver["listOutbox"]>[0]) {
    try {
      const rows = this.db
        .prepare(
          `
          SELECT outbox_id, scope_key, conversation_type, conversation_id, client_msg_id,
                 local_message_id, message_type, status, payload_json, retry_count, updated_at
          FROM send_outbox
          WHERE scope_key = ?
            AND (? IS NULL OR conversation_type = ?)
            AND (? IS NULL OR conversation_id = ?)
          ORDER BY updated_at ASC
          `,
        )
        .all(
          input.scopeKey,
          input.conversationType ?? null,
          input.conversationType ?? null,
          input.conversationId ?? null,
          input.conversationId ?? null,
        ) as OutboxRow[];
      return rows.map(outboxFromRow);
    } catch (error) {
      this.record({
        event: "list_outbox",
        phase: "failed",
        result: "failed",
        reason: errorReason(error),
      });
      throw error;
    }
  }

  async repair(input: Parameters<LocalDataDriver["repair"]>[0]) {
    try {
      const integrityRows = this.db.pragma("integrity_check") as Array<{ integrity_check?: string }>;
      const dbIntegrity = integrityRows.every((row) => row.integrity_check === "ok")
        ? "ok"
        : "failed";
      let ftsRebuilt = false;
      if (input.rebuildFts) {
        this.rebuildFts(input.scopeKey);
        ftsRebuilt = true;
      }
      const media = this.markMissingMediaVariantsStale(input.scopeKey);
      const result = {
        checkedAt: Date.now(),
        dbIntegrity,
        ftsRebuilt,
        mediaVariantsChecked: media.checked,
        staleMediaVariants: media.stale,
      } as const;
      this.record({ event: "repair", phase: "commit", result: "ok", context: result });
      return result;
    } catch (error) {
      this.record({
        event: "repair",
        phase: "failed",
        result: "failed",
        reason: errorReason(error),
      });
      throw error;
    }
  }

  async upsertMessages(input: LocalDataUpsertMessagesInput) {
    try {
      const currentRows = this.db
        .prepare("SELECT message_json FROM messages WHERE scope_key = ?")
        .all(input.scopeKey) as MessageRow[];
      const next = upsertLocalDataMessages(currentRows.map(rowToMessage), input.messages);
      const transaction = this.db.transaction(() => {
        const existingIds = this.db
          .prepare("SELECT id FROM messages WHERE scope_key = ?")
          .all(input.scopeKey) as Array<{ id: string }>;
        for (const row of existingIds) this.deleteMessageFts(row.id);
        this.db.prepare("DELETE FROM messages WHERE scope_key = ?").run(input.scopeKey);
        for (const message of next) this.insertMessage(message);
      });
      transaction();
      this.record({
        event: "upsert_messages",
        phase: "commit",
        result: "ok",
        context: { incomingCount: input.messages.length, storedCount: next.length },
      });
    } catch (error) {
      this.record({
        event: "upsert_messages",
        phase: "failed",
        result: "failed",
        reason: errorReason(error),
      });
      throw error;
    }
  }

  async upsertCustomerServiceThread(
    input: Parameters<LocalDataDriver["upsertCustomerServiceThread"]>[0],
  ) {
    try {
      const thread = normalizeCustomerServiceThread(input.thread);
      this.db
        .prepare(
          `
          INSERT INTO cs_threads (
            thread_key, scope_key, thread_type, thread_id, status, unread_count,
            customer_snapshot_json, last_event_json, updated_at
          ) VALUES (
            @threadKey, @scopeKey, @threadType, @threadId, @status, @unreadCount,
            @customerSnapshotJson, @lastEventJson, @updatedAt
          )
          ON CONFLICT(thread_key) DO UPDATE SET
            status = excluded.status,
            unread_count = excluded.unread_count,
            customer_snapshot_json = excluded.customer_snapshot_json,
            last_event_json = excluded.last_event_json,
            updated_at = excluded.updated_at
          `,
        )
        .run({
          customerSnapshotJson: JSON.stringify(thread.customerSnapshotJson),
          lastEventJson: JSON.stringify(thread.lastEventJson),
          scopeKey: thread.scopeKey,
          status: thread.status,
          threadId: thread.threadId,
          threadKey: thread.threadKey,
          threadType: thread.threadType,
          unreadCount: thread.unreadCount,
          updatedAt: thread.updatedAt,
        });
      this.record({ event: "upsert_cs_thread", phase: "commit", result: "ok" });
    } catch (error) {
      this.record({
        event: "upsert_cs_thread",
        phase: "failed",
        result: "failed",
        reason: errorReason(error),
      });
      throw error;
    }
  }

  async upsertMedia(input: Parameters<LocalDataDriver["upsertMedia"]>[0]) {
    try {
      const now = Date.now();
      const transaction = this.db.transaction(() => {
        this.db
          .prepare(
            `
            INSERT INTO media_assets (
              media_identity, identity_source, kind, server_url, file_name, mime_type,
              size_bytes, metadata_json, created_at, updated_at
            ) VALUES (
              @mediaIdentity, @identitySource, @kind, @serverUrl, @fileName, @mimeType,
              @sizeBytes, @metadataJson, @createdAt, @updatedAt
            )
            ON CONFLICT(media_identity) DO UPDATE SET
              identity_source = excluded.identity_source,
              kind = excluded.kind,
              server_url = COALESCE(excluded.server_url, media_assets.server_url),
              file_name = COALESCE(excluded.file_name, media_assets.file_name),
              mime_type = COALESCE(excluded.mime_type, media_assets.mime_type),
              size_bytes = COALESCE(excluded.size_bytes, media_assets.size_bytes),
              metadata_json = excluded.metadata_json,
              updated_at = excluded.updated_at
            `,
          )
          .run({
            createdAt: now,
            fileName: input.asset.fileName ?? null,
            identitySource: input.asset.identitySource ?? "unknown",
            kind: normalizeMediaKind(input.asset.kind),
            mediaIdentity: input.asset.mediaIdentity,
            metadataJson: JSON.stringify(input.asset.metadataJson ?? {}),
            mimeType: input.asset.mimeType ?? null,
            serverUrl: input.asset.serverUrl ?? null,
            sizeBytes: input.asset.sizeBytes ?? null,
            updatedAt: now,
          });
        for (const variant of input.variants ?? []) {
          const variantKind = normalizeVariantKind(variant.variantKind);
          this.db
            .prepare(
              `
              INSERT INTO media_variants (
                variant_id, media_identity, variant_kind, local_path, server_url,
                bytes, status, error_reason, updated_at
              ) VALUES (
                @variantId, @mediaIdentity, @variantKind, @localPath, @serverUrl,
                @bytes, @status, @errorReason, @updatedAt
              )
              ON CONFLICT(variant_id) DO UPDATE SET
                local_path = COALESCE(excluded.local_path, media_variants.local_path),
                server_url = COALESCE(excluded.server_url, media_variants.server_url),
                bytes = COALESCE(excluded.bytes, media_variants.bytes),
                status = excluded.status,
                error_reason = excluded.error_reason,
                updated_at = excluded.updated_at
              `,
            )
            .run({
              bytes: variant.bytes ?? bytesFromLocalUrl(variant.localUrl),
              errorReason: variant.errorReason ?? null,
              localPath: localPathFromUrl(variant.localUrl),
              mediaIdentity: input.asset.mediaIdentity,
              serverUrl: variant.serverUrl ?? input.asset.serverUrl ?? null,
              status: normalizeVariantStatus(variant.status),
              updatedAt: now,
              variantId: `${input.asset.mediaIdentity}:${variantKind}`,
              variantKind,
            });
        }
        for (const ref of input.messageRefs ?? []) {
          this.db
            .prepare(
              `
              INSERT OR IGNORE INTO message_media_refs (message_id, media_identity, ref_kind, created_at)
              VALUES (?, ?, ?, ?)
              `,
            )
            .run(ref.messageId, ref.mediaIdentity, ref.refKind ?? "attachment", now);
        }
      });
      transaction();
      this.record({
        event: "upsert_media",
        phase: "commit",
        result: "ok",
        context: { variants: input.variants?.length ?? 0 },
      });
    } catch (error) {
      this.record({
        event: "upsert_media",
        phase: "failed",
        result: "failed",
        reason: errorReason(error),
      });
      throw error;
    }
  }

  async upsertOutbox(input: Parameters<LocalDataDriver["upsertOutbox"]>[0]) {
    try {
      const record = normalizeLocalDataOutboxRecord(input.record);
      this.db
        .prepare(
          `
          INSERT INTO send_outbox (
            outbox_id, scope_key, conversation_type, conversation_id, client_msg_id,
            local_message_id, message_type, status, payload_json, retry_count, updated_at
          ) VALUES (
            @outboxId, @scopeKey, @conversationType, @conversationId, @clientMsgId,
            @localMessageId, @messageType, @status, @payloadJson, @retryCount, @updatedAt
          )
          ON CONFLICT(outbox_id) DO UPDATE SET
            status = excluded.status,
            payload_json = excluded.payload_json,
            retry_count = excluded.retry_count,
            updated_at = excluded.updated_at
          `,
        )
        .run({
          clientMsgId: record.clientMsgId,
          conversationId: record.conversationId,
          conversationType: record.conversationType,
          localMessageId: record.localMessageId,
          messageType: record.messageType,
          outboxId: record.outboxId,
          payloadJson: JSON.stringify(record.bodyJson),
          retryCount: record.retryCount,
          scopeKey: record.scopeKey,
          status: record.status,
          updatedAt: record.updatedAt,
        });
      this.record({ event: "upsert_outbox", phase: "commit", result: "ok" });
    } catch (error) {
      this.record({
        event: "upsert_outbox",
        phase: "failed",
        result: "failed",
        reason: errorReason(error),
      });
      throw error;
    }
  }

  private migrate() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS local_meta (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        updated_at INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS messages (
        id TEXT PRIMARY KEY,
        scope_key TEXT NOT NULL,
        conversation_type TEXT NOT NULL,
        conversation_id TEXT NOT NULL,
        conversation_key TEXT NOT NULL,
        message_id TEXT NOT NULL,
        client_msg_id TEXT,
        conversation_seq INTEGER,
        sent_at TEXT,
        status TEXT NOT NULL,
        is_read INTEGER NOT NULL,
        search_text TEXT NOT NULL,
        message_json TEXT NOT NULL,
        updated_at INTEGER NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_messages_conversation
        ON messages(conversation_key, conversation_seq, sent_at);
      CREATE INDEX IF NOT EXISTS idx_messages_scope
        ON messages(scope_key);

      CREATE TABLE IF NOT EXISTS conversations (
        conversation_key TEXT PRIMARY KEY,
        scope_key TEXT NOT NULL,
        conversation_type TEXT NOT NULL,
        conversation_id TEXT NOT NULL,
        last_message_id TEXT,
        last_message_sent_at TEXT,
        unread_count INTEGER NOT NULL DEFAULT 0,
        updated_at INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS media_assets (
        media_identity TEXT PRIMARY KEY,
        identity_source TEXT NOT NULL,
        kind TEXT NOT NULL,
        server_url TEXT,
        file_name TEXT,
        mime_type TEXT,
        size_bytes INTEGER,
        metadata_json TEXT NOT NULL DEFAULT '{}',
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS media_variants (
        variant_id TEXT PRIMARY KEY,
        media_identity TEXT NOT NULL,
        variant_kind TEXT NOT NULL,
        local_path TEXT,
        server_url TEXT,
        bytes INTEGER,
        status TEXT NOT NULL,
        error_reason TEXT,
        updated_at INTEGER NOT NULL,
        FOREIGN KEY(media_identity) REFERENCES media_assets(media_identity) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS message_media_refs (
        message_id TEXT NOT NULL,
        media_identity TEXT NOT NULL,
        ref_kind TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        PRIMARY KEY(message_id, media_identity, ref_kind),
        FOREIGN KEY(media_identity) REFERENCES media_assets(media_identity) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS send_outbox (
        outbox_id TEXT PRIMARY KEY,
        scope_key TEXT NOT NULL,
        conversation_type TEXT NOT NULL,
        conversation_id TEXT NOT NULL,
        client_msg_id TEXT NOT NULL,
        local_message_id TEXT NOT NULL,
        message_type TEXT NOT NULL,
        status TEXT NOT NULL,
        payload_json TEXT NOT NULL,
        retry_count INTEGER NOT NULL DEFAULT 0,
        next_retry_at INTEGER,
        updated_at INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS sync_cursors (
        cursor_key TEXT PRIMARY KEY,
        scope_key TEXT NOT NULL,
        conversation_type TEXT,
        conversation_id TEXT,
        cursor_json TEXT NOT NULL,
        updated_at INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS cleanup_jobs (
        job_id TEXT PRIMARY KEY,
        target TEXT NOT NULL,
        scope_key TEXT,
        status TEXT NOT NULL,
        result_json TEXT NOT NULL DEFAULT '{}',
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS cs_threads (
        thread_key TEXT PRIMARY KEY,
        scope_key TEXT NOT NULL,
        thread_type TEXT NOT NULL,
        thread_id TEXT NOT NULL,
        status TEXT NOT NULL,
        unread_count INTEGER NOT NULL DEFAULT 0,
        customer_snapshot_json TEXT NOT NULL DEFAULT '{}',
        last_event_json TEXT NOT NULL DEFAULT '{}',
        updated_at INTEGER NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_cs_threads_scope
        ON cs_threads(scope_key, updated_at);

      CREATE TABLE IF NOT EXISTS cs_thread_events (
        event_id TEXT PRIMARY KEY,
        thread_key TEXT NOT NULL,
        event_json TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        FOREIGN KEY(thread_key) REFERENCES cs_threads(thread_key) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS cs_customer_snapshots (
        snapshot_key TEXT PRIMARY KEY,
        thread_key TEXT NOT NULL,
        snapshot_json TEXT NOT NULL,
        updated_at INTEGER NOT NULL,
        FOREIGN KEY(thread_key) REFERENCES cs_threads(thread_key) ON DELETE CASCADE
      );

      CREATE VIRTUAL TABLE IF NOT EXISTS message_fts USING fts5(
        id UNINDEXED,
        scope_key UNINDEXED,
        conversation_type UNINDEXED,
        conversation_id UNINDEXED,
        content
      );
    `);
    this.ensureColumn("send_outbox", "local_message_id", "TEXT");
    this.ensureColumn("send_outbox", "message_type", "TEXT");
    this.db
      .prepare(
        `
        UPDATE send_outbox
        SET local_message_id = COALESCE(NULLIF(local_message_id, ''), client_msg_id),
            message_type = COALESCE(NULLIF(message_type, ''), 'text')
        WHERE local_message_id IS NULL OR local_message_id = ''
           OR message_type IS NULL OR message_type = ''
        `,
      )
      .run();
    this.db
      .prepare(
        `
        INSERT INTO local_meta (key, value, updated_at)
        VALUES ('schema_version', ?, ?)
        ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at
        `,
      )
      .run(String(localDataSchemaVersion), Date.now());
  }

  private insertMessage(message: LocalDataMessage) {
    const searchText = messageSearchText(message);
    this.db
      .prepare(
        `
        INSERT OR REPLACE INTO messages (
          id, scope_key, conversation_type, conversation_id, conversation_key,
          message_id, client_msg_id, conversation_seq, sent_at, status, is_read,
          search_text, message_json, updated_at
        ) VALUES (
          @id, @scopeKey, @conversationType, @conversationId, @conversationKey,
          @messageId, @clientMsgId, @conversationSeq, @sentAt, @status, @isRead,
          @searchText, @messageJson, @updatedAt
        )
        `,
      )
      .run({
        clientMsgId: message.clientMsgId ?? null,
        conversationId: message.conversationId,
        conversationKey: message.conversationKey,
        conversationSeq: message.conversationSeq ?? null,
        conversationType: message.conversationType,
        id: message.id,
        isRead: message.isRead ? 1 : 0,
        messageId: message.messageId,
        messageJson: JSON.stringify(message),
        scopeKey: message.scopeKey,
        searchText,
        sentAt: message.sentAt ?? null,
        status: message.status,
        updatedAt: message.updatedAt,
      });
    this.db
      .prepare(
        `
        INSERT INTO message_fts (id, scope_key, conversation_type, conversation_id, content)
        VALUES (?, ?, ?, ?, ?)
        `,
      )
      .run(
        message.id,
        message.scopeKey,
        message.conversationType,
        message.conversationId,
        searchText,
      );
  }

  private deleteMessageFts(id: string) {
    this.db.prepare("DELETE FROM message_fts WHERE id = ?").run(id);
  }

  private countMessages(scopeKey?: string) {
    const row = scopeKey
      ? this.db
          .prepare("SELECT COUNT(*) AS count FROM messages WHERE scope_key = ?")
          .get(scopeKey)
      : this.db.prepare("SELECT COUNT(*) AS count FROM messages").get();
    return Number((row as { count?: number } | undefined)?.count ?? 0);
  }

  private countOutbox(scopeKey?: string) {
    const row = scopeKey
      ? this.db
          .prepare("SELECT COUNT(*) AS count FROM send_outbox WHERE scope_key = ?")
          .get(scopeKey)
      : this.db.prepare("SELECT COUNT(*) AS count FROM send_outbox").get();
    return Number((row as { count?: number } | undefined)?.count ?? 0);
  }

  private cleanupMediaCache(scopeKey?: string) {
    const rows = this.mediaVariantRows(scopeKey);
    let deletedBytes = 0;
    let deletedMediaVariants = 0;
    const transaction = this.db.transaction(() => {
      for (const row of rows) {
        if (row.local_path && existsSync(row.local_path)) {
          const bytes = fileSize(row.local_path);
          rmSync(row.local_path, { force: true });
          deletedBytes += bytes;
        } else {
          deletedBytes += Number(row.bytes ?? 0);
        }
        deletedMediaVariants += 1;
        this.db.prepare("DELETE FROM media_variants WHERE variant_id = ?").run(row.variant_id);
      }
    });
    transaction();
    return { deletedBytes, deletedMediaVariants };
  }

  private mediaStats(scopeKey?: string) {
    const rows = this.mediaVariantRows(scopeKey).filter((row) => row.status === "cached");
    const mediaBytes = rows.reduce((sum, row) => sum + (row.local_path ? fileSize(row.local_path) : Number(row.bytes ?? 0)), 0);
    return {
      mediaBytes,
      mediaCount: new Set(rows.map((row) => row.media_identity)).size,
    };
  }

  private mediaVariantRows(scopeKey?: string) {
    if (!scopeKey) {
      return this.db
        .prepare(
          "SELECT variant_id, media_identity, local_path, bytes, status FROM media_variants",
        )
        .all() as Array<{
        bytes?: number | null;
        local_path?: string | null;
        media_identity: string;
        status: string;
        variant_id: string;
      }>;
    }
    return this.db
      .prepare(
        `
        SELECT DISTINCT v.variant_id, v.media_identity, v.local_path, v.bytes, v.status
        FROM media_variants v
        JOIN message_media_refs r ON r.media_identity = v.media_identity
        JOIN messages m ON m.message_id = r.message_id
        WHERE m.scope_key = ?
        `,
      )
      .all(scopeKey) as Array<{
      bytes?: number | null;
      local_path?: string | null;
      media_identity: string;
      status: string;
      variant_id: string;
    }>;
  }

  private rebuildFts(scopeKey?: string) {
    const rows = scopeKey
      ? (this.db.prepare("SELECT message_json FROM messages WHERE scope_key = ?").all(scopeKey) as MessageRow[])
      : (this.db.prepare("SELECT message_json FROM messages").all() as MessageRow[]);
    const messages = rows.map(rowToMessage);
    const transaction = this.db.transaction(() => {
      if (scopeKey) {
        const ids = this.db.prepare("SELECT id FROM messages WHERE scope_key = ?").all(scopeKey) as Array<{ id: string }>;
        for (const row of ids) this.deleteMessageFts(row.id);
      } else {
        this.db.prepare("DELETE FROM message_fts").run();
      }
      for (const message of messages) {
        this.db
          .prepare(
            "INSERT INTO message_fts (id, scope_key, conversation_type, conversation_id, content) VALUES (?, ?, ?, ?, ?)",
          )
          .run(message.id, message.scopeKey, message.conversationType, message.conversationId, messageSearchText(message));
      }
    });
    transaction();
  }

  private markMissingMediaVariantsStale(scopeKey?: string) {
    const rows = this.mediaVariantRows(scopeKey);
    let stale = 0;
    const transaction = this.db.transaction(() => {
      for (const row of rows) {
        if (!row.local_path || existsSync(row.local_path)) continue;
        stale += 1;
        this.db
          .prepare(
            "UPDATE media_variants SET status = 'stale', error_reason = 'local_file_missing', updated_at = ? WHERE variant_id = ?",
          )
          .run(Date.now(), row.variant_id);
      }
    });
    transaction();
    return { checked: rows.length, stale };
  }

  private dbBytes() {
    try {
      return statSync(this.dbPath).size;
    } catch {
      return 0;
    }
  }

  private record(record: SqliteLocalDataDiagnostic) {
    this.recordDiagnostic?.(record);
  }

  private ensureColumn(table: string, column: string, definition: string) {
    const rows = this.db.prepare(`PRAGMA table_info(${table})`).all() as Array<{ name: string }>;
    if (rows.some((row) => row.name === column)) return;
    this.db.prepare(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`).run();
  }
}

const localDataSchemaVersion = 3;

function rowToMessage(row: MessageRow) {
  return JSON.parse(row.message_json) as LocalDataMessage;
}

function outboxFromRow(row: OutboxRow): LocalDataOutboxRecord {
  return {
    bodyJson: safeJsonRecord(row.payload_json),
    clientMsgId: row.client_msg_id,
    conversationId: row.conversation_id,
    conversationType: row.conversation_type as LocalDataOutboxRecord["conversationType"],
    localMessageId: row.local_message_id,
    messageType: row.message_type,
    outboxId: row.outbox_id,
    retryCount: row.retry_count,
    scopeKey: row.scope_key,
    status: row.status as LocalDataOutboxRecord["status"],
    updatedAt: row.updated_at,
  };
}

function customerServiceThreadFromRow(row: CustomerServiceThreadRow): LocalDataCustomerServiceThreadSnapshot {
  return {
    customerSnapshotJson: safeJsonRecord(row.customer_snapshot_json),
    lastEventJson: safeJsonRecord(row.last_event_json),
    scopeKey: row.scope_key,
    status: row.status,
    threadId: row.thread_id,
    threadKey: row.thread_key,
    threadType: row.thread_type,
    unreadCount: row.unread_count,
    updatedAt: row.updated_at,
  };
}

function normalizeCustomerServiceThread(
  input: Parameters<LocalDataDriver["upsertCustomerServiceThread"]>[0]["thread"],
): LocalDataCustomerServiceThreadSnapshot {
  const scopeKey = normalizeText(input.scopeKey, "unknown-scope");
  const threadType = normalizeText(input.threadType, "unknown-thread-type");
  const threadId = normalizeText(input.threadId, "unknown-thread");
  return {
    customerSnapshotJson: input.customerSnapshotJson ?? {},
    lastEventJson: input.lastEventJson ?? {},
    scopeKey,
    status: input.status?.trim() || "unknown",
    threadId,
    threadKey: `${scopeKey}:${threadType}:${threadId}`,
    threadType,
    unreadCount: typeof input.unreadCount === "number" ? input.unreadCount : 0,
    updatedAt: typeof input.updatedAt === "number" ? input.updatedAt : Date.now(),
  };
}

function mediaVariantProjectionFromRow(row: {
  bytes?: number | null;
  local_path?: string | null;
  media_identity: string;
  server_url?: string | null;
  status: string;
  updated_at: number;
  variant_kind: string;
}): LocalDataMediaVariantProjection {
  return {
    ...(typeof row.bytes === "number" ? { bytes: row.bytes } : {}),
    ...(row.local_path ? { fileUrl: pathToFileURL(row.local_path).toString() } : {}),
    mediaIdentity: row.media_identity,
    ...(row.server_url ? { serverUrl: row.server_url } : {}),
    status: normalizeVariantStatus(row.status),
    updatedAt: row.updated_at,
    variantKind: normalizeVariantKind(row.variant_kind),
  };
}

function messageSearchText(message: LocalDataMessage) {
  return [
    message.preview,
    message.messageId,
    message.clientMsgId,
    message.messageType,
    JSON.stringify(message.bodyJson),
  ]
    .filter(Boolean)
    .join(" ");
}

function escapeLike(value: string) {
  return value.replace(/[%_]/g, (match) => `\\${match}`);
}

function normalizeMediaKind(value: string) {
  if (value === "image" || value === "video" || value === "file") return value;
  return "file";
}

function normalizeVariantKind(value?: string | null) {
  if (value === "thumbnail" || value === "poster" || value === "display") return value;
  return "original";
}

function normalizeVariantStatus(value?: string | null) {
  if (value === "stale" || value === "failed") return value;
  return "cached";
}

function localPathFromUrl(url?: string | null) {
  if (!url) return null;
  if (url.startsWith("file:")) return fileURLToPath(url);
  return url;
}

function bytesFromLocalUrl(url?: string | null) {
  const path = localPathFromUrl(url);
  return path ? fileSize(path) : null;
}

function fileSize(path: string) {
  try {
    const stats = statSync(path);
    return stats.isFile() ? stats.size : 0;
  } catch {
    return 0;
  }
}

function safeJsonRecord(value: string) {
  try {
    const parsed = JSON.parse(value) as unknown;
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : {};
  } catch {
    return {};
  }
}

function normalizeText(value: string, fallback: string) {
  return value.trim() || fallback;
}

function errorReason(error: unknown) {
  if (error instanceof Error) return error.message;
  return typeof error === "string" ? error : "unknown-error";
}
