import { describe, expect, it } from "vitest";

import {
  activeGroupReadReceiptAutoSyncDelayMs,
  activeGroupReadReceiptAutoSyncIntervalMs,
  activeGroupReadReceiptAutoSyncMaxTargets,
  activeGroupReadReceiptAutoSyncStaleMs,
  groupReadReceiptQueryKey,
  parseGroupReadReceiptsPayload,
} from "../../src/renderer/data/message/group-read-receipts-model";

describe("group read receipts model", () => {
  it("parses contract dto with lastReadSeq against message seq", () => {
    const receipts = parseGroupReadReceiptsPayload(
      {
        members: [
          {
            userId: "u-1",
            displayName: "Alice",
            avatarUrl: "https://cdn.example.test/a.png",
            lastReadSeq: 12,
          },
          {
            userId: "u-2",
            displayName: "Bob",
            lastReadSeq: 8,
          },
        ],
        totalMembers: 2,
        readCount: 1,
        unreadCount: 1,
      },
      { messageSeq: 10 },
    );

    expect(receipts.totalMembers).toBe(2);
    expect(receipts.readCount).toBe(1);
    expect(receipts.unreadCount).toBe(1);
    expect(receipts.readMembers.map((member) => member.userId)).toEqual(["u-1"]);
    expect(receipts.unreadMembers.map((member) => member.userId)).toEqual(["u-2"]);
  });

  it("keeps old hasRead list response compatible", () => {
    const receipts = parseGroupReadReceiptsPayload(
      [
        {
          userId: "u-1",
          displayName: "Alice",
          avatarUrl: "https://cdn.example.test/a.png",
          hasRead: true,
        },
        {
          userId: "u-2",
          displayName: "",
          hasRead: false,
        },
      ],
      { messageSeq: 10 },
    );

    expect(receipts.totalMembers).toBe(2);
    expect(receipts.readCount).toBe(1);
    expect(receipts.unreadCount).toBe(1);
    expect(receipts.readMembers[0]?.displayName).toBe("Alice");
    expect(receipts.unreadMembers[0]?.displayName).toBe("用户");
  });

  it("excludes the current sender from group read receipt members and counts", () => {
    const receipts = parseGroupReadReceiptsPayload(
      {
        members: [
          {
            userId: "self-user",
            displayName: "mouse客服1",
            avatarUrl: "https://cdn.example.test/self.png",
            lastReadSeq: 18,
          },
          {
            userId: "u-2",
            displayName: "测试客户A",
            lastReadSeq: 9,
          },
          {
            userId: "u-3",
            displayName: "测试客户B",
            lastReadSeq: 0,
          },
        ],
        readCount: 1,
        totalMembers: 3,
        unreadCount: 2,
      },
      {
        currentUser: { userId: "self-user" },
        messageSeq: 10,
      },
    );

    expect(receipts.totalMembers).toBe(2);
    expect(receipts.readCount).toBe(0);
    expect(receipts.unreadCount).toBe(2);
    expect(receipts.members.map((member) => member.userId)).toEqual(["u-2", "u-3"]);
    expect(receipts.readMembers).toEqual([]);
    expect(receipts.unreadMembers.map((member) => member.userId)).toEqual(["u-2", "u-3"]);
  });

  it("parses receipt member identity aliases used by read receipt APIs", () => {
    const receipts = parseGroupReadReceiptsPayload(
      {
        members: [
          {
            memberUserId: "member-user",
            platform_user_id: "platform-user",
            lpp_no: "lpp-1",
            display_name: "成员一",
            avatar_url: "member.png",
            lastReadSeq: 12,
          },
          {
            user: {
              readerUserId: "reader-user",
              platformUserId: "reader-platform",
              lppId: "reader-lpp",
              displayName: "成员二",
              avatarUrl: "reader.png",
            },
            lastReadSeq: 0,
          },
        ],
      },
      { messageSeq: 10 },
    );

    expect(receipts.readMembers[0]).toMatchObject({
      avatarUrl: "member.png",
      displayName: "成员一",
      lppId: "lpp-1",
      platformUserId: "platform-user",
      userId: "member-user",
    });
    expect(receipts.unreadMembers[0]).toMatchObject({
      avatarUrl: "reader.png",
      displayName: "成员二",
      lppId: "reader-lpp",
      platformUserId: "reader-platform",
      userId: "reader-user",
    });
  });

  it("scopes query key by workspace, group, message and seq", () => {
    expect(
      groupReadReceiptQueryKey({
        apiBaseUrl: "https://api.example.test",
        groupId: "group-1",
        messageId: "message-1",
        messageSeq: 10,
        tenantToken: "tenant-token",
      }),
    ).toEqual([
      "pc-group-read-receipts",
      "https://api.example.test",
      "tenant-token",
      "group-1",
      "message-1",
      10,
    ]);
  });

  it("keeps active-conversation read receipt auto sync out of the first frame", () => {
    expect(activeGroupReadReceiptAutoSyncDelayMs()).toBe(500);
    expect(activeGroupReadReceiptAutoSyncIntervalMs()).toBe(5_000);
    expect(activeGroupReadReceiptAutoSyncMaxTargets()).toBe(4);
    expect(activeGroupReadReceiptAutoSyncStaleMs()).toBe(10_000);
  });
});
