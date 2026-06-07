import { useQuery } from "@tanstack/react-query";

import type { AuthSession } from "../../data/auth/auth-session";
import { pcQueryKeys } from "../../data/query-keys";
import { realtimeSyncPolicy } from "../../data/realtime/realtime-sync-policy";
import { requireApiClient } from "../../data/runtime";

export function useImConversationsQuery(session: AuthSession | null) {
  return useQuery({
    queryKey: pcQueryKeys.imConversationsForSession(session),
    enabled: Boolean(session),
    queryFn: async () => requireApiClient(session).getConversations({ limit: 100 }),
    gcTime: 30 * 60_000,
    refetchInterval: realtimeSyncPolicy.im.conversationListFallbackPollMs,
    refetchIntervalInBackground: realtimeSyncPolicy.im.conversationListRefetchInBackground,
    refetchOnWindowFocus: true,
    staleTime: realtimeSyncPolicy.im.conversationListStaleMs,
  });
}
