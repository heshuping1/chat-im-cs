import type {
  ConversationListItem,
  DepartmentDto,
  DepartmentMemberDto,
  FriendDto,
  FriendRequestDto,
  TenantMemberDto,
} from "./api-client";
import type { ContactFilter, ContactItem, ContactKind } from "./types";
import { formatShortDate } from "../lib/format";

export type ContactDirectoryViewMode = "staff" | "customer";
type ContactDirectoryBucket = Exclude<ContactFilter, "all" | "requests" | "staff">;

export interface ContactDirectoryEntry {
  key: ContactFilter;
  label: string;
  count?: number;
  kind: "fixed" | "shortcut";
}

export interface OrganizationRoleGroup {
  key: string;
  label: string;
  count: number;
  contacts: ContactItem[];
}

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

export function normalizeContactDirectoryFilter(filter: ContactFilter): ContactFilter {
  return filter === "staff" ? "organization" : filter;
}

export function resolveContactDirectoryFilter({
  filter,
  viewMode,
  canReadOrganization,
}: {
  filter: ContactFilter;
  viewMode: ContactDirectoryViewMode;
  canReadOrganization: boolean;
}): ContactFilter {
  const normalized = normalizeContactDirectoryFilter(filter);
  if (viewMode === "customer") {
    if (normalized === "customer" || normalized === "organization") return "all";
    return normalized;
  }
  if (normalized === "organization" && !canReadOrganization) return "customer";
  return normalized;
}

export function createContactDirectoryEntries({
  contacts,
  requestCount,
  viewMode,
  canReadOrganization,
}: {
  contacts: ContactItem[];
  requestCount: number;
  viewMode: ContactDirectoryViewMode;
  canReadOrganization: boolean;
}) {
  const counts = countContactsByFilter(contacts);
  const fixed: ContactDirectoryEntry[] = [
    { key: "requests", label: "新的朋友", count: requestCount, kind: "fixed" },
    { key: "all", label: "全部联系人", count: counts.all, kind: "fixed" },
  ];
  const shortcuts: ContactDirectoryEntry[] =
    viewMode === "customer"
      ? [
          { key: "friend", label: "好友", count: counts.friend, kind: "shortcut" },
          { key: "group", label: "群聊", count: counts.group, kind: "shortcut" },
        ]
      : [
          { key: "customer", label: "客户", count: counts.customer, kind: "shortcut" },
          { key: "friend", label: "好友", count: counts.friend, kind: "shortcut" },
          ...(canReadOrganization
            ? [
                {
                  key: "organization" as ContactFilter,
                  label: "组织",
                  count: counts.organization,
                  kind: "shortcut" as const,
                },
              ]
            : []),
          { key: "group", label: "群聊", count: counts.group, kind: "shortcut" },
        ];
  return { fixed, shortcuts };
}

export function contactDirectorySearchPlaceholder({
  viewMode,
  canReadOrganization,
}: {
  viewMode: ContactDirectoryViewMode;
  canReadOrganization: boolean;
}) {
  if (viewMode === "customer") return "搜索好友、群聊";
  return canReadOrganization ? "搜索客户、好友、组织、群聊" : "搜索客户、好友、群聊";
}

export function contactDirectoryEmptyText({
  filter,
  viewMode,
}: {
  filter: ContactFilter;
  viewMode: ContactDirectoryViewMode;
}) {
  if (filter === "requests") return "暂无好友申请";
  if (viewMode === "customer") {
    if (filter === "friend") return "暂无好友，可以通过新的朋友添加联系人。";
    if (filter === "group") return "暂无群聊。";
    return "暂无联系人，可以先处理新的朋友或添加好友。";
  }
  if (filter === "customer") return "暂无客户联系人";
  if (filter === "organization") return "暂无组织成员";
  if (filter === "group") return "暂无群聊";
  if (filter === "friend") return "暂无好友";
  return "暂无通讯录数据";
}

export function filterContacts(contacts: ContactItem[], keyword: string) {
  const text = keyword.trim().toLowerCase();
  if (!text) return contacts;
  return contacts.filter((item) =>
    [
      item.name,
      item.subtitle,
      item.remark,
      item.lppId,
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

export function contactMatchesDirectoryFilter(
  contact: ContactItem,
  filter: ContactFilter,
) {
  const normalized = normalizeContactDirectoryFilter(filter);
  if (normalized === "all") return true;
  if (normalized === "requests") return false;
  if (normalized === "staff") {
    return contactDirectoryFilters(contact).includes("organization");
  }
  return contactDirectoryFilters(contact).includes(normalized);
}

export function mapContacts({
  friends,
  members,
  conversations,
  departments,
  departmentMembersById,
  currentUserId,
  viewMode = "staff",
}: {
  friends: FriendDto[];
  members: TenantMemberDto[];
  conversations: ConversationListItem[];
  departments: DepartmentDto[];
  departmentMembersById: Record<string, DepartmentMemberDto[]>;
  currentUserId?: string;
  viewMode?: ContactDirectoryViewMode;
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
      directoryFilters: ["group"],
      name: item.title || "未命名群聊",
      subtitle: `群聊 · ${item.memberCount ?? "--"} 人`,
      remark: item.lastMessage?.preview ?? "群聊会话",
      tags: ["群聊", item.isMuted ? "免打扰" : "正常提醒"],
      members: item.memberCount ?? undefined,
      avatarUrl: item.avatarUrl,
      lastMessagePreview: item.lastMessage?.preview,
      lastMessageAt: item.lastMessage?.sentAt,
      muted: item.isMuted,
    }));

  const friendContacts: ContactItem[] = friends.map((friend) => {
    const kind: ContactKind =
      viewMode === "customer" ? "friend" : friend.userType === 1 ? "customer" : "friend";
    const directoryFilters: ContactDirectoryBucket[] =
      viewMode === "customer"
        ? ["friend"]
        : friend.userType === 1
          ? ["customer", "friend"]
          : ["friend"];
    const lppId = friend.lppId || friend.lppNo || friend.lppNumber;
    return {
      id: `friend-${friend.friendUserId}`,
      userId: friend.friendUserId,
      lppId,
      conversationId: directByPeer.get(friend.friendUserId),
      kind,
      directoryFilters,
      name: friend.remarkName || friend.displayName || "好友",
      subtitle: `${kind === "customer" ? "客户" : "好友"}${friend.groupName ? ` · ${friend.groupName}` : ""}`,
      remark: friend.createdAt ? `添加于 ${formatShortDate(friend.createdAt)}` : "好友关系",
      tags: [kind === "customer" ? "客户" : "好友", friend.groupName ?? ""].filter(Boolean),
      avatarUrl: friend.avatarUrl,
      groupName: friend.groupName,
      createdAt: friend.createdAt,
    };
  });

  const memberContacts: ContactItem[] = members
    .filter((member) => member.userId !== currentUserId)
    .map((member) => {
      const department = departmentByMember.get(member.userId);
      const lppId = member.lppId || member.lppNo || member.lppNumber || undefined;
      return {
        id: `staff-${member.userId}`,
        userId: member.userId,
        lppId,
        conversationId: directByPeer.get(member.userId),
        kind: "staff",
        directoryFilters: ["organization"],
        name: member.displayName || "企业成员",
        subtitle: `员工 · ${membershipRoleLabel(member.membershipRole)}`,
        remark: member.joinedAt ? `加入于 ${formatShortDate(member.joinedAt)}` : "企业成员",
        tags: ["员工", membershipRoleLabel(member.membershipRole)],
        avatarUrl: member.avatarUrl,
        departmentId: department?.id,
        departmentName: department?.name,
        position: department?.position,
        roleLabel: membershipRoleLabel(member.membershipRole),
        roleRank: membershipRoleRank(member.membershipRole),
        joinedAt: member.joinedAt,
        source: "企业组织",
      };
    });

  return [...friendContacts, ...memberContacts, ...groupContacts];
}

function countContactsByFilter(contacts: ContactItem[]) {
  return contacts.reduce(
    (result, contact) => {
      result.all += 1;
      for (const filter of contactDirectoryFilters(contact)) {
        result[filter] += 1;
      }
      return result;
    },
    { all: 0, customer: 0, friend: 0, group: 0, organization: 0 },
  );
}

function contactDirectoryFilters(contact: ContactItem): ContactDirectoryBucket[] {
  if (contact.directoryFilters?.length) return contact.directoryFilters;
  return [contact.kind === "staff" ? "organization" : contact.kind];
}

export function sourceLabel(contact: ContactItem) {
  return contact.source || "--";
}

export function contactRowSubtitle(contact: ContactItem) {
  if (contact.kind === "customer") return ["客户", contact.groupName].filter(Boolean).join(" · ");
  if (contact.kind === "staff") {
    return [contact.departmentName || "企业成员", contact.position].filter(Boolean).join(" · ");
  }
  if (contact.kind === "group") {
    return `${contact.members ?? "--"} 人 · ${contact.muted ? "免打扰" : "正常提醒"}`;
  }
  return ["好友", contact.groupName].filter(Boolean).join(" · ");
}

export function contactRowHint(contact: ContactItem) {
  if (contact.kind === "customer") {
    return contact.createdAt ? `添加于 ${formatShortDate(contact.createdAt)}` : "客户好友";
  }
  if (contact.kind === "staff") {
    return [contact.position, contact.lppId].filter(Boolean).join(" · ") || "企业成员";
  }
  if (contact.kind === "group") return contact.lastMessagePreview || "暂无最近消息";
  return contact.remark || "好友关系";
}

export function contactKindBadge(contact: ContactItem) {
  if (contact.kind === "staff") return contact.roleLabel || "员工";
  if (contact.kind === "group") return contact.members ? `${contact.members}人` : "群聊";
  return contactKindLabels[contact.kind];
}

export function groupOrganizationContactsByRole(
  contacts: ContactItem[],
): OrganizationRoleGroup[] {
  const roleGroups = new Map<
    string,
    { rank: number; label: string; contacts: ContactItem[] }
  >();
  for (const contact of contacts) {
    const label = contact.roleLabel || "成员";
    const group = roleGroups.get(label);
    if (group) {
      group.contacts.push(contact);
      group.rank = Math.min(group.rank, contact.roleRank ?? roleLabelRank(label));
    } else {
      roleGroups.set(label, {
        rank: contact.roleRank ?? roleLabelRank(label),
        label,
        contacts: [contact],
      });
    }
  }
  return [...roleGroups.entries()]
    .map(([key, group]) => ({
      key,
      label: group.label,
      count: group.contacts.length,
      contacts: group.contacts,
      rank: group.rank,
    }))
    .sort((left, right) => left.rank - right.rank || left.label.localeCompare(right.label, "zh-CN"))
    .map((group) => ({
      key: group.key,
      label: group.label,
      count: group.count,
      contacts: group.contacts,
    }));
}

function membershipRoleLabel(role?: number) {
  if (role === 4) return "所有者";
  if (role === 3) return "管理员";
  if (role === 2) return "客服";
  if (role === 1) return "技术支持";
  return "成员";
}

function membershipRoleRank(role?: number) {
  if (role === 4) return 10;
  if (role === 3) return 20;
  if (role === 2) return 30;
  if (role === 1) return 40;
  return 50;
}

function roleLabelRank(label: string) {
  if (label === "所有者") return 10;
  if (label === "管理员") return 20;
  if (label === "客服") return 30;
  if (label === "技术支持") return 40;
  if (label === "成员") return 50;
  return 90;
}
