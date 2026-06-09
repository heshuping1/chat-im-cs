import type {
  ConversationListItem,
  FriendInviteQrDto,
  MessageItemDto,
} from "../../data/api-client";
import type { CurrentUserIdentity } from "../../data/message-display";
import {
  failedMessageRetryAction,
  sendFailurePresentation,
} from "../../data/message/message-retry-model";
import { useI18n } from "../../i18n/useI18n";
import { ForwardDialog } from "./ForwardDialog";
import { InviteQrDialog } from "./InviteQrDialog";
import {
  DirectChatDialog,
  ContactCardDialog,
  GroupChatDialog,
  type ContactPickerItem,
} from "./MessageStartDialogs";
import type { GroupConversationAvatar } from "../models/groupAvatarTypes";
import type { CreateGroupChatPayload } from "../models/groupCreateModel";

type ComposerDialogKind = "direct" | "group" | "qr" | "card" | null;
type Translate = ReturnType<typeof useI18n>["t"];

export function MessageDialogsLayer({
  activeConversationId,
  composerDialog,
  contactPickerItems,
  groupLockedContacts,
  conversations,
  createDirectPending,
  createGroupPending,
  createInviteQrPending,
  sendContactCardPending,
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
  onSendContactCard,
  onForward,
  onResend,
  resolveConversationAvatar,
  resolveConversationType,
  resolveMessagePreview,
}: {
  activeConversationId: string;
  composerDialog: ComposerDialogKind;
  contactPickerItems: ContactPickerItem[];
  groupLockedContacts?: ContactPickerItem[];
  conversations: ConversationListItem[];
  createDirectPending: boolean;
  createGroupPending: boolean;
  createInviteQrPending: boolean;
  sendContactCardPending: boolean;
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
  onCreateGroupChat: (payload: CreateGroupChatPayload) => void;
  onCreateInviteQr: () => void;
  onSendContactCard: (contact: ContactPickerItem) => Promise<void> | void;
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
          lockedContacts={groupLockedContacts}
          pending={createGroupPending}
          onClose={onCloseComposerDialog}
          onSubmit={onCreateGroupChat}
        />
      )}
      {composerDialog === "card" && (
        <ContactCardDialog
          contacts={contactPickerItems}
          pending={sendContactCardPending}
          onClose={onCloseComposerDialog}
          onSubmit={onSendContactCard}
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
  const { t } = useI18n();

  return (
    <div className="pc-modal-backdrop resend" role="presentation" onClick={onClose}>
      <section
        aria-label={t("messages.resendDialog.aria")}
        aria-modal="true"
        className="pc-resend-confirm-dialog"
        role="dialog"
        onClick={(event) => event.stopPropagation()}
      >
        <h3>{t("messages.resendDialog.title")}</h3>
        <p>{resendConfirmPreviewText(message, t)}</p>
        <footer>
          <button type="button" onClick={onClose}>
            {t("common.cancel")}
          </button>
          <button className="primary" type="button" onClick={onResend}>
            {t("messages.resendDialog.resend")}
          </button>
        </footer>
      </section>
    </div>
  );
}

function resendConfirmPreviewText(message: MessageItemDto, t: Translate) {
  const failure = sendFailurePresentation(localErrorFromMessage(message));
  if (failure.kind === "blocked") return t("messages.resendDialog.blocked");

  const action = failedMessageRetryAction(message);
  if (!action) return t("messages.resendDialog.unavailable");
  if (action.type === "text") return action.content;
  if (action.type === "contact_card") return t("messages.resendDialog.contactCardPreview");
  return t("messages.resendDialog.uploadPreview");
}

function localErrorFromMessage(message: MessageItemDto) {
  const value = (message as unknown as Record<string, unknown>).localError;
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}
