import { useCallback } from "react";
import type { Dispatch, MouseEvent, SetStateAction } from "react";

import type { ConversationListItem, MessageItemDto } from "../../data/api-client";
import type { AuthSession } from "../../data/auth/auth-session";
import {
  buildAvatarProfilePopover,
  buildGroupMemberMap,
  type AvatarProfilePopoverState,
} from "../models/messageDisplayModel";
import {
  normalizeContactCard,
  type NormalizedContactCard,
} from "../models/contactCardModel";
import { requestMessageDangerConfirmation } from "../runtime/messageConfirm";

type MessageMenuState = {
  message: MessageItemDto;
  x: number;
  y: number;
} | null;

type ConversationMenuState = {
  conversation: ConversationListItem;
  x: number;
  y: number;
} | null;

export function useMessageInteractionHandlers({
  activeConversation,
  activeConversationId,
  deleteMessage,
  groupMemberMap,
  messageListScrollRegistry,
  selectedMessageIds,
  session,
  setActiveConversation,
  setAvatarProfilePopover,
  setContactCardProfile,
  setConversationMenu,
  setLocalHiddenConversationIds,
  setLocalMutedConversationIds,
  setMessageMenu,
  setMultiSelectMode,
  setNotice,
  setSelectedMessageIds,
}: {
  activeConversation?: ConversationListItem;
  activeConversationId: string | null | undefined;
  deleteMessage: (messageId: string) => Promise<unknown>;
  groupMemberMap: ReturnType<typeof buildGroupMemberMap>;
  messageListScrollRegistry: {
    scrollToMessage: (messageId: string, onMissing?: () => void) => void;
  };
  selectedMessageIds: Set<string>;
  session: AuthSession | null;
  setActiveConversation: (conversationId: string) => void;
  setAvatarProfilePopover: Dispatch<SetStateAction<AvatarProfilePopoverState | null>>;
  setContactCardProfile: Dispatch<SetStateAction<NormalizedContactCard | null>>;
  setConversationMenu: Dispatch<SetStateAction<ConversationMenuState>>;
  setLocalHiddenConversationIds: Dispatch<SetStateAction<Set<string>>>;
  setLocalMutedConversationIds: Dispatch<SetStateAction<Set<string>>>;
  setMessageMenu: Dispatch<SetStateAction<MessageMenuState>>;
  setMultiSelectMode: Dispatch<SetStateAction<boolean>>;
  setNotice: Dispatch<SetStateAction<string | null>>;
  setSelectedMessageIds: Dispatch<SetStateAction<Set<string>>>;
}) {
  const openMessageMenu = useCallback(
    (event: MouseEvent<HTMLElement>, message: MessageItemDto) => {
      event.preventDefault();
      event.stopPropagation();
      setMessageMenu({
        message,
        x: Math.min(event.clientX, window.innerWidth - 260),
        y: Math.min(event.clientY, window.innerHeight - 340),
      });
    },
    [setMessageMenu],
  );

  const openConversationMenu = useCallback(
    (event: MouseEvent<HTMLElement>, conversation: ConversationListItem) => {
      event.preventDefault();
      event.stopPropagation();
      setConversationMenu({
        conversation,
        x: Math.min(event.clientX, window.innerWidth - 240),
        y: Math.min(event.clientY, window.innerHeight - 220),
      });
    },
    [setConversationMenu],
  );

  const handleConversationMenuAction = useCallback(
    (action: "mute" | "hide" | "delete", conversation: ConversationListItem) => {
      setConversationMenu(null);
      if (action === "mute") {
        setLocalMutedConversationIds((current) => {
          const next = new Set(current);
          if (conversation.isMuted || next.has(conversation.conversationId)) {
            next.delete(conversation.conversationId);
            setNotice("已在本机取消免打扰；服务端同步需要接口支持");
          } else {
            next.add(conversation.conversationId);
            setNotice("已在本机开启免打扰；服务端同步需要接口支持");
          }
          return next;
        });
        return;
      }
      if (action === "hide" || action === "delete") {
        if (
          action === "delete" &&
          !requestMessageDangerConfirmation({ action: "delete-conversation" })
        ) {
          return;
        }
        setLocalHiddenConversationIds((current) => {
          const next = new Set(current);
          next.add(conversation.conversationId);
          return next;
        });
        if (activeConversationId === conversation.conversationId) {
          setActiveConversation("");
        }
        setNotice(
          action === "delete"
            ? "会话已在本机隐藏；服务端删除需要接口支持"
            : "会话已在本机隐藏",
        );
      }
    },
    [
      activeConversationId,
      setActiveConversation,
      setConversationMenu,
      setLocalHiddenConversationIds,
      setLocalMutedConversationIds,
      setNotice,
    ],
  );

  const handleAvatarClick = useCallback(
    (event: MouseEvent<HTMLButtonElement>, message: MessageItemDto, mine: boolean) => {
      event.preventDefault();
      event.stopPropagation();
      if (!activeConversation) return;
      if (activeConversation.conversationType === "group") return;
      setMessageMenu(null);
      setNotice(null);
      const rect = event.currentTarget.getBoundingClientRect();
      setAvatarProfilePopover(
        buildAvatarProfilePopover({
          conversation: activeConversation,
          groupMembers: groupMemberMap,
          message,
          mine,
          session,
          x: mine
            ? Math.max(16, Math.min(rect.right - 300, window.innerWidth - 332))
            : Math.min(rect.left + 44, window.innerWidth - 332),
          y: Math.max(12, Math.min(rect.top, window.innerHeight - 244)),
        }),
      );
    },
    [
      activeConversation,
      groupMemberMap,
      session,
      setAvatarProfilePopover,
      setMessageMenu,
      setNotice,
    ],
  );

  const handleContactCardClick = useCallback(
    (event: MouseEvent<HTMLElement>, value: Record<string, unknown>) => {
      event.preventDefault();
      event.stopPropagation();
      setMessageMenu(null);
      setNotice(null);
      setContactCardProfile(normalizeContactCard(value));
    },
    [setContactCardProfile, setMessageMenu, setNotice],
  );

  const scrollToMessage = useCallback(
    (messageId: string) => {
      messageListScrollRegistry.scrollToMessage(messageId, () => {
        setNotice("该消息尚未加载，请调整筛选或加载更多历史");
      });
    },
    [messageListScrollRegistry, setNotice],
  );

  const handleBatchDeleteSelected = useCallback(async () => {
    const messageIds = Array.from(selectedMessageIds);
    if (messageIds.length === 0) return;
    if (
      !requestMessageDangerConfirmation({
        action: "batch-delete-messages",
        count: messageIds.length,
      })
    ) {
      return;
    }
    const results = await Promise.allSettled(
      messageIds.map((messageId) => deleteMessage(messageId)),
    );
    const failedCount = results.filter((result) => result.status === "rejected").length;
    setMultiSelectMode(false);
    setSelectedMessageIds(new Set());
    if (failedCount > 0) {
      setNotice(`已删除 ${messageIds.length - failedCount} 条，${failedCount} 条失败，请稍后重试`);
    } else {
      setNotice(`已删除 ${messageIds.length} 条消息`);
    }
  }, [
    deleteMessage,
    selectedMessageIds,
    setMultiSelectMode,
    setNotice,
    setSelectedMessageIds,
  ]);

  return {
    handleAvatarClick,
    handleBatchDeleteSelected,
    handleContactCardClick,
    handleConversationMenuAction,
    openConversationMenu,
    openMessageMenu,
    scrollToMessage,
  };
}
