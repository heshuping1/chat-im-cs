import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo } from "react";

import type { MessageItemDto } from "../../data/api/types";
import type { ConversationListItem } from "../../data/api-client";
import type { AuthSession } from "../../data/auth/auth-session";
import { reuseStableMessageItems } from "../../data/message/message-domain";
import { pcQueryKeys } from "../../data/query-keys";
import { requireApiClient } from "../../data/runtime";
import {
  activeDirectReadStatusRefetchIntervalMs,
  shouldEnableDirectReadStatusQuery,
} from "../models/imReadReceiptPolicy";
import { createMessageQueryHotCache } from "../models/messageQueryHotCacheModel";

type ImConversationType = "direct" | "group";
const messageQueryHotCache = createMessageQueryHotCache<MessageItemDto[]>();

export function useActiveImConversationQueries({
  activeConversation,
  activeConversationType,
  session,
}: {
  activeConversation?: ConversationListItem;
  activeConversationType?: ImConversationType;
  session: AuthSession | null;
}) {
  const messagesQueryKey = useMemo(
    () =>
      pcQueryKeys.imMessages(
        session?.apiBaseUrl,
        session?.tenantToken,
        activeConversationType,
        activeConversation?.conversationId,
      ),
    [
      activeConversation?.conversationId,
      activeConversationType,
      session?.apiBaseUrl,
      session?.tenantToken,
    ],
  );
  const hotMessagesSnapshot = messageQueryHotCache.read(messagesQueryKey);
  const messagesQuery = useQuery({
    queryKey: messagesQueryKey,
    enabled: Boolean(session && activeConversation && activeConversationType),
    initialData: () => hotMessagesSnapshot?.data,
    initialDataUpdatedAt: () => hotMessagesSnapshot?.updatedAt,
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
  useEffect(() => {
    if (isMessageItemList(messagesQuery.data)) {
      messageQueryHotCache.remember(messagesQueryKey, messagesQuery.data, messagesQuery.dataUpdatedAt);
    }
  }, [messagesQuery.data, messagesQuery.dataUpdatedAt, messagesQueryKey]);

  const directReadStatusQuery = useQuery({
    queryKey: pcQueryKeys.imDirectReadStatus(
      session?.apiBaseUrl,
      session?.tenantToken,
      activeConversation?.conversationId,
    ),
    enabled: shouldEnableDirectReadStatusQuery({
      conversationType: activeConversationType,
      hasActiveConversation: Boolean(activeConversation),
      hasSession: Boolean(session),
    }),
    queryFn: async () =>
      requireApiClient(session).getDirectReadStatus(
        activeConversation!.conversationId,
      ),
    refetchInterval: activeDirectReadStatusRefetchIntervalMs(),
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
    messages: messagesQuery.data ?? hotMessagesSnapshot?.data ?? [],
    messagesLoaded: messagesQuery.data !== undefined || hotMessagesSnapshot !== undefined,
    messagesLoading: messagesQuery.isLoading && !hotMessagesSnapshot,
    messagesQuery,
  };
}

function isMessageItemList(value: unknown): value is MessageItemDto[] {
  return Array.isArray(value);
}
