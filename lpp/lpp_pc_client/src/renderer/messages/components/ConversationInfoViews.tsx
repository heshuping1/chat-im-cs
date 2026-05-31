import { ChevronLeft, X } from "lucide-react";
import { useState } from "react";

import { PcAvatar } from "../../components/PcAvatar";
import type {
  ConversationListItem,
  CustomerProfileCard,
  GroupMemberDto,
  UserProfileDto,
} from "../../data/api-client";
import type { CurrentUserIdentity } from "../../data/message-display";
import type { ContactItem } from "../../data/types";
import type { AvatarProfilePopoverState } from "../models/messageDisplayModel";
import type {
  ContactCardRelation,
  NormalizedContactCard,
} from "../models/contactCardModel";
import { resolveGroupConversationAvatar } from "../models/groupAvatarModel";
import { ConversationInfoPanel } from "./ConversationInfoPanel";

export function StandaloneConversationInfoView({
  contact,
  conversation,
  groupAvatarSnapshot,
  groupMembers,
  loadingGroupMembers,
  onUpdateRemark,
  onUpdateTags,
  onBack,
  profile,
  profileActionPending = false,
  profileError,
  profileLoading = false,
  userIdentity,
}: {
  contact?: ContactItem | null;
  conversation?: ConversationListItem;
  groupAvatarSnapshot?: string;
  groupMembers: GroupMemberDto[];
  loadingGroupMembers: boolean;
  onUpdateRemark?: (remarkName: string) => Promise<void> | void;
  onUpdateTags?: (tags: string[]) => Promise<void> | void;
  onBack: () => void;
  profile?: CustomerProfileCard;
  profileActionPending?: boolean;
  profileError?: unknown;
  profileLoading?: boolean;
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
        onUpdateRemark={onUpdateRemark}
        onUpdateTags={onUpdateTags}
        profile={profile}
        profileActionPending={profileActionPending}
        profileError={profileError}
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

function InfoRow({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <span>{label}</span>
      <strong>{value || "--"}</strong>
    </div>
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
  card: NormalizedContactCard;
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
  const [requestMessage, setRequestMessage] = useState("你好，我想添加你为好友");
  const title = profile?.displayName || card.displayName;
  const subtitle = profile?.lppId || card.subtitle || "个人名片";
  return (
    <div className="pc-modal-backdrop contact-card-profile-backdrop" role="presentation" onClick={onClose}>
      <section
        aria-label="名片资料"
        aria-modal="true"
        className="contact-card-profile-dialog"
        role="dialog"
        onClick={(event) => event.stopPropagation()}
      >
        <button
          className="contact-card-profile-close"
          type="button"
          aria-label="关闭名片资料"
          onClick={onClose}
        >
          <X size={15} />
        </button>
        <header>
          <PcAvatar
            avatarUrl={profile?.avatarUrl ?? card.avatarUrl}
            className="contact-card-profile-avatar"
            name={title}
          />
          <div>
            <strong>{title}</strong>
            <span>{subtitle}</span>
          </div>
        </header>
        <div className="contact-card-profile-rows">
          <InfoRow label="账号" value={profile?.lppId || card.userId} />
          <InfoRow label="手机" value={profile?.mobile || card.mobile || "--"} />
          <InfoRow label="邮箱" value={profile?.email || card.email || "--"} />
          {profile?.signature && <InfoRow label="签名" value={profile.signature} />}
        </div>
        {profileLoading && <p className="contact-card-profile-hint">正在读取资料...</p>}
        {!profileLoading && Boolean(profileError) && (
          <p className="contact-card-profile-hint">对方资料受隐私保护，已显示名片基础信息。</p>
        )}
        {relation.status === "none" && (
          <label className="contact-card-profile-request">
            <span>验证信息</span>
            <textarea
              value={requestMessage}
              maxLength={120}
              onChange={(event) => setRequestMessage(event.target.value)}
            />
          </label>
        )}
        <footer>
          {relation.status === "self" && (
            <button type="button" disabled>这是你自己</button>
          )}
          {relation.status === "friend" && (
            <>
              <button className="primary" type="button" disabled={actionPending} onClick={onStartChat}>
                发消息
              </button>
              <button type="button" disabled={actionPending} onClick={onDeleteFriend}>
                删除好友
              </button>
              <button className="danger" type="button" disabled={actionPending} onClick={onBlock}>
                加入黑名单
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
              添加到通讯录
            </button>
          )}
          {relation.status === "outgoingPending" && (
            <button type="button" disabled>好友申请已发送</button>
          )}
          {relation.status === "incomingPending" && (
            <>
              <button type="button" disabled={actionPending} onClick={onReject}>
                拒绝
              </button>
              <button className="primary" type="button" disabled={actionPending} onClick={onAccept}>
                通过
              </button>
            </>
          )}
        </footer>
      </section>
    </div>
  );
}
