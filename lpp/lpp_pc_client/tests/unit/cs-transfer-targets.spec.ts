import { describe, expect, it } from "vitest";

import { createCustomerServiceTransferTargetOptions } from "../../src/renderer/data/customer-service/cs-transfer-targets";
import type { TenantMemberDto } from "../../src/renderer/data/api/types";

describe("customer service transfer targets", () => {
  it("keeps customer-service staff only, excludes the current user, and sorts by name", () => {
    const members: TenantMemberDto[] = [
      member("member-1", "Regular", 1),
      member("owner-1", "Owner", 4),
      member("self", "Me", 2),
      member("admin-1", "Admin", 3),
      member("staff-2", "Beta Agent", 2),
      member("staff-1", "Alpha Agent", 2),
    ];

    expect(createCustomerServiceTransferTargetOptions(members, ["self"]).map((item) => ({
      roleLabel: item.roleLabel,
      userId: item.userId,
    }))).toEqual([
      { roleLabel: "customer_service", userId: "staff-1" },
      { roleLabel: "customer_service", userId: "staff-2" },
    ]);
  });
});

function member(userId: string, displayName: string, membershipRole: number): TenantMemberDto {
  return { displayName, membershipRole, userId };
}
