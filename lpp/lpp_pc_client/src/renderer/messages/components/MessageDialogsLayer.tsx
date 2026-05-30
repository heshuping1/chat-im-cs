import type {
  ConversationListItem,
  FriendInviteQrDto,
  MessageItemDto,
} from "../../data/api-client";
import type { CurrentUserIdentity } from "../../data/message-display";
import { resendConfirmPreview } from "../../data/message/message-retry-model";
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
  resendMessage,
  userIdentity,
  onCloseComposerDialog,
  onCloseForward,
  onCloseResend,
  onCreateDirectChat,
  onCreateGroupChat,
  onCreateInviteQr,
  onForward,
  onResend,
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
  resendMessage?: MessageItemDto | null;
  userIdentity?: CurrentUserIdentity | null;
  onCloseComposerDialog: () => void;
  onCloseForward: () => void;
  onCloseResend: () => void;
  onCreateDirectChat: (userId: string) => void;
  onCreateGroupChat: (payload: { name: string; memberUserIds: string[] }) => void;
  onCreateInviteQr: () => void;
  onForward: (targetConversationId: string) => void;
  onResend: () => void;
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
      {resendMessage && (
        <MessageResendConfirmDialog
          message={resendMessage}
          onClose={onCloseResend}
          onResend={onResend}
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

function MessageResendConfirmDialog({
  message,
  onClose,
  onResend,
}: {
  message: MessageItemDto;
  onClose: () => void;
  onResend: () => void;
}) {
  return (
    <div className="pc-modal-backdrop resend" role="presentation" onClick={onClose}>
      <section
        aria-label="重发消息确认"
        aria-modal="true"
        className="pc-resend-confirm-dialog"
        role="dialog"
        onClick={(event) => event.stopPropagation()}
      >
        <h3>重发该消息?</h3>
        <p>{resendConfirmPreview(message)}</p>
        <footer>
          <button type="button" onClick={onClose}>取消</button>
          <button className="primary" type="button" onClick={onResend}>
            重新发送
          </button>
        </footer>
      </section>
    </div>
  );
}
