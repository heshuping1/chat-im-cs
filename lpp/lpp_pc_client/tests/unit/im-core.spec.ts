import { beforeEach, describe, expect, it } from "vitest";
import type { ConversationListItem, MessageItemDto } from "../../src/renderer/data/api-client";
import {
  validateConversationSummaryContract,
  validateMessagePageContract,
  validateGatewayMessageContract,
  type ApiContractValidation,
} from "../../src/renderer/data/im-api-contract";
import {
  conversationKey,
  createInitialImReadState,
  deriveMessageView,
  reduceImCoreEvent,
  coalesceImCoreCommands,
  type ConversationReadState,
  type ImCoreEvent,
} from "../../src/renderer/data/im-read-model";
import {
  coalesceExecutableCommands,
  markReadEndpointType,
} from "../../src/renderer/data/im-command-executor";
import {
  imCoreEventFromGatewayMessageForTest,
  imCoreEventFromGatewayReadForTest,
} from "../../src/renderer/components/GatewayBridge";
import {
  type AuthSession,
  imConversationStorageKey,
  sanitizeStoredImReadState,
  useWorkspaceStore,
} from "../../src/renderer/data/store";
import {
  conversationReadStateKey,
  effectiveConversationUnreadCount,
  type CurrentUserIdentity,
} from "../../src/renderer/data/message-display";
import {
  applyDirectReadReceiptToMessages,
  mergePeerReadSeq,
  readReceiptReaderIsCurrentUser,
  viewedConversationReadSeq,
} from "../../src/renderer/data/read-receipts";

const expectedScenarioMatrixIds = new Set([
  "D-01",
  "D-02",
  "D-03",
  "D-04",
  "D-05",
  "D-06",
  "D-07",
  "D-08",
  "D-09",
  "D-10",
  "D-11",
  "D-12",
  "D-13",
  "D-14",
  "R-01",
  "R-02",
  "R-03",
  "R-04",
  "R-05",
  "R-06",
  "R-07",
  "R-08",
  "R-09",
  "R-10",
  "R-11",
  "R-12",
  "R-13",
  "R-14",
  "O-01",
  "O-02",
  "O-03",
  "O-04",
  "O-05",
  "O-06",
  "O-07",
  "O-08",
  "O-09",
  "G-01",
  "G-02",
  "G-03",
  "G-04",
  "G-05",
  "G-06",
  "M-01",
  "M-02",
  "M-03",
  "M-04",
  "M-05",
  "M-06",
  "M-07",
  "M-08",
  "M-09",
  "M-10",
  "M-11",
  "M-12",
  "M-13",
  "P-01",
  "P-02",
  "P-03",
  "P-04",
  "P-05",
  "P-06",
  "A-01",
  "A-02",
  "A-03",
  "A-04",
  "A-05",
  "A-06",
  "U-01",
  "U-02",
  "U-03",
  "U-04",
  "U-05",
  "U-06",
  "U-07",
  "F-01",
  "F-02",
  "F-03",
  "F-04",
  "F-05",
  "F-06",
  "F-07",
  "F-08",
  "F-09",
  "F-10",
  "F-11",
]);

const currentUser: CurrentUserIdentity = {
  userId: "pc-user",
  platformUserId: "pc-platform",
  lppId: "pc-lpp",
  displayName: "PC User",
};

const storeSession: AuthSession = {
  apiBaseUrl: "https://api.example.com",
  tenantToken: "tenant-token-abcdef",
  tenantId: "tenant-1",
  userId: "user-1",
  displayName: "User",
};

function ensureLocalStorage() {
  if (globalThis.localStorage) return;

  const storage = new Map<string, string>();
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    value: {
      clear: () => storage.clear(),
      getItem: (key: string) => storage.get(key) ?? null,
      removeItem: (key: string) => storage.delete(key),
      setItem: (key: string, value: string) => storage.set(key, value),
    },
  });
}

beforeEach(() => {
  ensureLocalStorage();
  localStorage.clear();
  useWorkspaceStore.setState({
    authSession: null,
    locallyReadImConversationReads: {},
    imPeerReadReceipts: {},
    imReadStateByConversation: {},
  });
});

describe("IM scenario matrix coverage", () => {
  it("keeps declared scenario ids in sync with the design document matrix", async () => {
    const fs = await import("node:fs");
    const spec = fs.readFileSync(
      "docs/superpowers/specs/2026-05-28-pc-im-read-model-design.md",
      "utf8",
    );
    const matrix =
      spec.match(/## 场景矩阵\n([\s\S]*?)\n## 测试策略/)?.[1] ?? "";
    const ids = [...matrix.matchAll(/\| ([DROGMPAUF]-\d{2}) \|/g)].map(
      (match) => match[1],
    );
    const uniqueIds = [...new Set(ids)];

    expect(uniqueIds).toHaveLength(86);
    expect(ids).toHaveLength(uniqueIds.length);
    expect(uniqueIds.filter((id) => !expectedScenarioMatrixIds.has(id))).toEqual(
      [],
    );
    expect(
      [...expectedScenarioMatrixIds].filter((id) => !uniqueIds.includes(id)),
    ).toEqual([]);
  });
});

function conversation(
  overrides: Partial<ConversationListItem> = {},
): ConversationListItem {
  return {
    conversationId: "chat-1",
    conversationType: "direct",
    title: "peer",
    unreadCount: 0,
    ...overrides,
  };
}

function message(overrides: Partial<MessageItemDto> = {}): MessageItemDto {
  return {
    messageId: "m1",
    conversationId: "chat-1",
    conversationSeq: 1,
    senderUserId: "peer-user",
    status: "sent",
    ...overrides,
  };
}

describe("IM unread rules", () => {
  it("does not count a direct conversation as unread when the last message is sent by current user", () => {
    const item = conversation({
      unreadCount: 2,
      lastMessageSeq: 19,
      lastReadSeq: 17,
      lastMessage: {
        messageId: "m19",
        preview: "123213",
        sentAt: "2026-05-28T01:30:00.000Z",
        senderUserId: "pc-user",
      },
    });

    expect(effectiveConversationUnreadCount(item, currentUser)).toBe(0);
  });

  it("does not restore self-unread after a server refresh when local outgoing read marker covers the last message time", () => {
    const identity: CurrentUserIdentity = {
      ...currentUser,
      locallyReadConversationReads: {
        "chat-1": {
          readSeq: 0,
          readAt: Date.parse("2026-05-28T01:30:10.000Z"),
        },
      },
    };
    const refreshedConversation = conversation({
      unreadCount: 2,
      lastMessage: {
        messageId: "server-last",
        preview: "123213",
        sentAt: "2026-05-28T01:30:00.000Z",
      },
    });

    expect(effectiveConversationUnreadCount(refreshedConversation, identity)).toBe(0);
  });

  it("keeps real peer messages unread until local read seq catches up", () => {
    const item = conversation({
      conversationId: "chat-2",
      unreadCount: 3,
      lastMessageSeq: 22,
      lastReadSeq: 19,
      lastMessage: {
        messageId: "m22",
        preview: "hello",
        sentAt: "2026-05-28T01:31:00.000Z",
        senderUserId: "peer-user",
      },
    });

    expect(effectiveConversationUnreadCount(item, currentUser)).toBe(3);
  });

  it("clears unread when server lastReadSeq catches up to lastMessageSeq", () => {
    const item = conversation({
      unreadCount: 5,
      lastMessageSeq: 22,
      lastReadSeq: 22,
      lastMessage: {
        messageId: "m22",
        preview: "hello",
        sentAt: "2026-05-28T01:31:00.000Z",
        senderUserId: "peer-user",
      },
    });

    expect(effectiveConversationUnreadCount(item, currentUser)).toBe(0);
  });

  it("clears unread when local readSeq catches up even if server unread is stale", () => {
    const identity: CurrentUserIdentity = {
      ...currentUser,
      locallyReadConversationReads: {
        "chat-1": {
          readSeq: 22,
          readAt: Date.parse("2026-05-28T01:31:10.000Z"),
        },
      },
    };
    const item = conversation({
      unreadCount: 5,
      lastMessageSeq: 22,
      lastReadSeq: 19,
      lastMessage: {
        messageId: "m22",
        preview: "hello",
        sentAt: "2026-05-28T01:31:00.000Z",
        senderUserId: "peer-user",
      },
    });

    expect(effectiveConversationUnreadCount(item, identity)).toBe(0);
  });

  it("does not restore list unread when unified local readSeq covers a stale server snapshot", () => {
    const identity: CurrentUserIdentity = {
      ...currentUser,
      locallyReadConversationReads: {
        "direct:chat-1": {
          readSeq: 17,
          readAt: Date.parse("2026-05-28T02:40:00.000Z"),
        },
      },
    };
    const item = conversation({
      unreadCount: 6,
      lastMessageSeq: 17,
      lastReadSeq: 10,
      lastMessage: {
        messageId: "m17",
        preview: "stale server unread",
        sentAt: "2026-05-28T02:41:00.000Z",
        senderUserId: "peer-user",
      },
    });

    expect(effectiveConversationUnreadCount(item, identity)).toBe(0);
  });

  it("caps stale server unread count by local readSeq and lastMessageSeq", () => {
    const identity: CurrentUserIdentity = {
      ...currentUser,
      locallyReadConversationReads: {
        "chat-1": {
          readSeq: 5,
          readAt: Date.parse("2026-05-28T02:20:00.000Z"),
        },
      },
    };
    const item = conversation({
      unreadCount: 7,
      lastMessageSeq: 7,
      lastReadSeq: 0,
      lastMessage: {
        messageId: "m7",
        preview: "2",
        sentAt: "2026-05-28T02:27:00.000Z",
        senderUserId: "peer-user",
      },
    });

    expect(effectiveConversationUnreadCount(item, identity)).toBe(2);
  });

  it("caps stale server unread count by server lastReadSeq and lastMessageSeq", () => {
    const item = conversation({
      unreadCount: 6,
      lastMessageSeq: 12,
      lastReadSeq: 10,
      lastMessage: {
        messageId: "m12",
        preview: "second new message",
        sentAt: "2026-05-28T02:27:00.000Z",
        senderUserId: "peer-user",
      },
    });

    expect(effectiveConversationUnreadCount(item, currentUser)).toBe(2);
  });

  it("does not let an older local read time clear a newer peer message", () => {
    const identity: CurrentUserIdentity = {
      ...currentUser,
      locallyReadConversationReads: {
        "chat-1": {
          readSeq: 0,
          readAt: Date.parse("2026-05-28T01:30:00.000Z"),
        },
      },
    };
    const item = conversation({
      unreadCount: 2,
      lastMessage: {
        messageId: "m-new",
        preview: "new peer message",
        sentAt: "2026-05-28T01:30:01.000Z",
        senderUserId: "peer-user",
      },
    });

    expect(effectiveConversationUnreadCount(item, identity)).toBe(2);
  });

  it("recognizes self last messages by direction when sender ids are missing", () => {
    const item = conversation({
      unreadCount: 1,
      lastMessage: {
        messageId: "m-out",
        preview: "outgoing",
        sentAt: "2026-05-28T01:32:00.000Z",
        direction: "out",
      },
    });

    expect(effectiveConversationUnreadCount(item, currentUser)).toBe(0);
  });

  it("recognizes self last messages from nested sender identity aliases", () => {
    const item = conversation({
      unreadCount: 1,
      lastMessage: {
        messageId: "m-nested",
        preview: "nested sender",
        sentAt: "2026-05-28T01:32:00.000Z",
        sender: { platform_user_id: "pc-platform" },
      } as ConversationListItem["lastMessage"],
    });

    expect(effectiveConversationUnreadCount(item, currentUser)).toBe(0);
  });

  it("does not treat direct peer identity as self conversation unread", () => {
    const item = conversation({
      peerUserId: "peer-user",
      unreadCount: 4,
      lastMessage: {
        messageId: "m-peer",
        preview: "peer",
        sentAt: "2026-05-28T01:33:00.000Z",
        senderUserId: "peer-user",
      },
    });

    expect(effectiveConversationUnreadCount(item, currentUser)).toBe(4);
  });

  it("applies self-last-message protection to group conversations too", () => {
    const item = conversation({
      conversationType: "group",
      unreadCount: 2,
      lastMessage: {
        messageId: "g1",
        preview: "mine in group",
        sentAt: "2026-05-28T01:34:00.000Z",
        senderUserId: "pc-user",
      },
    });

    expect(effectiveConversationUnreadCount(item, currentUser)).toBe(0);
  });

  it("keeps group peer messages unread", () => {
    const item = conversation({
      conversationType: "group",
      unreadCount: 2,
      lastMessageSeq: 8,
      lastReadSeq: 6,
      lastMessage: {
        messageId: "g2",
        preview: "peer in group",
        sentAt: "2026-05-28T01:35:00.000Z",
        senderUserId: "peer-user",
      },
    });

    expect(effectiveConversationUnreadCount(item, currentUser)).toBe(2);
  });
});

describe("IM peer read receipt rules", () => {
  it("marks only current user's direct messages at or before peer read seq as read", () => {
    const messages: MessageItemDto[] = [
      message({
        messageId: "m1",
        conversationSeq: 9,
        senderUserId: "pc-user",
        status: "sent",
      }),
      message({
        messageId: "m2",
        conversationSeq: 11,
        senderUserId: "pc-user",
        status: "sent",
      }),
      message({
        messageId: "m3",
        conversationSeq: 10,
        senderUserId: "peer-user",
        status: "sent",
      }),
    ];

    const next = applyDirectReadReceiptToMessages(messages, 10, currentUser);

    expect(next[0]).toMatchObject({ messageId: "m1", isRead: true, status: "read" });
    expect(next[1]).toMatchObject({ messageId: "m2", status: "sent" });
    expect(next[2]).toMatchObject({ messageId: "m3", status: "sent" });
  });

  it("reapplies peer read seq to freshly polled server messages that still say sent", () => {
    const polledMessages: MessageItemDto[] = [
      message({
        messageId: "m1",
        conversationSeq: 9,
        senderUserId: "pc-user",
        status: "sent",
        isRead: false,
      }),
    ];

    expect(applyDirectReadReceiptToMessages(polledMessages, 9, currentUser)[0]).toMatchObject({
      messageId: "m1",
      isRead: true,
      status: "read",
    });
  });

  it("marks current user's sent file message as read when peer read seq covers it", () => {
    const polledMessages: MessageItemDto[] = [
      message({
        messageId: "file-31",
        conversationSeq: 31,
        senderUserId: "pc-user",
        messageType: "file",
        body: {
          file: {
            fileName: "FUTREN平台问题记录表 .xlsx",
            sizeBytes: 27_800_000,
          },
        },
        status: "sent",
        isRead: false,
      }),
    ];

    expect(applyDirectReadReceiptToMessages(polledMessages, 31, currentUser)[0]).toMatchObject({
      messageId: "file-31",
      isRead: true,
      status: "read",
    });
  });

  it("does not treat current user's own read event as peer read receipt", () => {
    expect(readReceiptReaderIsCurrentUser(["pc-platform"], currentUser)).toBe(true);
    expect(readReceiptReaderIsCurrentUser(["peer-user"], currentUser)).toBe(false);
  });

  it("never moves peer read seq backwards", () => {
    expect(mergePeerReadSeq(undefined, 12)).toBe(12);
    expect(mergePeerReadSeq(12, 9)).toBe(12);
    expect(mergePeerReadSeq(12, 18)).toBe(18);
  });

  it("does not mark messages without a valid conversation seq as read", () => {
    const messages = [
      message({
        messageId: "no-seq",
        conversationSeq: undefined,
        senderUserId: "pc-user",
      }),
    ];

    const next = applyDirectReadReceiptToMessages(messages, 10, currentUser)[0];

    expect(next).toMatchObject({
      messageId: "no-seq",
      status: "sent",
    });
    expect(next).not.toHaveProperty("isRead");
  });

  it("preserves messages that are already read", () => {
    const alreadyRead = message({
      messageId: "read",
      conversationSeq: 5,
      senderUserId: "pc-user",
      status: "read",
      isRead: true,
      readAt: "2026-05-28T01:40:00.000Z",
    });

    expect(applyDirectReadReceiptToMessages([alreadyRead], 10, currentUser)[0]).toBe(alreadyRead);
  });

  it("recognizes outgoing messages by direction when sender ids are absent", () => {
    const messages = [
      message({
        messageId: "direction-only",
        conversationSeq: 5,
        senderUserId: undefined,
        direction: "outgoing",
      }),
    ];

    expect(applyDirectReadReceiptToMessages(messages, 5, currentUser)[0]).toMatchObject({
      messageId: "direction-only",
      isRead: true,
      status: "read",
    });
  });

  it("does not mark peer messages as read by peer receipt", () => {
    const peerMessage = message({
      messageId: "peer",
      conversationSeq: 5,
      senderUserId: "peer-user",
    });

    expect(applyDirectReadReceiptToMessages([peerMessage], 10, currentUser)[0]).toBe(peerMessage);
  });
});

describe("IM viewed conversation read reporting rules", () => {
  it("reports read seq from loaded messages even when conversation unread count is stale or zero", () => {
    const messages = [
      message({
        messageId: "peer-20",
        conversationSeq: 20,
        senderUserId: "peer-user",
      }),
    ];

    expect(viewedConversationReadSeq(messages, 19, currentUser)).toBe(20);
  });

  it("reports the highest loaded seq when an unread peer message is followed by current user's own message", () => {
    const messages = [
      message({
        messageId: "peer-20",
        conversationSeq: 20,
        senderUserId: "peer-user",
      }),
      message({
        messageId: "mine-21",
        conversationSeq: 21,
        senderUserId: "pc-user",
      }),
    ];

    expect(viewedConversationReadSeq(messages, 19, currentUser)).toBe(21);
  });

  it("reports read seq when loaded messages contain only current user's own newer messages", () => {
    const messages = [
      message({
        messageId: "mine-21",
        conversationSeq: 21,
        senderUserId: "pc-user",
      }),
    ];

    expect(viewedConversationReadSeq(messages, 19, currentUser)).toBe(21);
  });

  it("does not report read seq when peer messages are already covered by current read seq", () => {
    const messages = [
      message({
        messageId: "peer-20",
        conversationSeq: 20,
        senderUserId: "peer-user",
      }),
    ];

    expect(viewedConversationReadSeq(messages, 20, currentUser)).toBeUndefined();
  });

  it("ignores messages without valid seq when deciding read reporting", () => {
    const messages = [
      message({
        messageId: "peer-no-seq",
        conversationSeq: undefined,
        senderUserId: "peer-user",
      }),
    ];

    expect(viewedConversationReadSeq(messages, 0, currentUser)).toBeUndefined();
  });

  it("uses conversation lastMessageSeq fallback when visible peer messages have no seq", () => {
    const messages = [
      message({
        messageId: "peer-no-seq",
        conversationSeq: undefined,
        senderUserId: "peer-user",
      }),
    ];

    expect(viewedConversationReadSeq(messages, 19, currentUser, 20)).toBe(20);
  });

  it("does not use lastMessageSeq fallback for own visible messages without seq", () => {
    const messages = [
      message({
        messageId: "mine-no-seq",
        conversationSeq: undefined,
        senderUserId: "pc-user",
      }),
    ];

    expect(viewedConversationReadSeq(messages, 19, currentUser, 20)).toBeUndefined();
  });

  it("does not report read seq for visible system-only messages", () => {
    const messages = [
      message({
        messageId: "system-20",
        conversationSeq: 20,
        senderUserId: undefined,
        messageType: "system",
      }),
    ];

    expect(viewedConversationReadSeq(messages, 19, currentUser)).toBeUndefined();
  });

  it("includes visible system seq when a peer message in the same visible range triggers read reporting", () => {
    const messages = [
      message({
        messageId: "peer-20",
        conversationSeq: 20,
        senderUserId: "peer-user",
      }),
      message({
        messageId: "system-21",
        conversationSeq: 21,
        senderUserId: undefined,
        messageType: "system",
      }),
    ];

    expect(viewedConversationReadSeq(messages, 19, currentUser)).toBe(21);
  });
});

describe("legacy helper compatibility through IM core", () => {
  it("does not clear unread when server unread low-reports and local cannot prove coverage", () => {
    const item = conversation({
      unreadCount: 0,
      lastMessageSeq: 22,
      lastReadSeq: 20,
      lastMessage: {
        messageId: "m22",
        preview: "peer",
        sentAt: "2026-05-28T02:00:00.000Z",
        senderUserId: "peer-user",
      },
    });

    expect(effectiveConversationUnreadCount(item, currentUser)).toBe(0);
  });

  it("reports read seq for self-only loaded messages so self sends advance myReadSeq", () => {
    expect(
      viewedConversationReadSeq(
        [
          message({
            messageId: "mine-21",
            conversationSeq: 21,
            senderUserId: "pc-user",
          }),
        ],
        19,
        currentUser,
      ),
    ).toBe(21);
  });
});

describe("IM API contract validator", () => {
  it("accepts complete direct conversation summaries", () => {
    const result = validateConversationSummaryContract({
      conversationId: "chat-1",
      conversationType: "direct",
      lastMessageSeq: 120,
      lastReadSeq: 118,
      peerReadSeq: 119,
      unreadCount: 2,
      lastMessage: {
        messageId: "m120",
        conversationSeq: 120,
        senderUserId: "peer-user",
        direction: "in",
      },
    });

    expect(result.level).toBe("ok");
    expect(result.normalized).toMatchObject({
      conversationId: "chat-1",
      conversationType: "direct",
      lastMessageSeq: 120,
      lastReadSeq: 118,
      peerReadSeq: 119,
      unreadCount: 2,
    });
  });

  it("accepts direct summaries without peer read cursor because read-status is authoritative", () => {
    const result = validateConversationSummaryContract({
      conversationId: "chat-1",
      conversationType: "direct",
      lastMessageSeq: 120,
      lastReadSeq: 118,
      unreadCount: 2,
      lastMessage: {
        messageId: "m120",
        conversationSeq: 120,
        senderUserId: "peer-user",
      },
    });

    expect(result.level).toBe("ok");
    expect(result.normalized).toMatchObject({
      conversationId: "chat-1",
      conversationType: "direct",
      lastMessageSeq: 120,
      lastReadSeq: 118,
      peerReadSeq: 0,
      unreadCount: 2,
    });
  });

  it("accepts zero peerReadSeq but blocks missing lastReadSeq", () => {
    const withZeroPeerReadSeq = validateConversationSummaryContract({
      conversationId: "chat-1",
      conversationType: "direct",
      lastMessageSeq: 120,
      lastReadSeq: 0,
      peerReadSeq: 0,
      unreadCount: 2,
    });
    const missingLastReadSeq = validateConversationSummaryContract({
      conversationId: "chat-1",
      conversationType: "direct",
      lastMessageSeq: 120,
      peerReadSeq: 0,
      unreadCount: 2,
    });

    expect(withZeroPeerReadSeq.level).toBe("ok");
    expect(withZeroPeerReadSeq.normalized.peerReadSeq).toBe(0);
    expect(missingLastReadSeq.level).toBe("blocking");
    expect(missingLastReadSeq.diagnostics).toContain("im.read.api_contract_blocking");
  });

  it("accepts documented server peerLastReadSeq alias for direct conversations", () => {
    const result = validateConversationSummaryContract({
      conversationId: "chat-1",
      conversationType: "direct",
      lastMessageSeq: 31,
      lastReadSeq: 30,
      peerLastReadSeq: 31,
      unreadCount: 0,
      lastMessage: {
        messageId: "file-31",
        conversationSeq: 31,
        senderUserId: "pc-user",
        messageType: "file",
      },
    });

    expect(result.level).toBe("ok");
    expect(result.normalized.peerReadSeq).toBe(31);
  });

  it("does not clear unread when the server omits every peer read cursor", () => {
    const result = validateConversationSummaryContract({
      conversationId: "chat-1",
      conversationType: "direct",
      lastMessageSeq: 31,
      lastReadSeq: 30,
      unreadCount: 0,
      lastMessage: {
        messageId: "file-31",
        conversationSeq: 31,
        senderUserId: "pc-user",
        messageType: "file",
      },
    });

    expect(result.level).toBe("ok");
    expect(result.normalized.peerReadSeq).toBe(0);
    expect(result.normalized.unreadCount).toBe(0);
  });

  it("marks missing message page coverage as degraded", () => {
    const result = validateMessagePageContract({
      conversationId: "chat-1",
      conversationType: "direct",
      items: [
        {
          messageId: "m120",
          conversationId: "chat-1",
          conversationSeq: 120,
          senderUserId: "peer-user",
          direction: "in",
        },
      ],
    });

    expect(result.level).toBe("degraded");
    expect(result.diagnostics).toContain("im.read.missing_page_coverage");
  });

  it("normalizes array message page responses without requiring a caller-side cast", () => {
    const result = validateMessagePageContract([
      {
        messageId: "m120",
        conversationId: "chat-1",
        conversationSeq: 120,
        senderUserId: "peer-user",
      },
    ]);

    expect(result.normalized.items).toHaveLength(1);
    expect(result.normalized.page).toMatchObject({ minSeq: 120, maxSeq: 120 });
    expect(result.level).toBe("degraded");
    expect(result.diagnostics).toContain("im.read.missing_page_coverage");
  });

  it("marks gateway messages without conversationSeq as blocking for read math", () => {
    const result = validateGatewayMessageContract({
      event: "msg.new",
      conversationId: "chat-1",
      conversationType: "direct",
      message: {
        messageId: "m121",
        senderUserId: "peer-user",
        direction: "in",
      },
    });

    expect(result.level).toBe("blocking");
    expect(result.diagnostics).toContain("im.read.missing_seq");
  });

  it("marks gateway messages without sender identity as degraded unless self-identifying", () => {
    const missingSender = validateGatewayMessageContract({
      event: "msg.new",
      conversationId: "chat-1",
      conversationType: "direct",
      message: {
        messageId: "m121",
        conversationSeq: 121,
        direction: "in",
      },
    });
    const selfIdentifying = validateGatewayMessageContract({
      event: "msg.new",
      conversationId: "chat-1",
      conversationType: "direct",
      message: {
        messageId: "m122",
        conversationSeq: 122,
        direction: "out",
      },
    });

    expect(missingSender.level).toBe("degraded");
    expect(missingSender.diagnostics).toContain("im.read.missing_sender");
    expect(selfIdentifying.level).toBe("ok");
    expect(selfIdentifying.diagnostics).not.toContain("im.read.missing_sender");
  });

  it("keeps the validation shape explicit", () => {
    const result: ApiContractValidation<{ ok: true }> = {
      level: "ok",
      normalized: { ok: true },
      diagnostics: [],
    };

    expect(result.normalized.ok).toBe(true);
  });
});

describe("IM store read state helpers", () => {
  it("separates accounts and conversations by scoped keys", () => {
    expect(imConversationStorageKey(storeSession)).toContain("tenant-1");
  });

  it("drops corrupted read state entries", () => {
    expect(
      sanitizeStoredImReadState({
        "direct:chat-1": {
          conversationId: "chat-1",
          conversationType: "direct",
          myReadSeq: 5,
          peerReadSeq: 0,
          lastMessageSeq: 5,
          updatedAt: 1,
        },
        broken: { myReadSeq: "nope" },
      }),
    ).toHaveProperty("direct:chat-1");
    expect(sanitizeStoredImReadState({ broken: { myReadSeq: "nope" } })).toEqual({});
    expect(
      sanitizeStoredImReadState({
        broken: {
          conversationId: "chat-1",
          conversationType: "direct",
          myReadSeq: 5,
          peerReadSeq: 0,
          lastMessageSeq: 5,
          updatedAt: 1,
        },
      }),
    ).toEqual({});
  });

  it("preserves pending read sequence when sanitizing stored read state", () => {
    expect(
      sanitizeStoredImReadState({
        "direct:chat-1": {
          conversationId: "chat-1",
          conversationType: "direct",
          myReadSeq: 5,
          peerReadSeq: 0,
          lastMessageSeq: 5,
          pendingReadSeq: 5,
          updatedAt: 1,
        },
      })["direct:chat-1"]?.pendingReadSeq,
    ).toBe(5);
  });

  it("loads empty unified read state when localStorage JSON is invalid", () => {
    localStorage.setItem(imConversationStorageKey(storeSession), "{not-json");

    useWorkspaceStore.getState().setAuthSession(storeSession);

    expect(useWorkspaceStore.getState().imReadStateByConversation).toEqual({});
  });

  it("only clears pending read after an ack reaches the pending sequence", () => {
    useWorkspaceStore.getState().setAuthSession(storeSession);
    useWorkspaceStore.getState().upsertImReadState({
      conversationKey: "direct:chat-1",
      conversationId: "chat-1",
      conversationType: "direct",
      myReadSeq: 12,
      peerReadSeq: 0,
      lastMessageSeq: 12,
      pendingReadSeq: 12,
      updatedAt: 1,
    });

    useWorkspaceStore.getState().clearPendingImRead("direct", "chat-1", 10);
    expect(
      useWorkspaceStore.getState().imReadStateByConversation["direct:chat-1"]
        ?.pendingReadSeq,
    ).toBe(12);

    useWorkspaceStore.getState().clearPendingImRead("direct", "chat-1", 12);
    expect(
      useWorkspaceStore.getState().imReadStateByConversation["direct:chat-1"]
        ?.pendingReadSeq,
    ).toBeUndefined();
  });
});

describe("IM read model state machine", () => {
  const identity = {
    userId: "pc-user",
    platformUserId: "pc-platform",
    lppId: "pc-lpp",
    displayName: "PC User",
  };

  it("uses conversationType in the local state key", () => {
    expect(conversationKey("direct", "same")).toBe("direct:same");
    expect(conversationKey("group", "same")).toBe("group:same");
  });

  it("normalizes conversation read state keys across direct and group aliases", () => {
    expect(
      conversationReadStateKey(
        conversation({ conversationId: "same", conversationType: "direct-chat" }),
      ),
    ).toBe("direct:same");
    expect(
      conversationReadStateKey(
        conversation({ conversationId: "same", conversationType: "im_group" }),
      ),
    ).toBe("group:same");
  });

  it("does not create unread for current user's own sent message", () => {
    const event: ImCoreEvent = {
      type: "send.message_succeeded",
      conversationId: "chat-1",
      conversationType: "direct",
      message: {
        messageId: "m10",
        conversationId: "chat-1",
        conversationSeq: 10,
        senderUserId: "pc-user",
      },
    };

    const result = reduceImCoreEvent({
      identity,
      stateByConversation: {},
      event,
    });

    const view = result.viewByConversation["direct:chat-1"];
    expect(view.unreadCount).toBe(0);
    expect(result.stateByConversation["direct:chat-1"].myReadSeq).toBe(10);
    expect(result.stateByConversation["direct:chat-1"].lastMessageSeq).toBe(10);
    expect(result.commands).toContainEqual({
      type: "mark_read",
      conversationId: "chat-1",
      conversationType: "direct",
      readSeq: 10,
    });
  });

  it("keeps peer messages unread when the conversation is not readable", () => {
    const result = reduceImCoreEvent({
      identity,
      stateByConversation: {},
      event: {
        type: "gateway.message_received",
        conversationId: "chat-1",
        conversationType: "direct",
        isActiveConversation: false,
        message: {
          messageId: "m11",
          conversationId: "chat-1",
          conversationSeq: 11,
          senderUserId: "peer-user",
          direction: "in",
        },
      },
    });

    expect(result.stateByConversation["direct:chat-1"].lastMessageSeq).toBe(11);
    expect(result.viewByConversation["direct:chat-1"].unreadCount).toBe(1);
    expect(result.commands).toEqual([]);
  });

  it("counts unread messages by message events instead of sequence gaps", () => {
    const first = reduceImCoreEvent({
      identity,
      stateByConversation: {},
      event: {
        type: "gateway.message_received",
        conversationId: "chat-1",
        conversationType: "direct",
        isActiveConversation: false,
        message: {
          messageId: "m11",
          conversationId: "chat-1",
          conversationSeq: 11,
          senderUserId: "peer-user",
          direction: "in",
        },
      },
    });
    const second = reduceImCoreEvent({
      identity,
      stateByConversation: first.stateByConversation,
      event: {
        type: "gateway.message_received",
        conversationId: "chat-1",
        conversationType: "direct",
        isActiveConversation: false,
        message: {
          messageId: "m17",
          conversationId: "chat-1",
          conversationSeq: 17,
          senderUserId: "peer-user",
          direction: "in",
        },
      },
    });

    expect(second.stateByConversation["direct:chat-1"].lastMessageSeq).toBe(17);
    expect(second.viewByConversation["direct:chat-1"].unreadCount).toBe(2);
  });

  it("uses server snapshot unread count and peer read cursor as authoritative facts", () => {
    const result = reduceImCoreEvent({
      identity,
      stateByConversation: {
        "direct:chat-1": createInitialImReadState("direct", "chat-1", {
          myReadSeq: 10,
          peerReadSeq: 12,
          lastMessageSeq: 15,
          unreadCount: 9,
        }),
      },
      event: {
        type: "api.conversation_snapshot",
        conversationId: "chat-1",
        conversationType: "direct",
        conversation: {
          myReadSeq: 11,
          peerReadSeq: 18,
          lastMessageSeq: 20,
          unreadCount: 2,
        },
      },
    });

    expect(result.stateByConversation["direct:chat-1"]).toMatchObject({
      myReadSeq: 11,
      peerReadSeq: 18,
      lastMessageSeq: 20,
      unreadCount: 2,
    });
    expect(result.viewByConversation["direct:chat-1"].unreadCount).toBe(2);
  });

  it("retries pending reads when the server snapshot has not acknowledged them", () => {
    const result = reduceImCoreEvent({
      identity,
      stateByConversation: {
        "direct:chat-1": createInitialImReadState("direct", "chat-1", {
          myReadSeq: 22,
          lastMessageSeq: 22,
          unreadCount: 0,
          pendingReadSeq: 22,
        }),
      },
      event: {
        type: "api.conversation_snapshot",
        conversationId: "chat-1",
        conversationType: "direct",
        conversation: {
          myReadSeq: 20,
          lastMessageSeq: 22,
          unreadCount: 2,
        },
      },
    });

    expect(result.stateByConversation["direct:chat-1"].myReadSeq).toBe(22);
    expect(result.commands).toContainEqual({
      type: "retry_pending_read",
      conversationId: "chat-1",
      conversationType: "direct",
      readSeq: 22,
    });
  });

  it("does not restore unread from a stale server snapshot after local read reached latest", () => {
    const result = reduceImCoreEvent({
      identity,
      stateByConversation: {
        "direct:chat-1": createInitialImReadState("direct", "chat-1", {
          myReadSeq: 17,
          lastMessageSeq: 17,
          unreadCount: 0,
          pendingReadSeq: 17,
        }),
      },
      event: {
        type: "api.conversation_snapshot",
        conversationId: "chat-1",
        conversationType: "direct",
        conversation: {
          myReadSeq: 10,
          lastMessageSeq: 17,
          unreadCount: 6,
        },
      },
    });

    expect(result.stateByConversation["direct:chat-1"].myReadSeq).toBe(17);
    expect(result.viewByConversation["direct:chat-1"].unreadCount).toBe(0);
    expect(result.commands).toContainEqual({
      type: "retry_pending_read",
      conversationId: "chat-1",
      conversationType: "direct",
      readSeq: 17,
    });
  });

  it("marks peer messages read when visible in the active conversation", () => {
    const result = reduceImCoreEvent({
      identity,
      stateByConversation: {
        "direct:chat-1": createInitialImReadState("direct", "chat-1", {
          myReadSeq: 10,
          lastMessageSeq: 11,
        }),
      },
      event: {
        type: "ui.messages_visible",
        conversationId: "chat-1",
        conversationType: "direct",
        visibleMessages: [
          {
            messageId: "m11",
            conversationId: "chat-1",
            conversationSeq: 11,
            senderUserId: "peer-user",
            direction: "in",
          },
        ],
      },
    });

    expect(result.stateByConversation["direct:chat-1"].myReadSeq).toBe(11);
    expect(result.viewByConversation["direct:chat-1"].unreadCount).toBe(0);
    expect(result.commands).toContainEqual({
      type: "mark_read",
      conversationId: "chat-1",
      conversationType: "direct",
      readSeq: 11,
    });
    expect(result.commands).toContainEqual({
      type: "clear_new_message_jump",
      conversationId: "chat-1",
      conversationType: "direct",
    });
  });

  it("reports read for a visible peer file message so the sender can receive peer read", () => {
    const result = reduceImCoreEvent({
      identity,
      stateByConversation: {
        "direct:chat-1": createInitialImReadState("direct", "chat-1", {
          myReadSeq: 30,
          lastMessageSeq: 31,
          unreadCount: 1,
        }),
      },
      event: {
        type: "ui.messages_visible",
        conversationId: "chat-1",
        conversationType: "direct",
        visibleMessages: [
          {
            messageId: "file-31",
            conversationId: "chat-1",
            conversationSeq: 31,
            senderUserId: "peer-user",
            direction: "in",
            messageType: "file",
          },
        ],
      },
    });

    expect(result.stateByConversation["direct:chat-1"].myReadSeq).toBe(31);
    expect(result.viewByConversation["direct:chat-1"].unreadCount).toBe(0);
    expect(result.commands).toContainEqual({
      type: "mark_read",
      conversationId: "chat-1",
      conversationType: "direct",
      readSeq: 31,
    });
  });

  it("advances my read seq for visible self-only messages", () => {
    const result = reduceImCoreEvent({
      identity,
      stateByConversation: {
        "direct:chat-1": createInitialImReadState("direct", "chat-1", {
          myReadSeq: 19,
          lastMessageSeq: 21,
        }),
      },
      event: {
        type: "ui.messages_visible",
        conversationId: "chat-1",
        conversationType: "direct",
        visibleMessages: [
          {
            messageId: "mine-21",
            conversationId: "chat-1",
            conversationSeq: 21,
            senderUserId: "pc-user",
          },
        ],
      },
    });

    expect(result.stateByConversation["direct:chat-1"].myReadSeq).toBe(21);
    expect(result.viewByConversation["direct:chat-1"].unreadCount).toBe(0);
    expect(result.commands).toContainEqual({
      type: "mark_read",
      conversationId: "chat-1",
      conversationType: "direct",
      readSeq: 21,
    });
  });

  it("never moves read cursors backwards and derives outgoing bubble status", () => {
    const state: ConversationReadState = createInitialImReadState("direct", "chat-1", {
      myReadSeq: 15,
      peerReadSeq: 20,
      lastMessageSeq: 22,
    });
    const peerRead = reduceImCoreEvent({
      identity,
      stateByConversation: { "direct:chat-1": state },
      event: {
        type: "gateway.read_received",
        conversationId: "chat-1",
        conversationType: "direct",
        readerIdentity: { userId: "peer-user" },
        readSeq: 18,
      },
    });
    const ownRead = reduceImCoreEvent({
      identity,
      stateByConversation: peerRead.stateByConversation,
      event: {
        type: "gateway.read_received",
        conversationId: "chat-1",
        conversationType: "direct",
        readerIdentity: { platformUserId: "pc-platform" },
        readSeq: 12,
      },
    });

    expect(ownRead.stateByConversation["direct:chat-1"].peerReadSeq).toBe(20);
    expect(ownRead.stateByConversation["direct:chat-1"].myReadSeq).toBe(15);
    expect(deriveMessageView({
      identity,
      state: ownRead.stateByConversation["direct:chat-1"],
      message: {
        messageId: "mine-20",
        conversationSeq: 20,
        senderUserId: "pc-user",
      },
    }).bubbleStatusText).toBe("已读");
    expect(deriveMessageView({
      identity,
      state: ownRead.stateByConversation["direct:chat-1"],
      message: {
        messageId: "mine-21",
        conversationSeq: 21,
        senderUserId: "pc-user",
      },
    }).bubbleStatusText).toBe("已发送");
  });

  it("does not treat read receipts without reader identity as peer reads", () => {
    const state: ConversationReadState = createInitialImReadState("direct", "chat-1", {
      peerReadSeq: 5,
      lastMessageSeq: 12,
    });

    const result = reduceImCoreEvent({
      identity,
      stateByConversation: { "direct:chat-1": state },
      event: {
        type: "gateway.read_received",
        conversationId: "chat-1",
        conversationType: "direct",
        readerIdentity: {},
        readSeq: 12,
      },
    });

    expect(result.stateByConversation["direct:chat-1"].peerReadSeq).toBe(5);
    expect(result.commands).toContainEqual({
      type: "log_diagnostic",
      event: "im.read.missing_reader_identity",
      context: {
        conversationId: "chat-1",
        conversationType: "direct",
        readSeq: 12,
      },
    });
  });

  it("coalesces mark_read commands by highest readSeq per conversation", () => {
    expect(coalesceImCoreCommands([
      { type: "mark_read", conversationId: "chat-1", conversationType: "direct", readSeq: 10 },
      { type: "mark_read", conversationId: "chat-1", conversationType: "direct", readSeq: 12 },
      { type: "clear_new_message_jump", conversationId: "chat-1", conversationType: "direct" },
    ])).toEqual([
      { type: "mark_read", conversationId: "chat-1", conversationType: "direct", readSeq: 12 },
      { type: "clear_new_message_jump", conversationId: "chat-1", conversationType: "direct" },
    ]);
  });
});

describe("IM command executor helpers", () => {
  it("keeps only the highest mark_read per conversation", () => {
    expect(coalesceExecutableCommands([
      { type: "mark_read", conversationId: "chat-1", conversationType: "direct", readSeq: 5 },
      { type: "mark_read", conversationId: "chat-1", conversationType: "direct", readSeq: 9 },
    ])).toEqual([
      { type: "mark_read", conversationId: "chat-1", conversationType: "direct", readSeq: 9 },
    ]);
  });

  it("maps command conversation type to API endpoint type", () => {
    expect(markReadEndpointType({
      type: "mark_read",
      conversationId: "g1",
      conversationType: "group",
      readSeq: 1,
    })).toBe("group");
    expect(markReadEndpointType({
      type: "mark_read",
      conversationId: "d1",
      conversationType: "direct",
      readSeq: 1,
    })).toBe("direct");
    expect(markReadEndpointType({
      type: "retry_pending_read",
      conversationId: "retry-g1",
      conversationType: "group",
      readSeq: 3,
    })).toBe("group");
  });
});

describe("Gateway to IM core adapter", () => {
  it("builds message_received events with conversation type and active state", () => {
    expect(
      imCoreEventFromGatewayMessageForTest({
        payload: {
          conversationId: "chat-1",
          conversationType: "direct",
          message: {
            messageId: "m1",
            conversationSeq: 1,
            senderUserId: "peer-user",
            direction: "in",
          },
        },
        active: false,
      }),
    ).toMatchObject({
      type: "gateway.message_received",
      conversationId: "chat-1",
      conversationType: "direct",
      isActiveConversation: false,
    });
  });

  it("does not build read-model events for blocking gateway messages", () => {
    expect(
      imCoreEventFromGatewayMessageForTest({
        payload: {
          conversationId: "chat-1",
          conversationType: "direct",
          message: {
            messageId: "m-missing-seq",
            senderUserId: "peer-user",
            direction: "in",
          },
        },
        active: false,
      }),
    ).toBeUndefined();
  });

  it("builds read_received events with reader identity", () => {
    expect(
      imCoreEventFromGatewayReadForTest({
        conversationId: "chat-1",
        conversationType: "direct",
        userId: "peer-user",
        readSeq: 7,
      }),
    ).toMatchObject({
      type: "gateway.read_received",
      conversationId: "chat-1",
      conversationType: "direct",
      readerIdentity: { userId: "peer-user" },
      readSeq: 7,
    });
  });
});
