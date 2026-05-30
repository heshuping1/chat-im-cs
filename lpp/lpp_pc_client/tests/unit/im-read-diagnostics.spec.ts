import { describe, expect, it } from "vitest";
import { createImReadDiagnosticRecord } from "../../src/renderer/data/im-read/im-read-diagnostics";

describe("im read diagnostics", () => {
  it("creates structured read diagnostic records", () => {
    const record = createImReadDiagnosticRecord({
      event: "im-read.mark-local",
      phase: "mark",
      result: "success",
      reason: "local_conversation_read",
      context: {
        conversationId: "c1",
        conversationType: "direct",
        readSeq: 8,
      },
    });

    expect(record.module).toBe("im-read");
    expect(record.taskId).toBe("P2-ST-004D");
    expect(record.traceId).toMatch(/^im-read-mark-/);
    expect(record.context).toEqual({
      conversationId: "c1",
      conversationType: "direct",
      readSeq: 8,
    });
  });
});
