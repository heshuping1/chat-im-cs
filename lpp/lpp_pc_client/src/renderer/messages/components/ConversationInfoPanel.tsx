import {
  BellOff,
  Check,
  Crown,
  FileText,
  FolderOpen,
  Info,
  LogOut,
  Megaphone,
  Pin,
  Search,
  Settings,
  Shield,
  ShieldOff,
  Trash2,
  UserMinus,
  UserPlus,
  UsersRound,
  VolumeX,
} from "lucide-react";
import { useEffect, useMemo, useState, type DragEvent, type ReactNode } from "react";

import { CustomerProfileWorkspace } from "../../components/CustomerProfileWorkspace";
import { PanelState } from "../../components/PanelState";
import { PcAvatar } from "../../components/PcAvatar";
import type {
  ConversationListItem,
  CustomerProfileCard,
  FriendProfileExtraDto,
  GroupAnnouncementDto,
  GroupMemberDto,
  GroupSettingsDto,
} from "../../data/api-client";
import { imConversationEffectiveUnreadCount } from "../../data/im-read/im-conversation-read-view";
import type { CurrentUserIdentity } from "../../data/message-display";
import type { ContactItem } from "../../data/types";
import type { TranslationParams } from "../../i18n/dictionary";
import { useI18n } from "../../i18n/useI18n";
import { formatChatTime } from "../../lib/format";
import { renderWechatEmojiText } from "../../lib/wechatEmoji";
import type { MessageGroupManagement } from "../hooks/useMessageGroupManagement";
import {
  canManageGroupMember,
  groupMemberDisplayName,
  groupMemberRoleRank,
  normalizeGroupRole,
  visibleGroupInfoTabs,
  type GroupInfoTabKey,
} from "../models/groupManagementModel";
import type { GroupConversationAvatar } from "../models/groupAvatarTypes";
import { requestMessageCustomConfirmation } from "../runtime/messageConfirm";
import { ConversationAvatar } from "./ConversationListParts";

type Translate = (key: string, params?: TranslationParams) => string;
type ContactPickerItem = {
  avatarUrl?: string | null;
  id: string;
  name: string;
  source: string;
  subtitle: string;
};

export function ConversationInfoPanel({
  avatarUrl,
  contact,
  contactPickerItems = [],
  conversation,
  groupAvatar,
  groupManagement,
  groupMembers,
  headerActions,
  loadingGroupMembers = false,
  onUpdateRemark,
  onUpdateTags,
  onDragOver,
  onDrop,
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
  groupAvatar?: GroupConversationAvatar;
  groupManagement?: MessageGroupManagement;
  groupMembers?: GroupMemberDto[];
  headerActions?: ReactNode;
  loadingGroupMembers?: boolean;
  onUpdateRemark?: (remarkName: string) => Promise<void> | void;
  onUpdateTags?: (tags: string[]) => Promise<void> | void;
  onDragOver?: (event: DragEvent<HTMLElement>) => void;
  onDrop?: (event: DragEvent<HTMLElement>) => void;
  profile?: CustomerProfileCard;
  profileActionPending?: boolean;
  profileError?: unknown;
  profileExtra?: FriendProfileExtraDto;
  profileExtraLoading?: boolean;
  profileLoading?: boolean;
  userIdentity?: CurrentUserIdentity | null;
}) {
  const { t } = useI18n();
  const [activeTab, setActiveTab] = useState<GroupInfoTabKey>("profile");
  const [expanded, setExpanded] = useState(true);

  useEffect(() => {
    setActiveTab("profile");
  }, [conversation?.conversationId]);

  if (!conversation) {
    return (
      <aside className="e-profile-panel message-info-panel">
        <header className="customer-info-head">
          <h2>{t("messages.conversationInfo.title")}</h2>
        </header>
        <PanelState text={t("messages.conversationInfo.empty")} />
      </aside>
    );
  }

  const isGroup = conversation.conversationType === "group";
  if (!isGroup) {
    return (
      <CustomerProfileWorkspace
        className="e-profile-panel message-info-panel"
        avatarUrl={avatarUrl}
        contact={contact}
        conversation={conversation}
        errorMode="silent"
        error={profileError}
        headerActions={headerActions}
        loading={profileLoading || profileExtraLoading}
        onUpdateRemark={onUpdateRemark}
        onUpdateTags={onUpdateTags}
        onDragOver={onDragOver}
        onDrop={onDrop}
        profile={profile}
        profileActionPending={profileActionPending}
        profileExtra={profileExtra}
        title={t("customerProfile.title")}
        variant="im"
      />
    );
  }

  const members = groupMembers ?? [];
  const role = groupManagement?.role ?? normalizeGroupRole(conversation.myRole);
  const visibleTabs = visibleGroupInfoTabs({
    role,
    settings: groupManagement?.settings ?? groupManagement?.detail?.settings,
  });
  const unread = imConversationEffectiveUnreadCount(conversation, userIdentity, {
    activeConversationId: conversation.conversationId,
    visibility: "paneVisible",
  });

  const safeActiveTab = visibleTabs.includes(activeTab) ? activeTab : "profile";

  return (
    <aside
      className="e-profile-panel customer-info-panel message-info-panel"
      onDragOver={onDragOver}
      onDrop={onDrop}
    >
      <header className="customer-info-head">
        <h2>{t("messages.conversationInfo.groupProfileTitle")}</h2>
        {headerActions && <div className="customer-info-head-actions">{headerActions}</div>}
      </header>
      <section className="customer-info-card">
        <div className="group-profile-hero">
          <div className="customer-info-identity group-profile-identity">
            <ConversationAvatar
              avatarUrl={avatarUrl ?? conversation.avatarUrl}
              groupAvatar={groupAvatar}
              isGroup
              title={conversation.title}
              unread={unread}
            />
            <div>
              <strong>{groupManagement?.detail?.title || conversation.title}</strong>
              <p>
                <span>{t("messages.conversationInfo.groupChat")}</span>
                <span>{groupRoleText(role, t)}</span>
                {unread > 0 && <span>{t("messages.conversationInfo.unreadCount", { count: unread })}</span>}
              </p>
            </div>
          </div>
          <div className="group-profile-stats">
            <GroupStat label={t("messages.conversationInfo.fields.members")} value={groupMemberCountText(conversation, groupManagement, members)} />
            <GroupStat label={t("messages.conversationInfo.fields.myRole")} value={groupRoleText(role, t)} />
            <GroupStat label={t("messages.conversationInfo.fields.unread")} value={String(unread)} />
          </div>
        </div>
        <nav className="customer-info-tabs group-info-tabs" aria-label={t("messages.conversationInfo.tabsAria")}>
          {visibleTabs.map((tab) => (
            <button
              className={safeActiveTab === tab ? "active" : ""}
              type="button"
              key={tab}
              onClick={() => setActiveTab(tab)}
            >
              <GroupTabIcon tab={tab} />
              {t(`messages.conversationInfo.tabs.${tab}`)}
            </button>
          ))}
        </nav>
        <GroupInfoTabContent
          contactPickerItems={contactPickerItems}
          conversation={conversation}
          expanded={expanded}
          groupManagement={groupManagement}
          loadingGroupMembers={loadingGroupMembers}
          members={members}
          role={role}
          tab={safeActiveTab}
          t={t}
          unread={unread}
        />
      </section>
      {safeActiveTab === "profile" && (
        <button
          className="message-info-collapse"
          type="button"
          onClick={() => setExpanded((value) => !value)}
        >
          {expanded
            ? t("messages.conversationInfo.collapse")
            : t("messages.conversationInfo.expand")}
        </button>
      )}
    </aside>
  );
}

function GroupInfoTabContent({
  contactPickerItems,
  conversation,
  expanded,
  groupManagement,
  loadingGroupMembers,
  members,
  role,
  tab,
  t,
  unread,
}: {
  contactPickerItems: ContactPickerItem[];
  conversation: ConversationListItem;
  expanded: boolean;
  groupManagement?: MessageGroupManagement;
  loadingGroupMembers: boolean;
  members: GroupMemberDto[];
  role: "owner" | "admin" | "member";
  tab: GroupInfoTabKey;
  t: Translate;
  unread: number;
}) {
  if (tab === "members") {
    return (
      <GroupMembersTab
        contactPickerItems={contactPickerItems}
        groupManagement={groupManagement}
        loading={loadingGroupMembers}
        members={members}
        t={t}
      />
    );
  }
  if (tab === "announcements") {
    return <GroupAnnouncementsTab groupManagement={groupManagement} t={t} />;
  }
  if (tab === "files") {
    return <GroupFilesTab groupManagement={groupManagement} t={t} />;
  }
  if (tab === "management") {
    return <GroupManagementTab conversation={conversation} groupManagement={groupManagement} t={t} />;
  }
  return (
    <>
      <GroupSummaryRows
        conversation={conversation}
        groupManagement={groupManagement}
        members={members}
        role={role}
        t={t}
        unread={unread}
      />
      {expanded && (
        <section className="customer-info-block group-info-overview">
          <h3>{t("messages.conversationInfo.overview")}</h3>
          <div className="customer-info-rows">
            <InfoRow
              label={t("messages.conversationInfo.fields.pinned")}
              value={conversation.isPinned ? t("messages.conversationInfo.pinned") : "--"}
            />
            <InfoRow label={t("messages.conversationInfo.fields.unread")} value={String(unread)} />
            <InfoRow
              label={t("messages.conversationInfo.fields.lastTime")}
              value={formatChatTime(conversation.lastMessage?.sentAt)}
            />
          </div>
        </section>
      )}
    </>
  );
}

function GroupSummaryRows({
  conversation,
  groupManagement,
  members,
  role,
  t,
  unread,
}: {
  conversation: ConversationListItem;
  groupManagement?: MessageGroupManagement;
  members: GroupMemberDto[];
  role: "owner" | "admin" | "member";
  t: Translate;
  unread: number;
}) {
  const ownerName =
    groupManagement?.detail?.ownerDisplayName ||
    conversation.ownerDisplayName ||
    groupMemberDisplayName(members.find((member) => groupMemberRoleRank(member) === 0));
  const adminNames = members
    .filter((member) => groupMemberRoleRank(member) === 1)
    .map(groupMemberDisplayName)
    .filter(Boolean);
  return (
    <>
      <div className="customer-info-rows">
        <InfoRow
          label={t("messages.conversationInfo.fields.conversationType")}
          value={t("messages.conversationInfo.groupChat")}
        />
        <InfoRow
          label={t("messages.conversationInfo.fields.members")}
          value={String(groupManagement?.detail?.memberCount ?? conversation.memberCount ?? (members.length || "--"))}
        />
        <InfoRow label={t("messages.conversationInfo.fields.owner")} value={ownerName || "--"} />
        <InfoRow
          label={t("messages.conversationInfo.fields.admins")}
          value={adminNames.length > 0 ? compactNames(adminNames, t) : "--"}
        />
        <InfoRow label={t("messages.conversationInfo.fields.myRole")} value={groupRoleText(role, t)} />
        <InfoRow
          label={t("messages.conversationInfo.fields.muted")}
          value={conversation.isMuted ? t("messages.conversationInfo.enabled") : t("messages.conversationInfo.disabled")}
        />
        <InfoRow label={t("messages.conversationInfo.fields.unread")} value={String(unread)} />
        <InfoRow
          label={t("messages.conversationInfo.fields.latestMessage")}
          value={renderWechatEmojiText(conversation.lastMessage?.preview || "--")}
        />
      </div>
      <div className="customer-info-tags">
        <span>{t("messages.conversationInfo.groupChat")}</span>
        <span>{groupRoleText(role, t)}</span>
        {groupManagement?.detail?.muteMode === "all_muted" || groupManagement?.detail?.muteMode === 1 ? (
          <span>{t("messages.conversationInfo.allMuted")}</span>
        ) : null}
      </div>
    </>
  );
}

function GroupMembersTab({
  contactPickerItems,
  groupManagement,
  loading,
  members,
  t,
}: {
  contactPickerItems: ContactPickerItem[];
  groupManagement?: MessageGroupManagement;
  loading: boolean;
  members: GroupMemberDto[];
  t: Translate;
}) {
  const [keyword, setKeyword] = useState("");
  const [inviteContactKeyword, setInviteContactKeyword] = useState("");
  const [inviteIds, setInviteIds] = useState("");
  const [selectedInviteIds, setSelectedInviteIds] = useState<Set<string>>(() => new Set());
  const role = groupManagement?.role ?? "member";
  const existingMemberIds = useMemo(() => groupMemberInviteIdSet(members), [members]);
  const visibleMembers = useMemo(() => {
    const normalized = keyword.trim().toLowerCase();
    const sorted = [...members].sort((left, right) => groupMemberRoleRank(left) - groupMemberRoleRank(right));
    if (!normalized) return sorted;
    return sorted.filter((member) =>
      [groupMemberDisplayName(member), member.groupNickname, member.nickname, member.displayName, member.lppId, member.userId].some((value) =>
        `${value ?? ""}`.toLowerCase().includes(normalized),
      ),
    );
  }, [keyword, members]);
  const inviteCandidates = useMemo(() => {
    return groupInviteCandidateItems({
      contacts: contactPickerItems,
      excludedIds: existingMemberIds,
      keyword: inviteContactKeyword,
    });
  }, [contactPickerItems, existingMemberIds, inviteContactKeyword]);
  const inviteTargetIds = useMemo(
    () => uniqueGroupInviteIds([...parseGroupInviteIds(inviteIds), ...selectedInviteIds], existingMemberIds),
    [existingMemberIds, inviteIds, selectedInviteIds],
  );
  const submitInvite = () => {
    const ids = inviteTargetIds;
    if (ids.length === 0) return;
    groupManagement?.actions.addMembers(ids);
    setInviteIds("");
    setInviteContactKeyword("");
    setSelectedInviteIds(new Set());
  };
  const toggleInviteContact = (id: string) => {
    setSelectedInviteIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };
  return (
    <div className="group-management-pane">
      <label className="group-management-search">
        <span>{t("messages.conversationInfo.searchMembers")}</span>
        <input
          value={keyword}
          onChange={(event) => setKeyword(event.target.value)}
          placeholder={t("messages.conversationInfo.memberSearchPlaceholder")}
        />
      </label>
      {groupManagement?.permissions.canManageMembers && (
        <div className="group-invite-box">
          <div className="group-management-inline-form">
            <input
              value={inviteIds}
              onChange={(event) => setInviteIds(event.target.value)}
              placeholder={t("messages.conversationInfo.invitePlaceholder")}
            />
            <button type="button" disabled={inviteTargetIds.length === 0} onClick={submitInvite}>
              <UserPlus size={14} />
              {inviteTargetIds.length > 0
                ? t("messages.conversationInfo.inviteCount", { count: inviteTargetIds.length })
                : t("messages.conversationInfo.invite")}
            </button>
          </div>
          {contactPickerItems.length > 0 && (
            <section className="group-invite-picker">
              <label className="e-search compact">
                <Search size={14} />
                <input
                  value={inviteContactKeyword}
                  onChange={(event) => setInviteContactKeyword(event.target.value)}
                  placeholder={t("messages.conversationInfo.inviteContactSearchPlaceholder")}
                />
              </label>
              <div className="group-invite-picker-head">
                <strong>{t("messages.conversationInfo.inviteFromContacts")}</strong>
                <span>{t("messages.conversationInfo.inviteSelectedCount", { count: selectedInviteIds.size })}</span>
              </div>
              <div className="group-invite-contact-list">
                {inviteCandidates.map((item) => {
                  const selected = selectedInviteIds.has(item.id);
                  return (
                    <button
                      className={selected ? "selected" : ""}
                      type="button"
                      key={`${item.source}-${item.id}`}
                      onClick={() => toggleInviteContact(item.id)}
                    >
                      <PcAvatar avatarUrl={item.avatarUrl} className="e-avatar" name={item.name} />
                      <span>
                        <strong>{item.name}</strong>
                        <small>{item.subtitle}</small>
                      </span>
                      {selected && <Check size={14} />}
                    </button>
                  );
                })}
                {inviteCandidates.length === 0 && (
                  <PanelState text={t("messages.conversationInfo.emptyInviteContacts")} />
                )}
              </div>
            </section>
          )}
        </div>
      )}
      {loading && <PanelState text={t("messages.conversationInfo.loadingMembers")} />}
      {!loading && visibleMembers.length === 0 && <PanelState text={t("messages.conversationInfo.emptyMembers")} />}
      <div className="group-member-list">
        {visibleMembers.map((member) => (
          <GroupMemberRow
            actorRole={role}
            groupManagement={groupManagement}
            key={member.userId}
            member={member}
            t={t}
          />
        ))}
      </div>
    </div>
  );
}

function GroupMemberRow({
  actorRole,
  groupManagement,
  member,
  t,
}: {
  actorRole: "owner" | "admin" | "member";
  groupManagement?: MessageGroupManagement;
  member: GroupMemberDto;
  t: Translate;
}) {
  const targetRole = normalizeGroupRole(member.role ?? member.memberRole);
  const displayName = groupMemberDisplayName(member);
  const canRemove = canManageGroupMember({ actorRole, targetRole, action: "remove" });
  const canPromote = canManageGroupMember({ actorRole, targetRole, action: "promote" });
  const canDemote = canManageGroupMember({ actorRole, targetRole, action: "demote" });
  const canMute = canManageGroupMember({ actorRole, targetRole, action: "mute" });
  const canTransfer = canManageGroupMember({ actorRole, targetRole, action: "transfer" });
  return (
    <div className="group-member-row">
      <PcAvatar avatarUrl={member.avatarUrl} className="e-avatar" name={displayName} />
      <div>
        <strong>{displayName || t("messages.conversationInfo.memberFallback")}</strong>
        <span>
          {[groupRoleText(targetRole, t), member.isMuted ? t("messages.conversationInfo.memberMuted") : ""]
            .filter(Boolean)
            .join(" · ")}
        </span>
      </div>
      <div className="group-member-actions">
        {canPromote && (
          <button type="button" onClick={() => groupManagement?.actions.setMemberRole(member.userId, "admin")}>
            <Shield size={13} />
            {t("messages.conversationInfo.actions.promoteAdmin")}
          </button>
        )}
        {canDemote && (
          <button type="button" onClick={() => groupManagement?.actions.setMemberRole(member.userId, "member")}>
            <ShieldOff size={13} />
            {t("messages.conversationInfo.actions.demoteAdmin")}
          </button>
        )}
        {canMute && (
          <button type="button" onClick={() => groupManagement?.actions.setMemberMute(member.userId, !member.isMuted)}>
            <VolumeX size={13} />
            {member.isMuted
              ? t("messages.conversationInfo.actions.unmute")
              : t("messages.conversationInfo.actions.mute")}
          </button>
        )}
        {canTransfer && (
          <button
            type="button"
            onClick={() =>
              confirmDanger(
                t("messages.conversationInfo.confirm.transferOwner", {
                  name: displayName || t("messages.conversationInfo.thisMember"),
                }),
              ) &&
              groupManagement?.actions.transferOwner(member.userId)
            }
          >
            <Crown size={13} />
            {t("messages.conversationInfo.actions.transfer")}
          </button>
        )}
        {canRemove && (
          <button
            className="danger"
            type="button"
            onClick={() =>
              confirmDanger(
                t("messages.conversationInfo.confirm.removeMember", {
                  name: displayName || t("messages.conversationInfo.thisMember"),
                }),
              ) &&
              groupManagement?.actions.removeMember(member.userId)
            }
          >
            <UserMinus size={13} />
            {t("messages.conversationInfo.actions.remove")}
          </button>
        )}
      </div>
    </div>
  );
}

function GroupAnnouncementsTab({
  groupManagement,
  t,
}: {
  groupManagement?: MessageGroupManagement;
  t: Translate;
}) {
  const [content, setContent] = useState("");
  const canManage = Boolean(groupManagement?.permissions.canManageAnnouncements);
  const submit = () => {
    const trimmed = content.trim();
    if (!trimmed) return;
    groupManagement?.actions.createAnnouncement(trimmed);
    setContent("");
  };
  return (
    <div className="group-management-pane">
      {canManage && (
        <div className="group-management-compose">
          <textarea
            value={content}
            onChange={(event) => setContent(event.target.value)}
            placeholder={t("messages.conversationInfo.announcementPlaceholder")}
          />
          <button type="button" onClick={submit}>
            <Megaphone size={14} />
            {t("messages.conversationInfo.actions.publish")}
          </button>
        </div>
      )}
      {groupManagement?.announcements.length ? (
        groupManagement.announcements.map((item) => (
          <GroupAnnouncementItem
            canManage={canManage}
            groupManagement={groupManagement}
            item={item}
            key={item.announcementId}
            t={t}
          />
        ))
      ) : (
        <PanelState text={t("messages.conversationInfo.emptyAnnouncements")} />
      )}
    </div>
  );
}

function GroupAnnouncementItem({
  canManage,
  groupManagement,
  item,
  t,
}: {
  canManage: boolean;
  groupManagement?: MessageGroupManagement;
  item: GroupAnnouncementDto;
  t: Translate;
}) {
  const [editing, setEditing] = useState(false);
  const [content, setContent] = useState(item.content);
  return (
    <article className="group-announcement-item">
      <header>
        <strong>{item.title || t("messages.conversationInfo.announcementFallback")}</strong>
        {item.isPinned && <span>{t("messages.conversationInfo.pinned")}</span>}
      </header>
      {editing ? (
        <textarea value={content} onChange={(event) => setContent(event.target.value)} />
      ) : (
        <p>{item.content}</p>
      )}
      <footer>
        <span>{formatChatTime(item.updatedAt || item.createdAt)}</span>
        {canManage && (
          <>
            <button
              type="button"
              onClick={() => {
                if (editing) groupManagement?.actions.updateAnnouncement(item.announcementId, content, item.title ?? undefined);
                setEditing((value) => !value);
              }}
            >
              {editing ? t("common.save") : t("common.edit")}
            </button>
            <button
              className="danger"
              type="button"
              onClick={() =>
                confirmDanger(t("messages.conversationInfo.confirm.deleteAnnouncement")) &&
                groupManagement?.actions.deleteAnnouncement(item.announcementId)
              }
            >
              {t("common.delete")}
            </button>
          </>
        )}
      </footer>
    </article>
  );
}

function GroupFilesTab({
  groupManagement,
  t,
}: {
  groupManagement?: MessageGroupManagement;
  t: Translate;
}) {
  const files = groupManagement?.files ?? [];
  return (
    <div className="group-management-pane">
      <div className="group-file-filters">
        {(["all", "image", "video", "voice", "file"] as const).map((filter) => (
          <button
            className={groupManagement?.fileFilter === filter ? "active" : ""}
            type="button"
            key={filter}
            onClick={() => groupManagement?.actions.setFileFilter(filter)}
          >
            {groupFileFilterLabel(filter, t)}
          </button>
        ))}
      </div>
      {files.length === 0 && <PanelState text={t("messages.conversationInfo.emptyFiles")} />}
      {files.map((file) => (
        <a className="group-file-row" href={file.url} target="_blank" rel="noreferrer" key={file.mediaId}>
          <FileText size={16} />
          <span>{file.fileName || file.mediaKind}</span>
          <em>{formatFileSize(file.sizeBytes)}</em>
        </a>
      ))}
    </div>
  );
}

function GroupManagementTab({
  conversation,
  groupManagement,
  t,
}: {
  conversation: ConversationListItem;
  groupManagement?: MessageGroupManagement;
  t: Translate;
}) {
  const settings = groupManagement?.settings ?? {};
  const [title, setTitle] = useState(groupManagement?.detail?.title || conversation.title);
  useEffect(() => {
    setTitle(groupManagement?.detail?.title || conversation.title);
  }, [conversation.title, groupManagement?.detail?.title]);
  return (
    <div className="group-management-pane">
      <div className="group-management-inline-form">
        <input
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder={t("messages.conversationInfo.groupNamePlaceholder")}
        />
        <button
          type="button"
          disabled={!groupManagement?.permissions.canManageSettings || !title.trim()}
          title={
            groupManagement?.permissions.canManageSettings
              ? t("messages.conversationInfo.saveGroupName")
              : t("messages.conversationInfo.ownerAdminOnly")
          }
          onClick={() => groupManagement?.actions.updateGroupTitle(title.trim())}
        >
          {t("common.save")}
        </button>
      </div>
      <div className="group-management-actions">
        <ActionButton
          icon={<Pin size={14} />}
          label={
            conversation.isPinned
              ? t("messages.conversationInfo.actions.unpin")
              : t("messages.conversationInfo.actions.pin")
          }
          onClick={() => groupManagement?.actions.setPinned(!conversation.isPinned)}
        />
        <ActionButton
          icon={<BellOff size={14} />}
          label={
            conversation.isMuted
              ? t("messages.conversationInfo.actions.disableDnd")
              : t("messages.conversationInfo.actions.enableDnd")
          }
          onClick={() => groupManagement?.actions.setMuted(!conversation.isMuted)}
        />
        <ActionButton
          disabled={!groupManagement?.permissions.canManageSettings}
          icon={<VolumeX size={14} />}
          label={
            isAllMuted(groupManagement)
              ? t("messages.conversationInfo.actions.disableAllMute")
              : t("messages.conversationInfo.actions.enableAllMute")
          }
          onClick={() => groupManagement?.actions.setMuteMode(!isAllMuted(groupManagement))}
        />
      </div>
      <section className="group-management-settings">
        <h3>{t("messages.conversationInfo.groupSettings")}</h3>
        {groupSettingRows(settings, t).map((row) => (
          <label key={row.key}>
            <span>{row.label}</span>
            <input
              type="checkbox"
              checked={Boolean(row.value)}
              disabled={!groupManagement?.permissions.canManageSettings}
              onChange={(event) =>
                groupManagement?.actions.updateSettings({ [row.key]: event.currentTarget.checked })
              }
            />
          </label>
        ))}
      </section>
      <section className="group-management-settings">
        <h3>{t("messages.conversationInfo.joinRequests")}</h3>
        {groupManagement?.joinRequests.length ? (
          groupManagement.joinRequests.map((request) => (
            <div className="group-join-request-row" key={request.requestId}>
              <span>{request.applicantDisplayName || request.applicantUserId || t("messages.conversationInfo.applicant")}</span>
              <em>{request.message || t("messages.conversationInfo.joinRequestFallback")}</em>
              <button
                type="button"
                disabled={!groupManagement.permissions.canManageJoinRequests}
                onClick={() => groupManagement.actions.approveJoinRequest(request.requestId)}
              >
                <Check size={13} />
                {t("messages.conversationInfo.actions.accept")}
              </button>
              <button
                type="button"
                disabled={!groupManagement.permissions.canManageJoinRequests}
                onClick={() => groupManagement.actions.rejectJoinRequest(request.requestId)}
              >
                {t("messages.conversationInfo.actions.reject")}
              </button>
            </div>
          ))
        ) : (
          <PanelState text={t("messages.conversationInfo.emptyJoinRequests")} />
        )}
      </section>
      <div className="group-management-danger">
        <ActionButton
          disabled={!groupManagement?.permissions.canLeave}
          icon={<LogOut size={14} />}
          label={t("messages.conversationInfo.actions.leaveGroup")}
          onClick={() => confirmDanger(t("messages.conversationInfo.confirm.leaveGroup")) && groupManagement?.actions.leaveGroup()}
        />
        <ActionButton
          danger
          disabled={!groupManagement?.permissions.canDisband}
          icon={<Trash2 size={14} />}
          label={t("messages.conversationInfo.actions.disbandGroup")}
          onClick={() => confirmDanger(t("messages.conversationInfo.confirm.disbandGroup")) && groupManagement?.actions.disbandGroup()}
        />
      </div>
    </div>
  );
}

function ActionButton({
  danger,
  disabled,
  icon,
  label,
  onClick,
}: {
  danger?: boolean;
  disabled?: boolean;
  icon: ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button className={danger ? "danger" : ""} type="button" disabled={disabled} onClick={onClick}>
      {icon}
      {label}
    </button>
  );
}

function GroupTabIcon({ tab }: { tab: GroupInfoTabKey }) {
  if (tab === "members") return <UsersRound size={14} />;
  if (tab === "announcements") return <Megaphone size={14} />;
  if (tab === "files") return <FolderOpen size={14} />;
  if (tab === "management") return <Settings size={14} />;
  return <Info size={14} />;
}

function GroupStat({ label, value }: { label: string; value: ReactNode }) {
  return (
    <span className="group-profile-stat">
      <em>{label}</em>
      <strong>{value || "--"}</strong>
    </span>
  );
}

function InfoRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="customer-info-row">
      <span>{label}</span>
      <strong>{value || "--"}</strong>
    </div>
  );
}

function groupMemberCountText(
  conversation: ConversationListItem,
  groupManagement: MessageGroupManagement | undefined,
  members: GroupMemberDto[],
) {
  return String(groupManagement?.detail?.memberCount ?? conversation.memberCount ?? (members.length || "--"));
}

function parseGroupInviteIds(value: string) {
  return value
    .split(/[\s,，]+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function uniqueGroupInviteIds(values: Iterable<string>, excludedIds: Set<string>) {
  const seen = new Set<string>();
  const result: string[] = [];
  Array.from(values).forEach((value) => {
    const id = value.trim();
    const key = id.toLowerCase();
    if (!id || excludedIds.has(key) || seen.has(key)) return;
    seen.add(key);
    result.push(id);
  });
  return result;
}

function groupMemberInviteIdSet(members: GroupMemberDto[]) {
  const ids = new Set<string>();
  members.forEach((member) => {
    [member.userId, member.platformUserId, member.lppId].forEach((value) => {
      const id = value?.trim().toLowerCase();
      if (id) ids.add(id);
    });
  });
  return ids;
}

function groupInviteCandidateItems({
  contacts,
  excludedIds,
  keyword,
  limit = 30,
}: {
  contacts: ContactPickerItem[];
  excludedIds: Set<string>;
  keyword: string;
  limit?: number;
}) {
  const normalized = keyword.trim().toLowerCase();
  return contacts
    .filter((item) => item.id && !excludedIds.has(item.id.trim().toLowerCase()))
    .filter((item) =>
      !normalized ||
      `${item.name} ${item.subtitle} ${item.id}`.toLowerCase().includes(normalized),
    )
    .slice(0, limit);
}

function groupSettingRows(settings: GroupSettingsDto, t: Translate) {
  return [
    ["allowMemberInvite", t("messages.conversationInfo.settings.allowMemberInvite"), settings.allowMemberInvite],
    ["allowMemberModifyTitle", t("messages.conversationInfo.settings.allowMemberModifyTitle"), settings.allowMemberModifyTitle],
    ["allowMemberAtAll", t("messages.conversationInfo.settings.allowMemberAtAll"), settings.allowMemberAtAll],
    ["allowMemberViewMemberList", t("messages.conversationInfo.settings.allowMemberViewMemberList"), settings.allowMemberViewMemberList],
    ["allowQrCodeJoin", t("messages.conversationInfo.settings.allowQrCodeJoin"), settings.allowQrCodeJoin],
    ["requireApproval", t("messages.conversationInfo.settings.requireApproval"), settings.requireApproval],
    ["allowMemberAddFriend", t("messages.conversationInfo.settings.allowMemberAddFriend"), settings.allowMemberAddFriend],
  ].map(([key, label, value]) => ({
    key: key as keyof GroupSettingsDto,
    label: label as string,
    value: Boolean(value),
  }));
}

function groupFileFilterLabel(filter: string, t: Translate) {
  if (filter === "image") return t("messages.conversationInfo.fileFilter.image");
  if (filter === "video") return t("messages.conversationInfo.fileFilter.video");
  if (filter === "voice") return t("messages.conversationInfo.fileFilter.voice");
  if (filter === "file") return t("messages.conversationInfo.fileFilter.file");
  return t("messages.conversationInfo.fileFilter.all");
}

function groupRoleText(role: string | number | null | undefined, t: Translate) {
  const normalized = normalizeGroupRole(role);
  if (normalized === "owner") return t("messages.conversationInfo.roles.owner");
  if (normalized === "admin") return t("messages.conversationInfo.roles.admin");
  return t("messages.conversationInfo.roles.member");
}

function compactNames(names: string[], t: Translate) {
  const compact = names.filter(Boolean);
  if (compact.length <= 3) return compact.join(t("messages.conversationInfo.listSeparator"));
  return t("messages.conversationInfo.compactNames", {
    names: compact.slice(0, 3).join(t("messages.conversationInfo.listSeparator")),
    count: compact.length,
  });
}

function formatFileSize(size?: number) {
  if (!size || size <= 0) return "--";
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / 1024 / 1024).toFixed(1)} MB`;
}

function isAllMuted(groupManagement?: MessageGroupManagement) {
  const mode = groupManagement?.detail?.muteMode;
  return mode === "all_muted" || mode === 1;
}

function confirmDanger(message: string) {
  return requestMessageCustomConfirmation(message);
}
