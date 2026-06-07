import { QueryClient } from "@tanstack/react-query";
import { afterEach, describe, expect, it, vi } from "vitest";
import { triggerMessageGapSync } from "../../src/renderer/data/gateway/message-gap-sync-coordinator";

const diagnostics = vi.hoisted(() => ({
  record: vi.fn(),
}));

vi.mock("../../src/renderer/data/diagnostics/message-reminder-diagnostics", () => ({
  recordMessageReminderDiagnostic: diagnostics.record,
}));

describe("MessageGapSyncCoordinator", () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

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
      summary: expect.objectContaining({
        mode: "fallback-refetch",
        preciseGapSync: false,
        requiresServerCursor: true,
      }),
    }));
    expect(invalidate).toHaveBeenCalledWith({ predicate: expect.any(Function) });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ["pc-cs-workbench-threads"] });
    expect(invalidate).toHaveBeenCalledWith({ predicate: expect.any(Function) });
  });

  it("records failed fallback refetch and schedules one retry without rolling back push", async () => {
    vi.useFakeTimers();
    const queryClient = new QueryClient();
    const invalidate = vi
      .spyOn(queryClient, "invalidateQueries")
      .mockRejectedValueOnce(new Error("network down"))
      .mockResolvedValue(undefined);

    triggerMessageGapSync(queryClient, {
      conversationId: "direct-failed",
      reason: "push-seq-gap",
      scopeKey: "scope-1",
      source: "message-delivery-service",
    });
    await Promise.resolve();
    await Promise.resolve();

    expect(diagnostics.record).toHaveBeenCalledWith(expect.objectContaining({
      event: "message.gap-sync.failed",
      summary: expect.objectContaining({
        error: "network down",
        mode: "fallback-refetch",
      }),
    }));
    expect(diagnostics.record).toHaveBeenCalledWith(expect.objectContaining({
      event: "message.gap-sync.retry-scheduled",
      classification: expect.objectContaining({
        retryAttempt: 1,
        retryDelayMs: 2000,
      }),
    }));

    await vi.advanceTimersByTimeAsync(2000);

    expect(invalidate).toHaveBeenCalledTimes(6);
    expect(diagnostics.record).toHaveBeenCalledWith(expect.objectContaining({
      event: "message.gap-sync.triggered",
      summary: expect.objectContaining({
        retryAttempt: 1,
      }),
    }));
  });
});
