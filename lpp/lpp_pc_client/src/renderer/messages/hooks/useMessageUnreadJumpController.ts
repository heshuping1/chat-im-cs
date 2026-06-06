import { useCallback, useEffect, useRef, useState } from "react";
import type { Dispatch, SetStateAction } from "react";

import type { ConversationListItem, MessageItemDto } from "../../data/api-client";
import type { AuthSession } from "../../data/auth/auth-session";
import {
  imConversationEffectiveUnreadCount,
  resolveImConversationReadView,
} from "../../data/im-read/im-conversation-read-view";
import type { CurrentUserIdentity } from "../../data/message-display";
import { recordMessageReminderDiagnostic } from "../../data/diagnostics/message-reminder-diagnostics";
import { useI18n } from "../../i18n/useI18n";
import {
  findFirstUnreadLoadedMessage,
  type UnreadJumpState,
} from "../models/messageDisplayModel";

export type ActiveImConversationSource = "user" | "auto" | "none";

export function useMessageUnreadJumpController({
  activeConversation,
  activeConversationId,
  messageListScrollRegistry,
  messageSearchOpen,
  messages,
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
  const { t } = useI18n();
  const autoSelectedConversationIdsRef = useRef(new Set<string>());
  const [selectionSources, setSelectionSources] = useState<
    Record<string, ActiveImConversationSource>
  >({});
  const activeConversationSource: ActiveImConversationSource = activeConversation
    ? selectionSources[activeConversation.conversationId] ??
      (activeConversationId === activeConversation.conversationId ? "user" : "auto")
    : "none";

  useEffect(() => {
    if (
      activeConversation &&
      activeConversationId !== activeConversation.conversationId
    ) {
      if (!activeConversationId) {
        const readView = resolveImConversationReadView({
          activeConversationId,
          conversation: activeConversation,
          identity: unreadIdentity,
          visibility: "listOnly",
        });
        autoSelectedConversationIdsRef.current.add(activeConversation.conversationId);
        setSelectionSources((current) => ({
          ...current,
          [activeConversation.conversationId]: "auto",
        }));
        recordMessageReminderDiagnostic({
          event: "im.ui.selection",
          source: "use-message-unread-jump-controller",
          phase: "selection",
          route: "auto",
          classification: {
            activeConversationId,
            activeConversationSource: "auto",
            conversationId: activeConversation.conversationId,
            effectiveUnread: readView.effectiveUnread,
            lastMessageSeq: activeConversation.lastMessageSeq,
            lastReadSeq: activeConversation.lastReadSeq,
            readViewReason: readView.reason,
          },
          summary: {
            activeConversation,
          },
        });
      }
      setActiveConversation(activeConversation.conversationId);
    }
  }, [activeConversation, activeConversationId, setActiveConversation, unreadIdentity]);

  const openConversationFromUserClick = useCallback(
    (conversation: ConversationListItem) => {
      autoSelectedConversationIdsRef.current.delete(conversation.conversationId);
      const readView = resolveImConversationReadView({
        activeConversationId: conversation.conversationId,
        conversation,
        identity: unreadIdentity,
        visibility: "listOnly",
      });
      setSelectionSources((current) => ({
        ...current,
        [conversation.conversationId]: "user",
      }));
      recordMessageReminderDiagnostic({
        event: "im.ui.selection",
        source: "use-message-unread-jump-controller",
        phase: "selection",
        route: "user",
        classification: {
          activeConversationId,
          activeConversationSource: "user",
          conversationId: conversation.conversationId,
          effectiveUnread: readView.effectiveUnread,
          lastMessageSeq: conversation.lastMessageSeq,
          lastReadSeq: conversation.lastReadSeq,
          readViewReason: readView.reason,
        },
        summary: {
          conversation,
        },
      });
      setConversationDrawerOpen(false);
      setActiveConversation(conversation.conversationId);

      const unread = imConversationEffectiveUnreadCount(conversation, unreadIdentity);
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
      activeConversationId,
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
    const unread = imConversationEffectiveUnreadCount(activeConversation, unreadIdentity);
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
      setNotice(t("messages.unreadJump.notLoaded"));
      return;
    }
    messageListScrollRegistry.scrollToMessage(target.messageId, () => {
      setNotice(t("messages.unreadJump.filteredOut"));
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
    t,
    unreadJump,
  ]);

  return {
    activeConversationSource,
    handleUnreadJump,
    openConversationFromUserClick,
  };
}
