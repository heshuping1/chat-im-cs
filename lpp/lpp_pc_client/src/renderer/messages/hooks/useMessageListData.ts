import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import type { MutableRefObject } from "react";

import type { ConversationListItem, MessageItemDto } from "../../data/api-client";
import type { AuthSession } from "../../data/auth/auth-session";
import { mergeLocalOutgoingMessages } from "../../data/im-local-outgoing";
import { reduceMessageCoreEvent } from "../../data/message-core/message-core";
import {
  getImMessageStore,
  imMessageScopeKey,
} from "../../data/message-store/im-message-store";
import type { ImMessageHydrationSource } from "../../data/message-store/im-message-store-hydration";
import type { CurrentUserIdentity } from "../../data/message-display";
import { applyDirectReadReceiptToMessages } from "../../data/read-receipts";
import { withLocalMediaPreviews } from "../models/messageCacheMutationModel";
import {
  createMessageLookupScope,
  filterMessagesByHistory,
  filterVisibleMessages,
  getHistoryFilterCounts,
  type HistoryFilterKey,
} from "../models/messageListModel";
import { getImConversationType } from "./useMessageCenterViewModel";

export function useMessageListData({
  activeConversation,
  activeConversationKey,
  activeConversationType,
  historyFilter,
  historyOpen,
  imPeerReadReceipts,
  localImagePreviewByMessageIdRef,
  localOutgoingMessagesByConversation,
  messageSearchKeyword,
  messageSearchOpen,
  messagesHydrationSource,
  session,
  serverMessages,
  unreadIdentity,
}: {
  activeConversation?: ConversationListItem;
  activeConversationKey?: string;
  activeConversationType: ReturnType<typeof getImConversationType>;
  historyFilter: HistoryFilterKey;
  historyOpen: boolean;
  imPeerReadReceipts: Record<string, { readSeq?: number } | undefined>;
  localImagePreviewByMessageIdRef: MutableRefObject<Map<string, string>>;
  localOutgoingMessagesByConversation: Record<string, MessageItemDto[]>;
  messageSearchKeyword: string;
  messageSearchOpen: boolean;
  messagesHydrationSource: ImMessageHydrationSource;
  session: AuthSession | null;
  serverMessages: MessageItemDto[];
  unreadIdentity: CurrentUserIdentity | null;
}) {
  const messages = useMemo(
    () => {
      const mergedOutgoingMessages = mergeLocalOutgoingMessages(
        serverMessages,
        activeConversationKey
          ? (localOutgoingMessagesByConversation[activeConversationKey] ?? [])
          : [],
      );
      const reducedMessages =
        activeConversation?.conversationId && activeConversationType
          ? reduceMessageCoreEvent(
              { messages: [] },
              {
                type: "message.polled",
                conversationId: activeConversation.conversationId,
                conversationType: activeConversationType,
                messages: mergedOutgoingMessages,
              },
            ).state.messages
          : mergedOutgoingMessages;
      const messagesWithPreviews = withLocalMediaPreviews(
        reducedMessages,
        localImagePreviewByMessageIdRef.current,
      );
      const peerReadSeq = activeConversation?.conversationId
        ? imPeerReadReceipts[activeConversation.conversationId]?.readSeq
        : undefined;
      return activeConversationType === "direct" && peerReadSeq
        ? applyDirectReadReceiptToMessages(
            messagesWithPreviews,
            peerReadSeq,
            unreadIdentity,
          )
        : messagesWithPreviews;
    },
    [
      activeConversation?.conversationId,
      activeConversationKey,
      activeConversationType,
      imPeerReadReceipts,
      localImagePreviewByMessageIdRef,
      localOutgoingMessagesByConversation,
      serverMessages,
      unreadIdentity,
    ],
  );
  const historyCounts = useMemo(() => getHistoryFilterCounts(messages), [messages]);
  const scopeKey = imMessageScopeKey(session);
  const localSearchKeyword = messageSearchOpen ? messageSearchKeyword.trim() : "";
  const localSearchQuery = useQuery({
    queryKey: [
      "pc-im-local-message-search",
      scopeKey,
      activeConversationType ?? "",
      activeConversation?.conversationId ?? "",
      localSearchKeyword,
    ],
    enabled: Boolean(
      session &&
        activeConversation?.conversationId &&
        activeConversationType &&
        localSearchKeyword,
    ),
    queryFn: () =>
      getImMessageStore().searchMessages(
        scopeKey,
        activeConversationType!,
        activeConversation!.conversationId,
        localSearchKeyword,
        200,
      ),
    staleTime: 15_000,
  });
  const localDatabaseSearchActive = Boolean(localSearchKeyword && localSearchQuery.data);
  const lookupScope = useMemo(
    () =>
      createMessageLookupScope(messagesHydrationSource, {
        localDatabaseSearch: localDatabaseSearchActive,
      }),
    [localDatabaseSearchActive, messagesHydrationSource],
  );
  const visibleMessages = useMemo(
    () => filterVisibleMessages(messages, ""),
    [messages],
  );
  const lookupMessages = useMemo(
    () => {
      const lookupOpen = historyOpen || messageSearchOpen;
      const searchSource = localDatabaseSearchActive ? localSearchQuery.data ?? [] : messages;
      return filterVisibleMessages(
        filterMessagesByHistory(searchSource, lookupOpen ? historyFilter : "all"),
        localDatabaseSearchActive ? "" : messageSearchOpen ? messageSearchKeyword : "",
      );
    },
    [
      historyFilter,
      historyOpen,
      localDatabaseSearchActive,
      localSearchQuery.data,
      messageSearchKeyword,
      messageSearchOpen,
      messages,
    ],
  );

  return {
    historyCounts,
    lookupMessages,
    lookupScope,
    messages,
    visibleMessages,
  };
}
