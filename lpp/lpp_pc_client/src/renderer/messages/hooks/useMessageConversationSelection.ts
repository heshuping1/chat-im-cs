import { useEffect, useMemo } from "react";

import type { ConversationListItem } from "../../data/api-client";
import type { AuthSession } from "../../data/auth/auth-session";
import { resolveImConversationReadView } from "../../data/im-read/im-conversation-read-view";
import {
  type CurrentUserIdentity,
  isImConversation,
} from "../../data/message-display";
import { recordMessageReminderDiagnostic } from "../../data/diagnostics/message-reminder-diagnostics";
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

const effectiveUnreadDiagnosticSignatures = new Map<string, string>();
const maxEffectiveUnreadDiagnosticSignatures = 500;

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

  useEffect(() => {
    if (!unreadIdentity) return;
    for (const conversation of conversations) {
      const readView = resolveImConversationReadView({
        conversation,
        identity: unreadIdentity,
      });
      const diagnostic = readView.diagnostic;
      const shouldRecord =
        readView.effectiveUnread > 0 ||
        diagnostic.serverUnread !== readView.effectiveUnread;
      if (!shouldRecord) continue;
      const signature = [
        diagnostic.serverUnread,
        readView.effectiveUnread,
        diagnostic.lastReadSeq ?? "",
        diagnostic.lastMessageSeq ?? "",
        diagnostic.localReadSeq ?? "",
        diagnostic.localReadAt ?? "",
        diagnostic.localReadCoversLastMessage,
        diagnostic.localReadCoverReason,
        diagnostic.selfLastMessage,
      ].join("|");
      const logKey = conversation.conversationId;
      if (effectiveUnreadDiagnosticSignatures.get(logKey) === signature) continue;
      effectiveUnreadDiagnosticSignatures.set(logKey, signature);
      if (effectiveUnreadDiagnosticSignatures.size > maxEffectiveUnreadDiagnosticSignatures) {
        const oldest = effectiveUnreadDiagnosticSignatures.keys().next().value;
        if (oldest) effectiveUnreadDiagnosticSignatures.delete(oldest);
      }
      recordMessageReminderDiagnostic({
        event: "im.ui.effective-unread",
        source: "use-message-conversation-selection",
        phase: "derive",
        route: "conversation-list",
        classification: {
          conversationId: conversation.conversationId,
          conversationType: conversation.conversationType,
          effectiveUnread: readView.effectiveUnread,
          lastMessageAt: diagnostic.lastMessageAt,
          lastMessageSeq: diagnostic.lastMessageSeq,
          lastReadSeq: diagnostic.lastReadSeq,
          localReadAt: diagnostic.localReadAt,
          localReadCoversLastMessage: diagnostic.localReadCoversLastMessage,
          localReadCoverReason: diagnostic.localReadCoverReason,
          localReadSeq: diagnostic.localReadSeq,
          selfLastMessage: diagnostic.selfLastMessage,
          serverUnread: diagnostic.serverUnread,
          viewReason: readView.reason,
        },
        summary: {
          conversation,
        },
      });
    }
  }, [conversations, unreadIdentity]);

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
