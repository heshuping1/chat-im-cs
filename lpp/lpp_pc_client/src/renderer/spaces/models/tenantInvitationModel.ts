export type TenantInvitationTargetRole = 0 | 1 | 2 | 3;

export interface TenantInvitationRoleOption {
  label?: string;
  role: TenantInvitationTargetRole;
  labelKey: string;
  descriptionKey: string;
}

const roleOptions: TenantInvitationRoleOption[] = [
  {
    role: 0,
    label: "成员",
    labelKey: "tenantInvitation.roles.member",
    descriptionKey: "tenantInvitation.roleDescription.member",
  },
  {
    role: 1,
    label: "技术支持",
    labelKey: "tenantInvitation.roles.technicalSupport",
    descriptionKey: "tenantInvitation.roleDescription.technicalSupport",
  },
  {
    role: 2,
    label: "客服",
    labelKey: "tenantInvitation.roles.staff",
    descriptionKey: "tenantInvitation.roleDescription.staff",
  },
  {
    role: 3,
    label: "管理员",
    labelKey: "tenantInvitation.roles.admin",
    descriptionKey: "tenantInvitation.roleDescription.admin",
  },
];

export function tenantInvitationRoleOptionsFor(
  creatorMembershipRole?: number | null,
): TenantInvitationRoleOption[] {
  const role = Number.isFinite(creatorMembershipRole)
    ? Number(creatorMembershipRole)
    : 0;
  if (role === 4) return roleOptions;
  if (role === 3) {
    return roleOptions.filter((option) => option.role === 0 || option.role === 1 || option.role === 2);
  }
  return [];
}

export function canCreateTenantInvitations(creatorMembershipRole?: number | null) {
  const role = Number.isFinite(creatorMembershipRole)
    ? Number(creatorMembershipRole)
    : 0;
  return role === 3 || role === 4;
}

export function createTenantInvitationDefaults(creatorMembershipRole?: number | null) {
  const options = tenantInvitationRoleOptionsFor(creatorMembershipRole);
  const preferred = options.find((option) => option.role === 2) ?? options[0];
  return {
    expireHours: 168,
    maxUses: 10,
    targetIdentifier: "",
    targetMembershipRole: preferred?.role ?? 0,
  };
}

export function invitationRoleLabelKey(role?: number | null) {
  if (role === 3) return "tenantInvitation.roles.admin";
  if (role === 2) return "tenantInvitation.roles.staff";
  if (role === 1) return "tenantInvitation.roles.technicalSupport";
  return "tenantInvitation.roles.member";
}

export function invitationRoleLabel(role?: number | null) {
  if (role === 3) return "管理员";
  if (role === 2) return "客服";
  if (role === 1) return "技术支持";
  return "成员";
}

export function invitationCreateButtonLabelKey(role?: number | null) {
  return role === 3 ? "tenantInvitation.createAdmin" : "tenantInvitation.create";
}

export function invitationCreateButtonLabel(role?: number | null) {
  return role === 3 ? "创建管理员邀请" : `创建${invitationRoleLabel(role)}邀请`;
}

export function invitationAcceptedRoleTextKey() {
  return "tenantInvitation.acceptedRole";
}

export function invitationRoleDescriptionKey(role?: number | null) {
  return (
    roleOptions.find((option) => option.role === role)?.descriptionKey ??
    roleOptions[0].descriptionKey
  );
}

export function invitationRoleDescription(role?: number | null) {
  if (role === 3) return "管理员将拥有成员和空间管理权限。";
  if (role === 2) return "接受后进入企业空间，并获得客服工作台权限。";
  if (role === 1) return "接受后进入企业空间，并获得技术支持权限。";
  return "接受后进入企业空间，但不会获得员工工作台权限。";
}

interface TenantInvitationRoleSource {
  targetMembershipRole?: number | string | null;
  targetRole?: number | string | null;
  target_role?: number | string | null;
  target_membership_role?: number | string | null;
  membershipRole?: number | string | null;
  role?: number | string | null;
}

export function normalizeTenantInvitationTargetRole(
  source?: TenantInvitationRoleSource | number | string | null,
) {
  const rawRole =
    typeof source === "number" || typeof source === "string"
      ? source
      : source?.targetMembershipRole ??
        source?.targetRole ??
        source?.target_role ??
        source?.target_membership_role ??
        source?.membershipRole ??
        source?.role;

  if (rawRole === 3 || rawRole === "3") return 3;
  if (rawRole === 2 || rawRole === "2") return 2;
  if (rawRole === 1 || rawRole === "1") return 1;
  if (rawRole === 0 || rawRole === "0") return 0;

  const normalized = String(rawRole ?? "").trim().toLowerCase();
  if (["admin", "manager", "administrator"].includes(normalized)) return 3;
  if (["customer_service", "customer-service", "customerservice", "service", "agent"].includes(normalized)) return 2;
  if (["technical_support", "technical-support", "technicalsupport", "support"].includes(normalized)) return 1;
  if (["member", "employee", "staff"].includes(normalized)) return 0;

  return undefined;
}

export function normalizeTenantInvitationRoleFields<T extends TenantInvitationRoleSource>(invitation: T) {
  const role = normalizeTenantInvitationTargetRole(invitation);
  return role === undefined
    ? invitation
    : {
        ...invitation,
        targetMembershipRole: role,
      };
}

export function tenantInvitationStatusLabelKey(status?: string | number | null) {
  if (status === 1) return "tenantInvitation.status.active";
  if (status === 0) return "tenantInvitation.status.revoked";
  if (status === 3) return "tenantInvitation.status.usedUp";

  const normalized = String(status ?? "").toLowerCase();
  if (normalized.includes("revoked") || normalized.includes("cancel")) {
    return "tenantInvitation.status.revoked";
  }
  if (normalized.includes("expired")) return "tenantInvitation.status.expired";
  if (normalized.includes("used_up") || normalized.includes("exhausted")) {
    return "tenantInvitation.status.usedUp";
  }
  if (normalized.includes("active") || normalized.includes("valid")) {
    return "tenantInvitation.status.active";
  }
  return "tenantInvitation.status.unsynced";
}

export function tenantInvitationStatusLabel(status?: string | number | null) {
  const key = tenantInvitationStatusLabelKey(status);
  if (key === "tenantInvitation.status.active") return "有效";
  if (key === "tenantInvitation.status.revoked") return "已撤销";
  if (key === "tenantInvitation.status.expired") return "已过期";
  if (key === "tenantInvitation.status.usedUp") return "已用完";
  return "状态待同步";
}

interface TenantInvitationCopySource {
  inviteUrl?: string | null;
  invitationUrl?: string | null;
  url?: string | null;
  inviteCode?: string | null;
  invitationCode?: string | null;
  code?: string | null;
  token?: string | null;
}

export function invitationCopyTarget(invitation: TenantInvitationCopySource) {
  const url =
    invitation.inviteUrl ||
    invitation.invitationUrl ||
    invitation.url ||
    "";
  if (url) {
    return {
      value: url,
      kind: "url" as const,
      label: "邀请链接",
      buttonLabel: "复制链接",
      copiedNotice: "邀请链接已复制",
    };
  }

  const code =
    invitation.inviteCode ||
    invitation.invitationCode ||
    invitation.code ||
    invitation.token ||
    "";
  return {
    value: code,
    kind: code ? ("code" as const) : ("none" as const),
    label: "邀请码",
    buttonLabel: "复制邀请码",
    copiedNotice: "邀请码已复制",
  };
}

export function invitationCopyValue(invitation: TenantInvitationCopySource) {
  return invitationCopyTarget(invitation).value;
}
