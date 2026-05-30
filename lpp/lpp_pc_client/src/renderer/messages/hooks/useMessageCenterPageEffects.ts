import { useEffect } from "react";
import type { Dispatch, MutableRefObject, RefObject, SetStateAction } from "react";

import type { ConversationListItem, MessageItemDto } from "../../data/api-client";
import { logMessageCenterDiagnostic } from "../diagnostics/message-center-diagnostics";
import { isNoticeErrorText } from "../components/ChatToastNotice";
import type { ReplyTarget } from "../models/messageComposerModel";
import type {
  AvatarProfilePopoverState,
  UnreadJumpState,
} from "../models/messageDisplayModel";
import { getImConversationType } from "./useMessageCenterViewModel";

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

export function useMessageCenterPageEffects({
  activeConversation,
  activeConversationType,
  chatPanelRef,
  clampComposerHeight,
  localImagePreviewByMessageIdRef,
  notice,
  setAvatarProfilePopover,
  setComposerHeight,
  setConversationDrawerOpen,
  setConversationMenu,
  setForwardTargetMessages,
  setMessageMenu,
  setNotice,
  setProfileStandaloneOpen,
  setReplyTarget,
  setUnreadJump,
  visibleConversationCount,
}: {
  activeConversation?: ConversationListItem;
  activeConversationType: ReturnType<typeof getImConversationType>;
  chatPanelRef: RefObject<HTMLElement | null>;
  clampComposerHeight: (height: number, panelHeight?: number | null) => number;
  localImagePreviewByMessageIdRef: MutableRefObject<Map<string, string>>;
  notice: string | null;
  setAvatarProfilePopover: Dispatch<SetStateAction<AvatarProfilePopoverState | null>>;
  setComposerHeight: Dispatch<SetStateAction<number>>;
  setConversationDrawerOpen: Dispatch<SetStateAction<boolean>>;
  setConversationMenu: Dispatch<SetStateAction<ConversationMenuState>>;
  setForwardTargetMessages: Dispatch<SetStateAction<MessageItemDto[]>>;
  setMessageMenu: Dispatch<SetStateAction<MessageMenuState>>;
  setNotice: Dispatch<SetStateAction<string | null>>;
  setProfileStandaloneOpen: Dispatch<SetStateAction<boolean>>;
  setReplyTarget: Dispatch<SetStateAction<ReplyTarget>>;
  setUnreadJump: Dispatch<SetStateAction<UnreadJumpState | null>>;
  visibleConversationCount: number;
}) {
  useEffect(() => {
    const panel = chatPanelRef.current;
    if (!panel) return undefined;

    const clampCurrentHeight = () => {
      const panelHeight = panel.getBoundingClientRect().height;
      setComposerHeight((current) => clampComposerHeight(current, panelHeight));
    };

    clampCurrentHeight();
    const resizeObserver =
      typeof ResizeObserver === "undefined"
        ? null
        : new ResizeObserver(clampCurrentHeight);
    resizeObserver?.observe(panel);
    window.addEventListener("resize", clampCurrentHeight);
    return () => {
      resizeObserver?.disconnect();
      window.removeEventListener("resize", clampCurrentHeight);
    };
  }, [chatPanelRef, clampComposerHeight, setComposerHeight]);

  useEffect(
    () => () => {
      localImagePreviewByMessageIdRef.current.forEach((url) => {
        URL.revokeObjectURL(url);
      });
      localImagePreviewByMessageIdRef.current.clear();
    },
    [localImagePreviewByMessageIdRef],
  );

  useEffect(() => {
    if (!notice) return undefined;
    const timeout = window.setTimeout(
      () => setNotice(null),
      isNoticeErrorText(notice) ? 3200 : 1800,
    );
    return () => window.clearTimeout(timeout);
  }, [notice, setNotice]);

  useEffect(() => {
    if (!activeConversation) {
      logMessageCenterDiagnostic({
        event: "conversation.selected",
        phase: "selection",
        result: "ignored",
        reason: "no_active_conversation",
      });
      return;
    }
    logMessageCenterDiagnostic({
      event: "conversation.selected",
      phase: "selection",
      result: "ok",
      context: {
        conversationId: activeConversation.conversationId,
        conversationType: activeConversationType,
        visibleConversationCount,
      },
    });
  }, [
    activeConversation?.conversationId,
    activeConversationType,
    visibleConversationCount,
  ]);

  useEffect(() => {
    setReplyTarget(null);
    setMessageMenu(null);
    setAvatarProfilePopover(null);
    setConversationMenu(null);
    setForwardTargetMessages([]);
    setConversationDrawerOpen(false);
    setProfileStandaloneOpen(false);
    setUnreadJump((current) =>
      current?.conversationId === activeConversation?.conversationId ? current : null,
    );
  }, [
    activeConversation?.conversationId,
    setAvatarProfilePopover,
    setConversationDrawerOpen,
    setConversationMenu,
    setForwardTargetMessages,
    setMessageMenu,
    setProfileStandaloneOpen,
    setReplyTarget,
    setUnreadJump,
  ]);
}
