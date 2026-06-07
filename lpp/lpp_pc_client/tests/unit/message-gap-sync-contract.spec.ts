import { QueryClient } from "@tanstack/react-query";
import { describe, expect, it, vi } from "vitest";

import { triggerMessageGapSync } from "../../src/renderer/data/gateway/message-gap-sync-coordinator";

const diagnostics = vi.hoisted(() => ({
  record: vi.fn(),
}));

vi.mock("../../src/renderer/data/diagnostics/message-reminder-diagnostics", () => ({
  recordMessageReminderDiagnostic: diagnostics.record,
}));

describe("message gap sync contract", () => {
  it("declares current compensation as fallback refetch instead of precise afterSeq sync", () => {
    const queryClient = new QueryClient();

    triggerMessageGapSync(queryClient, {
      conversationId: "c1",
      reason: "push-seq-gap",
      scopeKey: "scope-a",
      source: "contract-test",
    });

    expect(diagnostics.record).toHaveBeenCalledWith(expect.objectContaining({
      event: "message.gap-sync.triggered",
      summary: expect.objectContaining({
        mode: "fallback-refetch",
        preciseGapSync: false,
        requiresServerCursor: true,
        requiredServerContract: "conversation-after-seq-or-global-cursor",
      }),
    }));
  });

  it("invalidates only the scoped IM message query when a scope key is available", () => {
    const queryClient = new QueryClient();
    queryClient.setQueryData(["pc-im-messages", "scope-a", "direct", "c1"], []);
    queryClient.setQueryData(["pc-im-messages", "scope-b", "direct", "c1"], []);
    queryClient.setQueryData(["pc-im-conversations", "scope-a", 100], { items: [] });
    queryClient.setQueryData(["pc-im-conversations", "scope-b", 100], { items: [] });

    triggerMessageGapSync(queryClient, {
      conversationId: "c1",
      reason: "gateway-reconnected",
      scopeKey: "scope-a",
      source: "contract-test",
    });

    expect(queryClient.getQueryCache().find({ queryKey: ["pc-im-messages", "scope-a", "direct", "c1"] })?.state.isInvalidated)
      .toBe(true);
    expect(queryClient.getQueryCache().find({ queryKey: ["pc-im-conversations", "scope-a", 100] })?.state.isInvalidated)
      .toBe(true);
    expect(queryClient.getQueryCache().find({ queryKey: ["pc-im-messages", "scope-b", "direct", "c1"] })?.state.isInvalidated)
      .toBe(false);
    expect(queryClient.getQueryCache().find({ queryKey: ["pc-im-conversations", "scope-b", 100] })?.state.isInvalidated)
      .toBe(false);
  });
});
