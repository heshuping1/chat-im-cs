import type { ConversationListItem, GroupDetailDto, GroupMemberDto, GroupSettingsDto } from "../../data/api-client";

export type GroupRole = "owner" | "admin" | "member";
export type GroupInfoTabKey = "profile" | "members" | "announcements" | "files" | "management";

export type GroupManagementPermissions = {
  canManageAnnouncements: boolean;
  canManageMembers: boolean;
  canManageSettings: boolean;
  canManageJoinRequests: boolean;
  canMuteMembers: boolean;
  canTransferOwner: boolean;
  canDisband: boolean;
  canLeave: boolean;
};

export type GroupInfoVisibilityInput = {
  role: GroupRole;
  settings?: Pick<
    GroupSettingsDto,
    | "allowMemberAddFriend"
    | "allowMemberAtAll"
    | "allowMemberInvite"
    | "allowMemberModifyTitle"
    | "allowMemberViewMemberList"
  > | null;
};

export function normalizeGroupRole(role?: string | number | null): GroupRole {
  const value = `${role ?? ""}`.trim().toLowerCase();
  if (value.includes("owner") || value.includes("\u7fa4\u4e3b")) return "owner";
  if (value.includes("admin") || value.includes("\u7ba1\u7406\u5458")) return "admin";
  return "member";
}

export function groupRoleLabel(role?: string | number | null) {
  const normalized = normalizeGroupRole(role);
  if (normalized === "owner") return "Owner";
  if (normalized === "admin") return "Admin";
  return "Member";
}

export function groupMemberRoleRank(member: GroupMemberDto) {
  const role = normalizeGroupRole(member.role ?? member.memberRole);
  if (role === "owner") return 0;
  if (role === "admin") return 1;
  return 2;
}

export function groupMemberDisplayName(member?: GroupMemberDto | null) {
  if (!member) return "";
  return (
    usableGroupMemberName(member.groupAlias) ||
    usableGroupMemberName(member.displayName) ||
    usableGroupMemberName(member.groupNickname) ||
    usableGroupMemberName(member.nickname) ||
    usableGroupMemberName((member as unknown as Record<string, unknown>).name) ||
    usableGroupMemberName((member as unknown as Record<string, unknown>).userName) ||
    member.userId ||
    ""
  );
}

export function groupMemberIdentityKeys(member: GroupMemberDto) {
  return [
    member.userId,
    member.platformUserId,
    member.lppId,
    member.groupAlias,
    member.groupNickname,
    member.nickname,
    member.displayName,
    (member as unknown as Record<string, unknown>).name,
    (member as unknown as Record<string, unknown>).userName,
  ]
    .map((value) => (typeof value === "string" ? value.trim().toLowerCase() : ""))
    .filter(Boolean);
}

export function resolveMyGroupRole({
  conversation,
  currentUserId,
  detail,
  members,
}: {
  conversation?: ConversationListItem;
  currentUserId?: string | null;
  detail?: GroupDetailDto | null;
  members?: GroupMemberDto[];
}) {
  const explicitRole = detail?.myRole ?? conversation?.myRole;
  if (explicitRole) return normalizeGroupRole(explicitRole);
  const currentMember = currentUserId
    ? members?.find((member) => member.userId === currentUserId)
    : undefined;
  return normalizeGroupRole(currentMember?.role ?? currentMember?.memberRole);
}

export function groupManagementPermissions(role: GroupRole): GroupManagementPermissions {
  const elevated = role === "owner" || role === "admin";
  return {
    canManageAnnouncements: elevated,
    canManageMembers: elevated,
    canManageSettings: elevated,
    canManageJoinRequests: elevated,
    canMuteMembers: elevated,
    canTransferOwner: role === "owner",
    canDisband: role === "owner",
    canLeave: role !== "owner",
  };
}

export function canViewGroupManagement(role: GroupRole) {
  return role === "owner" || role === "admin";
}

export function canViewGroupMemberList({ role, settings }: GroupInfoVisibilityInput) {
  if (canViewGroupManagement(role)) return true;
  return settings?.allowMemberViewMemberList !== false;
}

export function canModifyGroupTitle({ role, settings }: GroupInfoVisibilityInput) {
  if (canViewGroupManagement(role)) return true;
  return settings?.allowMemberModifyTitle === true;
}

export function canInviteGroupMembers({ role, settings }: GroupInfoVisibilityInput) {
  if (canViewGroupManagement(role)) return true;
  return settings?.allowMemberInvite === true;
}

export function canAddGroupMemberFriend({ role, settings }: GroupInfoVisibilityInput) {
  if (canViewGroupManagement(role)) return true;
  return settings?.allowMemberAddFriend !== false;
}

export function canMentionAllGroupMembers({ settings }: GroupInfoVisibilityInput) {
  return settings?.allowMemberAtAll === true;
}

export function visibleGroupInfoTabs(input: GroupInfoVisibilityInput): GroupInfoTabKey[] {
  const tabs: GroupInfoTabKey[] = ["profile"];
  if (canViewGroupMemberList(input)) tabs.push("members");
  tabs.push("announcements", "files");
  if (canViewGroupManagement(input.role)) tabs.push("management");
  return tabs;
}

export function canManageGroupMember({
  actorRole,
  targetRole,
  action,
}: {
  actorRole: GroupRole;
  targetRole: GroupRole;
  action: "remove" | "promote" | "demote" | "mute" | "transfer";
}) {
  if (actorRole === "member") return false;
  if (action === "transfer") return actorRole === "owner" && targetRole !== "owner";
  if (targetRole === "owner") return false;
  if (actorRole === "admin" && targetRole === "admin") return false;
  if (action === "demote") return actorRole === "owner" && targetRole === "admin";
  if (action === "promote") return actorRole === "owner" && targetRole === "member";
  return true;
}

export function compactGroupNames(names: string[]) {
  const compact = names.filter(Boolean);
  if (compact.length <= 3) return compact.join(", ");
  return `${compact.slice(0, 3).join(", ")} and ${compact.length} people`;
}

function usableGroupMemberName(value: unknown) {
  if (typeof value !== "string") return undefined;
  const text = value.trim();
  if (!text || text === "00000000-0000-0000-0000-000000000000") return undefined;
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(text)) {
    return undefined;
  }
  return text;
}
