import { QueryClient } from "@tanstack/react-query";
import { describe, expect, it, vi } from "vitest";
import { triggerMessageGapSync } from "../../src/renderer/data/gateway/message-gap-sync-coordinator";

const diagnostics = vi.hoisted(() => ({
  record: vi.fn(),
}));

vi.mock("../../src/renderer/data/diagnostics/message-reminder-diagnostics", () => ({
  recordMessageReminderDiagnostic: diagnostics.record,
}));

describe("MessageGapSyncCoordinator", () => {
  it("records gap sync and invalidates existing reconcile queries", () => {
    const queryClient = new QueryClient();
    const invalidate = vi.spyOn(queryClient, "invalidateQueries");

    triggerMessageGapSync(queryClient, {
      conversationId: "direct-1",
      reason: "gateway-reconnected",
      scopeKey: "scope-1",
      source: "gateway-bridge",
    });

    expect(diagnostics.record).toHaveBeenCalledWith(expect.objectContaining({
      event: "message.gap-sync.triggered",
      phase: "gateway-reconnected",
      route: "gap-sync",
    }));
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ["pc-im-conversations"] });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ["pc-cs-workbench-threads"] });
    expect(invalidate).toHaveBeenCalledWith({ predicate: expect.any(Function) });
  });
});
