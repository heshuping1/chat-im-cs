import type {
  ConversationListItem,
  DepartmentDto,
  DepartmentMemberDto,
  FriendDto,
  FriendRequestDto,
  TenantMemberDto,
} from "./api-client";
import type { ContactItem, ContactKind } from "./types";
import { formatShortDate } from "../lib/format";

export const contactKindLabels: Record<ContactKind, string> = {
  friend: "好友",
  group: "群聊",
  customer: "客户",
  staff: "员工",
};

export function requestStatusLabel(status?: string) {
  if (status === "accepted") return "已通过";
  if (status === "rejected") return "已拒绝";
  return "待处理";
}

export function filterContacts(contacts: ContactItem[], keyword: string) {
  const text = keyword.trim().toLowerCase();
  if (!text) return contacts;
  return contacts.filter((item) =>
    [
      item.name,
      item.subtitle,
      item.remark,
      item.departmentName,
      item.position,
      item.tags.join(" "),
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase()
      .includes(text),
  );
}

export function filterRequests(requests: FriendRequestDto[], keyword: string) {
  const text = keyword.trim().toLowerCase();
  if (!text) return requests;
  return requests.filter((item) =>
    [item.fromDisplayName, item.message, item.status, item.fromUserId]
      .filter(Boolean)
      .join(" ")
      .toLowerCase()
      .includes(text),
  );
}

export function mapContacts({
  friends,
  members,
  conversations,
  departments,
  departmentMembersById,
  currentUserId,
}: {
  friends: FriendDto[];
  members: TenantMemberDto[];
  conversations: ConversationListItem[];
  departments: DepartmentDto[];
  departmentMembersById: Record<string, DepartmentMemberDto[]>;
  currentUserId?: string;
}): ContactItem[] {
  const directByPeer = new Map(
    conversations
      .filter((item) => item.conversationType === "direct" && item.peerUserId)
      .map((item) => [item.peerUserId!, item.conversationId]),
  );
  const departmentByMember = new Map<
    string,
    { id: string; name: string; position?: string | null }
  >();
  for (const department of departments) {
    for (const member of departmentMembersById[department.departmentId] ?? []) {
      departmentByMember.set(member.userId, {
        id: department.departmentId,
        name: department.departmentName,
        position: member.position,
      });
    }
  }

  const groupContacts: ContactItem[] = conversations
    .filter((item) => item.conversationType === "group")
    .map((item) => ({
      id: `group-${item.conversationId}`,
      conversationId: item.conversationId,
      kind: "group",
      name: item.title || "未命名群聊",
      subtitle: `群聊 · ${item.memberCount ?? "--"} 人`,
      remark: item.lastMessage?.preview ?? "群聊会话",
      tags: ["群聊", item.isMuted ? "免打扰" : "正常提醒"],
      members: item.memberCount ?? undefined,
      avatarUrl: item.avatarUrl,
      source: "普通群聊",
      lastMessagePreview: item.lastMessage?.preview,
      lastMessageAt: item.lastMessage?.sentAt,
      muted: item.isMuted,
    }));

  const friendContacts: ContactItem[] = friends.map((friend) => {
    const kind: ContactKind = friend.userType === 1 ? "customer" : "friend";
    return {
      id: `friend-${friend.friendUserId}`,
      userId: friend.friendUserId,
      conversationId: directByPeer.get(friend.friendUserId),
      kind,
      name: friend.remarkName || friend.displayName || "好友",
      subtitle: `${kind === "customer" ? "客户" : "好友"}${friend.groupName ? ` · ${friend.groupName}` : ""}`,
      remark: friend.createdAt ? `添加于 ${formatShortDate(friend.createdAt)}` : "好友关系",
      tags: [kind === "customer" ? "客户" : "好友", friend.groupName ?? ""].filter(Boolean),
      avatarUrl: friend.avatarUrl,
      groupName: friend.groupName,
      createdAt: friend.createdAt,
      source: kind === "customer" ? "客户通讯录" : "好友通讯录",
    };
  });

  const memberContacts: ContactItem[] = members
    .filter((member) => member.userId !== currentUserId)
    .map((member) => {
      const department = departmentByMember.get(member.userId);
      return {
        id: `staff-${member.userId}`,
        userId: member.userId,
        conversationId: directByPeer.get(member.userId),
        kind: "staff",
        name: member.displayName || "企业成员",
        subtitle: `员工 · ${membershipRoleLabel(member.membershipRole)}`,
        remark: member.joinedAt ? `加入于 ${formatShortDate(member.joinedAt)}` : "企业成员",
        tags: ["员工", membershipRoleLabel(member.membershipRole)],
        avatarUrl: member.avatarUrl,
        departmentId: department?.id,
        departmentName: department?.name,
        position: department?.position,
        roleLabel: membershipRoleLabel(member.membershipRole),
        joinedAt: member.joinedAt,
        source: "企业组织",
      };
    });

  return [...friendContacts, ...memberContacts, ...groupContacts];
}

export function sourceLabel(contact: ContactItem) {
  if (contact.kind === "customer") return "客户通讯录";
  if (contact.kind === "group") return "群聊";
  if (contact.kind === "staff") return "企业组织";
  return "好友";
}

export function contactRowSubtitle(contact: ContactItem) {
  if (contact.kind === "customer") return `客户 · ${contact.groupName || "默认分组"}`;
  if (contact.kind === "staff") {
    return `${contact.roleLabel || "员工"} · ${contact.departmentName || "企业成员"}`;
  }
  if (contact.kind === "group") {
    return `${contact.members ?? "--"} 人 · ${contact.muted ? "免打扰" : "正常提醒"}`;
  }
  return `好友 · ${contact.groupName || "默认分组"}`;
}

export function contactRowHint(contact: ContactItem) {
  if (contact.kind === "customer") {
    return contact.createdAt ? `添加于 ${formatShortDate(contact.createdAt)}` : "客户好友";
  }
  if (contact.kind === "staff") {
    return [contact.position, contact.userId].filter(Boolean).join(" · ") || "企业成员";
  }
  if (contact.kind === "group") return contact.lastMessagePreview || "暂无最近消息";
  return contact.remark || "好友关系";
}

export function contactKindBadge(contact: ContactItem) {
  if (contact.kind === "staff") return contact.roleLabel || "员工";
  if (contact.kind === "group") return contact.members ? `${contact.members}人` : "群聊";
  return contactKindLabels[contact.kind];
}

function membershipRoleLabel(role?: number) {
  if (role === 4) return "所有者";
  if (role === 3) return "管理员";
  if (role === 2) return "客服";
  if (role === 1) return "技术支持";
  return "成员";
}
