import { ChevronLeft, X } from "lucide-react";

import { PcAvatar } from "../../components/PcAvatar";
import type { ConversationListItem, GroupMemberDto } from "../../data/api-client";
import type { CurrentUserIdentity } from "../../data/message-display";
import type { ContactItem } from "../../data/types";
import type { AvatarProfilePopoverState } from "../models/messageDisplayModel";
import { resolveGroupConversationAvatar } from "../models/groupAvatarModel";
import { ConversationInfoPanel } from "./ConversationInfoPanel";

export function StandaloneConversationInfoView({
  contact,
  conversation,
  groupAvatarSnapshot,
  groupMembers,
  loadingGroupMembers,
  onBack,
  userIdentity,
}: {
  contact?: ContactItem | null;
  conversation?: ConversationListItem;
  groupAvatarSnapshot?: string;
  groupMembers: GroupMemberDto[];
  loadingGroupMembers: boolean;
  onBack: () => void;
  userIdentity?: CurrentUserIdentity | null;
}) {
  return (
    <section className="message-info-standalone">
      <header className="message-info-standalone-head">
        <button type="button" onClick={onBack} aria-label="返回聊天">
          <ChevronLeft size={20} />
          <span>返回聊天</span>
        </button>
        <strong>客户信息</strong>
      </header>
      <ConversationInfoPanel
        contact={contact}
        conversation={conversation}
        groupAvatar={
          conversation
            ? resolveGroupConversationAvatar(conversation, groupMembers, groupAvatarSnapshot)
            : undefined
        }
        groupMembers={groupMembers}
        loadingGroupMembers={loadingGroupMembers}
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
  return (
    <aside
      className="pc-avatar-profile-popover"
      style={{ left: profile.x, top: profile.y }}
      role="dialog"
      aria-label="头像资料"
      onClick={(event) => event.stopPropagation()}
    >
      <button
        className="pc-avatar-profile-close"
        type="button"
        aria-label="关闭头像资料"
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
    </aside>
  );
}
