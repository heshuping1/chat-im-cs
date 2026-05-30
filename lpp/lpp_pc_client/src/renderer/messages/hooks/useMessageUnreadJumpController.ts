import type { QueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useRef } from "react";
import type { Dispatch, SetStateAction } from "react";

import type { ConversationListItem, MessageItemDto } from "../../data/api-client";
import type { AuthSession } from "../../data/auth/auth-session";
import {
  effectiveConversationUnreadCount,
  type CurrentUserIdentity,
} from "../../data/message-display";
import { pcQueryKeys } from "../../data/query-keys";
import {
  findFirstUnreadLoadedMessage,
  type UnreadJumpState,
} from "../models/messageDisplayModel";
import { getImConversationType } from "./useMessageCenterViewModel";

export function useMessageUnreadJumpController({
  activeConversation,
  activeConversationId,
  messageListScrollRegistry,
  messageSearchOpen,
  messages,
  queryClient,
  session,
  setActiveConversation,
  setConversationDrawerOpen,
  setMessageSearchKeyword,
  setMessageSearchOpen,
  setNotice,
  setUnreadJump,
  unreadIdentity,
  unreadJump,
}: {
  activeConversation?: ConversationListItem;
  activeConversationId: string | null | undefined;
  messageListScrollRegistry: {
    scrollToMessage: (messageId: string, onMissing?: () => void) => void;
  };
  messageSearchOpen: boolean;
  messages: MessageItemDto[];
  queryClient: QueryClient;
  session: AuthSession | null;
  setActiveConversation: (conversationId: string) => void;
  setConversationDrawerOpen: Dispatch<SetStateAction<boolean>>;
  setMessageSearchKeyword: Dispatch<SetStateAction<string>>;
  setMessageSearchOpen: Dispatch<SetStateAction<boolean>>;
  setNotice: Dispatch<SetStateAction<string | null>>;
  setUnreadJump: Dispatch<SetStateAction<UnreadJumpState | null>>;
  unreadIdentity: CurrentUserIdentity | null;
  unreadJump: UnreadJumpState | null;
}) {
  const autoSelectedConversationIdsRef = useRef(new Set<string>());

  useEffect(() => {
    if (
      activeConversation &&
      activeConversationId !== activeConversation.conversationId
    ) {
      if (!activeConversationId) {
        autoSelectedConversationIdsRef.current.add(activeConversation.conversationId);
      }
      setActiveConversation(activeConversation.conversationId);
    }
  }, [activeConversation, activeConversationId, setActiveConversation]);

  const openConversationFromUserClick = useCallback(
    (conversation: ConversationListItem) => {
      autoSelectedConversationIdsRef.current.delete(conversation.conversationId);
      setConversationDrawerOpen(false);
      setActiveConversation(conversation.conversationId);

      const conversationType = getImConversationType(conversation);
      if (!session || !conversationType) return;
      void queryClient.invalidateQueries({
        queryKey: pcQueryKeys.imMessages(
          session.apiBaseUrl,
          session.tenantToken,
          conversationType,
          conversation.conversationId,
        ),
      });

      const unread = effectiveConversationUnreadCount(conversation, unreadIdentity);
      if (unread <= 0) {
        setUnreadJump(null);
        return;
      }

      setUnreadJump({
        conversationId: conversation.conversationId,
        count: unread,
        lastReadSeq: Number(conversation.lastReadSeq ?? 0),
      });
    },
    [
      queryClient,
      session,
      setActiveConversation,
      setConversationDrawerOpen,
      setUnreadJump,
      unreadIdentity,
    ],
  );

  useEffect(() => {
    if (!activeConversation || !session) return;
    if (activeConversationId !== activeConversation.conversationId) return;
    if (autoSelectedConversationIdsRef.current.has(activeConversation.conversationId)) {
      return;
    }
    const unread = effectiveConversationUnreadCount(activeConversation, unreadIdentity);
    if (unread <= 0) return;
    const readSeq =
      typeof activeConversation.lastMessageSeq === "number"
        ? activeConversation.lastMessageSeq
        : typeof activeConversation.lastReadSeq === "number"
          ? activeConversation.lastReadSeq
          : 0;
    if (readSeq <= 0) return;
    setUnreadJump((current) =>
      current?.conversationId === activeConversation.conversationId
        ? current
        : {
            conversationId: activeConversation.conversationId,
            count: unread,
            lastReadSeq: Number(activeConversation.lastReadSeq ?? 0),
          },
    );
  }, [
    activeConversation?.conversationId,
    activeConversation?.lastMessage?.messageId,
    activeConversation?.lastMessageSeq,
    activeConversation?.lastReadSeq,
    activeConversation?.unreadCount,
    activeConversationId,
    session,
    setUnreadJump,
    unreadIdentity,
  ]);

  const handleUnreadJump = useCallback(() => {
    if (!unreadJump || unreadJump.conversationId !== activeConversation?.conversationId) {
      return;
    }
    if (messageSearchOpen) {
      setMessageSearchOpen(false);
      setMessageSearchKeyword("");
    }
    const target = findFirstUnreadLoadedMessage(messages, unreadJump, session);
    if (!target) {
      setNotice("第一条未读消息尚未加载，请加载更多历史后重试");
      return;
    }
    messageListScrollRegistry.scrollToMessage(target.messageId, () => {
      setNotice("第一条未读消息不在当前筛选结果中，请清空搜索后重试");
    });
    setUnreadJump(null);
  }, [
    activeConversation?.conversationId,
    messageListScrollRegistry,
    messageSearchOpen,
    messages,
    session,
    setMessageSearchKeyword,
    setMessageSearchOpen,
    setNotice,
    setUnreadJump,
    unreadJump,
  ]);

  return {
    handleUnreadJump,
    openConversationFromUserClick,
  };
}
