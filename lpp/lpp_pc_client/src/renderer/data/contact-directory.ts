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
  friend: "contacts.page.kind.friend",
  group: "contacts.page.kind.group",
  customer: "contacts.page.kind.customer",
  staff: "contacts.page.kind.staff",
};

export function requestStatusLabel(status?: string) {
  if (status === "accepted") return "contacts.page.requestStatus.accepted";
  if (status === "rejected") return "contacts.page.requestStatus.rejected";
  return "contacts.page.requestStatus.pending";
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
    { key: "requests", label: "contacts.page.entry.requests", count: requestCount, kind: "fixed" },
    { key: "all", label: "contacts.page.entry.all", count: counts.all, kind: "fixed" },
  ];
  const shortcuts: ContactDirectoryEntry[] =
    viewMode === "customer"
      ? [
          { key: "friend", label: "contacts.page.entry.friend", count: counts.friend, kind: "shortcut" },
          { key: "group", label: "contacts.page.entry.group", count: counts.group, kind: "shortcut" },
        ]
      : [
          { key: "customer", label: "contacts.page.entry.customer", count: counts.customer, kind: "shortcut" },
          { key: "friend", label: "contacts.page.entry.friend", count: counts.friend, kind: "shortcut" },
          ...(canReadOrganization
            ? [
                {
                  key: "organization" as ContactFilter,
                  label: "contacts.page.entry.organization",
                  count: counts.organization,
                  kind: "shortcut" as const,
                },
              ]
            : []),
          { key: "group", label: "contacts.page.entry.group", count: counts.group, kind: "shortcut" },
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
  if (viewMode === "customer") return "contacts.page.search.customerMode";
  return canReadOrganization ? "contacts.page.search.staffWithOrganization" : "contacts.page.search.staffBasic";
}

export function contactDirectoryEmptyText({
  filter,
  viewMode,
}: {
  filter: ContactFilter;
  viewMode: ContactDirectoryViewMode;
}) {
  if (filter === "requests") return "contacts.page.empty.requests";
  if (viewMode === "customer") {
    if (filter === "friend") return "contacts.page.empty.customerFriend";
    if (filter === "group") return "contacts.page.empty.customerGroup";
    return "contacts.page.empty.customerAll";
  }
  if (filter === "customer") return "contacts.page.empty.customer";
  if (filter === "organization") return "contacts.page.empty.organization";
  if (filter === "group") return "contacts.page.empty.group";
  if (filter === "friend") return "contacts.page.empty.friend";
  return "contacts.page.empty.all";
}

export function filterContacts(contacts: ContactItem[], keyword: string) {
  const text = keyword.trim().toLowerCase();
  if (!text) return contacts;
  return contacts.filter((item) =>
    [
      item.name,
      item.subtitle,
      item.remark,
      item.greenBubbleNo,
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
      name: item.title || "contacts.page.unnamedGroup",
      subtitle: "contacts.page.kind.group",
      remark: item.lastMessage?.preview ?? "contacts.page.groupConversation",
      tags: ["contacts.page.kind.group", item.isMuted ? "contacts.reminder.muted" : "contacts.reminder.normal"],
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
    const greenBubbleNo = friend.greenBubbleNo;
    return {
      id: `friend-${friend.friendUserId}`,
      userId: friend.friendUserId,
      greenBubbleNo,
      conversationId: directByPeer.get(friend.friendUserId),
      kind,
      directoryFilters,
      name: friend.remarkName || friend.displayName || "contacts.page.kind.friend",
      subtitle: kind === "customer" ? "contacts.page.kind.customer" : "contacts.page.kind.friend",
      remark: "contacts.page.friendRelationship",
      tags: [kind === "customer" ? "contacts.page.kind.customer" : "contacts.page.kind.friend", friend.groupName ?? ""].filter(Boolean),
      avatarUrl: friend.avatarUrl,
      groupName: friend.groupName,
      createdAt: friend.createdAt,
    };
  });

  const memberContacts: ContactItem[] = members
    .filter((member) => member.userId !== currentUserId)
    .map((member) => {
      const department = departmentByMember.get(member.userId);
      return {
        id: `staff-${member.userId}`,
        userId: member.userId,
        greenBubbleNo: member.greenBubbleNo,
        conversationId: directByPeer.get(member.userId),
        kind: "staff",
        directoryFilters: ["organization"],
        name: member.displayName || "contacts.page.role.enterpriseMember",
        subtitle: "contacts.page.kind.staff",
        remark: "contacts.page.role.enterpriseMember",
        tags: ["contacts.page.kind.staff", membershipRoleLabel(member.membershipRole)],
        avatarUrl: member.avatarUrl,
        departmentId: department?.id,
        departmentName: department?.name,
        position: department?.position,
        roleLabel: membershipRoleLabel(member.membershipRole),
        roleRank: membershipRoleRank(member.membershipRole),
        joinedAt: member.joinedAt,
        source: "contacts.page.enterpriseOrganization",
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
  if (contact.kind === "customer") return ["contacts.page.kind.customer", contact.groupName].filter(Boolean).join(" · ");
  if (contact.kind === "staff") {
    return [contact.departmentName || "contacts.page.role.enterpriseMember", contact.position].filter(Boolean).join(" · ");
  }
  if (contact.kind === "group") {
    return "contacts.page.groupSubtitle";
  }
  return ["contacts.page.kind.friend", contact.groupName].filter(Boolean).join(" · ");
}

export function contactRowHint(contact: ContactItem) {
  if (contact.kind === "customer") {
    return contact.createdAt ? `contacts.page.addedAt:${formatShortDate(contact.createdAt)}` : "contacts.detail.customerFriend";
  }
  if (contact.kind === "staff") {
    return [contact.position, contact.greenBubbleNo].filter(Boolean).join(" · ") || "contacts.page.role.enterpriseMember";
  }
  if (contact.kind === "group") return contact.lastMessagePreview || "contacts.page.noRecentMessage";
  return contact.remark || "contacts.page.friendRelationship";
}

export function contactKindBadge(contact: ContactItem) {
  if (contact.kind === "staff") return contact.roleLabel || "contacts.page.kind.staff";
  if (contact.kind === "group") return contact.members ? `contacts.page.groupMemberBadge:${contact.members}` : "contacts.page.kind.group";
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
    const label = contact.roleLabel || "contacts.page.role.member";
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
  if (role === 4) return "contacts.page.role.owner";
  if (role === 3) return "contacts.page.role.admin";
  if (role === 2) return "contacts.page.role.customerService";
  if (role === 1) return "contacts.page.role.technicalSupport";
  return "contacts.page.role.member";
}

function membershipRoleRank(role?: number) {
  if (role === 4) return 10;
  if (role === 3) return 20;
  if (role === 2) return 30;
  if (role === 1) return 40;
  return 50;
}

function roleLabelRank(label: string) {
  if (label === "contacts.page.role.owner") return 10;
  if (label === "contacts.page.role.admin") return 20;
  if (label === "contacts.page.role.customerService") return 30;
  if (label === "contacts.page.role.technicalSupport") return 40;
  if (label === "contacts.page.role.member") return 50;
  return 90;
}
