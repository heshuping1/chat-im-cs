import type { CachedMediaStatus } from "../../../shared/desktop-api";
import type { ConversationListItem, MessageItemDto } from "../../data/api-client";
import {
  createMessageContextMenuState,
  type MessageContextAction,
} from "../models/messageContextMenuModel";
import { getCurrentMediaActionCapabilities } from "../runtime/mediaActionCapabilities";
import { revealInFolderLabel } from "../runtime/messageMediaActions";
import {
  ConversationContextMenu,
  MessageContextMenu,
} from "./ChatContextMenus";
import {
  AvatarProfilePopover,
} from "./ConversationInfoViews";
import type { AvatarProfilePopoverState } from "../models/messageDisplayModel";

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

type ConversationContextAction = "mute" | "hide" | "delete";

export function MessageOverlayLayer({
  avatarProfilePopover,
  conversationMenu,
  messageMenu,
  messageMenuMediaStatus,
  profileStandaloneOpen,
  isMineMessage,
  onAvatarProfileClose,
  onConversationAction,
  onMessageAction,
}: {
  avatarProfilePopover: AvatarProfilePopoverState | null;
  conversationMenu: ConversationMenuState;
  messageMenu: MessageMenuState;
  messageMenuMediaStatus: CachedMediaStatus;
  profileStandaloneOpen: boolean;
  isMineMessage: (message: MessageItemDto) => boolean;
  onAvatarProfileClose: () => void;
  onConversationAction: (
    action: ConversationContextAction,
    conversation: ConversationListItem,
  ) => void;
  onMessageAction: (action: MessageContextAction, message: MessageItemDto) => void;
}) {
  const { canCopyMediaFile } = getCurrentMediaActionCapabilities();

  return (
    <>
      {!profileStandaloneOpen && messageMenu && (
        <MessageContextMenu
          onAction={(action) => onMessageAction(action, messageMenu.message)}
          position={{ x: messageMenu.x, y: messageMenu.y }}
          state={createMessageContextMenuState({
            canCopyMediaFile,
            mediaCacheStatus: messageMenuMediaStatus,
            message: messageMenu.message,
            mine: isMineMessage(messageMenu.message),
            revealInFolderLabel: revealInFolderLabel(),
          })}
        />
      )}
      {conversationMenu && (
        <ConversationContextMenu
          isMuted={Boolean(conversationMenu.conversation.isMuted)}
          onAction={(action) => onConversationAction(action, conversationMenu.conversation)}
          position={{ x: conversationMenu.x, y: conversationMenu.y }}
        />
      )}

      {avatarProfilePopover && (
        <AvatarProfilePopover
          profile={avatarProfilePopover}
          onClose={onAvatarProfileClose}
        />
      )}
    </>
  );
}
