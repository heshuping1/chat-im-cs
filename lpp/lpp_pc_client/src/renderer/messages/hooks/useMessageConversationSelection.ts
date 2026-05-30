import { useMemo } from "react";

import type { ConversationListItem } from "../../data/api-client";
import type { AuthSession } from "../../data/auth/auth-session";
import {
  type CurrentUserIdentity,
  isImConversation,
} from "../../data/message-display";
import {
  conversationKey as imConversationKey,
  type ConversationReadState,
} from "../../data/im-read-model";
import { mergeUnifiedReadStateForIdentity } from "../../data/im-read/im-read-view-model";
import {
  filterMessageConversations,
  sortMessageConversations,
} from "../models/messageConversationListModel";
import { getImConversationType } from "./useMessageCenterViewModel";

export function useMessageConversationSelection({
  activeConversationId,
  conversationItems,
  imReadStateByConversation,
  keyword,
  localHiddenConversationIds,
  localMutedConversationIds,
  locallyReadConversationReads,
  messageFilter,
  session,
}: {
  activeConversationId: string | null | undefined;
  conversationItems: ConversationListItem[];
  imReadStateByConversation: Record<string, ConversationReadState>;
  keyword: string;
  localHiddenConversationIds: Set<string>;
  localMutedConversationIds: Set<string>;
  locallyReadConversationReads: Parameters<typeof mergeUnifiedReadStateForIdentity>[0];
  messageFilter: Parameters<typeof filterMessageConversations>[1];
  session: AuthSession | null;
}) {
  const unreadIdentity = useMemo<CurrentUserIdentity | null>(
    () =>
      session
        ? {
            ...session,
            locallyReadConversationReads: mergeUnifiedReadStateForIdentity(
              locallyReadConversationReads,
              imReadStateByConversation,
            ),
          }
        : null,
    [imReadStateByConversation, locallyReadConversationReads, session],
  );
  const conversations = useMemo(
    () =>
      sortMessageConversations(
        conversationItems
          .filter((item) => isImConversation(item))
          .filter((item) => !localHiddenConversationIds.has(item.conversationId))
          .map((item) =>
            localMutedConversationIds.has(item.conversationId)
              ? { ...item, isMuted: true }
              : item,
          ),
        unreadIdentity,
      ),
    [
      conversationItems,
      localHiddenConversationIds,
      localMutedConversationIds,
      unreadIdentity,
    ],
  );

  const visibleConversations = useMemo(
    () =>
      filterMessageConversations(conversations, messageFilter, keyword, unreadIdentity),
    [conversations, keyword, messageFilter, unreadIdentity],
  );
  const activeConversation =
    visibleConversations.find((item) => item.conversationId === activeConversationId) ??
    conversations.find((item) => item.conversationId === activeConversationId) ??
    visibleConversations[0] ??
    conversations[0];
  const activeConversationType = getImConversationType(activeConversation);
  const activeConversationKey =
    activeConversation && activeConversationType
      ? imConversationKey(activeConversationType, activeConversation.conversationId)
      : undefined;
  const activeConversationReadState =
    activeConversation && activeConversationType
      ? imReadStateByConversation[
          imConversationKey(activeConversationType, activeConversation.conversationId)
        ]
      : undefined;

  return {
    activeConversation,
    activeConversationIsGroup: activeConversationType === "group",
    activeConversationKey,
    activeConversationReadState,
    activeConversationType,
    conversations,
    unreadIdentity,
    visibleConversations,
  };
}
