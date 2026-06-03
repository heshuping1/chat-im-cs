import { describe, expect, it } from "vitest";

import type { MessageItemDto } from "../../src/renderer/data/api/types";
import {
  createMemorySendOutboxStorage,
  createOutboxFile,
  expiredOutboxCutoff,
  interruptedOutboxMessage,
  sendOutboxBlobId,
  sendOutboxRecordToMessage,
  sendOutboxTargetKey,
  sendOutboxRetentionMs,
  shouldMarkOutboxRecordInterrupted,
  type SendOutboxRecord,
} from "../../src/renderer/data/send/send-outbox";

const now = Date.parse("2026-05-30T10:00:00.000Z");

function record(overrides: Partial<SendOutboxRecord> = {}): SendOutboxRecord {
  return {
    body: { text: "hello" },
    channel: "im",
    clientMsgId: "client-1",
    createdAt: now,
    localMessageId: "local-1",
    localTaskId: "task-1",
    messageType: "text",
    scopeKey: "scope-1",
    status: "failed",
    targetId: "c1",
    targetType: "direct",
    updatedAt: now,
    ...overrides,
  };
}

describe("send outbox", () => {
  it("persists and restores failed messages by scope and target", async () => {
    const storage = createMemorySendOutboxStorage();
    await storage.upsertRecord(record());
    await storage.upsertRecord(record({
      localMessageId: "other",
      scopeKey: "scope-2",
    }));

    const restored = await storage.listRecords({
      scopeKey: "scope-1",
      targetKey: sendOutboxTargetKey("im", "direct", "c1"),
    });

    expect(restored).toHaveLength(1);
    expect(restored[0]).toMatchObject({
      body: { text: "hello" },
      localMessageId: "local-1",
      status: "failed",
    });
  });

  it("turns interrupted upload and send states into failed messages on restore", () => {
    expect(
      interruptedOutboxMessage(record({
        status: "uploading",
        uploadPhase: "uploading_media",
        uploadProgress: 42,
      }) as unknown as MessageItemDto),
    ).toMatchObject({
      status: "failed",
      localError: "发送中断，点击重试",
      uploadPhase: "failed",
      uploadProgress: undefined,
    });
  });

  it("does not mark fresh in-flight outbox records as interrupted", () => {
    const fresh = record({
      createdAt: now - 1_000,
      status: "sending",
      updatedAt: now - 500,
    });
    const stale = record({
      createdAt: now - 20_000,
      status: "sending",
      updatedAt: now - 20_000,
    });

    expect(shouldMarkOutboxRecordInterrupted(fresh, now)).toBe(false);
    expect(shouldMarkOutboxRecordInterrupted(stale, now)).toBe(true);
  });

  it("converts records to local outgoing messages without changing identity scope", () => {
    expect(sendOutboxRecordToMessage(record({
      body: { text: "restored" },
      localFailedAt: now + 1,
      status: "sending",
    }), {
      avatarUrl: "avatar.png",
      displayName: "Eric",
      userId: "u1",
    })).toMatchObject({
      body: { text: "restored" },
      conversationId: "c1",
      direction: "out",
      isMine: true,
      localError: "发送中断，点击重试",
      localFailedAt: now + 1,
      messageId: "local-1",
      messageType: "text",
      preview: "restored",
      senderAvatarUrl: "avatar.png",
      senderDisplayName: "Eric",
      status: "failed",
    });
  });

  it("preserves cached local open urls when restoring interrupted media records", () => {
    const message = sendOutboxRecordToMessage(record({
      body: {
        video: {
          fileName: "clip.mp4",
          localOpenUrl: "file:///app-cache/clip.mp4",
          localPreviewUrl: "blob:preview",
          url: "/remote/clip.mp4",
        },
      },
      messageType: "video",
      status: "paused",
      uploadPhase: "uploading_media",
    }));

    expect(message).toMatchObject({
      body: {
        video: {
          localOpenUrl: "file:///app-cache/clip.mp4",
          localPreviewUrl: "blob:preview",
          url: "/remote/clip.mp4",
        },
      },
      messageType: "video",
      status: "failed",
    });
  });

  it("cleans records and blobs older than the retention window", async () => {
    const storage = createMemorySendOutboxStorage();
    const expiredAt = expiredOutboxCutoff(now) - 1;
    await storage.putBlob("blob-old", new Blob(["old"], { type: "text/plain" }));
    await storage.putBlob("blob-fresh", new Blob(["fresh"], { type: "text/plain" }));
    await storage.upsertRecord(record({
      createdAt: expiredAt,
      fileBlobId: "blob-old",
      localMessageId: "expired",
      updatedAt: expiredAt,
    }));
    await storage.upsertRecord(record({
      fileBlobId: "blob-fresh",
      localMessageId: "fresh",
    }));

    await storage.cleanupExpired(now);

    expect(await storage.getBlob("blob-old")).toBeNull();
    expect(await storage.getBlob("blob-fresh")).toBeInstanceOf(Blob);
    expect(await storage.listRecords({ scopeKey: "scope-1" })).toHaveLength(1);
    expect(sendOutboxRetentionMs).toBe(30 * 24 * 60 * 60 * 1000);
  });

  it("restores files from blobs and reports when the local file is gone", async () => {
    const storage = createMemorySendOutboxStorage();
    await storage.putBlob("blob-file", new Blob(["video"], { type: "video/mp4" }));

    const restored = await createOutboxFile(storage, record({
      fileBlobId: "blob-file",
      fileName: "clip.mp4",
      mimeType: "video/mp4",
    }));
    const missing = await createOutboxFile(storage, record({
      fileBlobId: "missing",
      fileName: "clip.mp4",
      mimeType: "video/mp4",
    }));

    expect(restored?.name).toBe("clip.mp4");
    expect(restored?.type).toBe("video/mp4");
    expect(missing).toBeNull();
    expect(sendOutboxBlobId("scope-1", "local-1", "file")).toBe("scope-1:local-1:file");
  });
});
