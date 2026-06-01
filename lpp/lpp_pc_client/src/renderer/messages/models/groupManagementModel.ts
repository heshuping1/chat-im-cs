import type { ConversationListItem, GroupDetailDto, GroupMemberDto } from "../../data/api-client";

export type GroupRole = "owner" | "admin" | "member";

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

export function normalizeGroupRole(role?: string | number | null): GroupRole {
  const value = `${role ?? ""}`.trim().toLowerCase();
  if (value.includes("owner") || value.includes("群主")) return "owner";
  if (value.includes("admin") || value.includes("管理员")) return "admin";
  return "member";
}

export function groupRoleLabel(role?: string | number | null) {
  const normalized = normalizeGroupRole(role);
  if (normalized === "owner") return "群主";
  if (normalized === "admin") return "管理员";
  return "成员";
}

export function groupMemberRoleRank(member: GroupMemberDto) {
  const role = normalizeGroupRole(member.role ?? member.memberRole);
  if (role === "owner") return 0;
  if (role === "admin") return 1;
  return 2;
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
  if (compact.length <= 3) return compact.join("、");
  return `${compact.slice(0, 3).join("、")} 等 ${compact.length} 人`;
}
