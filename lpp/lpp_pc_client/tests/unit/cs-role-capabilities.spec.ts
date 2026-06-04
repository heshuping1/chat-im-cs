import { describe, expect, it } from "vitest";

import {
  canUseCustomerServiceManagementReadonly,
  canUseCustomerServiceStaffEndpoints,
} from "../../src/renderer/data/customer-service/cs-role-capabilities";

describe("customer service role capabilities", () => {
  it("keeps owner and admin on management readonly APIs instead of staff workbench APIs", () => {
    expect(canUseCustomerServiceStaffEndpoints({ membershipRole: 4 })).toBe(false);
    expect(canUseCustomerServiceStaffEndpoints({ membershipRole: 3 })).toBe(false);
    expect(canUseCustomerServiceManagementReadonly({ membershipRole: 4 })).toBe(true);
    expect(canUseCustomerServiceManagementReadonly({ membershipRole: 3 })).toBe(true);
  });

  it("keeps customer service staff on staff workbench APIs", () => {
    expect(canUseCustomerServiceStaffEndpoints({ membershipRole: 2 })).toBe(true);
    expect(canUseCustomerServiceManagementReadonly({ membershipRole: 2 })).toBe(false);
  });

  it("does not treat unknown high role numbers as management roles", () => {
    expect(canUseCustomerServiceManagementReadonly({ membershipRole: 5 })).toBe(false);
  });

  it("does not block configured token sessions without role metadata", () => {
    expect(canUseCustomerServiceStaffEndpoints({})).toBe(true);
  });
});
