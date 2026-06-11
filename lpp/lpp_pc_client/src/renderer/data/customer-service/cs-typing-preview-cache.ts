import type { QueryClient } from "@tanstack/react-query";

import type { AuthSession } from "../auth/auth-session";
import { pcQueryKeys } from "../query-keys";
import {
  reduceCustomerServiceTypingPreview,
  type CustomerServiceTypingPreviewEvent,
} from "./cs-typing-preview";

export function applyCustomerServiceTypingPreviewCache(
  queryClient: QueryClient,
  session: AuthSession,
  event: CustomerServiceTypingPreviewEvent,
) {
  const nextPreview = reduceCustomerServiceTypingPreview(event);
  if (nextPreview === undefined) return;
  queryClient.setQueryData(
    pcQueryKeys.customerServiceTypingPreview(
      session.apiBaseUrl,
      session.tenantToken,
      event.threadType,
      event.threadId,
    ),
    nextPreview,
  );
}
