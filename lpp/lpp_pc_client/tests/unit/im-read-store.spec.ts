import { describe, expect, it, vi } from "vitest";
import {
  selectClearPendingImRead,
  selectImReadStateByConversation,
  selectLocalImConversationReads,
  selectMarkImConversationReadLocally,
} from "../../src/renderer/data/im-read/im-read-store";

describe("im read store selectors", () => {
  it("selects read state and actions from compatible workspace state", () => {
    const markImConversationReadLocally = vi.fn();
    const clearPendingImRead = vi.fn();
    const state = {
      locallyReadImConversationReads: { c1: { readSeq: 3 } },
      imPeerReadReceipts: {},
      imReadStateByConversation: {
        "direct:c1": {
          conversationId: "c1",
          conversationKey: "direct:c1",
          conversationType: "direct" as const,
          lastMessageSeq: 3,
          myReadSeq: 2,
          peerReadSeq: 1,
          unreadCount: 1,
          updatedAt: 10,
        },
      },
      markImConversationReadLocally,
      markImPeerReadReceipt: vi.fn(),
      upsertImReadState: vi.fn(),
      clearPendingImRead,
    };

    expect(selectLocalImConversationReads(state)).toEqual({ c1: { readSeq: 3 } });
    expect(selectImReadStateByConversation(state)["direct:c1"]?.myReadSeq).toBe(2);
    expect(selectMarkImConversationReadLocally(state)).toBe(markImConversationReadLocally);
    expect(selectClearPendingImRead(state)).toBe(clearPendingImRead);
  });
});
