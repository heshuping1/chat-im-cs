import type { AuthSession } from "./auth/auth-session";

export interface ContactDirectoryAccess {
  canReadOrganization: boolean;
  canReadSocialContacts: boolean;
  isCustomerTenantMember: boolean;
}

export function deriveContactDirectoryAccess(
  session: AuthSession | null | undefined,
): ContactDirectoryAccess {
  if (!session) {
    return {
      canReadOrganization: false,
      canReadSocialContacts: false,
      isCustomerTenantMember: false,
    };
  }

  const userType = finiteNumber(session.userType);
  const membershipRole =
    finiteNumber(session.membershipRole) ?? currentTenantMembershipRole(session);
  const spaceType = finiteNumber(session.spaceType);
  const isPersonalSpace = spaceType === 1 || session.roleLabel === "个人空间";
  const isCustomerTenantMember = userType === 1 || membershipRole === 0;
  const isOrganizationMember =
    userType === 2 || (membershipRole !== undefined && membershipRole >= 1);

  return {
    canReadOrganization:
      !isPersonalSpace &&
      !isCustomerTenantMember &&
      (isOrganizationMember || (userType === undefined && membershipRole === undefined)),
    canReadSocialContacts: true,
    isCustomerTenantMember,
  };
}

function currentTenantMembershipRole(session: AuthSession) {
  const tenantId = session.tenantId;
  if (!tenantId) return undefined;
  const tenant = session.tenants?.find((item) => item.tenantId === tenantId);
  return finiteNumber(tenant?.membershipRole);
}

function finiteNumber(value: unknown) {
  if (value === undefined || value === null || value === "") return undefined;
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : undefined;
}
