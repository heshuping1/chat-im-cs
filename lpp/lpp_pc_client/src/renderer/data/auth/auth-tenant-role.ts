import type { PlatformTenant } from "../api/types";
import type { AuthSession } from "./auth-session";

export function authTenantRoleLabel(role?: number | null) {
  if (role === 4) return "所有者";
  if (role === 3) return "管理员";
  if (role === 2) return "客服";
  if (role === 1) return "技术支持";
  return "成员";
}

export function mergePlatformTenants(
  remote?: PlatformTenant[],
  fallback?: PlatformTenant[],
) {
  const map = new Map<string, PlatformTenant>();
  [...(fallback ?? []), ...(remote ?? [])].forEach((item) => {
    if (item.tenantId) map.set(item.tenantId, item);
  });
  return Array.from(map.values());
}

export function reconcileAuthSessionTenantRole(
  session: AuthSession,
  remoteTenants?: PlatformTenant[],
): AuthSession {
  if (session.spaceType === 1 || !session.tenantId) return session;
  const tenants = mergePlatformTenants(remoteTenants, session.tenants);
  const tenantsChanged = !sameTenantRoles(session.tenants, tenants);
  const currentTenant = tenants.find((tenant) => tenant.tenantId === session.tenantId);
  if (!currentTenant) {
    return tenantsChanged ? { ...session, tenants } : session;
  }
  const roleLabel = authTenantRoleLabel(currentTenant.membershipRole);
  if (
    session.membershipRole === currentTenant.membershipRole &&
    session.roleLabel === roleLabel &&
    !tenantsChanged
  ) {
    return session;
  }
  return {
    ...session,
    membershipRole: currentTenant.membershipRole,
    roleLabel,
    tenants,
  };
}

export function authSessionTenantRoleNeedsRefresh(session: AuthSession) {
  if (!session.platformToken || session.spaceType === 1 || !session.tenantId) return false;
  const localTenant = session.tenants?.find((tenant) => tenant.tenantId === session.tenantId);
  const localRoleLabel =
    localTenant?.membershipRole === undefined
      ? undefined
      : authTenantRoleLabel(localTenant.membershipRole);
  return (
    session.membershipRole === undefined ||
    !session.roleLabel ||
    session.roleLabel === "auth.roles.member" ||
    session.roleLabel === "成员" ||
    (localTenant?.membershipRole !== undefined &&
      session.membershipRole !== localTenant.membershipRole) ||
    (localRoleLabel !== undefined && session.roleLabel !== localRoleLabel)
  );
}

function sameTenantRoles(left?: PlatformTenant[], right?: PlatformTenant[]) {
  if (!left && !right) return true;
  if (!left || !right || left.length !== right.length) return false;
  return left.every((tenant, index) => {
    const other = right[index];
    return (
      tenant.tenantId === other?.tenantId &&
      tenant.tenantCode === other.tenantCode &&
      tenant.tenantName === other.tenantName &&
      tenant.membershipRole === other.membershipRole
    );
  });
}
