import type {
  ConversationListItem,
  FriendInviteQrDto,
  MessageItemDto,
} from "../../data/api-client";
import type { CurrentUserIdentity } from "../../data/message-display";
import { ForwardDialog } from "./ForwardDialog";
import { InviteQrDialog } from "./InviteQrDialog";
import {
  DirectChatDialog,
  GroupChatDialog,
  type ContactPickerItem,
} from "./MessageStartDialogs";
import type { GroupConversationAvatar } from "../models/groupAvatarTypes";

type ComposerDialogKind = "direct" | "group" | "qr" | null;

export function MessageDialogsLayer({
  activeConversationId,
  composerDialog,
  contactPickerItems,
  conversations,
  createDirectPending,
  createGroupPending,
  createInviteQrPending,
  forwardMessages,
  forwardPending,
  inviteQrError,
  inviteQrLoading,
  inviteQrs,
  userIdentity,
  onCloseComposerDialog,
  onCloseForward,
  onCreateDirectChat,
  onCreateGroupChat,
  onCreateInviteQr,
  onForward,
  resolveConversationAvatar,
  resolveConversationType,
  resolveMessagePreview,
}: {
  activeConversationId: string;
  composerDialog: ComposerDialogKind;
  contactPickerItems: ContactPickerItem[];
  conversations: ConversationListItem[];
  createDirectPending: boolean;
  createGroupPending: boolean;
  createInviteQrPending: boolean;
  forwardMessages: MessageItemDto[];
  forwardPending: boolean;
  inviteQrError: unknown;
  inviteQrLoading: boolean;
  inviteQrs: FriendInviteQrDto[];
  userIdentity?: CurrentUserIdentity | null;
  onCloseComposerDialog: () => void;
  onCloseForward: () => void;
  onCreateDirectChat: (userId: string) => void;
  onCreateGroupChat: (payload: { name: string; memberUserIds: string[] }) => void;
  onCreateInviteQr: () => void;
  onForward: (targetConversationId: string) => void;
  resolveConversationAvatar: (
    conversation: ConversationListItem,
  ) => GroupConversationAvatar | undefined;
  resolveConversationType: (
    conversation: ConversationListItem,
  ) => "direct" | "group" | undefined;
  resolveMessagePreview: (message: MessageItemDto) => string;
}) {
  return (
    <>
      {forwardMessages.length > 0 && (
        <ForwardDialog
          activeConversationId={activeConversationId}
          conversations={conversations}
          messages={forwardMessages}
          pending={forwardPending}
          resolveConversationAvatar={resolveConversationAvatar}
          resolveConversationType={resolveConversationType}
          resolveMessagePreview={resolveMessagePreview}
          userIdentity={userIdentity}
          onClose={onCloseForward}
          onForward={onForward}
        />
      )}
      {composerDialog === "direct" && (
        <DirectChatDialog
          contacts={contactPickerItems}
          pending={createDirectPending}
          onClose={onCloseComposerDialog}
          onSubmit={onCreateDirectChat}
        />
      )}
      {composerDialog === "group" && (
        <GroupChatDialog
          contacts={contactPickerItems}
          pending={createGroupPending}
          onClose={onCloseComposerDialog}
          onSubmit={onCreateGroupChat}
        />
      )}
      {composerDialog === "qr" && (
        <InviteQrDialog
          creating={createInviteQrPending}
          error={inviteQrError}
          loading={inviteQrLoading}
          qrs={inviteQrs}
          onClose={onCloseComposerDialog}
          onCreate={onCreateInviteQr}
        />
      )}
    </>
  );
}
