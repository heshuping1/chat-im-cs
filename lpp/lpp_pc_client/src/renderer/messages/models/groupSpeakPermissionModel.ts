import type { GroupDetailDto } from "../../data/api-client";
import type { GroupRole } from "./groupManagementModel";

export type GroupSpeakPermissionGate = {
  disabled: boolean;
  reason?: "all_muted";
};

export type GroupSpeakPermissionInput = {
  conversationType?: "direct" | "group";
  detailLoaded: boolean;
  groupRole?: GroupRole | null;
  membershipRole?: number | string | null;
  muteMode?: GroupDetailDto["muteMode"];
};

export function isGroupAllMuted(muteMode: GroupDetailDto["muteMode"] | undefined) {
  return muteMode === "all_muted" || muteMode === 1 || muteMode === "1";
}

export function canGroupRoleBypassAllMute(role?: GroupRole | null) {
  return role === "owner" || role === "admin";
}

export function canTenantRoleBypassAllMute(role?: number | string | null) {
  if (role === null || role === undefined || role === "") return false;
  const numericRole = Number(role);
  return Number.isFinite(numericRole) && numericRole >= 2;
}

export function resolveGroupSpeakPermissionGate({
  conversationType,
  detailLoaded,
  groupRole,
  membershipRole,
  muteMode,
}: GroupSpeakPermissionInput): GroupSpeakPermissionGate {
  if (conversationType !== "group") return { disabled: false };
  if (!detailLoaded) return { disabled: false };
  if (!isGroupAllMuted(muteMode)) return { disabled: false };
  if (canGroupRoleBypassAllMute(groupRole)) return { disabled: false };
  if (canTenantRoleBypassAllMute(membershipRole)) return { disabled: false };
  return { disabled: true, reason: "all_muted" };
}
