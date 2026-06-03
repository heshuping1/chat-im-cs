import { describe, expect, it } from "vitest";

import type {
  ChatArchiveConversation,
  ChatArchiveSessionScope,
} from "../../src/renderer/settings/models/chatArchiveModel";
import {
  buildChatArchiveBackup,
  buildChatArchiveExport,
  parseChatArchiveBackup,
  preflightChatArchiveRestore,
} from "../../src/renderer/settings/models/chatArchiveModel";

const scope: ChatArchiveSessionScope = {
  apiBaseUrl: "https://chat.example.test",
  tenantId: "tenant-1",
  tenantName: "Tenant One",
  userId: "user-1",
  displayName: "Agent One",
  spaceType: 1,
};

const conversations: ChatArchiveConversation[] = [
  {
    conversationId: "direct-1",
    conversationType: "direct",
    title: "Customer A",
    exportedMessageCount: 2,
    messages: [
      {
        messageId: "m-1",
        conversationSeq: 1,
        messageType: "text",
        sentAt: "2026-06-03T09:00:00.000Z",
        senderUserId: "customer-1",
        preview: "hello",
        body: { text: "hello" },
      },
      {
        messageId: "m-2",
        conversationSeq: 2,
        messageType: "image",
        sentAt: "2026-06-03T09:01:00.000Z",
        senderUserId: "user-1",
        preview: "[图片]",
        body: { url: "https://assets.example/image.png", fileName: "image.png" },
      },
    ],
  },
];

describe("chat archive model", () => {
  it("builds a readable export without credentials and with stable conversation metadata", () => {
    const exported = buildChatArchiveExport({
      conversations,
      generatedAt: "2026-06-03T10:00:00.000Z",
      scope: {
        ...scope,
        tenantToken: "raw-token",
      } as ChatArchiveSessionScope,
    });

    expect(exported.version).toBe(1);
    expect(exported.kind).toBe("lpp-chat-export");
    expect(exported.scope).toEqual({
      apiBaseUrl: "https://chat.example.test",
      displayName: "Agent One",
      spaceType: 1,
      tenantId: "tenant-1",
      tenantName: "Tenant One",
      userId: "user-1",
    });
    expect(JSON.stringify(exported)).not.toContain("raw-token");
    expect(exported.conversations[0]).toMatchObject({
      conversationId: "direct-1",
      conversationType: "direct",
      exportedMessageCount: 2,
      title: "Customer A",
    });
  });

  it("builds and parses a backup package with checksum validation", () => {
    const backupText = buildChatArchiveBackup({
      conversations,
      generatedAt: "2026-06-03T10:00:00.000Z",
      scope,
    });
    const parsed = parseChatArchiveBackup(backupText);

    expect(parsed.kind).toBe("lpp-chat-backup");
    expect(parsed.checksum).toMatch(/^[a-f0-9]{16}$/);
    expect(parsed.archive.conversations).toHaveLength(1);
    expect(parsed.archive.conversations[0].messages).toHaveLength(2);

    const damaged = backupText.replace("Customer A", "Customer B");
    expect(() => parseChatArchiveBackup(damaged)).toThrow("备份文件校验失败");
  });

  it("blocks restore when backup scope does not match the current account space", () => {
    const backupText = buildChatArchiveBackup({
      conversations,
      generatedAt: "2026-06-03T10:00:00.000Z",
      scope,
    });
    const parsed = parseChatArchiveBackup(backupText);

    expect(preflightChatArchiveRestore(parsed, scope)).toMatchObject({
      ok: true,
      conversationCount: 1,
      messageCount: 2,
    });
    expect(
      preflightChatArchiveRestore(parsed, {
        ...scope,
        tenantId: "tenant-2",
      }),
    ).toMatchObject({
      ok: false,
      reason: "备份文件属于其他账号或空间，不能恢复到当前客户端。",
    });
  });

  it("rejects malformed archive files before they reach local storage", () => {
    expect(() => parseChatArchiveBackup("{bad-json")).toThrow("备份文件不是有效 JSON");
    expect(() => parseChatArchiveBackup(JSON.stringify({ version: 1 }))).toThrow(
      "备份文件格式不正确",
    );
  });
});
