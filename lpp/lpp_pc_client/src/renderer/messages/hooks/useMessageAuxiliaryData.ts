import { useEffect, useState } from "react";

import type { ConversationListItem, GroupMemberDto, MessageItemDto } from "../../data/api-client";
import type { AuthSession } from "../../data/auth/auth-session";
import { prefetchImageMessages } from "../../media/runtime/imagePrecache";
import { getImConversationType } from "./useMessageCenterViewModel";

export function useMessageAuxiliaryData({
  activeConversation,
  activeConversationType,
  groupMembers,
  messages,
  session,
}: {
  activeConversation?: ConversationListItem;
  activeConversationType: ReturnType<typeof getImConversationType>;
  groupMembers: GroupMemberDto[];
  messages: MessageItemDto[];
  session: AuthSession | null;
}) {
  const [groupMembersByConversation, setGroupMembersByConversation] =
    useState<Record<string, GroupMemberDto[]>>({});

  useEffect(() => {
    if (
      !activeConversation?.conversationId ||
      activeConversationType !== "group" ||
      groupMembers.length === 0
    ) {
      return;
    }
    setGroupMembersByConversation((current) => {
      if (current[activeConversation.conversationId] === groupMembers) {
        return current;
      }
      return {
        ...current,
        [activeConversation.conversationId]: groupMembers,
      };
    });
  }, [
    activeConversation?.conversationId,
    activeConversationType,
    groupMembers,
  ]);

  useEffect(() => {
    if (!session || !activeConversation?.conversationId || messages.length === 0) {
      return;
    }
    prefetchImageMessages({
      accountId:
        session.userId ||
        session.platformUserId ||
        session.lppId ||
        session.tenantId,
      assetBaseUrl: session.apiBaseUrl,
      authToken: session.tenantToken,
      conversationId: activeConversation.conversationId,
      messages,
    });
  }, [
    activeConversation?.conversationId,
    messages,
    session?.lppId,
    session?.apiBaseUrl,
    session?.platformUserId,
    session?.tenantId,
    session?.tenantToken,
    session?.userId,
  ]);

  return {
    groupMembersByConversation,
  };
}
