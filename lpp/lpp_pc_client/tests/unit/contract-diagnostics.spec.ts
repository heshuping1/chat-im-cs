import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createApiContractDiagnosticRecord,
  logApiContractDiagnostic,
} from "../../src/renderer/data/api-contract/contract-diagnostics";
import { createContractIssue } from "../../src/renderer/data/api-contract/contract-result";

describe("api contract diagnostics", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

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

  it("does not print ok or degraded normalize diagnostics unless explicitly enabled", () => {
    const info = vi.spyOn(console, "info").mockImplementation(() => undefined);
    vi.stubGlobal("window", {
      localStorage: {
        getItem: vi.fn(() => null),
      },
    });

    logApiContractDiagnostic({
      api: "pc-im-conversations",
      phase: "normalize",
      status: "ok",
    });
    logApiContractDiagnostic({
      api: "pc-im-conversations",
      phase: "normalize",
      status: "degraded",
      issues: [
        createContractIssue("im.conversation.missing_title", "warning", {
          field: "title",
          message: "title fallback used",
        }),
      ],
    });

    expect(info).not.toHaveBeenCalled();
  });

  it("prints invalid contract diagnostics and explicit debug diagnostics", () => {
    const info = vi.spyOn(console, "info").mockImplementation(() => undefined);
    const getItem = vi.fn(() => null as string | null);
    vi.stubGlobal("window", {
      localStorage: { getItem },
    });

    logApiContractDiagnostic({
      api: "pc-im-conversations",
      phase: "normalize",
      status: "invalid",
    });
    getItem.mockReturnValue("1");
    logApiContractDiagnostic({
      api: "pc-im-conversations",
      phase: "normalize",
      status: "ok",
    });

    expect(info).toHaveBeenCalledTimes(2);
  });
});
