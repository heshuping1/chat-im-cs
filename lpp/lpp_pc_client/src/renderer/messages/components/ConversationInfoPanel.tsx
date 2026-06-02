import {
  BellOff,
  Check,
  Crown,
  FileText,
  LogOut,
  Megaphone,
  Pin,
  Shield,
  ShieldOff,
  Trash2,
  UserMinus,
  UserPlus,
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
import { effectiveConversationUnreadCount, type CurrentUserIdentity } from "../../data/message-display";
import type { ContactItem } from "../../data/types";
import { formatChatTime } from "../../lib/format";
import { renderWechatEmojiText } from "../../lib/wechatEmoji";
import type { MessageGroupManagement } from "../hooks/useMessageGroupManagement";
import {
  canManageGroupMember,
  compactGroupNames,
  groupMemberRoleRank,
  groupRoleLabel,
  normalizeGroupRole,
} from "../models/groupManagementModel";
import type { GroupConversationAvatar } from "../models/groupAvatarTypes";
import { ConversationAvatar } from "./ConversationListParts";

const groupInfoTabs = ["资料", "成员", "公告", "文件", "管理"] as const;
type GroupInfoTab = (typeof groupInfoTabs)[number];

export function ConversationInfoPanel({
  avatarUrl,
  contact,
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
  const [activeTab, setActiveTab] = useState<GroupInfoTab>("资料");
  const [expanded, setExpanded] = useState(true);

  useEffect(() => {
    setActiveTab("资料");
  }, [conversation?.conversationId]);

  if (!conversation) {
    return (
      <aside className="e-profile-panel message-info-panel">
        <header className="customer-info-head">
          <h2>会话信息</h2>
        </header>
        <PanelState text="请选择一个会话查看详情" />
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
        title="客户信息"
        variant="im"
      />
    );
  }

  const members = groupMembers ?? [];
  const unread = effectiveConversationUnreadCount(conversation, userIdentity);
  return (
    <aside
      className="e-profile-panel customer-info-panel message-info-panel"
      onDragOver={onDragOver}
      onDrop={onDrop}
    >
      <header className="customer-info-head">
        <h2>群聊资料</h2>
        {headerActions && <div className="customer-info-head-actions">{headerActions}</div>}
      </header>
      <section className="customer-info-card">
        <div className="customer-info-identity">
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
              <span>群聊</span>
              {unread > 0 && <span>{unread} 条未读</span>}
            </p>
          </div>
        </div>
        <nav className="customer-info-tabs group-info-tabs" aria-label="会话信息页签">
          {groupInfoTabs.map((tab) => (
            <button
              className={activeTab === tab ? "active" : ""}
              type="button"
              key={tab}
              onClick={() => setActiveTab(tab)}
            >
              {tab}
            </button>
          ))}
        </nav>
        <GroupInfoTabContent
          conversation={conversation}
          expanded={expanded}
          groupManagement={groupManagement}
          loadingGroupMembers={loadingGroupMembers}
          members={members}
          tab={activeTab}
          unread={unread}
        />
      </section>
      {activeTab === "资料" && (
        <button
          className="message-info-collapse"
          type="button"
          onClick={() => setExpanded((value) => !value)}
        >
          {expanded ? "收起群聊信息" : "展开群聊信息"}
        </button>
      )}
    </aside>
  );
}

function GroupInfoTabContent({
  conversation,
  expanded,
  groupManagement,
  loadingGroupMembers,
  members,
  tab,
  unread,
}: {
  conversation: ConversationListItem;
  expanded: boolean;
  groupManagement?: MessageGroupManagement;
  loadingGroupMembers: boolean;
  members: GroupMemberDto[];
  tab: GroupInfoTab;
  unread: number;
}) {
  if (tab === "成员") {
    return (
      <GroupMembersTab
        groupManagement={groupManagement}
        loading={loadingGroupMembers}
        members={members}
      />
    );
  }
  if (tab === "公告") {
    return <GroupAnnouncementsTab groupManagement={groupManagement} />;
  }
  if (tab === "文件") {
    return <GroupFilesTab groupManagement={groupManagement} />;
  }
  if (tab === "管理") {
    return <GroupManagementTab conversation={conversation} groupManagement={groupManagement} />;
  }
  return (
    <>
      <GroupSummaryRows
        conversation={conversation}
        groupManagement={groupManagement}
        members={members}
        unread={unread}
      />
      {expanded && (
        <section className="customer-info-block group-info-overview">
          <h3>群聊概览</h3>
          <div className="customer-info-rows">
            <InfoRow label="置顶" value={conversation.isPinned ? "已置顶" : "--"} />
            <InfoRow label="未读" value={String(unread)} />
            <InfoRow label="最后时间" value={formatChatTime(conversation.lastMessage?.sentAt)} />
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
  unread,
}: {
  conversation: ConversationListItem;
  groupManagement?: MessageGroupManagement;
  members: GroupMemberDto[];
  unread: number;
}) {
  const ownerName =
    groupManagement?.detail?.ownerDisplayName ||
    conversation.ownerDisplayName ||
    members.find((member) => groupMemberRoleRank(member) === 0)?.displayName;
  const adminNames = members
    .filter((member) => groupMemberRoleRank(member) === 1)
    .map((member) => member.displayName)
    .filter(Boolean);
  const role = groupManagement?.role ?? normalizeGroupRole(conversation.myRole);
  return (
    <>
      <div className="customer-info-rows">
        <InfoRow label="会话类型" value="群聊" />
        <InfoRow
          label="成员"
          value={String(groupManagement?.detail?.memberCount ?? conversation.memberCount ?? (members.length || "--"))}
        />
        <InfoRow label="群主" value={ownerName || "--"} />
        <InfoRow label="群管理员" value={adminNames.length > 0 ? compactGroupNames(adminNames) : "--"} />
        <InfoRow label="我的角色" value={groupRoleLabel(role)} />
        <InfoRow label="免打扰" value={conversation.isMuted ? "已开启" : "未开启"} />
        <InfoRow label="未读" value={String(unread)} />
        <InfoRow label="最近消息" value={renderWechatEmojiText(conversation.lastMessage?.preview || "--")} />
      </div>
      <div className="customer-info-tags">
        <span>群聊</span>
        <span>{groupRoleLabel(role)}</span>
        {groupManagement?.detail?.muteMode === "all_muted" || groupManagement?.detail?.muteMode === 1 ? (
          <span>全员禁言</span>
        ) : null}
      </div>
    </>
  );
}

function GroupMembersTab({
  groupManagement,
  loading,
  members,
}: {
  groupManagement?: MessageGroupManagement;
  loading: boolean;
  members: GroupMemberDto[];
}) {
  const [keyword, setKeyword] = useState("");
  const [inviteIds, setInviteIds] = useState("");
  const role = groupManagement?.role ?? "member";
  const visibleMembers = useMemo(() => {
    const normalized = keyword.trim().toLowerCase();
    const sorted = [...members].sort((left, right) => groupMemberRoleRank(left) - groupMemberRoleRank(right));
    if (!normalized) return sorted;
    return sorted.filter((member) =>
      [member.displayName, member.lppId, member.userId].some((value) =>
        `${value ?? ""}`.toLowerCase().includes(normalized),
      ),
    );
  }, [keyword, members]);
  const submitInvite = () => {
    const ids = inviteIds
      .split(/[\s,，]+/)
      .map((item) => item.trim())
      .filter(Boolean);
    if (ids.length === 0) return;
    groupManagement?.actions.addMembers(ids);
    setInviteIds("");
  };
  return (
    <div className="group-management-pane">
      <label className="group-management-search">
        <span>搜索成员</span>
        <input value={keyword} onChange={(event) => setKeyword(event.target.value)} placeholder="昵称 / LPP ID" />
      </label>
      {groupManagement?.permissions.canManageMembers && (
        <div className="group-management-inline-form">
          <input
            value={inviteIds}
            onChange={(event) => setInviteIds(event.target.value)}
            placeholder="输入 userId，多个用逗号分隔"
          />
          <button type="button" onClick={submitInvite}>
            <UserPlus size={14} />
            邀请
          </button>
        </div>
      )}
      {loading && <PanelState text="正在加载群成员..." />}
      {!loading && visibleMembers.length === 0 && <PanelState text="暂无群成员" />}
      <div className="group-member-list">
        {visibleMembers.map((member) => (
          <GroupMemberRow
            actorRole={role}
            groupManagement={groupManagement}
            key={member.userId}
            member={member}
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
}: {
  actorRole: "owner" | "admin" | "member";
  groupManagement?: MessageGroupManagement;
  member: GroupMemberDto;
}) {
  const targetRole = normalizeGroupRole(member.role ?? member.memberRole);
  const canRemove = canManageGroupMember({ actorRole, targetRole, action: "remove" });
  const canPromote = canManageGroupMember({ actorRole, targetRole, action: "promote" });
  const canDemote = canManageGroupMember({ actorRole, targetRole, action: "demote" });
  const canMute = canManageGroupMember({ actorRole, targetRole, action: "mute" });
  const canTransfer = canManageGroupMember({ actorRole, targetRole, action: "transfer" });
  return (
    <div className="group-member-row">
      <PcAvatar avatarUrl={member.avatarUrl} className="e-avatar" name={member.displayName} />
      <div>
        <strong>{member.displayName || "群成员"}</strong>
        <span>{[groupRoleLabel(targetRole), member.isMuted ? "已禁言" : ""].filter(Boolean).join(" · ")}</span>
      </div>
      <div className="group-member-actions">
        {canPromote && (
          <button type="button" onClick={() => groupManagement?.actions.setMemberRole(member.userId, "admin")}>
            <Shield size={13} />
            设管理
          </button>
        )}
        {canDemote && (
          <button type="button" onClick={() => groupManagement?.actions.setMemberRole(member.userId, "member")}>
            <ShieldOff size={13} />
            取消管理
          </button>
        )}
        {canMute && (
          <button type="button" onClick={() => groupManagement?.actions.setMemberMute(member.userId, !member.isMuted)}>
            <VolumeX size={13} />
            {member.isMuted ? "解禁" : "禁言"}
          </button>
        )}
        {canTransfer && (
          <button
            type="button"
            onClick={() =>
              confirmDanger(`确认把群主转让给 ${member.displayName || "该成员"}？`) &&
              groupManagement?.actions.transferOwner(member.userId)
            }
          >
            <Crown size={13} />
            转让
          </button>
        )}
        {canRemove && (
          <button
            className="danger"
            type="button"
            onClick={() =>
              confirmDanger(`确认将 ${member.displayName || "该成员"} 移出群聊？`) &&
              groupManagement?.actions.removeMember(member.userId)
            }
          >
            <UserMinus size={13} />
            移除
          </button>
        )}
      </div>
    </div>
  );
}

function GroupAnnouncementsTab({ groupManagement }: { groupManagement?: MessageGroupManagement }) {
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
          <textarea value={content} onChange={(event) => setContent(event.target.value)} placeholder="发布群公告" />
          <button type="button" onClick={submit}>
            <Megaphone size={14} />
            发布
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
          />
        ))
      ) : (
        <PanelState text="暂无群公告" />
      )}
    </div>
  );
}

function GroupAnnouncementItem({
  canManage,
  groupManagement,
  item,
}: {
  canManage: boolean;
  groupManagement?: MessageGroupManagement;
  item: GroupAnnouncementDto;
}) {
  const [editing, setEditing] = useState(false);
  const [content, setContent] = useState(item.content);
  return (
    <article className="group-announcement-item">
      <header>
        <strong>{item.title || "群公告"}</strong>
        {item.isPinned && <span>置顶</span>}
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
              {editing ? "保存" : "编辑"}
            </button>
            <button
              className="danger"
              type="button"
              onClick={() =>
                confirmDanger("确认删除这条群公告？") &&
                groupManagement?.actions.deleteAnnouncement(item.announcementId)
              }
            >
              删除
            </button>
          </>
        )}
      </footer>
    </article>
  );
}

function GroupFilesTab({ groupManagement }: { groupManagement?: MessageGroupManagement }) {
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
            {groupFileFilterLabel(filter)}
          </button>
        ))}
      </div>
      {files.length === 0 && <PanelState text="暂无群文件" />}
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
}: {
  conversation: ConversationListItem;
  groupManagement?: MessageGroupManagement;
}) {
  const settings = groupManagement?.settings ?? {};
  const [title, setTitle] = useState(groupManagement?.detail?.title || conversation.title);
  useEffect(() => {
    setTitle(groupManagement?.detail?.title || conversation.title);
  }, [conversation.title, groupManagement?.detail?.title]);
  return (
    <div className="group-management-pane">
      <div className="group-management-inline-form">
        <input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="群名称" />
        <button
          type="button"
          disabled={!groupManagement?.permissions.canManageSettings || !title.trim()}
          title={groupManagement?.permissions.canManageSettings ? "保存群名称" : "仅群主或管理员可修改"}
          onClick={() => groupManagement?.actions.updateGroupTitle(title.trim())}
        >
          保存
        </button>
      </div>
      <div className="group-management-actions">
        <ActionButton icon={<Pin size={14} />} label={conversation.isPinned ? "取消置顶" : "置顶群聊"} onClick={() => groupManagement?.actions.setPinned(!conversation.isPinned)} />
        <ActionButton icon={<BellOff size={14} />} label={conversation.isMuted ? "关闭免打扰" : "开启免打扰"} onClick={() => groupManagement?.actions.setMuted(!conversation.isMuted)} />
        <ActionButton
          disabled={!groupManagement?.permissions.canManageSettings}
          icon={<VolumeX size={14} />}
          label={isAllMuted(groupManagement) ? "关闭全员禁言" : "开启全员禁言"}
          onClick={() => groupManagement?.actions.setMuteMode(!isAllMuted(groupManagement))}
        />
      </div>
      <section className="group-management-settings">
        <h3>群设置</h3>
        {groupSettingRows(settings).map((row) => (
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
        <h3>入群申请</h3>
        {groupManagement?.joinRequests.length ? (
          groupManagement.joinRequests.map((request) => (
            <div className="group-join-request-row" key={request.requestId}>
              <span>{request.applicantDisplayName || request.applicantUserId || "申请人"}</span>
              <em>{request.message || "申请加入群聊"}</em>
              <button
                type="button"
                disabled={!groupManagement.permissions.canManageJoinRequests}
                onClick={() => groupManagement.actions.approveJoinRequest(request.requestId)}
              >
                <Check size={13} />
                通过
              </button>
              <button
                type="button"
                disabled={!groupManagement.permissions.canManageJoinRequests}
                onClick={() => groupManagement.actions.rejectJoinRequest(request.requestId)}
              >
                拒绝
              </button>
            </div>
          ))
        ) : (
          <PanelState text="暂无入群申请" />
        )}
      </section>
      <div className="group-management-danger">
        <ActionButton
          disabled={!groupManagement?.permissions.canLeave}
          icon={<LogOut size={14} />}
          label="退出群聊"
          onClick={() => confirmDanger("确认退出该群聊？") && groupManagement?.actions.leaveGroup()}
        />
        <ActionButton
          danger
          disabled={!groupManagement?.permissions.canDisband}
          icon={<Trash2 size={14} />}
          label="解散群聊"
          onClick={() => confirmDanger("确认解散该群聊？此操作不可恢复。") && groupManagement?.actions.disbandGroup()}
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

function InfoRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="customer-info-row">
      <span>{label}</span>
      <strong>{value || "--"}</strong>
    </div>
  );
}

function groupSettingRows(settings: GroupSettingsDto) {
  return [
    ["allowMemberInvite", "允许成员邀请", settings.allowMemberInvite],
    ["allowMemberModifyTitle", "允许成员改群名", settings.allowMemberModifyTitle],
    ["allowMemberAtAll", "允许成员 @所有人", settings.allowMemberAtAll],
    ["allowMemberViewMemberList", "允许查看成员列表", settings.allowMemberViewMemberList],
    ["allowQrCodeJoin", "允许二维码入群", settings.allowQrCodeJoin],
    ["requireApproval", "入群需要审批", settings.requireApproval],
    ["allowMemberAddFriend", "允许成员互加好友", settings.allowMemberAddFriend],
  ].map(([key, label, value]) => ({
    key: key as keyof GroupSettingsDto,
    label: label as string,
    value: Boolean(value),
  }));
}

function groupFileFilterLabel(filter: string) {
  if (filter === "image") return "图片";
  if (filter === "video") return "视频";
  if (filter === "voice") return "语音";
  if (filter === "file") return "文件";
  return "全部";
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
  if (typeof window === "undefined") return true;
  return window.confirm(message);
}
