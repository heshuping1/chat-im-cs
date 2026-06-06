import { describe, expect, it } from "vitest";

import {
  createMessageQueryHotCache,
  messageQueryHotCacheKey,
} from "../../src/renderer/messages/models/messageQueryHotCacheModel";

describe("message query hot cache model", () => {
  it("returns the last successful snapshot synchronously for a revisited conversation", () => {
    const cache = createMessageQueryHotCache<string[]>();
    const queryKey = ["pc-im-messages", "base", "tenant", "group", "conversation-1"];

    cache.remember(queryKey, ["m1", "m2"], 123);

    expect(cache.read(queryKey)).toEqual({
      data: ["m1", "m2"],
      updatedAt: 123,
    });
  });

  it("separates conversations by the full query key", () => {
    expect(messageQueryHotCacheKey(["messages", "c1"])).not.toBe(
      messageQueryHotCacheKey(["messages", "c2"]),
    );
  });
});
