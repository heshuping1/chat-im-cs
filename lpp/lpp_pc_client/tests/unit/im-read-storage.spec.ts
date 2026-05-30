import { describe, expect, it, vi } from "vitest";
import {
  imConversationStorageKey,
  localImReadsStorageKey,
  persistImReadState,
  persistLocalImConversationReads,
  readStoredImReadState,
  readStoredLocalImConversationReads,
  sanitizeStoredImReadState,
} from "../../src/renderer/data/im-read/im-read-storage";

function createMemoryStorage(initial: Record<string, string> = {}) {
  const values = new Map(Object.entries(initial));
  return {
    getItem: vi.fn((key: string) => values.get(key) ?? null),
    setItem: vi.fn((key: string, value: string) => {
      values.set(key, value);
    }),
    values,
  };
}

const session = {
  apiBaseUrl: "https://api.example.com",
  displayName: "Tester",
  tenantId: "tenant-1",
  tenantToken: "tenant-token",
  userId: "user-1",
};

describe("im read storage", () => {
  it("uses session-scoped storage keys", () => {
    expect(imConversationStorageKey(session)).toContain("tenant-1");
    expect(localImReadsStorageKey(session)).toContain("user-1");
  });

  it("sanitizes stored read state and drops invalid entries", () => {
    expect(
      sanitizeStoredImReadState({
        "direct:c1": {
          conversationId: "c1",
          conversationType: "direct",
          myReadSeq: "2",
          peerReadSeq: "3",
          lastMessageSeq: "4",
          unreadCount: "1",
          updatedAt: "5",
        },
        broken: {
          conversationId: "c2",
          conversationType: "direct",
          myReadSeq: "nope",
        },
      }),
    ).toEqual({
      "direct:c1": {
        conversationId: "c1",
        conversationKey: "direct:c1",
        conversationType: "direct",
        lastMessageSeq: 4,
        myReadSeq: 2,
        peerReadSeq: 3,
        unreadCount: 1,
        updatedAt: 5,
      },
    });
  });

  it("reads and persists local conversation reads", () => {
    const storage = createMemoryStorage();

    persistLocalImConversationReads(
      session,
      { c1: { readSeq: 7, messageKey: "m1", readAt: 9 } },
      storage,
    );

    expect(readStoredLocalImConversationReads(session, storage)).toEqual({
      c1: { readSeq: 7, messageKey: "m1", readAt: 9 },
    });
  });

  it("reads and persists read state", () => {
    const storage = createMemoryStorage();

    persistImReadState(
      session,
      {
        "direct:c1": {
          conversationId: "c1",
          conversationKey: "direct:c1",
          conversationType: "direct",
          lastMessageSeq: 3,
          myReadSeq: 2,
          peerReadSeq: 1,
          unreadCount: 1,
          updatedAt: 10,
        },
      },
      storage,
    );

    expect(readStoredImReadState(session, storage)["direct:c1"]?.myReadSeq).toBe(2);
  });
});
