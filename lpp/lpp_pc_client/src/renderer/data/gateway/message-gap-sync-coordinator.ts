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
  scopeKey?: string;
  source: string;
}

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
      note: "Existing APIs support conversation/message refetch; dedicated seq range gap sync requires server support.",
    },
  });
  void queryClient.invalidateQueries({ queryKey: ["pc-im-conversations"] });
  void queryClient.invalidateQueries({ queryKey: ["pc-cs-workbench-threads"] });
  if (input.conversationId) {
    void queryClient.invalidateQueries({
      predicate: (query) =>
        query.queryKey[0] === "pc-im-messages" &&
        query.queryKey.includes(input.conversationId),
    });
  }
}
