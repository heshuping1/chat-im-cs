import { describe, expect, it } from "vitest";
import { createApiContractDiagnosticRecord } from "../../src/renderer/data/api-contract/contract-diagnostics";
import { createContractIssue } from "../../src/renderer/data/api-contract/contract-result";

describe("api contract diagnostics", () => {
  it("creates structured diagnostics with issue summaries", () => {
    const record = createApiContractDiagnosticRecord({
      api: "pc-im-conversations",
      phase: "normalize",
      status: "degraded",
      issues: [
        createContractIssue("im.conversation.missing_title", "warning", {
          field: "title",
          message: "title fallback used",
        }),
      ],
      context: {
        conversationId: "conversation-1",
        itemCount: 1,
      },
    });

    expect(record.module).toBe("api-contract");
    expect(record.taskId).toBe("P3-API-001C");
    expect(record.traceId).toMatch(/^api-contract-normalize-/);
    expect(record.issues).toEqual([
      {
        code: "im.conversation.missing_title",
        field: "title",
        level: "warning",
      },
    ]);
    expect(record.context).toEqual({
      conversationId: "conversation-1",
      itemCount: 1,
    });
  });
});
