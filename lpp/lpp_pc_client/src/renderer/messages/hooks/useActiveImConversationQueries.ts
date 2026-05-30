import { useQuery } from "@tanstack/react-query";

import type { MessageItemDto } from "../../data/api/types";
import type { ConversationListItem } from "../../data/api-client";
import type { AuthSession } from "../../data/auth/auth-session";
import { reuseStableMessageItems } from "../../data/message/message-domain";
import { pcQueryKeys } from "../../data/query-keys";
import { requireApiClient } from "../../data/runtime";

type ImConversationType = "direct" | "group";

export function useActiveImConversationQueries({
  activeConversation,
  activeConversationType,
  session,
}: {
  activeConversation?: ConversationListItem;
  activeConversationType?: ImConversationType;
  session: AuthSession | null;
}) {
  const messagesQuery = useQuery({
    queryKey: pcQueryKeys.imMessages(
      session?.apiBaseUrl,
      session?.tenantToken,
      activeConversationType,
      activeConversation?.conversationId,
    ),
    enabled: Boolean(session && activeConversation && activeConversationType),
    queryFn: async () =>
      requireApiClient(session).getConversationMessages(
        activeConversationType!,
        activeConversation!.conversationId,
      ),
    gcTime: 30 * 60_000,
    refetchInterval: 30_000,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: true,
    staleTime: 5 * 60_000,
    structuralSharing: (previous, next) => {
      if (!isMessageItemList(next)) return next;
      return reuseStableMessageItems(
        isMessageItemList(previous) ? previous : undefined,
        next,
      );
    },
  });

  const directReadStatusQuery = useQuery({
    queryKey: pcQueryKeys.imDirectReadStatus(
      session?.apiBaseUrl,
      session?.tenantToken,
      activeConversation?.conversationId,
    ),
    enabled: Boolean(
      session &&
        activeConversation &&
        activeConversationType === "direct",
    ),
    queryFn: async () =>
      requireApiClient(session).getDirectReadStatus(
        activeConversation!.conversationId,
      ),
    refetchInterval: 5_000,
    refetchIntervalInBackground: true,
    refetchOnWindowFocus: true,
    staleTime: 2_000,
  });

  const groupMembersQuery = useQuery({
    queryKey: [
      "pc-group-members",
      session?.apiBaseUrl ?? "",
      session?.tenantToken ?? "",
      activeConversation?.conversationId ?? "",
    ],
    enabled: Boolean(session && activeConversationType === "group" && activeConversation),
    queryFn: async () =>
      requireApiClient(session).getGroupMembers(activeConversation!.conversationId),
    staleTime: 60_000,
  });

  return {
    directReadStatusQuery,
    groupMembersQuery,
    messagesQuery,
  };
}

function isMessageItemList(value: unknown): value is MessageItemDto[] {
  return Array.isArray(value);
}
