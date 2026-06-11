import { describe, expect, it } from "vitest";

import {
  canControlCustomerServiceReception,
  canReadCustomerServiceHistory,
  canSuperviseCustomerServiceClose,
  canSuperviseCustomerServiceTransfer,
  canUseCustomerServiceManagementReadonly,
  canUseCustomerServiceStaffEndpoints,
} from "../../src/renderer/data/customer-service/cs-role-capabilities";

describe("customer service role capabilities", () => {
  it("lets admin and owner read service history without controlling personal reception", () => {
    expect(canUseCustomerServiceStaffEndpoints({ membershipRole: 4 })).toBe(false);
    expect(canUseCustomerServiceStaffEndpoints({ membershipRole: 3 })).toBe(false);
    expect(canControlCustomerServiceReception({ membershipRole: 4 })).toBe(false);
    expect(canControlCustomerServiceReception({ membershipRole: 3 })).toBe(false);
    expect(canReadCustomerServiceHistory({ membershipRole: 4 })).toBe(true);
    expect(canReadCustomerServiceHistory({ membershipRole: 3 })).toBe(true);
    expect(canSuperviseCustomerServiceClose({ membershipRole: 4 })).toBe(true);
    expect(canSuperviseCustomerServiceClose({ membershipRole: 3 })).toBe(true);
    expect(canSuperviseCustomerServiceTransfer({ membershipRole: 4 })).toBe(true);
    expect(canSuperviseCustomerServiceTransfer({ membershipRole: 3 })).toBe(true);
    expect(canUseCustomerServiceManagementReadonly({ membershipRole: 4 })).toBe(true);
    expect(canUseCustomerServiceManagementReadonly({ membershipRole: 3 })).toBe(true);
  });

  it("keeps customer service staff on staff workbench and reception APIs", () => {
    expect(canUseCustomerServiceStaffEndpoints({ membershipRole: 2 })).toBe(true);
    expect(canControlCustomerServiceReception({ membershipRole: 2 })).toBe(true);
    expect(canReadCustomerServiceHistory({ membershipRole: 2 })).toBe(true);
    expect(canSuperviseCustomerServiceClose({ membershipRole: 2 })).toBe(false);
    expect(canSuperviseCustomerServiceTransfer({ membershipRole: 2 })).toBe(false);
    expect(canUseCustomerServiceManagementReadonly({ membershipRole: 2 })).toBe(false);
  });

  it("accepts string and label based customer service roles for staff actions", () => {
    expect(canUseCustomerServiceStaffEndpoints({ membershipRole: "2" })).toBe(true);
    expect(canUseCustomerServiceStaffEndpoints({ roleLabel: "customer_service" })).toBe(true);
    expect(canReadCustomerServiceHistory({ roleLabel: "customer_service" })).toBe(true);
    expect(canUseCustomerServiceManagementReadonly({ membershipRole: "2" })).toBe(false);
    expect(canUseCustomerServiceManagementReadonly({ roleLabel: "customer_service" })).toBe(false);
  });

  it("keeps label based owner and admin accounts on readonly management access", () => {
    expect(canUseCustomerServiceStaffEndpoints({ roleLabel: "admin" })).toBe(false);
    expect(canUseCustomerServiceStaffEndpoints({ roleLabel: "owner" })).toBe(false);
    expect(canControlCustomerServiceReception({ roleLabel: "admin" })).toBe(false);
    expect(canControlCustomerServiceReception({ roleLabel: "owner" })).toBe(false);
    expect(canReadCustomerServiceHistory({ roleLabel: "admin" })).toBe(true);
    expect(canReadCustomerServiceHistory({ roleLabel: "owner" })).toBe(true);
    expect(canSuperviseCustomerServiceClose({ roleLabel: "admin" })).toBe(true);
    expect(canSuperviseCustomerServiceClose({ roleLabel: "owner" })).toBe(true);
    expect(canSuperviseCustomerServiceTransfer({ roleLabel: "admin" })).toBe(true);
    expect(canSuperviseCustomerServiceTransfer({ roleLabel: "owner" })).toBe(true);
    expect(canUseCustomerServiceManagementReadonly({ roleLabel: "admin" })).toBe(true);
    expect(canUseCustomerServiceManagementReadonly({ roleLabel: "owner" })).toBe(true);
  });

  it("keeps incomplete role metadata away from personal reception controls", () => {
    expect(canUseCustomerServiceStaffEndpoints({ roleLabel: "tenant-account" })).toBe(false);
    expect(canReadCustomerServiceHistory({ roleLabel: "tenant-account" })).toBe(true);
    expect(canUseCustomerServiceManagementReadonly({ roleLabel: "tenant-account" })).toBe(false);
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
      canReadCustomerServiceHistory({
        tenantId: "tenant-1",
        tenants: [{ tenantId: "tenant-1", membershipRole: 3 }],
      }),
    ).toBe(true);
    expect(
      canUseCustomerServiceManagementReadonly({
        tenantId: "tenant-1",
        tenants: [{ tenantId: "tenant-1", membershipRole: 3 }],
      }),
    ).toBe(true);
  });

  it("does not treat unknown high role numbers as service history roles", () => {
    expect(canUseCustomerServiceManagementReadonly({ membershipRole: 5 })).toBe(false);
    expect(canReadCustomerServiceHistory({ membershipRole: 5 })).toBe(false);
  });

  it("does not allow staff endpoints without role metadata", () => {
    expect(canUseCustomerServiceStaffEndpoints({})).toBe(false);
    expect(canReadCustomerServiceHistory({})).toBe(true);
  });
});
