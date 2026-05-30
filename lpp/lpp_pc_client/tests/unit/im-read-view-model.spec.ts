import { describe, expect, it } from "vitest";
import type { ConversationReadState } from "../../src/renderer/data/im-read-model";
import {
  mergeUnifiedReadStateForIdentity,
  readStateMeaningfullyChanged,
} from "../../src/renderer/data/im-read/im-read-view-model";

describe("im-read-view-model", () => {
  it("merges read state by conversation key and id without downgrading legacy reads", () => {
    const readState = {
      "direct:c1": {
        conversationKey: "direct:c1",
        conversationId: "c1",
        conversationType: "direct",
        myReadSeq: 10,
        peerReadSeq: 0,
        lastMessageSeq: 12,
        unreadCount: 2,
        updatedAt: 1000,
      },
    } as Record<string, ConversationReadState>;

    expect(mergeUnifiedReadStateForIdentity({ c1: { readSeq: 12, readAt: 900 } }, readState)).toEqual({
      "direct:c1": { readSeq: 10, readAt: 1000 },
      c1: { readSeq: 12, readAt: 900 },
    });
  });

  it("detects meaningful read state changes", () => {
    const previous = {
      conversationKey: "direct:c1",
      conversationId: "c1",
      conversationType: "direct",
      myReadSeq: 1,
      peerReadSeq: 0,
      lastMessageSeq: 2,
      unreadCount: 1,
      updatedAt: 1000,
    } as ConversationReadState;

    expect(readStateMeaningfullyChanged(previous, { ...previous, updatedAt: 2000 })).toBe(false);
    expect(readStateMeaningfullyChanged(previous, { ...previous, myReadSeq: 2 })).toBe(true);
    expect(readStateMeaningfullyChanged(undefined, previous)).toBe(true);
  });
});
