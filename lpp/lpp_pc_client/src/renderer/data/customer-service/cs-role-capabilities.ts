export function canUseCustomerServiceStaffEndpoints(input?: {
  membershipRole?: number | string | null;
  roleLabel?: string | null;
  tenantId?: string | null;
  tenants?: Array<{ tenantId?: string | null; membershipRole?: number | string | null }>;
} | null) {
  const role = resolveMembershipRole(input);
  if (role !== undefined) return role === 2;
  const roleLabel = normalizeRoleLabel(input?.roleLabel);
  if (roleLabel && isManagementRoleLabel(roleLabel)) return false;
  if (roleLabel && isCustomerServiceRoleLabel(roleLabel)) return true;
  return true;
}

export function canControlCustomerServiceReception(input?: {
  membershipRole?: number | string | null;
  roleLabel?: string | null;
  tenantId?: string | null;
  tenants?: Array<{ tenantId?: string | null; membershipRole?: number | string | null }>;
} | null) {
  return canUseCustomerServiceStaffEndpoints(input);
}

export function canReadCustomerServiceHistory(input?: {
  membershipRole?: number | string | null;
  roleLabel?: string | null;
  tenantId?: string | null;
  tenants?: Array<{ tenantId?: string | null; membershipRole?: number | string | null }>;
} | null) {
  const role = resolveMembershipRole(input);
  if (role !== undefined) return role === 2 || role === 3 || role === 4;
  const roleLabel = normalizeRoleLabel(input?.roleLabel);
  if (roleLabel && isManagementRoleLabel(roleLabel)) return true;
  if (roleLabel && isCustomerServiceRoleLabel(roleLabel)) return true;
  return true;
}

export function canSuperviseCustomerServiceTransfer(input?: {
  membershipRole?: number | string | null;
  roleLabel?: string | null;
  tenantId?: string | null;
  tenants?: Array<{ tenantId?: string | null; membershipRole?: number | string | null }>;
} | null) {
  return canUseCustomerServiceManagementReadonly(input);
}

export function canSuperviseCustomerServiceClose(input?: {
  membershipRole?: number | string | null;
  roleLabel?: string | null;
  tenantId?: string | null;
  tenants?: Array<{ tenantId?: string | null; membershipRole?: number | string | null }>;
} | null) {
  return canUseCustomerServiceManagementReadonly(input);
}

export function canUseCustomerServiceManagementReadonly(input?: {
  membershipRole?: number | string | null;
  roleLabel?: string | null;
  tenantId?: string | null;
  tenants?: Array<{ tenantId?: string | null; membershipRole?: number | string | null }>;
} | null) {
  const role = resolveMembershipRole(input);
  if (role !== undefined) return role === 3 || role === 4;
  const roleLabel = normalizeRoleLabel(input?.roleLabel);
  if (roleLabel) return isManagementRoleLabel(roleLabel);
  return false;
}

function resolveMembershipRole(input?: {
  membershipRole?: number | string | null;
  tenantId?: string | null;
  tenants?: Array<{ tenantId?: string | null; membershipRole?: number | string | null }>;
} | null) {
  const directRole = normalizeMembershipRole(input?.membershipRole);
  if (directRole !== undefined) return directRole;
  const tenantId = String(input?.tenantId ?? "").trim();
  if (!tenantId) return undefined;
  const currentTenant = input?.tenants?.find((tenant) => tenant.tenantId === tenantId);
  return normalizeMembershipRole(currentTenant?.membershipRole);
}

function normalizeMembershipRole(role?: number | string | null) {
  if (role === undefined || role === null || role === "") return undefined;
  const numericRole = Number(role);
  return Number.isFinite(numericRole) ? numericRole : undefined;
}

function normalizeRoleLabel(roleLabel?: string | null) {
  return String(roleLabel ?? "")
    .trim()
    .toLowerCase()
    .replace(/[-_\s]/g, "");
}

function isCustomerServiceRoleLabel(roleLabel: string) {
  return ["客服", "customerservice", "customer-service", "agent", "staff", "kefu"].some(
    (marker) => roleLabel.includes(marker.replace(/[-_\s]/g, "")),
  );
}

function isManagementRoleLabel(roleLabel: string) {
  if (isCustomerServiceRoleLabel(roleLabel)) return false;
  return ["所有者", "owner", "管理员", "admin"].some((marker) =>
    roleLabel.includes(marker.replace(/[-_\s]/g, "")),
  );
}
