import { describe, expect, it } from "vitest";

import {
  messageBatchFailedCount,
  messageBatchSucceededCount,
  normalizeMessageBatchActionResult,
} from "../../src/renderer/data/message/message-batch-action-result";

describe("messageBatchActionResult", () => {
  it("normalizes explicit success and failed ids", () => {
    const result = normalizeMessageBatchActionResult(
      {
        successIds: ["m1", "m1"],
        failedItems: [{ messageId: "m2", message: "denied" }],
      },
      ["m1", "m2"],
    );

    expect(result.successIds).toEqual(["m1"]);
    expect(result.failedItems).toEqual([{ messageId: "m2", message: "denied" }]);
    expect(messageBatchSucceededCount(result)).toBe(1);
    expect(messageBatchFailedCount(result)).toBe(1);
  });

  it("treats missing successIds as all requested ids except explicit failures", () => {
    const result = normalizeMessageBatchActionResult(
      { failedItems: [{ id: "m2", reason: "missing" }] },
      ["m1", "m2", "m3"],
    );

    expect(result.successIds).toEqual(["m1", "m3"]);
    expect(messageBatchFailedCount(result)).toBe(1);
  });
});
