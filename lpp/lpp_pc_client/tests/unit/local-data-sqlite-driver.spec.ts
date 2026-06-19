import { mkdtemp, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import Database from "better-sqlite3";
import { describe, expect, it } from "vitest";

import {
  SqliteLocalDataDriver,
  type SqliteLocalDataDiagnostic,
} from "../../src/main/local-data/local-data-sqlite-driver";
import { createLocalDataService } from "../../src/main/local-data/local-data-service";
import { normalizeLocalDataMessage } from "../../src/shared/local-data-contract";

describe("local data sqlite driver", () => {
  it("persists local messages and searches through FTS-like query contract", async () => {
    const root = await mkdtemp(join(tmpdir(), "lpp-local-sqlite-"));
    try {
      const dbPath = join(root, "lpp-local-v1.sqlite");
      const diagnostics: SqliteLocalDataDiagnostic[] = [];
      const first = createLocalDataService({
        driver: new SqliteLocalDataDriver({
          dbPath,
          recordDiagnostic: (record) => diagnostics.push(record),
        }),
      });
      await first.upsertMessages({
        messages: [
          normalizeLocalDataMessage({
            bodyJson: { text: "hello sqlite driver" },
            conversationId: "c1",
            conversationSeq: 1,
            conversationType: "direct",
            messageId: "m1",
            preview: "hello sqlite driver",
            scopeKey: "scope-a",
            sentAt: "2026-06-07T00:00:01.000Z",
          }),
        ],
        scopeKey: "scope-a",
      });

      const second = createLocalDataService({
        driver: new SqliteLocalDataDriver({ dbPath }),
      });

      expect(
        await second.listMessages({
          conversationId: "c1",
          conversationType: "direct",
          limit: 50,
          scopeKey: "scope-a",
        }),
      ).toMatchObject([{ messageId: "m1", preview: "hello sqlite driver" }]);
      expect(
        await second.searchMessages({
          keyword: "sqlite",
          limit: 10,
          scopeKey: "scope-a",
        }),
      ).toMatchObject([{ messageId: "m1" }]);
      expect(
        await second.searchMessages({
          keyword: "%",
          limit: 10,
          scopeKey: "scope-a",
        }),
      ).toEqual([]);
      expect(await second.getStorageStats({ scopeKey: "scope-a" })).toMatchObject({
        messageCount: 1,
        scopeKey: "scope-a",
      });
      expect(
        await second.cleanup({ scopeKey: "scope-a", target: "message-index" }),
      ).toMatchObject({
        deletedMessages: 1,
        target: "message-index",
      });
      expect(await second.getStorageStats({ scopeKey: "scope-a" })).toMatchObject({
        messageCount: 0,
        scopeKey: "scope-a",
      });
      expect(diagnostics).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ event: "migration", result: "ok" }),
          expect.objectContaining({ event: "upsert_messages", result: "ok" }),
        ]),
      );

      const db = new Database(dbPath, { readonly: true });
      try {
        expect(
          db
            .prepare("SELECT value FROM local_meta WHERE key = 'schema_version'")
            .get(),
        ).toMatchObject({ value: "3" });
        expect(
          db
            .prepare(
              `
              SELECT name
              FROM sqlite_master
              WHERE type IN ('table', 'virtual')
              ORDER BY name
              `,
            )
            .all()
            .map((row) => (row as { name: string }).name),
        ).toEqual(
          expect.arrayContaining([
            "cleanup_jobs",
            "conversations",
            "cs_customer_snapshots",
            "cs_thread_events",
            "cs_threads",
            "local_meta",
            "media_assets",
            "media_variants",
            "message_fts",
            "message_media_refs",
            "messages",
            "send_outbox",
            "sync_cursors",
          ]),
        );
      } finally {
        await first.close();
        await second.close();
        db.close();
      }
    } finally {
      await rm(root, { force: true, recursive: true });
    }
  });

  it("persists media variants, outbox metadata, cs snapshots and repairs fts", async () => {
    const root = await mkdtemp(join(tmpdir(), "lpp-local-sqlite-"));
    try {
      const dbPath = join(root, "lpp-local-v1.sqlite");
      const service = createLocalDataService({
        driver: new SqliteLocalDataDriver({ dbPath }),
      });
      await service.upsertMedia({
        asset: {
          fileName: "photo.png",
          identitySource: "mediaId",
          kind: "image",
          mediaIdentity: "media-1",
          serverUrl: "https://assets.example/photo.png",
        },
        variants: [
          {
            mediaIdentity: "media-1",
            serverUrl: "https://assets.example/photo.png",
            status: "cached",
            variantKind: "original",
          },
        ],
      });
      expect(await service.getMediaVariant({ mediaIdentity: "media-1" })).toMatchObject({
        mediaIdentity: "media-1",
        serverUrl: "https://assets.example/photo.png",
        status: "cached",
      });

      await service.upsertOutbox({
        record: {
          bodyJson: { text: "pending" },
          clientMsgId: "client-1",
          conversationId: "c1",
          conversationType: "direct",
          localMessageId: "local-1",
          messageType: "text",
          scopeKey: "scope-a",
          status: "sending",
          updatedAt: 10,
        },
      });
      expect(await service.listOutbox({ scopeKey: "scope-a" })).toMatchObject([
        { clientMsgId: "client-1", localMessageId: "local-1", status: "sending" },
      ]);
      await service.deleteOutbox({ localMessageId: "local-1", scopeKey: "scope-a" });
      expect(await service.listOutbox({ scopeKey: "scope-a" })).toEqual([]);

      await service.upsertCustomerServiceThread({
        thread: {
          customerSnapshotJson: { profile: { displayName: "Alice" } },
          scopeKey: "scope-a",
          status: "serving",
          threadId: "t1",
          threadType: "temp_session",
          unreadCount: 2,
          updatedAt: 20,
        },
      });
      expect(
        await service.listCustomerServiceThreads({ scopeKey: "scope-a" }),
      ).toMatchObject([
        {
          customerSnapshotJson: { profile: { displayName: "Alice" } },
          threadId: "t1",
          unreadCount: 2,
        },
      ]);
      expect(await service.repair({ rebuildFts: true })).toMatchObject({
        dbIntegrity: "ok",
        ftsRebuilt: true,
      });
      await service.close();
    } finally {
      await rm(root, { force: true, recursive: true });
    }
  });
});
