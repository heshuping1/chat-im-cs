import {
  BellOff,
  Check,
  ChevronRight,
  Crown,
  Eraser,
  FileText,
  ImagePlus,
  LogOut,
  MessageSquareWarning,
  MoreHorizontal,
  PencilLine,
  Pin,
  Plus,
  Search,
  Shield,
  ShieldOff,
  Trash2,
  UserMinus,
  UserPlus,
  VolumeX,
  X,
} from "lucide-react";
import { createPortal } from "react-dom";
import { useEffect, useMemo, useRef, useState, type DragEvent, type KeyboardEvent, type ReactNode } from "react";

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
import type { CurrentUserIdentity } from "../../data/message-display";
import type { ContactItem } from "../../data/types";
import type { TranslationParams } from "../../i18n/dictionary";
import { useI18n } from "../../i18n/useI18n";
import { formatChatTime } from "../../lib/format";
import type { MessageGroupManagement } from "../hooks/useMessageGroupManagement";
import {
  canAddGroupMemberFriend,
  canInviteGroupMembers,
  canModifyGroupTitle,
  canViewGroupMemberList,
  canManageGroupMember,
  groupMemberDisplayName,
  groupMemberRoleRank,
  normalizeGroupRole,
  visibleGroupInfoTabs,
  type GroupInfoTabKey,
} from "../models/groupManagementModel";
import type { GroupConversationAvatar } from "../models/groupAvatarTypes";
import type { ConversationContextAction } from "../models/messageConversationActionModel";
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
type GroupMemberProfileOpenOptions = {
  canAddFriend: boolean;
};

const groupRemarkStoragePrefix = "lpp.pc.groupRemark.";

function groupRemarkStorageKey(conversationId: string) {
  return `${groupRemarkStoragePrefix}${conversationId}`;
}

function readLocalGroupRemark(conversationId: string) {
  if (typeof window === "undefined") return undefined;
  try {
    return window.localStorage.getItem(groupRemarkStorageKey(conversationId)) ?? undefined;
  } catch {
    return undefined;
  }
}

function writeLocalGroupRemark(conversationId: string, remark: string) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(groupRemarkStorageKey(conversationId), remark);
  } catch {
    // Keep the in-memory edit usable when localStorage is unavailable.
  }
}

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
  onOpenGroupMemberProfile,
  onOpenMessageLookup,
  onOpenChatBackgroundSettings,
  onOpenCreateGroup,
  onConversationAction,
  onSubmitComplaint,
  onShowGroupMemberNicknamesChange,
  profile,
  profileActionPending = false,
  profileError,
  profileExtra,
  profileExtraLoading = false,
  profileLoading = false,
  showGroupMemberNicknames = true,
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
  onOpenGroupMemberProfile?: (target: HTMLElement, member: GroupMemberDto, options?: GroupMemberProfileOpenOptions) => void;
  onOpenMessageLookup?: () => void;
  onOpenChatBackgroundSettings?: () => void;
  onOpenCreateGroup?: () => void;
  onConversationAction?: (action: ConversationContextAction, conversation: ConversationListItem) => void;
  onSubmitComplaint?: (conversation: ConversationListItem, content: string) => Promise<void> | void;
  onShowGroupMemberNicknamesChange?: (show: boolean) => void;
  profile?: CustomerProfileCard;
  profileActionPending?: boolean;
  profileError?: unknown;
  profileExtra?: FriendProfileExtraDto;
  profileExtraLoading?: boolean;
  profileLoading?: boolean;
  showGroupMemberNicknames?: boolean;
  userIdentity?: CurrentUserIdentity | null;
}) {
  const { t } = useI18n();
  const [activeTab, setActiveTab] = useState<GroupInfoTabKey>("profile");
  const [membersInviteOpen, setMembersInviteOpen] = useState(false);

  useEffect(() => {
    setActiveTab("profile");
    setMembersInviteOpen(false);
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
        profileActions={
          <ConversationSettingsActions
            conversation={conversation}
            onConversationAction={onConversationAction}
            onOpenChatBackgroundSettings={onOpenChatBackgroundSettings}
            onOpenCreateGroup={onOpenCreateGroup}
            onOpenMessageLookup={onOpenMessageLookup}
            onSubmitComplaint={onSubmitComplaint}
            t={t}
          />
        }
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
      <section className="customer-info-card group-info-shell">
        <div className="group-profile-hero">
          <div className="customer-info-identity group-profile-identity">
            <ConversationAvatar
              avatarUrl={avatarUrl ?? conversation.avatarUrl}
              groupAvatar={groupAvatar}
              isGroup
              title={conversation.title}
            />
            <div className="group-profile-copy">
              <strong>{groupManagement?.detail?.title || conversation.title}</strong>
              <p className="group-profile-meta">
                <span>{t("messages.conversationInfo.groupChat")}</span>
                <span>{groupRoleText(role, t)}</span>
                <span>{t("messages.conversationInfo.fields.members")} {groupMemberCountText(conversation, groupManagement, members)}</span>
              </p>
            </div>
          </div>
        </div>
        <GroupInfoTabContent
          conversation={conversation}
          groupManagement={groupManagement}
          loadingGroupMembers={loadingGroupMembers}
          members={members}
          onOpenGroupMemberProfile={onOpenGroupMemberProfile}
          onOpenChatBackgroundSettings={onOpenChatBackgroundSettings}
          onOpenMessageLookup={onOpenMessageLookup}
          onConversationAction={onConversationAction}
          onShowGroupMemberNicknamesChange={onShowGroupMemberNicknamesChange}
          onSubmitComplaint={onSubmitComplaint}
          onSelectTab={setActiveTab}
          role={role}
          setMembersInviteOpen={setMembersInviteOpen}
          showGroupMemberNicknames={showGroupMemberNicknames}
          tab={safeActiveTab}
          t={t}
        />
      </section>
      {membersInviteOpen && (
        <GroupInviteDialog
          contactPickerItems={contactPickerItems}
          groupManagement={groupManagement}
          members={members}
          onClose={() => setMembersInviteOpen(false)}
          t={t}
        />
      )}
    </aside>
  );
}

function GroupInfoTabContent({
  conversation,
  groupManagement,
  loadingGroupMembers,
  members,
  onOpenGroupMemberProfile,
  onOpenChatBackgroundSettings,
  onOpenMessageLookup,
  onConversationAction,
  onShowGroupMemberNicknamesChange,
  onSubmitComplaint,
  onSelectTab,
  role,
  setMembersInviteOpen,
  showGroupMemberNicknames,
  tab,
  t,
}: {
  conversation: ConversationListItem;
  groupManagement?: MessageGroupManagement;
  loadingGroupMembers: boolean;
  members: GroupMemberDto[];
  onOpenGroupMemberProfile?: (target: HTMLElement, member: GroupMemberDto, options?: GroupMemberProfileOpenOptions) => void;
  onOpenChatBackgroundSettings?: () => void;
  onOpenMessageLookup?: () => void;
  onConversationAction?: (action: ConversationContextAction, conversation: ConversationListItem) => void;
  onShowGroupMemberNicknamesChange?: (show: boolean) => void;
  onSubmitComplaint?: (conversation: ConversationListItem, content: string) => Promise<void> | void;
  onSelectTab: (tab: GroupInfoTabKey) => void;
  role: "owner" | "admin" | "member";
  setMembersInviteOpen: (open: boolean) => void;
  showGroupMemberNicknames: boolean;
  tab: GroupInfoTabKey;
  t: Translate;
}) {
  if (tab === "members") {
    return (
      <GroupMembersTab
        groupManagement={groupManagement}
        loading={loadingGroupMembers}
        members={members}
        onOpenGroupMemberProfile={onOpenGroupMemberProfile}
        setInviteOpen={setMembersInviteOpen}
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
    <GroupProfileInfoList
      conversation={conversation}
      groupManagement={groupManagement}
      members={members}
      onConversationAction={onConversationAction}
      onOpenChatBackgroundSettings={onOpenChatBackgroundSettings}
      onOpenMessageLookup={onOpenMessageLookup}
      onOpenGroupMemberProfile={onOpenGroupMemberProfile}
      onOpenInviteMembers={() => {
        setMembersInviteOpen(true);
        onSelectTab("members");
      }}
      onShowGroupMemberNicknamesChange={onShowGroupMemberNicknamesChange}
      onSelectTab={onSelectTab}
      onSubmitComplaint={onSubmitComplaint}
      role={role}
      showGroupMemberNicknames={showGroupMemberNicknames}
      t={t}
    />
  );
}

function ConversationSettingsActions({
  conversation,
  onConversationAction,
  onOpenChatBackgroundSettings,
  onOpenCreateGroup,
  onOpenMessageLookup,
  onSubmitComplaint,
  t,
}: {
  conversation: ConversationListItem;
  onConversationAction?: (action: ConversationContextAction, conversation: ConversationListItem) => void;
  onOpenChatBackgroundSettings?: () => void;
  onOpenCreateGroup?: () => void;
  onOpenMessageLookup?: () => void;
  onSubmitComplaint?: (conversation: ConversationListItem, content: string) => Promise<void> | void;
  t: Translate;
}) {
  return (
    <section className="customer-info-block conversation-settings-actions">
      <h3>{t("messages.conversationInfo.chatSettings")}</h3>
      <div className="group-management-actions">
        <ActionButton
          icon={<Search size={14} />}
          label={t("messages.conversationInfo.actions.searchMessages")}
          onClick={() => onOpenMessageLookup?.()}
        />
        <ActionButton
          icon={<UserPlus size={14} />}
          label={t("messages.conversationInfo.actions.addMembers")}
          onClick={() => onOpenCreateGroup?.()}
        />
        <ActionButton
          icon={<Pin size={14} />}
          label={
            conversation.isPinned
              ? t("messages.conversationInfo.actions.unpinDirect")
              : t("messages.conversationInfo.actions.pinDirect")
          }
          onClick={() => onConversationAction?.("pin", conversation)}
        />
        <ActionButton
          icon={<BellOff size={14} />}
          label={
            conversation.isMuted
              ? t("messages.conversationInfo.actions.disableDnd")
              : t("messages.conversationInfo.actions.enableDnd")
          }
          onClick={() => onConversationAction?.("mute", conversation)}
        />
        <ActionButton
          icon={<ImagePlus size={14} />}
          label={t("messages.conversationInfo.actions.chatBackground")}
          onClick={() => onOpenChatBackgroundSettings?.()}
        />
        <ActionButton
          danger
          icon={<Eraser size={14} />}
          label={t("messages.conversationInfo.actions.clearHistory")}
          onClick={() => onConversationAction?.("delete", conversation)}
        />
        <ComplaintActionButton
          conversation={conversation}
          onSubmitComplaint={onSubmitComplaint}
          t={t}
        />
      </div>
    </section>
  );
}

function ComplaintActionButton({
  conversation,
  listRow,
  onSubmitComplaint,
  t,
}: {
  conversation: ConversationListItem;
  listRow?: boolean;
  onSubmitComplaint?: (conversation: ConversationListItem, content: string) => Promise<void> | void;
  t: Translate;
}) {
  const [open, setOpen] = useState(false);
  const [content, setContent] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const submit = async () => {
    const trimmed = content.trim();
    if (!trimmed || submitting) return;
    setSubmitting(true);
    try {
      await onSubmitComplaint?.(conversation, trimmed);
      setContent("");
      setOpen(false);
    } finally {
      setSubmitting(false);
    }
  };
  return (
    <div className={`conversation-complaint-action ${listRow ? "group-info-action-row-wrap" : ""}`}>
      <ActionButton
        className={listRow ? "group-info-action-button" : undefined}
        icon={<MessageSquareWarning size={14} />}
        label={t("messages.conversationInfo.actions.complain")}
        onClick={() => setOpen((value) => !value)}
        trailing={listRow ? <ChevronRight size={15} /> : undefined}
      />
      {open && (
        <div className="conversation-complaint-box">
          <textarea
            value={content}
            onChange={(event) => setContent(event.target.value)}
            placeholder={t("messages.conversationInfo.complaintPlaceholder")}
            maxLength={500}
          />
          <div>
            <button type="button" onClick={() => setOpen(false)}>
              {t("common.cancel")}
            </button>
            <button type="button" disabled={!content.trim() || submitting} onClick={submit}>
              {submitting ? t("common.saving") : t("messages.conversationInfo.actions.submitComplaint")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function EditableGroupTitleRow({
  allowEmpty = false,
  canEdit,
  label,
  maxLength = 30,
  onSave,
  placeholder,
  t,
  title,
}: {
  allowEmpty?: boolean;
  canEdit: boolean;
  label: string;
  maxLength?: number;
  onSave?: (title: string) => Promise<void> | void;
  placeholder: string;
  t: Translate;
  title: string;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(title);
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!editing) setDraft(title);
  }, [editing, title]);
  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  const cancel = () => {
    setDraft(title);
    setEditing(false);
  };
  const submit = async () => {
    const nextTitle = draft.trim();
    if ((!allowEmpty && !nextTitle) || nextTitle === title || saving) {
      if (nextTitle === title) setEditing(false);
      return;
    }
    setSaving(true);
    try {
      await onSave?.(nextTitle);
      setEditing(false);
    } finally {
      setSaving(false);
    }
  };
  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      event.preventDefault();
      void submit();
      return;
    }
    if (event.key === "Escape") {
      event.preventDefault();
      cancel();
    }
  };

  if (editing) {
    return (
      <div className="group-info-row group-info-row-editing">
        <span className="group-info-row-label">{label}</span>
        <div className="group-title-inline-editor">
          <input
            ref={inputRef}
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            maxLength={maxLength}
          />
          <button
            type="button"
            disabled={(!allowEmpty && !draft.trim()) || saving}
            onClick={() => void submit()}
            title={t("common.save")}
          >
            <Check size={14} />
          </button>
          <button type="button" disabled={saving} onClick={cancel} title={t("common.cancel")}>
            <X size={14} />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="group-info-row">
      <span className="group-info-row-label">{label}</span>
      <span className="group-title-value">
        <strong className="group-info-row-value">{title || "--"}</strong>
        {canEdit && (
          <button
            className="group-title-edit-trigger"
            type="button"
            onClick={() => setEditing(true)}
            title={t("common.edit")}
            aria-label={t("common.edit")}
          >
            <PencilLine size={15} />
          </button>
        )}
      </span>
    </div>
  );
}

function GroupInfoValueRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="group-info-row">
      <span className="group-info-row-label">{label}</span>
      <strong className="group-info-row-value">{value || "--"}</strong>
    </div>
  );
}

function GroupInfoLinkedRow({
  label,
  onClick,
  value,
}: {
  label: string;
  onClick: () => void;
  value: ReactNode;
}) {
  return (
    <button className="group-info-row group-info-linked-row" type="button" onClick={onClick}>
      <span className="group-info-row-label">{label}</span>
      <span className="group-info-row-trailing">
        <strong className="group-info-row-value">{value || "--"}</strong>
        <ChevronRight size={15} />
      </span>
    </button>
  );
}

function GroupInfoToggleRow({
  checked,
  label,
  offText,
  onText,
  onToggle,
  readOnly,
}: {
  checked: boolean;
  label: string;
  offText: string;
  onText: string;
  onToggle?: (checked: boolean) => Promise<void> | void;
  readOnly?: boolean;
}) {
  return (
    <div className="group-info-row">
      <span className="group-info-row-label">{label}</span>
      {readOnly ? (
        <StatusText checked={checked} offText={offText} onText={onText} />
      ) : (
        <ToggleStatusControl checked={checked} offText={offText} onText={onText} onToggle={onToggle} />
      )}
    </div>
  );
}

function GroupInfoActionRow({
  danger,
  icon,
  label,
  onClick,
}: {
  danger?: boolean;
  icon: ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <ActionButton
      className="group-info-action-button"
      danger={danger}
      icon={icon}
      label={label}
      onClick={onClick}
      trailing={<ChevronRight size={15} />}
    />
  );
}

function GroupInfoDangerButton({
  label,
  onClick,
}: {
  label: string;
  onClick: () => void;
}) {
  return (
    <button className="group-info-danger-button" type="button" onClick={onClick}>
      {label}
    </button>
  );
}

function GroupProfileInfoList({
  conversation,
  groupManagement,
  members,
  onConversationAction,
  onOpenChatBackgroundSettings,
  onOpenGroupMemberProfile,
  onOpenInviteMembers,
  onOpenMessageLookup,
  onShowGroupMemberNicknamesChange,
  onSelectTab,
  onSubmitComplaint,
  role,
  showGroupMemberNicknames,
  t,
}: {
  conversation: ConversationListItem;
  groupManagement?: MessageGroupManagement;
  members: GroupMemberDto[];
  onConversationAction?: (action: ConversationContextAction, conversation: ConversationListItem) => void;
  onOpenChatBackgroundSettings?: () => void;
  onOpenGroupMemberProfile?: (target: HTMLElement, member: GroupMemberDto, options?: GroupMemberProfileOpenOptions) => void;
  onOpenInviteMembers: () => void;
  onOpenMessageLookup?: () => void;
  onShowGroupMemberNicknamesChange?: (show: boolean) => void;
  onSelectTab: (tab: GroupInfoTabKey) => void;
  onSubmitComplaint?: (conversation: ConversationListItem, content: string) => Promise<void> | void;
  role: "owner" | "admin" | "member";
  showGroupMemberNicknames: boolean;
  t: Translate;
}) {
  const detailRecord = (groupManagement?.detail ?? {}) as Record<string, unknown>;
  const settings = groupManagement?.settings ?? groupManagement?.detail?.settings;
  const canRename = canModifyGroupTitle({ role, settings });
  const canInvite = canInviteGroupMembers({ role, settings });
  const canViewMembers = canViewGroupMemberList({ role, settings });
  const canAddFriend = canAddGroupMemberFriend({ role, settings });
  const canManageSettings = Boolean(groupManagement?.permissions.canManageSettings);
  const [localGroupRemark, setLocalGroupRemark] = useState<string | undefined>(() =>
    readLocalGroupRemark(conversation.conversationId),
  );
  const [optimisticMyGroupNickname, setOptimisticMyGroupNickname] = useState<string | undefined>();
  useEffect(() => {
    setLocalGroupRemark(readLocalGroupRemark(conversation.conversationId));
    setOptimisticMyGroupNickname(undefined);
  }, [conversation.conversationId]);
  const ownerName =
    groupManagement?.detail?.ownerDisplayName ||
    conversation.ownerDisplayName ||
    groupMemberDisplayName(members.find((member) => groupMemberRoleRank(member) === 0));
  const adminNames = members
    .filter((member) => groupMemberRoleRank(member) === 1)
    .map(groupMemberDisplayName)
    .filter(Boolean);
  const pinnedAnnouncement = groupManagement?.announcements.find((item) => item.isPinned) ?? groupManagement?.announcements[0];
  const announcementText = pinnedAnnouncement?.title || pinnedAnnouncement?.content;
  const recentFile = groupManagement?.files[0];
  const fileSummary = recentFile
    ? recentFile.fileName || recentFile.mediaKind
    : (groupManagement?.files.length ?? 0) > 0
      ? t("messages.conversationInfo.fileCount", { count: groupManagement?.files.length ?? 0 })
      : "--";
  const sortedMembers = useMemo(() => sortGroupMembers(members), [members]);
  const groupRemark = firstProfileValue(
    detailRecord.groupRemark,
    detailRecord.remark,
    detailRecord.remarkName,
    detailRecord.groupRemarkName,
  );
  const displayedGroupRemark = localGroupRemark ?? groupRemark ?? "";
  const serverMyGroupNickname =
    firstProfileValue(
      detailRecord.myGroupNickname,
      detailRecord.groupNickname,
      detailRecord.myNickname,
      detailRecord.nicknameInGroup,
    ) ?? "";
  const myGroupNickname = optimisticMyGroupNickname ?? serverMyGroupNickname;
  const profileSettingRows = groupSettingRows(settings ?? {}, t);
  const title = groupManagement?.detail?.title || conversation.title;
  return (
    <div className="group-info-list">
      {(canViewMembers || canInvite) && (
        <section className="group-info-member-preview-section">
          {canViewMembers ? (
            <>
              <GroupMemberGrid
                actorRole={role}
                canAddFriend={canAddFriend}
                canInvite={canInvite}
                groupManagement={groupManagement}
                members={sortedMembers}
                onInvite={onOpenInviteMembers}
                onOpenProfile={onOpenGroupMemberProfile}
                preview
                t={t}
              />
              {sortedMembers.length > (canInvite ? 11 : 12) && (
                <button className="group-member-view-more" type="button" onClick={() => onSelectTab("members")}>
                  {t("messages.conversationInfo.viewMore")}
                  <ChevronRight size={15} />
                </button>
              )}
            </>
          ) : (
            <button className="group-member-add-tile group-member-add-tile-standalone" type="button" onClick={onOpenInviteMembers}>
              <span>
                <Plus size={24} />
              </span>
              <strong>{t("messages.conversationInfo.addMemberTile")}</strong>
            </button>
          )}
        </section>
      )}
      <section className="group-info-list-section">
        <EditableGroupTitleRow
          canEdit={canRename}
          label={t("messages.conversationInfo.groupName")}
          onSave={(nextTitle) => groupManagement?.actions.updateGroupTitle(nextTitle)}
          placeholder={t("messages.conversationInfo.groupNamePlaceholder")}
          t={t}
          title={title}
        />
        <GroupInfoLinkedRow
          label={t("messages.conversationInfo.announcementFallback")}
          onClick={() => onSelectTab("announcements")}
          value={announcementText || "--"}
        />
        <EditableGroupTitleRow
          allowEmpty
          canEdit
          label={t("messages.conversationInfo.groupRemark")}
          maxLength={30}
          onSave={(nextRemark) => {
            writeLocalGroupRemark(conversation.conversationId, nextRemark);
            setLocalGroupRemark(nextRemark);
          }}
          placeholder={t("messages.conversationInfo.groupRemark")}
          t={t}
          title={displayedGroupRemark}
        />
        <EditableGroupTitleRow
          allowEmpty
          canEdit={Boolean(groupManagement?.actions.updateMyGroupNickname)}
          label={t("messages.conversationInfo.myGroupNickname")}
          maxLength={30}
          onSave={async (nextNickname) => {
            if (!groupManagement?.actions.updateMyGroupNickname) return;
            await groupManagement.actions.updateMyGroupNickname(nextNickname);
            setOptimisticMyGroupNickname(nextNickname.trim());
          }}
          placeholder={t("messages.conversationInfo.myGroupNickname")}
          t={t}
          title={myGroupNickname}
        />
        <GroupInfoLinkedRow
          label={t("messages.conversationInfo.tabs.files")}
          onClick={() => onSelectTab("files")}
          value={fileSummary}
        />
      </section>
      <section className="group-info-list-section">
        <GroupInfoValueRow label={t("messages.conversationInfo.fields.owner")} value={ownerName || "--"} />
        <GroupInfoValueRow
          label={t("messages.conversationInfo.fields.admins")}
          value={adminNames.length > 0 ? compactNames(adminNames, t) : "--"}
        />
        <GroupInfoValueRow label={t("messages.conversationInfo.fields.myRole")} value={groupRoleText(role, t)} />
      </section>
      <section className="group-info-list-section">
        <GroupInfoToggleRow
          checked={Boolean(conversation.isMuted)}
          label={t("messages.conversationInfo.fields.muted")}
          offText={t("messages.conversationInfo.disabled")}
          onText={t("messages.conversationInfo.enabled")}
          onToggle={(nextChecked) =>
            groupManagement?.actions.setMuted
              ? groupManagement.actions.setMuted(nextChecked)
              : onConversationAction?.("mute", conversation)
          }
        />
        <GroupInfoToggleRow
          checked={Boolean(conversation.isPinned)}
          label={t("messages.conversationInfo.fields.pinned")}
          offText={t("messages.conversationInfo.disabled")}
          onText={t("messages.conversationInfo.enabled")}
          onToggle={(nextChecked) =>
            groupManagement?.actions.setPinned
              ? groupManagement.actions.setPinned(nextChecked)
              : onConversationAction?.("pin", conversation)
          }
        />
        {canManageSettings && profileSettingRows.slice(0, 5).map((row) => (
          <GroupInfoToggleRow
            key={row.key}
            checked={Boolean(row.value)}
            label={row.label}
            offText={t("messages.conversationInfo.disabled")}
            onText={t("messages.conversationInfo.enabled")}
            onToggle={(nextChecked) =>
              groupManagement?.actions.updateSettings({ [row.key]: nextChecked })
            }
          />
        ))}
        <GroupInfoToggleRow
          checked={isAllMuted(groupManagement)}
          label={t("messages.conversationInfo.allMuted")}
          offText={t("messages.conversationInfo.disabled")}
          onText={t("messages.conversationInfo.enabled")}
          readOnly={!canManageSettings}
          onToggle={(nextChecked) => groupManagement?.actions.setMuteMode(nextChecked)}
        />
        {canManageSettings && profileSettingRows.slice(5).map((row) => (
          <GroupInfoToggleRow
            key={row.key}
            checked={Boolean(row.value)}
            label={row.label}
            offText={t("messages.conversationInfo.disabled")}
            onText={t("messages.conversationInfo.enabled")}
            onToggle={(nextChecked) =>
              groupManagement?.actions.updateSettings({ [row.key]: nextChecked })
            }
          />
        ))}
        <GroupInfoToggleRow
          checked={showGroupMemberNicknames}
          label={t("messages.conversationInfo.showGroupMemberNicknames")}
          offText={t("messages.conversationInfo.disabled")}
          onText={t("messages.conversationInfo.enabled")}
          onToggle={(nextChecked) => onShowGroupMemberNicknamesChange?.(nextChecked)}
        />
      </section>
      <section className="group-info-list-section">
        <GroupInfoActionRow
          icon={<Search size={15} />}
          label={t("messages.conversationInfo.actions.searchMessages")}
          onClick={() => onOpenMessageLookup?.()}
        />
        <GroupInfoActionRow
          icon={<ImagePlus size={15} />}
          label={t("messages.conversationInfo.actions.chatBackground")}
          onClick={() => onOpenChatBackgroundSettings?.()}
        />
        <ComplaintActionButton
          conversation={conversation}
          listRow
          onSubmitComplaint={onSubmitComplaint}
          t={t}
        />
      </section>
      <section className="group-info-danger-section">
        <GroupInfoDangerButton
          label={t("messages.conversationInfo.actions.clearHistory")}
          onClick={() => onConversationAction?.("delete", conversation)}
        />
        {groupManagement?.permissions.canLeave && (
          <GroupInfoDangerButton
            label={t("messages.conversationInfo.actions.leaveGroup")}
            onClick={() =>
              confirmDanger(t("messages.conversationInfo.confirm.leaveGroup")) &&
              groupManagement?.actions.leaveGroup()
            }
          />
        )}
      </section>
    </div>
  );
}

function GroupMembersTab({
  groupManagement,
  loading,
  members,
  onOpenGroupMemberProfile,
  setInviteOpen,
  t,
}: {
  groupManagement?: MessageGroupManagement;
  loading: boolean;
  members: GroupMemberDto[];
  onOpenGroupMemberProfile?: (target: HTMLElement, member: GroupMemberDto, options?: GroupMemberProfileOpenOptions) => void;
  setInviteOpen: (open: boolean) => void;
  t: Translate;
}) {
  const [keyword, setKeyword] = useState("");
  const role = groupManagement?.role ?? "member";
  const groupSettings = groupManagement?.settings ?? groupManagement?.detail?.settings;
  const canInvite = canInviteGroupMembers({ role, settings: groupSettings });
  const canAddFriend = canAddGroupMemberFriend({ role, settings: groupSettings });
  const visibleMembers = useMemo(() => {
    const normalized = keyword.trim().toLowerCase();
    const sorted = [...members].sort((left, right) => {
      const roleDelta = groupMemberRoleRank(left) - groupMemberRoleRank(right);
      if (roleDelta !== 0) return roleDelta;
      return groupMemberDisplayName(left).localeCompare(groupMemberDisplayName(right), "zh-Hans-CN", {
        numeric: true,
        sensitivity: "base",
      });
    });
    if (!normalized) return sorted;
    return sorted.filter((member) =>
      [groupMemberDisplayName(member), member.groupNickname, member.nickname, member.displayName, member.lppId].some((value) =>
        `${value ?? ""}`.toLowerCase().includes(normalized),
      ),
    );
  }, [keyword, members]);
  return (
    <div className="group-management-pane">
      <div className="group-members-toolbar">
        <label className="group-management-search group-members-search">
          <Search size={14} />
          <input
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
            placeholder={t("messages.conversationInfo.memberSearchPlaceholder")}
          />
        </label>
        {canInvite && (
          <button
            className="group-members-invite-toggle"
            type="button"
            onClick={() => setInviteOpen(true)}
          >
            <UserPlus size={14} />
            {t("messages.conversationInfo.inviteMembers")}
          </button>
        )}
      </div>
      {loading && <PanelState text={t("messages.conversationInfo.loadingMembers")} />}
      {!loading && visibleMembers.length === 0 && <PanelState text={t("messages.conversationInfo.emptyMembers")} />}
      {!loading && visibleMembers.length > 0 && (
        <GroupMemberGrid
          actorRole={role}
          canAddFriend={canAddFriend}
          canInvite={canInvite}
          groupManagement={groupManagement}
          members={visibleMembers}
          onInvite={() => setInviteOpen(true)}
          onOpenProfile={onOpenGroupMemberProfile}
          t={t}
        />
      )}
    </div>
  );
}

function GroupInviteDialog({
  contactPickerItems,
  groupManagement,
  members,
  onClose,
  t,
}: {
  contactPickerItems: ContactPickerItem[];
  groupManagement?: MessageGroupManagement;
  members: GroupMemberDto[];
  onClose: () => void;
  t: Translate;
}) {
  const [keyword, setKeyword] = useState("");
  const [selectedInviteIds, setSelectedInviteIds] = useState<Set<string>>(() => new Set());
  const [shareChatContent, setShareChatContent] = useState(false);
  const existingMemberIds = useMemo(() => groupMemberInviteIdSet(members), [members]);
  const inviteCandidates = useMemo(() => {
    return groupInviteCandidateItems({
      contacts: contactPickerItems,
      excludedIds: existingMemberIds,
      keyword,
      limit: 200,
    });
  }, [contactPickerItems, existingMemberIds, keyword]);
  const selectedContacts = useMemo(
    () => contactPickerItems.filter((item) => selectedInviteIds.has(item.id)),
    [contactPickerItems, selectedInviteIds],
  );
  const inviteTargetIds = useMemo(
    () => uniqueGroupInviteIds(selectedInviteIds, existingMemberIds),
    [existingMemberIds, selectedInviteIds],
  );
  const toggleInviteContact = (id: string) => {
    setSelectedInviteIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };
  const submitInvite = () => {
    if (inviteTargetIds.length === 0) return;
    groupManagement?.actions.addMembers(inviteTargetIds);
    onClose();
  };

  if (typeof document === "undefined") return null;
  return createPortal(
    <div className="group-invite-dialog-backdrop" role="presentation" onMouseDown={onClose}>
      <section
        className="group-invite-dialog"
        role="dialog"
        aria-modal="true"
        aria-label={t("messages.conversationInfo.actions.addMembers")}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="group-invite-dialog-left">
          <label className="group-invite-dialog-search">
            <Search size={22} />
            <input
              value={keyword}
              onChange={(event) => setKeyword(event.target.value)}
              placeholder={t("messages.conversationInfo.inviteContactSearchPlaceholder")}
              autoFocus
            />
          </label>
          <div className="group-invite-dialog-section-title">
            <ChevronRight size={16} />
            <strong>{t("messages.conversationInfo.inviteFromContacts")}</strong>
          </div>
          <div className="group-invite-dialog-list">
            {inviteCandidates.map((item) => {
              const selected = selectedInviteIds.has(item.id);
              return (
                <button
                  className={selected ? "selected" : ""}
                  type="button"
                  key={`${item.source}-${item.id}`}
                  onClick={() => toggleInviteContact(item.id)}
                >
                  <span className="group-invite-check" aria-hidden="true">
                    {selected && <Check size={18} />}
                  </span>
                  <PcAvatar avatarUrl={item.avatarUrl} className="e-avatar" name={item.name} />
                  <span className="group-invite-contact-copy">
                    <strong>{item.name}</strong>
                    {item.subtitle && <small>{item.subtitle}</small>}
                  </span>
                </button>
              );
            })}
            {inviteCandidates.length === 0 && (
              <PanelState text={t("messages.conversationInfo.emptyInviteContacts")} />
            )}
          </div>
        </div>
        <div className="group-invite-dialog-right">
          <header>
            <h2>{t("messages.conversationInfo.actions.addMembers")}</h2>
          </header>
          <div className="group-invite-selected-area">
            {selectedContacts.map((item) => (
              <span className="group-invite-selected-chip" key={`selected-${item.source}-${item.id}`}>
                <PcAvatar avatarUrl={item.avatarUrl} className="e-avatar" name={item.name} />
                <strong>{item.name}</strong>
              </span>
            ))}
          </div>
          <button
            className="group-invite-share-row"
            type="button"
            aria-pressed={shareChatContent}
            onClick={() => setShareChatContent((value) => !value)}
          >
            <span>分享聊天内容</span>
            <span className={shareChatContent ? "selected" : ""} aria-hidden="true">
              {shareChatContent && <Check size={15} />}
            </span>
            <ChevronRight size={22} />
          </button>
          <footer>
            <button type="button" onClick={onClose}>
              {t("common.cancel")}
            </button>
            <button type="button" disabled={inviteTargetIds.length === 0} onClick={submitInvite}>
              {t("messages.conversationInfo.actions.addMembers")}
            </button>
          </footer>
        </div>
      </section>
    </div>,
    document.body,
  );
}

function GroupMemberGrid({
  actorRole,
  canAddFriend,
  canInvite,
  groupManagement,
  members,
  onInvite,
  onOpenProfile,
  preview = false,
  t,
}: {
  actorRole: "owner" | "admin" | "member";
  canAddFriend: boolean;
  canInvite: boolean;
  groupManagement?: MessageGroupManagement;
  members: GroupMemberDto[];
  onInvite: () => void;
  onOpenProfile?: (target: HTMLElement, member: GroupMemberDto, options?: GroupMemberProfileOpenOptions) => void;
  preview?: boolean;
  t: Translate;
}) {
  const [openMenuMemberId, setOpenMenuMemberId] = useState<string | null>(null);
  const removableMemberCount = members.filter((member) =>
    canManageGroupMember({
      actorRole,
      targetRole: normalizeGroupRole(member.role ?? member.memberRole),
      action: "remove",
    }),
  ).length;
  const canRemoveMembers = Boolean(groupManagement?.permissions.canManageMembers && removableMemberCount > 0);
  const [removeMode, setRemoveMode] = useState(false);
  const actionTileCount = (canInvite ? 1 : 0) + (canRemoveMembers ? 1 : 0);
  const maxMembers = preview ? Math.max(0, 12 - actionTileCount) : members.length;
  const visibleMembers = members.slice(0, maxMembers);
  useEffect(() => {
    if (!canRemoveMembers) setRemoveMode(false);
  }, [canRemoveMembers]);
  return (
    <div className={`group-member-grid ${preview ? "preview" : "full"} ${removeMode ? "removing" : ""}`}>
      {visibleMembers.map((member) => (
        <GroupMemberRow
          actorRole={actorRole}
          groupManagement={groupManagement}
          key={member.userId}
          member={member}
          menuOpen={openMenuMemberId === member.userId}
          onMenuClose={() => setOpenMenuMemberId(null)}
          onMenuToggle={() =>
            setOpenMenuMemberId((current) => (current === member.userId ? null : member.userId))
          }
          onOpenProfile={(target, targetMember) => {
            setOpenMenuMemberId(null);
            onOpenProfile?.(target, targetMember, { canAddFriend });
          }}
          removeMode={removeMode}
          t={t}
        />
      ))}
      {canInvite && (
        <button className="group-member-add-tile" type="button" onClick={onInvite}>
          <span>
            <Plus size={24} />
          </span>
          <strong>{t("messages.conversationInfo.addMemberTile")}</strong>
        </button>
      )}
      {canRemoveMembers && (
        <button
          className={`group-member-remove-tile ${removeMode ? "active" : ""}`}
          type="button"
          aria-pressed={removeMode}
          onClick={() => setRemoveMode((value) => !value)}
        >
          <span>
            <UserMinus size={22} />
          </span>
          <strong>{t("messages.conversationInfo.actions.remove")}</strong>
        </button>
      )}
    </div>
  );
}

function GroupMemberRow({
  actorRole,
  groupManagement,
  menuOpen,
  member,
  onMenuClose,
  onMenuToggle,
  onOpenProfile,
  removeMode,
  t,
}: {
  actorRole: "owner" | "admin" | "member";
  groupManagement?: MessageGroupManagement;
  menuOpen: boolean;
  member: GroupMemberDto;
  onMenuClose: () => void;
  onMenuToggle: () => void;
  onOpenProfile: (target: HTMLElement, member: GroupMemberDto, options?: GroupMemberProfileOpenOptions) => void;
  removeMode?: boolean;
  t: Translate;
}) {
  const targetRole = normalizeGroupRole(member.role ?? member.memberRole);
  const displayName = groupMemberPrimaryLine(member) || groupMemberDisplayName(member);
  const canRemove = canManageGroupMember({ actorRole, targetRole, action: "remove" });
  const canPromote = canManageGroupMember({ actorRole, targetRole, action: "promote" });
  const canDemote = canManageGroupMember({ actorRole, targetRole, action: "demote" });
  const canMute = canManageGroupMember({ actorRole, targetRole, action: "mute" });
  const canTransfer = canManageGroupMember({ actorRole, targetRole, action: "transfer" });
  const hasActions = Boolean(groupManagement?.permissions.canManageMembers) && [canPromote, canDemote, canMute, canTransfer, canRemove].some(Boolean);
  const signature = groupMemberSignature(member);
  const roleLabel = groupRoleText(targetRole, t);
  const [muteEditorOpen, setMuteEditorOpen] = useState(false);
  const [muteDurationMinutes, setMuteDurationMinutes] = useState("0");
  const [muteReason, setMuteReason] = useState("");
  const invokeAction = (action: () => void) => {
    onMenuClose();
    action();
  };
  const submitMute = () => {
    const durationMinutes = Math.max(0, Number.parseInt(muteDurationMinutes, 10) || 0);
    groupManagement?.actions.setMemberMute(member.userId, true, {
      muteUntil: groupMuteUntilFromMinutes(durationMinutes),
      reason: muteReason.trim() || null,
    });
    setMuteEditorOpen(false);
    setMuteDurationMinutes("0");
    setMuteReason("");
  };
  const openProfileFromKeyboard = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    event.stopPropagation();
    onOpenProfile(event.currentTarget, member);
  };
  const removeMember = () => {
    if (
      confirmDanger(
        t("messages.conversationInfo.confirm.removeMember", {
          name: displayName || t("messages.conversationInfo.thisMember"),
        }),
      )
    ) {
      groupManagement?.actions.removeMember(member.userId);
    }
  };
  return (
    <div
      className="group-member-row"
      role="button"
      tabIndex={0}
      aria-label={t("messages.conversationInfo.viewMemberProfile", {
        name: displayName || t("messages.conversationInfo.memberFallback"),
      })}
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        onOpenProfile(event.currentTarget, member);
      }}
      onKeyDown={openProfileFromKeyboard}
    >
      <PcAvatar avatarUrl={member.avatarUrl} className="e-avatar" name={displayName} />
      {removeMode && canRemove && Boolean(groupManagement?.permissions.canManageMembers) && (
        <button
          className="group-member-remove-badge"
          type="button"
          aria-label={t("messages.conversationInfo.confirm.removeMember", {
            name: displayName || t("messages.conversationInfo.thisMember"),
          })}
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            removeMember();
          }}
        >
          <UserMinus size={12} />
        </button>
      )}
      <div className="group-member-main">
        <strong>{displayName || t("messages.conversationInfo.memberFallback")}</strong>
        <span className={signature ? undefined : "empty-signature"}>
          {signature || t("messages.conversationInfo.noSignature")}
        </span>
      </div>
      <div className="group-member-badges">
        <span className={`group-member-role group-member-role-${targetRole}`}>{roleLabel}</span>
        {member.isMuted && <span className="group-member-muted">{t("messages.conversationInfo.memberMuted")}</span>}
      </div>
      {hasActions && (
        <div
          className="group-member-menu-wrap"
          onClick={(event) => event.stopPropagation()}
          onKeyDown={(event) => event.stopPropagation()}
        >
          <button
            className="group-member-menu-trigger"
            type="button"
            aria-expanded={menuOpen}
            aria-label={t("messages.conversationInfo.moreActions")}
            onClick={onMenuToggle}
          >
            <MoreHorizontal size={16} />
          </button>
          {menuOpen && (
            <div className="group-member-actions" role="menu">
              {canPromote && (
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => invokeAction(() => groupManagement?.actions.setMemberRole(member.userId, "admin"))}
                >
                  <Shield size={13} />
                  {t("messages.conversationInfo.actions.promoteAdmin")}
                </button>
              )}
              {canDemote && (
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => invokeAction(() => groupManagement?.actions.setMemberRole(member.userId, "member"))}
                >
                  <ShieldOff size={13} />
                  {t("messages.conversationInfo.actions.demoteAdmin")}
                </button>
              )}
              {canMute && (
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    if (member.isMuted) {
                      invokeAction(() => groupManagement?.actions.setMemberMute(member.userId, false));
                      return;
                    }
                    onMenuClose();
                    setMuteEditorOpen(true);
                  }}
                >
                  <VolumeX size={13} />
                  {member.isMuted
                    ? t("messages.conversationInfo.actions.unmute")
                    : t("messages.conversationInfo.actions.mute")}
                </button>
              )}
              {canTransfer && (
                <button
                  type="button"
                  role="menuitem"
                  onClick={() =>
                    invokeAction(() => {
                      if (
                        confirmDanger(
                          t("messages.conversationInfo.confirm.transferOwner", {
                            name: displayName || t("messages.conversationInfo.thisMember"),
                          }),
                        )
                      ) {
                        groupManagement?.actions.transferOwner(member.userId);
                      }
                    })
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
                  role="menuitem"
                  onClick={() =>
                    invokeAction(() => {
                      removeMember();
                    })
                  }
                >
                  <UserMinus size={13} />
                  {t("messages.conversationInfo.actions.remove")}
                </button>
              )}
            </div>
          )}
        </div>
      )}
      {muteEditorOpen && (
        <div
          className="group-member-mute-editor"
          role="dialog"
          aria-label={t("messages.conversationInfo.memberMuteDialog.title")}
          onClick={(event) => event.stopPropagation()}
          onKeyDown={(event) => event.stopPropagation()}
        >
          <header>
            <strong>{t("messages.conversationInfo.memberMuteDialog.title")}</strong>
            <span>{displayName || t("messages.conversationInfo.thisMember")}</span>
          </header>
          <label>
            <span>{t("messages.conversationInfo.memberMuteDialog.duration")}</span>
            <input
              type="number"
              min={0}
              step={1}
              value={muteDurationMinutes}
              onChange={(event) => setMuteDurationMinutes(event.target.value)}
            />
          </label>
          <label>
            <span>{t("messages.conversationInfo.memberMuteDialog.reason")}</span>
            <textarea
              value={muteReason}
              onChange={(event) => setMuteReason(event.target.value)}
              placeholder={t("messages.conversationInfo.memberMuteDialog.reasonPlaceholder")}
              maxLength={200}
            />
          </label>
          <p>{t("messages.conversationInfo.memberMuteDialog.hint")}</p>
          <div>
            <button type="button" onClick={() => setMuteEditorOpen(false)}>
              {t("common.cancel")}
            </button>
            <button className="danger" type="button" onClick={submitMute}>
              {t("messages.conversationInfo.memberMuteDialog.submit")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function groupMemberPrimaryLine(member: GroupMemberDto) {
  const groupNickname = `${member.groupNickname ?? ""}`.trim();
  const accountNickname = groupMemberAccountNickname(member);
  if (groupNickname && accountNickname && groupNickname !== accountNickname) return `${groupNickname} / ${accountNickname}`;
  return groupNickname || accountNickname;
}

function sortGroupMembers(members: GroupMemberDto[]) {
  return [...members].sort((left, right) => {
    const roleDelta = groupMemberRoleRank(left) - groupMemberRoleRank(right);
    if (roleDelta !== 0) return roleDelta;
    return groupMemberDisplayName(left).localeCompare(groupMemberDisplayName(right), "zh-Hans-CN", {
      numeric: true,
      sensitivity: "base",
    });
  });
}

function groupMemberAccountNickname(member: GroupMemberDto) {
  return (
    `${member.nickname ?? ""}`.trim() ||
    `${member.displayName ?? ""}`.trim() ||
    `${(member as unknown as Record<string, unknown>).name ?? ""}`.trim() ||
    `${(member as unknown as Record<string, unknown>).userName ?? ""}`.trim()
  );
}

function groupMemberSignature(member: GroupMemberDto) {
  return (
    `${member.signature ?? ""}`.trim() ||
    `${member.bio ?? ""}`.trim() ||
    `${(member as unknown as Record<string, unknown>).statusMessage ?? ""}`.trim() ||
    `${(member as unknown as Record<string, unknown>).personalSignature ?? ""}`.trim()
  );
}

function groupMuteUntilFromMinutes(minutes: number) {
  if (minutes <= 0) return null;
  return new Date(Date.now() + minutes * 60_000).toISOString();
}

function GroupAnnouncementsTab({
  groupManagement,
  t,
}: {
  groupManagement?: MessageGroupManagement;
  t: Translate;
}) {
  const canManage = Boolean(groupManagement?.permissions.canManageAnnouncements);
  const announcements = groupManagement?.announcements ?? [];
  const [activeAnnouncementId, setActiveAnnouncementId] = useState<string | "new" | null>(null);
  const activeAnnouncement =
    activeAnnouncementId && activeAnnouncementId !== "new"
      ? announcements.find((item) => item.announcementId === activeAnnouncementId)
      : undefined;

  useEffect(() => {
    if (activeAnnouncementId && activeAnnouncementId !== "new" && !activeAnnouncement) {
      setActiveAnnouncementId(null);
    }
  }, [activeAnnouncement, activeAnnouncementId]);

  if (activeAnnouncementId) {
    return (
      <GroupAnnouncementDetail
        canManage={canManage}
        groupManagement={groupManagement}
        item={activeAnnouncementId === "new" ? undefined : activeAnnouncement}
        onBack={() => setActiveAnnouncementId(null)}
        t={t}
      />
    );
  }

  return (
    <div className="group-management-pane group-announcement-pane">
      {canManage && (
        <button className="group-announcement-new-button" type="button" onClick={() => setActiveAnnouncementId("new")}>
          <Plus size={15} />
          {t("messages.conversationInfo.newAnnouncement")}
        </button>
      )}
      {announcements.length ? (
        <div className="group-announcement-list">
          {announcements.map((item) => (
            <button
              className="group-announcement-list-row"
              type="button"
              key={item.announcementId}
              onClick={() => setActiveAnnouncementId(item.announcementId)}
            >
              <span>
                <strong>{item.title || t("messages.conversationInfo.announcementFallback")}</strong>
                <small>{item.content}</small>
              </span>
              {item.isPinned && <em>{t("messages.conversationInfo.pinned")}</em>}
              <ChevronRight size={15} />
            </button>
          ))}
        </div>
      ) : (
        <PanelState text={t("messages.conversationInfo.emptyAnnouncements")} />
      )}
    </div>
  );
}

function GroupAnnouncementDetail({
  canManage,
  groupManagement,
  item,
  onBack,
  t,
}: {
  canManage: boolean;
  groupManagement?: MessageGroupManagement;
  item?: GroupAnnouncementDto;
  onBack: () => void;
  t: Translate;
}) {
  const [title, setTitle] = useState(item?.title ?? "");
  const [content, setContent] = useState(item?.content ?? "");
  const [pinned, setPinned] = useState(Boolean(item?.isPinned));
  useEffect(() => {
    setTitle(item?.title ?? "");
    setContent(item?.content ?? "");
    setPinned(Boolean(item?.isPinned));
  }, [item?.content, item?.isPinned, item?.title]);
  const submit = () => {
    const trimmed = content.trim();
    if (!trimmed) return;
    if (item) {
      groupManagement?.actions.updateAnnouncement(
        item.announcementId,
        trimmed,
        title.trim() || undefined,
        pinned,
      );
    } else {
      groupManagement?.actions.createAnnouncement(trimmed, title.trim() || undefined, pinned);
    }
    onBack();
  };

  return (
    <article className={`group-announcement-detail ${canManage ? "editing" : "readonly"}`}>
      <header>
        <button type="button" onClick={onBack}>
          <ChevronRight size={15} />
          {t("messages.conversationInfo.backToAnnouncements")}
        </button>
        {pinned && <span>{t("messages.conversationInfo.pinned")}</span>}
      </header>
      {canManage ? (
        <>
          <input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder={t("messages.conversationInfo.announcementTitlePlaceholder")}
            maxLength={60}
          />
          <textarea
            value={content}
            onChange={(event) => setContent(event.target.value)}
            placeholder={t("messages.conversationInfo.announcementPlaceholder")}
          />
          <label className="group-announcement-pin-toggle">
            <input
              type="checkbox"
              checked={pinned}
              onChange={(event) => setPinned(event.currentTarget.checked)}
            />
            <span>{t("messages.conversationInfo.pinAnnouncement")}</span>
          </label>
          <footer>
            <button type="button" onClick={onBack}>
              {t("common.cancel")}
            </button>
            <button type="button" disabled={!content.trim()} onClick={submit}>
              {t("common.save")}
            </button>
            {item && (
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
            )}
          </footer>
        </>
      ) : (
        <div className="group-announcement-readonly">
          <strong>{item?.title || t("messages.conversationInfo.announcementFallback")}</strong>
          <p>{item?.content || t("messages.conversationInfo.emptyAnnouncements")}</p>
          <span>{formatChatTime(item?.updatedAt || item?.createdAt)}</span>
        </div>
      )}
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
  return (
    <div className="group-management-pane">
      <section className="group-info-list-section group-management-title-section">
        <EditableGroupTitleRow
          canEdit={Boolean(groupManagement?.permissions.canManageSettings)}
          label={t("messages.conversationInfo.groupName")}
          onSave={(nextTitle) => groupManagement?.actions.updateGroupTitle(nextTitle)}
          placeholder={t("messages.conversationInfo.groupNamePlaceholder")}
          t={t}
          title={groupManagement?.detail?.title || conversation.title}
        />
      </section>
      <section className="group-management-settings group-management-status-settings">
        <h3>{t("messages.conversationInfo.chatStatus")}</h3>
        <StatusToggleRow
          label={t("messages.conversationInfo.fields.pinned")}
          checked={Boolean(conversation.isPinned)}
          offText={t("messages.conversationInfo.disabled")}
          onText={t("messages.conversationInfo.enabled")}
          onToggle={(nextChecked) => groupManagement?.actions.setPinned(nextChecked)}
        />
        <StatusToggleRow
          label={t("messages.conversationInfo.fields.muted")}
          checked={Boolean(conversation.isMuted)}
          offText={t("messages.conversationInfo.disabled")}
          onText={t("messages.conversationInfo.enabled")}
          onToggle={(nextChecked) => groupManagement?.actions.setMuted(nextChecked)}
        />
        {groupManagement?.permissions.canManageSettings ? (
          <StatusToggleRow
            label={t("messages.conversationInfo.allMuted")}
            checked={isAllMuted(groupManagement)}
            offText={t("messages.conversationInfo.disabled")}
            onText={t("messages.conversationInfo.enabled")}
            onToggle={(nextChecked) => groupManagement?.actions.setMuteMode(nextChecked)}
          />
        ) : (
          <div className="group-management-status-row">
            <span>{t("messages.conversationInfo.allMuted")}</span>
            <StatusText
              checked={isAllMuted(groupManagement)}
              offText={t("messages.conversationInfo.disabled")}
              onText={t("messages.conversationInfo.enabled")}
            />
          </div>
        )}
      </section>
      <section className="group-management-settings">
        <h3>{t("messages.conversationInfo.groupSettings")}</h3>
        {groupSettingRows(settings, t).map((row) => (
          <StatusToggleRow
            key={row.key}
            checked={Boolean(row.value)}
            disabled={!groupManagement?.permissions.canManageSettings}
            label={row.label}
            offText={t("messages.conversationInfo.disabled")}
            onText={t("messages.conversationInfo.enabled")}
            onToggle={(nextChecked) => groupManagement?.actions.updateSettings({ [row.key]: nextChecked })}
          />
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
  className,
  danger,
  disabled,
  icon,
  label,
  onClick,
  trailing,
}: {
  className?: string;
  danger?: boolean;
  disabled?: boolean;
  icon: ReactNode;
  label: string;
  onClick: () => void;
  trailing?: ReactNode;
}) {
  const classes = [className, danger ? "danger" : ""].filter(Boolean).join(" ");
  return (
    <button className={classes || undefined} type="button" disabled={disabled} onClick={onClick}>
      <span className="action-button-main">
        {icon}
        {label}
      </span>
      {trailing}
    </button>
  );
}

function ToggleStatusControl({
  checked,
  disabled,
  offText,
  onText,
  onToggle,
  showText = false,
}: {
  checked: boolean;
  disabled?: boolean;
  offText: string;
  onText: string;
  onToggle?: (checked: boolean) => Promise<void> | void;
  showText?: boolean;
}) {
  const [optimisticChecked, setOptimisticChecked] = useState(checked);
  const [pending, setPending] = useState(false);
  const pendingTargetRef = useRef<boolean | null>(null);

  useEffect(() => {
    if (pendingTargetRef.current !== null) {
      if (checked === pendingTargetRef.current) {
        pendingTargetRef.current = null;
        setOptimisticChecked(checked);
      }
      return;
    }
    setOptimisticChecked(checked);
  }, [checked]);

  const toggle = async () => {
    if (disabled || pending) return;
    const previous = optimisticChecked;
    const nextChecked = !previous;
    pendingTargetRef.current = nextChecked;
    setOptimisticChecked(nextChecked);
    setPending(true);
    try {
      await onToggle?.(nextChecked);
    } catch {
      pendingTargetRef.current = null;
      setOptimisticChecked(previous);
    } finally {
      setPending(false);
    }
  };

  return (
    <button
      className={`conversation-status-toggle ${optimisticChecked ? "on" : ""} ${pending ? "pending" : ""}`}
      type="button"
      disabled={disabled}
      aria-disabled={disabled || pending}
      aria-pressed={optimisticChecked}
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        void toggle();
      }}
    >
      {showText && <span>{optimisticChecked ? onText : offText}</span>}
      <i aria-hidden="true" />
    </button>
  );
}

function StatusText({
  checked,
  offText,
  onText,
}: {
  checked: boolean;
  offText: string;
  onText: string;
}) {
  return <span className={`conversation-status-text ${checked ? "on" : ""}`}>{checked ? onText : offText}</span>;
}

function StatusToggleRow({
  checked,
  disabled,
  label,
  offText,
  onText,
  onToggle,
}: {
  checked: boolean;
  disabled?: boolean;
  label: string;
  offText: string;
  onText: string;
  onToggle?: (checked: boolean) => Promise<void> | void;
}) {
  return (
    <div className="group-management-status-row">
      <span>{label}</span>
      <ToggleStatusControl
        checked={checked}
        disabled={disabled}
        offText={offText}
        onText={onText}
        onToggle={onToggle}
      />
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
    ["allowQrCodeJoin", t("messages.conversationInfo.settings.allowQrCodeJoin"), settings.allowQrCodeJoin],
    ["requireApproval", t("messages.conversationInfo.settings.requireApproval"), settings.requireApproval],
    ["allowMemberModifyTitle", t("messages.conversationInfo.settings.allowMemberModifyTitle"), settings.allowMemberModifyTitle],
    ["allowMemberInvite", t("messages.conversationInfo.settings.allowMemberInvite"), settings.allowMemberInvite],
    ["allowMemberAtAll", t("messages.conversationInfo.settings.allowMemberAtAll"), settings.allowMemberAtAll],
    ["allowMemberAddFriend", t("messages.conversationInfo.settings.allowMemberAddFriend"), settings.allowMemberAddFriend],
    ["allowMemberViewMemberList", t("messages.conversationInfo.settings.allowMemberViewMemberList"), settings.allowMemberViewMemberList],
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

function firstProfileValue(...values: unknown[]) {
  for (const value of values) {
    const text = typeof value === "string" ? value.trim() : "";
    if (text) return text;
  }
  return "";
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
