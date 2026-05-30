import { useMemo } from "react";
import type { MutableRefObject } from "react";

import type { ConversationListItem, MessageItemDto } from "../../data/api-client";
import { mergeLocalOutgoingMessages } from "../../data/im-local-outgoing";
import { reduceMessageCoreEvent } from "../../data/message-core/message-core";
import type { CurrentUserIdentity } from "../../data/message-display";
import { applyDirectReadReceiptToMessages } from "../../data/read-receipts";
import { withLocalMediaPreviews } from "../models/messageCacheMutationModel";
import {
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
  const visibleMessages = useMemo(
    () =>
      filterVisibleMessages(
        filterMessagesByHistory(messages, historyOpen ? historyFilter : "all"),
        messageSearchOpen ? messageSearchKeyword : "",
      ),
    [historyFilter, historyOpen, messageSearchKeyword, messageSearchOpen, messages],
  );

  return {
    historyCounts,
    messages,
    visibleMessages,
  };
}
