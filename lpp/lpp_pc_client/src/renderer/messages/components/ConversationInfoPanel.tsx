import { useEffect, useState, type DragEvent, type ReactNode } from "react";

import { CustomerProfileWorkspace } from "../../components/CustomerProfileWorkspace";
import { PanelState } from "../../components/PanelState";
import type {
  ConversationListItem,
  CustomerProfileCard,
  FriendProfileExtraDto,
  GroupMemberDto,
} from "../../data/api-client";
import { effectiveConversationUnreadCount, type CurrentUserIdentity } from "../../data/message-display";
import type { ContactItem } from "../../data/types";
import { formatChatTime } from "../../lib/format";
import { renderWechatEmojiText } from "../../lib/wechatEmoji";
import type { GroupConversationAvatar } from "../models/groupAvatarTypes";
import { ConversationAvatar } from "./ConversationListParts";

export function ConversationInfoPanel({
  contact,
  conversation,
  groupAvatar,
  groupMembers,
  headerActions,
  loadingGroupMembers: _loadingGroupMembers = false,
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
  contact?: ContactItem | null;
  conversation?: ConversationListItem;
  groupAvatar?: GroupConversationAvatar;
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
  const [activeTab, setActiveTab] = useState("资料");
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
  const tabs = ["资料", "公告", "文件"];
  const unread = effectiveConversationUnreadCount(conversation, userIdentity);
  const selectedTab = tabs.includes(activeTab) ? activeTab : "资料";
  return (
    <aside
      className="e-profile-panel customer-info-panel message-info-panel"
      onDragOver={onDragOver}
      onDrop={onDrop}
    >
      <header className="customer-info-head">
        <h2>群聊资料</h2>
        {headerActions && (
          <div className="customer-info-head-actions">{headerActions}</div>
        )}
      </header>
      <section className="customer-info-card">
        <div className="customer-info-identity">
          <ConversationAvatar
            avatarUrl={conversation.avatarUrl}
            groupAvatar={groupAvatar}
            isGroup
            title={conversation.title}
            unread={unread}
          />
          <div>
            <strong>{conversation.title}</strong>
            <p>
              <span>群聊</span>
              {unread > 0 && <span>{unread} 条未读</span>}
            </p>
          </div>
        </div>
        <nav className="customer-info-tabs" aria-label="会话信息页签">
          {tabs.map((tab) => (
            <button
              className={selectedTab === tab ? "active" : ""}
              type="button"
              key={tab}
              onClick={() => setActiveTab(tab)}
            >
              {tab}
            </button>
          ))}
        </nav>
        {renderConversationInfoTab(selectedTab, conversation, unread, groupMembers ?? [])}
      </section>
      {selectedTab === "资料" && expanded && (
        <section className="customer-info-block">
          <h3>群聊概览</h3>
          <div className="customer-info-rows">
            <InfoRow label="置顶" value={conversation.isPinned ? "已置顶" : "--"} />
            <InfoRow label="未读" value={String(unread)} />
            <InfoRow label="最后时间" value={formatChatTime(conversation.lastMessage?.sentAt)} />
          </div>
        </section>
      )}
      {selectedTab === "资料" && (
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

function renderConversationInfoTab(
  tab: string,
  conversation: ConversationListItem,
  unread: number,
  groupMembers: GroupMemberDto[] = [],
) {
  if (tab === "公告") {
    return <PanelState text="暂无群公告" />;
  }
  if (tab === "文件") {
    return <PanelState text="暂无群文件" />;
  }

  const ownerName =
    conversation.ownerDisplayName ||
    groupMembers.find((member) => groupMemberRoleRank(member) === 0)?.displayName;
  const adminNames = groupMembers
    .filter((member) => groupMemberRoleRank(member) === 1)
    .map((member) => member.displayName)
    .filter(Boolean);
  return (
    <>
      <div className="customer-info-rows">
        <InfoRow label="会话类型" value="群聊" />
        <InfoRow label="成员" value={String(conversation.memberCount ?? "--")} />
        <InfoRow label="群主" value={ownerName || "--"} />
        <InfoRow label="群管理员" value={adminNames.length > 0 ? joinCompactNames(adminNames) : "--"} />
        <InfoRow label="我的角色" value={groupRoleLabel(conversation.myRole) || "--"} />
        <InfoRow label="免打扰" value={conversation.isMuted ? "已开启" : "未开启"} />
        <InfoRow label="最近消息" value={renderWechatEmojiText(conversation.lastMessage?.preview || "--")} />
      </div>
      <div className="customer-info-tags">
        {["群聊", "协作"].map((tag) => (
          <span key={tag}>{tag}</span>
        ))}
      </div>
    </>
  );
}

function groupMemberRoleRank(member: GroupMemberDto) {
  const role = `${member.role ?? member.memberRole ?? ""}`.toLowerCase();
  if (role.includes("owner") || role.includes("群主")) return 0;
  if (role.includes("admin") || role.includes("管理员")) return 1;
  return 2;
}

function groupRoleLabel(role?: string | null) {
  const normalized = `${role ?? ""}`.trim().toLowerCase();
  if (!normalized) return "成员";
  if (normalized.includes("owner") || normalized.includes("群主")) return "群主";
  if (normalized.includes("admin") || normalized.includes("管理员")) return "管理员";
  if (normalized.includes("member") || normalized.includes("成员")) return "成员";
  return role?.trim() || "成员";
}

function joinCompactNames(names: string[]) {
  if (names.length <= 3) return names.join("、");
  return `${names.slice(0, 3).join("、")}等 ${names.length} 人`;
}

function InfoRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="customer-info-row">
      <span>{label}</span>
      <strong>{value || "--"}</strong>
    </div>
  );
}
