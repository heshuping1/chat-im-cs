import type { QueryClient } from "@tanstack/react-query";
import { recordMessageReminderDiagnostic } from "../diagnostics/message-reminder-diagnostics";

export type MessageGapSyncReason =
  | "gateway-started"
  | "gateway-reconnected"
  | "gateway-closed-retry"
  | "push-seq-gap"
  | "startup-snapshot-gap"
  | "manual";

export interface MessageGapSyncInput {
  conversationId?: string;
  reason: MessageGapSyncReason;
  retryAttempt?: number;
  scopeKey?: string;
  source: string;
}

const retryDelayMs = 2_000;
const maxRetryAttempts = 1;

export function triggerMessageGapSync(
  queryClient: QueryClient,
  input: MessageGapSyncInput,
) {
  recordMessageReminderDiagnostic({
    event: "message.gap-sync.triggered",
    source: input.source,
    phase: input.reason,
    route: "gap-sync",
    classification: {
      conversationId: input.conversationId,
      reason: input.reason,
      scopeKey: input.scopeKey,
    },
    summary: {
      mode: "conversation-snapshot-reconcile",
      retryAttempt: input.retryAttempt ?? 0,
      note: "Existing APIs support conversation/message refetch; dedicated seq range gap sync requires server support.",
    },
  });
  const invalidations = [
    queryClient.invalidateQueries({ queryKey: ["pc-im-conversations"] }),
    queryClient.invalidateQueries({ queryKey: ["pc-cs-workbench-threads"] }),
  ];
  if (input.conversationId) {
    invalidations.push(
      queryClient.invalidateQueries({
        predicate: (query) =>
          query.queryKey[0] === "pc-im-messages" &&
          query.queryKey.includes(input.conversationId),
      }),
    );
  }
  void Promise.all(invalidations).catch((error) => {
    recordMessageReminderDiagnostic({
      event: "message.gap-sync.failed",
      source: input.source,
      phase: input.reason,
      route: "gap-sync",
      classification: {
        conversationId: input.conversationId,
        reason: input.reason,
        retryAttempt: input.retryAttempt ?? 0,
        scopeKey: input.scopeKey,
      },
      summary: {
        error: error instanceof Error ? error.message : String(error),
        mode: "fallback-refetch",
      },
    });
    if ((input.retryAttempt ?? 0) >= maxRetryAttempts) return;
    recordMessageReminderDiagnostic({
      event: "message.gap-sync.retry-scheduled",
      source: input.source,
      phase: input.reason,
      route: "gap-sync",
      classification: {
        conversationId: input.conversationId,
        reason: input.reason,
        retryAttempt: (input.retryAttempt ?? 0) + 1,
        retryDelayMs,
        scopeKey: input.scopeKey,
      },
    });
    globalThis.setTimeout(() => {
      triggerMessageGapSync(queryClient, {
        ...input,
        retryAttempt: (input.retryAttempt ?? 0) + 1,
      });
    }, retryDelayMs);
  });
}
