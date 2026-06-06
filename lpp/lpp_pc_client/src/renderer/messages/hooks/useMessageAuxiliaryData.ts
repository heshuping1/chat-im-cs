import { useEffect, useState } from "react";

import type { ConversationListItem, GroupMemberDto, MessageItemDto } from "../../data/api-client";
import type { AuthSession } from "../../data/auth/auth-session";
import {
  accountIdFromSession,
  materializeImageMessages,
} from "../../media/runtime/imageMaterialization";
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
    materializeImageMessages({
      accountId: accountIdFromSession(session),
      assetBaseUrl: session.apiBaseUrl,
      authToken: session.tenantToken,
      conversationId: activeConversation.conversationId,
      messages,
      reason: "conversation-snapshot",
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
