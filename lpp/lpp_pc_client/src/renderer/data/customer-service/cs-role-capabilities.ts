export function canUseCustomerServiceStaffEndpoints(input?: {
  membershipRole?: number;
} | null) {
  const role = input?.membershipRole;
  return role === undefined || role === 2;
}

export function canUseCustomerServiceManagementReadonly(input?: {
  membershipRole?: number;
} | null) {
  const role = input?.membershipRole;
  return role === 3 || role === 4;
}
