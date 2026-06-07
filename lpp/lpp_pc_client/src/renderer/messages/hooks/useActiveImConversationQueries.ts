import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo } from "react";

import type { MessageItemDto } from "../../data/api/types";
import type { ConversationListItem } from "../../data/api-client";
import type { AuthSession } from "../../data/auth/auth-session";
import { reuseStableMessageItems } from "../../data/message/message-domain";
import {
  getImMessageStore,
  imMessageConversationKey,
  imMessageScopeKey,
} from "../../data/message-store/im-message-store";
import {
  imLocalMessagesQueryKey,
  resolveLocalFirstMessages,
} from "../../data/message-store/im-message-store-hydration";
import { pcQueryKeys } from "../../data/query-keys";
import { requireApiClient } from "../../data/runtime";
import {
  activeDirectReadStatusRefetchInBackground,
  activeDirectReadStatusRefetchIntervalMs,
  activeDirectReadStatusStaleMs,
  shouldEnableDirectReadStatusQuery,
} from "../models/imReadReceiptPolicy";
import { createMessageQueryHotCache } from "../models/messageQueryHotCacheModel";
import { realtimeSyncPolicy } from "../../data/realtime/realtime-sync-policy";

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
  const queryClient = useQueryClient();
  const messageStore = getImMessageStore();
  const scopeKey = imMessageScopeKey(session);
  const messagesQueryKey = useMemo(
    () =>
      pcQueryKeys.imMessagesForSession(
        session,
        activeConversationType,
        activeConversation?.conversationId,
      ),
    [
      activeConversation?.conversationId,
      activeConversationType,
      session,
    ],
  );
  const localMessagesQueryKey = useMemo(
    () =>
      imLocalMessagesQueryKey(
        scopeKey,
        activeConversationType ?? "",
        activeConversation?.conversationId ?? "",
      ),
    [activeConversation?.conversationId, activeConversationType, scopeKey],
  );
  const localConversationKey = useMemo(
    () =>
      imMessageConversationKey(
        scopeKey,
        activeConversationType ?? "",
        activeConversation?.conversationId ?? "",
      ),
    [activeConversation?.conversationId, activeConversationType, scopeKey],
  );
  const hotMessagesSnapshot = messageQueryHotCache.read(messagesQueryKey);
  const localMessagesQuery = useQuery({
    queryKey: localMessagesQueryKey,
    enabled: Boolean(session && activeConversation && activeConversationType),
    queryFn: async () =>
      messageStore.listMessages(localConversationKey, { limit: 50 }),
    gcTime: 30 * 60_000,
    refetchOnWindowFocus: false,
    staleTime: 5 * 60_000,
  });
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
    refetchInterval: realtimeSyncPolicy.im.activeMessagesFallbackPollMs,
    refetchIntervalInBackground: realtimeSyncPolicy.im.activeMessagesRefetchInBackground,
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
  useEffect(() => {
    if (
      !session ||
      !activeConversation ||
      !activeConversationType ||
      !isMessageItemList(messagesQuery.data)
    ) {
      return;
    }
    void messageStore
      .replaceConversationSnapshot(
        scopeKey,
        activeConversationType,
        activeConversation.conversationId,
        messagesQuery.data,
      )
      .then(() => {
        void queryClient.invalidateQueries({ queryKey: localMessagesQueryKey });
      });
  }, [
    activeConversation,
    activeConversationType,
    localMessagesQueryKey,
    messageStore,
    messagesQuery.data,
    queryClient,
    scopeKey,
    session,
  ]);

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
    refetchIntervalInBackground: activeDirectReadStatusRefetchInBackground(),
    refetchOnWindowFocus: true,
    staleTime: activeDirectReadStatusStaleMs(),
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

  const localFirstMessages = resolveLocalFirstMessages({
    hotMessages: hotMessagesSnapshot?.data,
    localLoading: localMessagesQuery.isLoading,
    localMessages: localMessagesQuery.data,
    serverError: messagesQuery.error instanceof Error ? messagesQuery.error : null,
    serverLoading: messagesQuery.isLoading,
    serverMessages: messagesQuery.data,
  });

  return {
    directReadStatusQuery,
    groupMembersQuery,
    messages: localFirstMessages.messages,
    messagesHydrationSource: localFirstMessages.hydrationSource,
    messagesLoaded: localFirstMessages.messagesLoaded,
    messagesLoading: localFirstMessages.messagesLoading,
    messagesQuery,
  };
}

function isMessageItemList(value: unknown): value is MessageItemDto[] {
  return Array.isArray(value);
}
