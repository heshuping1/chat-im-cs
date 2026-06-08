import { describe, expect, it } from "vitest";

import {
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
});
