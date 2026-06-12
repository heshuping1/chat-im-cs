import type { QueryClient } from "@tanstack/react-query";

import type { ConversationListItem } from "../../data/api-client";
import type { AuthSession } from "../../data/auth/auth-session";
import { syncGroupReadReceiptSnapshotToCache } from "./messageCacheMutationModel";

export function applyGroupReadReceiptSnapshot(
  queryClient: QueryClient,
  options: {
    conversation: ConversationListItem;
    messageId: string;
    messageSeq: number;
    readCount: number;
    session?: AuthSession | null;
  },
) {
  syncGroupReadReceiptSnapshotToCache(queryClient, options);
}
