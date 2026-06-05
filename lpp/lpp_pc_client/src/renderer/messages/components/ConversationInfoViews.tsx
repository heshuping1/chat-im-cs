import { ChevronLeft, X } from "lucide-react";
import { useState } from "react";

import { PcAvatar } from "../../components/PcAvatar";
import type {
  ConversationListItem,
  CustomerProfileCard,
  FriendProfileExtraDto,
  GroupMemberDto,
  UserProfileDto,
} from "../../data/api-client";
import type { CurrentUserIdentity } from "../../data/message-display";
import type { ContactItem } from "../../data/types";
import { useI18n } from "../../i18n/useI18n";
import {
  buildContactCardProfilePopover,
  type AvatarProfilePopoverState,
} from "../models/messageDisplayModel";
import type { MessageGroupManagement } from "../hooks/useMessageGroupManagement";
import type {
  AnchoredContactCardProfile,
  ContactCardRelation,
} from "../models/contactCardModel";
import { resolveGroupConversationAvatar } from "../models/groupAvatarModel";
import { ConversationInfoPanel } from "./ConversationInfoPanel";
import type { ContactPickerItem } from "./MessageStartDialogs";

export function StandaloneConversationInfoView({
  avatarUrl,
  contact,
  contactPickerItems = [],
  conversation,
  groupAvatarSnapshot,
  groupManagement,
  groupMembers,
  loadingGroupMembers,
  onUpdateRemark,
  onUpdateTags,
  onBack,
  profile,
  profileActionPending = false,
  profileError,
  profileExtra,
  profileExtraLoading = false,
  profileLoading = false,
  userIdentity,
}: {
  avatarUrl?: string | null;
  contact?: ContactItem | null;
  contactPickerItems?: ContactPickerItem[];
  conversation?: ConversationListItem;
  groupAvatarSnapshot?: string;
  groupManagement?: MessageGroupManagement;
  groupMembers: GroupMemberDto[];
  loadingGroupMembers: boolean;
  onUpdateRemark?: (remarkName: string) => Promise<void> | void;
  onUpdateTags?: (tags: string[]) => Promise<void> | void;
  onBack: () => void;
  profile?: CustomerProfileCard;
  profileActionPending?: boolean;
  profileError?: unknown;
  profileExtra?: FriendProfileExtraDto;
  profileExtraLoading?: boolean;
  profileLoading?: boolean;
  userIdentity?: CurrentUserIdentity | null;
}) {
  const { t } = useI18n();

  return (
    <section className="message-info-standalone">
      <header className="message-info-standalone-head">
        <button
          type="button"
          onClick={onBack}
          aria-label={t("messages.conversationViews.backToChat")}
        >
          <ChevronLeft size={20} />
          <span>{t("messages.conversationViews.backToChat")}</span>
        </button>
        <strong>{t("messages.conversationViews.customerInfo")}</strong>
      </header>
      <ConversationInfoPanel
        avatarUrl={avatarUrl}
        contact={contact}
        contactPickerItems={contactPickerItems}
        conversation={conversation}
        groupAvatar={
          conversation
            ? resolveGroupConversationAvatar(conversation, groupMembers, groupAvatarSnapshot)
            : undefined
        }
        groupMembers={groupMembers}
        groupManagement={groupManagement}
        loadingGroupMembers={loadingGroupMembers}
        onUpdateRemark={onUpdateRemark}
        onUpdateTags={onUpdateTags}
        profile={profile}
        profileActionPending={profileActionPending}
        profileError={profileError}
        profileExtra={profileExtra}
        profileExtraLoading={profileExtraLoading}
        profileLoading={profileLoading}
        userIdentity={userIdentity}
      />
    </section>
  );
}

export function AvatarProfilePopover({
  onClose,
  profile,
}: {
  onClose: () => void;
  profile: AvatarProfilePopoverState;
}) {
  const { t } = useI18n();

  return (
    <aside
      className="pc-avatar-profile-popover"
      style={{ left: profile.x, top: profile.y }}
      role="dialog"
      aria-label={t("messages.conversationViews.avatarProfile")}
      onClick={(event) => event.stopPropagation()}
    >
      <button
        className="pc-avatar-profile-close"
        type="button"
        aria-label={t("messages.conversationViews.closeAvatarProfile")}
        onClick={onClose}
      >
        <X size={14} />
      </button>
      <div className="pc-avatar-profile-head">
        <PcAvatar
          avatarUrl={profile.avatarUrl}
          className="pc-avatar-profile-image"
          name={profile.title}
        />
        <div>
          <strong>{profile.title}</strong>
          <span>{profile.subtitle}</span>
        </div>
      </div>
      <div className="pc-avatar-profile-rows">
        {profile.rows.map((row) => (
          <div key={row.label}>
            <span>{row.label}</span>
            <strong>{row.value || "--"}</strong>
          </div>
        ))}
      </div>
      {profile.tags && profile.tags.length > 0 && (
        <div className="pc-avatar-profile-tags" aria-label={t("messages.conversationViews.tags")}>
          {profile.tags.map((tag) => (
            <span key={tag}>{tag}</span>
          ))}
        </div>
      )}
    </aside>
  );
}

export function ContactCardProfileDialog({
  actionPending = false,
  card,
  onAccept,
  onBlock,
  onClose,
  onDeleteFriend,
  onReject,
  onSendRequest,
  onStartChat,
  profile,
  profileError,
  profileLoading = false,
  relation,
}: {
  actionPending?: boolean;
  card: AnchoredContactCardProfile;
  onAccept: () => void;
  onBlock: () => void;
  onClose: () => void;
  onDeleteFriend: () => void;
  onReject: () => void;
  onSendRequest: (message: string) => void;
  onStartChat: () => void;
  profile?: UserProfileDto;
  profileError?: unknown;
  profileLoading?: boolean;
  relation: ContactCardRelation;
}) {
  const { t } = useI18n();
  const [requestMessage, setRequestMessage] = useState(() =>
    t("messages.conversationViews.defaultFriendRequest"),
  );
  const cardProfile = buildContactCardProfilePopover({
    profile,
    value: card as unknown as Record<string, unknown>,
    x: card.x,
    y: card.y,
  });
  const title = cardProfile.title;

  return (
    <aside
      aria-label={t("messages.conversationViews.contactCardProfile")}
      className="pc-avatar-profile-popover contact-card-profile-dialog"
      role="dialog"
      style={{ left: cardProfile.x, top: cardProfile.y }}
      onClick={(event) => event.stopPropagation()}
    >
      <button
        className="contact-card-profile-close"
        type="button"
        aria-label={t("messages.conversationViews.closeContactCardProfile")}
        onClick={onClose}
      >
        <X size={15} />
      </button>
      <header className="pc-avatar-profile-head">
        <PcAvatar
          avatarUrl={cardProfile.avatarUrl}
          className="pc-avatar-profile-image"
          name={title}
        />
        <div>
          <strong>{title}</strong>
          <span>{cardProfile.subtitle}</span>
        </div>
      </header>
      <div className="pc-avatar-profile-rows contact-card-profile-rows">
        {cardProfile.rows.map((row) => (
          <div key={row.label}>
            <span>{row.label}</span>
            <strong>{row.value || "--"}</strong>
          </div>
        ))}
      </div>
      {profileLoading && (
        <p className="contact-card-profile-hint">{t("messages.conversationViews.loadingProfile")}</p>
      )}
      {!profileLoading && Boolean(profileError) && (
        <p className="contact-card-profile-hint">
          {t("messages.conversationViews.profilePrivacyHint")}
        </p>
      )}
      {relation.status === "none" && (
        <label className="contact-card-profile-request">
          <span>{t("messages.conversationViews.verificationMessage")}</span>
          <textarea
            value={requestMessage}
            maxLength={120}
            onChange={(event) => setRequestMessage(event.target.value)}
          />
        </label>
      )}
      <footer>
        {relation.status === "self" && (
          <button type="button" disabled>
            {t("messages.conversationViews.self")}
          </button>
        )}
        {relation.status === "friend" && (
          <>
            <button className="primary" type="button" disabled={actionPending} onClick={onStartChat}>
              {t("messages.conversationViews.sendMessage")}
            </button>
            <button type="button" disabled={actionPending} onClick={onDeleteFriend}>
              {t("messages.conversationViews.deleteFriend")}
            </button>
            <button className="danger" type="button" disabled={actionPending} onClick={onBlock}>
              {t("messages.conversationViews.block")}
            </button>
          </>
        )}
        {relation.status === "none" && (
          <button
            className="primary"
            type="button"
            disabled={actionPending}
            onClick={() => onSendRequest(requestMessage)}
          >
            {t("messages.conversationViews.addToContacts")}
          </button>
        )}
        {relation.status === "outgoingPending" && (
          <button type="button" disabled>
            {t("messages.conversationViews.requestSent")}
          </button>
        )}
        {relation.status === "incomingPending" && (
          <>
            <button type="button" disabled={actionPending} onClick={onReject}>
              {t("messages.conversationViews.reject")}
            </button>
            <button className="primary" type="button" disabled={actionPending} onClick={onAccept}>
              {t("messages.conversationViews.accept")}
            </button>
          </>
        )}
      </footer>
    </aside>
  );
}
