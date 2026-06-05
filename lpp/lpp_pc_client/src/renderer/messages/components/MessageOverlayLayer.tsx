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
  ContactCardProfileDialog,
} from "./ConversationInfoViews";
import type { AvatarProfilePopoverState } from "../models/messageDisplayModel";
import type {
  AnchoredContactCardProfile,
  ContactCardRelation,
} from "../models/contactCardModel";
import type { ConversationContextAction } from "../models/messageConversationActionModel";
import type { UserProfileDto } from "../../data/api-client";

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

export function MessageOverlayLayer({
  avatarProfilePopover,
  contactCardProfile,
  contactCardProfileData,
  contactCardProfileError,
  contactCardProfileLoading,
  contactCardRelation,
  contactCardActionPending,
  conversationMenu,
  messageMenu,
  messageMenuMediaStatus,
  profileStandaloneOpen,
  isMineMessage,
  onAvatarProfileClose,
  onContactCardAccept,
  onContactCardBlock,
  onContactCardClose,
  onContactCardDeleteFriend,
  onContactCardReject,
  onContactCardSendRequest,
  onContactCardStartChat,
  onConversationAction,
  onMessageAction,
}: {
  avatarProfilePopover: AvatarProfilePopoverState | null;
  contactCardProfile: AnchoredContactCardProfile | null;
  contactCardProfileData?: UserProfileDto;
  contactCardProfileError?: unknown;
  contactCardProfileLoading?: boolean;
  contactCardRelation?: ContactCardRelation;
  contactCardActionPending?: boolean;
  conversationMenu: ConversationMenuState;
  messageMenu: MessageMenuState;
  messageMenuMediaStatus: CachedMediaStatus;
  profileStandaloneOpen: boolean;
  isMineMessage: (message: MessageItemDto) => boolean;
  onAvatarProfileClose: () => void;
  onContactCardAccept: () => void;
  onContactCardBlock: () => void;
  onContactCardClose: () => void;
  onContactCardDeleteFriend: () => void;
  onContactCardReject: () => void;
  onContactCardSendRequest: (message: string) => void;
  onContactCardStartChat: () => void;
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
          isPinned={Boolean(conversationMenu.conversation.isPinned)}
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
      {contactCardProfile && contactCardRelation && (
        <ContactCardProfileDialog
          actionPending={contactCardActionPending}
          card={contactCardProfile}
          profile={contactCardProfileData}
          profileError={contactCardProfileError}
          profileLoading={contactCardProfileLoading}
          relation={contactCardRelation}
          onAccept={onContactCardAccept}
          onBlock={onContactCardBlock}
          onClose={onContactCardClose}
          onDeleteFriend={onContactCardDeleteFriend}
          onReject={onContactCardReject}
          onSendRequest={onContactCardSendRequest}
          onStartChat={onContactCardStartChat}
        />
      )}
    </>
  );
}
