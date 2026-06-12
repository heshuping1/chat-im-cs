import type { QueryClient } from "@tanstack/react-query";

import type { AuthSession } from "../auth/auth-session";
import { recordMessageReminderDiagnostic } from "../diagnostics/message-reminder-diagnostics";
import { pcQueryKeys } from "../query-keys";
import {
  reduceCustomerServiceTypingPreview,
  type CustomerServiceTypingPreviewEvent,
} from "./cs-typing-preview";

export interface CustomerServiceTypingPreviewClearInput {
  threadId: string;
  threadType: CustomerServiceTypingPreviewEvent["threadType"];
  aliasThreadIds?: string[];
  reason?: string;
}

export function applyCustomerServiceTypingPreviewCache(
  queryClient: QueryClient,
  session: AuthSession,
  event: CustomerServiceTypingPreviewEvent,
) {
  const nextPreview = reduceCustomerServiceTypingPreview(event);
  if (nextPreview === undefined) {
    recordTypingPreviewCacheDiagnostic("ignored", event, "staff-or-invalid");
    return;
  }
  for (const threadId of typingPreviewCacheThreadIds(event)) {
    const queryKey = pcQueryKeys.customerServiceTypingPreview(
      session.apiBaseUrl,
      session.tenantToken,
      event.threadType,
      threadId,
    );
    if (nextPreview) {
      queryClient.setQueryData(queryKey, {
        ...nextPreview,
        threadId,
      });
      recordTypingPreviewCacheDiagnostic("write", event, "typing", threadId);
      continue;
    }
    if (!event.isTyping) {
      queryClient.setQueryData(queryKey, null);
      recordTypingPreviewCacheDiagnostic("clear", event, "typing-stopped", threadId);
      continue;
    }
    if (event.hasPreviewText) {
      queryClient.setQueryData(queryKey, null);
      recordTypingPreviewCacheDiagnostic("clear", event, "input-empty", threadId);
      continue;
    }
    recordTypingPreviewCacheDiagnostic("clear-deferred", event, "preview-missing", threadId);
  }
}

export function clearCustomerServiceTypingPreviewCache(
  queryClient: QueryClient,
  session: AuthSession,
  input: CustomerServiceTypingPreviewClearInput,
) {
  for (const threadId of typingPreviewCacheThreadIds(input)) {
    const queryKey = pcQueryKeys.customerServiceTypingPreview(
      session.apiBaseUrl,
      session.tenantToken,
      input.threadType,
      threadId,
    );
    queryClient.setQueryData(queryKey, null);
    recordTypingPreviewClearDiagnostic(input, threadId);
  }
}

function recordTypingPreviewCacheDiagnostic(
  phase: "clear" | "clear-deferred" | "ignored" | "write",
  event: CustomerServiceTypingPreviewEvent,
  reason: string,
  threadId = event.threadId,
) {
  recordMessageReminderDiagnostic({
    event: "cs.typing-preview.cache",
    source: "cs-typing-preview-cache",
    phase,
    route: "onlineService",
    classification: {
      aliasCount: event.aliasThreadIds?.length ?? 0,
      hasPreviewText: event.hasPreviewText,
      isTyping: event.isTyping,
      previewLength: event.previewText?.length ?? 0,
      reason,
      receivedAt: event.receivedAt,
      senderRole: event.senderRole,
      threadId,
      threadType: event.threadType,
    },
  });
}

function recordTypingPreviewClearDiagnostic(
  input: CustomerServiceTypingPreviewClearInput,
  threadId: string,
) {
  recordMessageReminderDiagnostic({
    event: "cs.typing-preview.cache",
    source: "cs-typing-preview-cache",
    phase: "clear",
    route: "onlineService",
    classification: {
      aliasCount: input.aliasThreadIds?.length ?? 0,
      isTyping: false,
      previewLength: 0,
      reason: input.reason ?? "message-received",
      threadId,
      threadType: input.threadType,
    },
  });
}

function typingPreviewCacheThreadIds(input: {
  threadId: string;
  aliasThreadIds?: string[];
}) {
  return [...new Set([input.threadId, ...(input.aliasThreadIds ?? [])].filter(Boolean))];
}
