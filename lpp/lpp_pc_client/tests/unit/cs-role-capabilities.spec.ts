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

  it("accepts string and label based customer service roles for staff actions", () => {
    expect(canUseCustomerServiceStaffEndpoints({ membershipRole: "2" })).toBe(true);
    expect(canUseCustomerServiceStaffEndpoints({ roleLabel: "客服" })).toBe(true);
    expect(canUseCustomerServiceStaffEndpoints({ roleLabel: "customer_service" })).toBe(true);
    expect(canUseCustomerServiceManagementReadonly({ membershipRole: "2" })).toBe(false);
    expect(canUseCustomerServiceManagementReadonly({ roleLabel: "客服" })).toBe(false);
  });

  it("keeps label based owner and admin accounts on readonly management access", () => {
    expect(canUseCustomerServiceStaffEndpoints({ roleLabel: "管理员" })).toBe(false);
    expect(canUseCustomerServiceStaffEndpoints({ roleLabel: "owner" })).toBe(false);
    expect(canUseCustomerServiceManagementReadonly({ roleLabel: "管理员" })).toBe(true);
    expect(canUseCustomerServiceManagementReadonly({ roleLabel: "owner" })).toBe(true);
  });

  it("does not block token or tenant-account sessions when role metadata is incomplete", () => {
    expect(canUseCustomerServiceStaffEndpoints({ roleLabel: "已配置 Token" })).toBe(true);
    expect(canUseCustomerServiceStaffEndpoints({ roleLabel: "tenant-account" })).toBe(true);
    expect(canUseCustomerServiceManagementReadonly({ roleLabel: "已配置 Token" })).toBe(false);
  });

  it("falls back to the current tenant membership role", () => {
    expect(
      canUseCustomerServiceStaffEndpoints({
        tenantId: "tenant-1",
        tenants: [{ tenantId: "tenant-1", membershipRole: 2 }],
      }),
    ).toBe(true);
    expect(
      canUseCustomerServiceStaffEndpoints({
        tenantId: "tenant-1",
        tenants: [{ tenantId: "tenant-1", membershipRole: 3 }],
      }),
    ).toBe(false);
    expect(
      canUseCustomerServiceManagementReadonly({
        tenantId: "tenant-1",
        tenants: [{ tenantId: "tenant-1", membershipRole: 3 }],
      }),
    ).toBe(true);
  });

  it("does not treat unknown high role numbers as management roles", () => {
    expect(canUseCustomerServiceManagementReadonly({ membershipRole: 5 })).toBe(false);
  });

  it("does not block configured token sessions without role metadata", () => {
    expect(canUseCustomerServiceStaffEndpoints({})).toBe(true);
  });
});
