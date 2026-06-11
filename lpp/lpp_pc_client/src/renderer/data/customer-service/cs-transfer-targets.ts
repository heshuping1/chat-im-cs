import type { TenantMemberDto } from "../api/types";

export interface CustomerServiceTransferTarget {
  avatarUrl?: string | null;
  displayName: string;
  roleLabel: "customer_service" | "admin" | "owner";
  userId: string;
}

export function createCustomerServiceTransferTargetOptions(
  members: TenantMemberDto[],
  currentUserIds: Array<string | null | undefined>,
): CustomerServiceTransferTarget[] {
  const excluded = new Set(
    currentUserIds
      .map((value) => value?.trim())
      .filter((value): value is string => Boolean(value)),
  );
  const targets: CustomerServiceTransferTarget[] = [];
  members
    .filter((member) => member.userId && !excluded.has(member.userId))
    .forEach((member) => {
      const roleLabel = transferRoleLabel(member.membershipRole);
      if (!roleLabel) return;
      targets.push({
        avatarUrl: member.avatarUrl,
        displayName: member.displayName || member.userId,
        roleLabel,
        userId: member.userId,
      });
    });
  return targets.sort((left, right) => {
    const roleDelta = transferRoleRank(left.roleLabel) - transferRoleRank(right.roleLabel);
    if (roleDelta !== 0) return roleDelta;
    return left.displayName.localeCompare(right.displayName);
  });
}

function transferRoleLabel(
  role?: number,
): CustomerServiceTransferTarget["roleLabel"] | null {
  if (role === 2) return "customer_service";
  return null;
}

function transferRoleRank(role: CustomerServiceTransferTarget["roleLabel"]) {
  if (role === "customer_service") return 0;
  if (role === "admin") return 1;
  return 2;
}
