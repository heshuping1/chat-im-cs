export type TenantInvitationTargetRole = 0 | 1 | 2 | 3;

export interface TenantInvitationRoleOption {
  role: TenantInvitationTargetRole;
  label: string;
  description: string;
}

const roleOptions: TenantInvitationRoleOption[] = [
  {
    role: 0,
    label: "成员",
    description: "接受后进入企业空间，但不会获得员工工作台权限。",
  },
  {
    role: 1,
    label: "技术支持",
    description: "接受后成为技术支持，可使用技术相关协作能力。",
  },
  {
    role: 2,
    label: "客服",
    description: "接受后成为客服，可进入在线客服工作台处理客户会话。",
  },
  {
    role: 3,
    label: "管理员",
    description: "管理员将拥有成员和空间管理权限，请只发送给可信员工。",
  },
];

export function tenantInvitationRoleOptionsFor(
  creatorMembershipRole?: number | null,
): TenantInvitationRoleOption[] {
  const role = Number.isFinite(creatorMembershipRole)
    ? Number(creatorMembershipRole)
    : 0;
  if (role === 4) return roleOptions;
  if (role === 3) return roleOptions.filter((option) => option.role === 0 || option.role === 1 || option.role === 2);
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

export function invitationRoleLabel(role?: number | null) {
  if (role === 3) return "管理员";
  if (role === 2) return "客服";
  if (role === 1) return "技术支持";
  return "成员";
}

export function invitationCreateButtonLabel(role?: number | null) {
  return `创建${invitationRoleLabel(role)}邀请`;
}

export function invitationAcceptedRoleText(role?: number | null) {
  return `接受后成为${invitationRoleLabel(role)}`;
}

export function invitationRoleDescription(role?: number | null) {
  return roleOptions.find((option) => option.role === role)?.description ?? roleOptions[0].description;
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

export function tenantInvitationStatusLabel(status?: string | number | null) {
  if (status === 1) return "有效";
  if (status === 0) return "已撤销";
  if (status === 3) return "已用完";

  const normalized = String(status ?? "").toLowerCase();
  if (normalized.includes("revoked") || normalized.includes("cancel")) return "已撤销";
  if (normalized.includes("expired")) return "已过期";
  if (normalized.includes("used_up") || normalized.includes("exhausted")) return "已用完";
  if (normalized.includes("active") || normalized.includes("valid")) return "有效";
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
  if (code) {
    return {
      value: code,
      kind: "code" as const,
      label: "邀请码",
      buttonLabel: "复制邀请码",
      copiedNotice: "邀请码已复制",
    };
  }

  return {
    value: "",
    kind: "none" as const,
    label: "邀请码",
    buttonLabel: "复制邀请码",
    copiedNotice: "邀请码已复制",
  };
}

export function invitationCopyValue(invitation: TenantInvitationCopySource) {
  return invitationCopyTarget(invitation).value;
}
