import { describe, expect, it } from "vitest";

import {
  buildTenantJoinResultReminder,
  reconcileTenantJoinRequestReminders,
  tenantJoinRequestReminderId,
  tenantJoinRequestStatus,
  tenantJoinRequestsPollIntervalMs,
} from "../../src/renderer/spaces/models/tenantJoinReminderModel";
import type { TenantJoinRequestDto } from "../../src/renderer/data/api-client";

describe("tenant join reminder model", () => {
  it("uses a fixed five minute polling interval while pending requests exist", () => {
    expect(tenantJoinRequestsPollIntervalMs([request({ status: "pending" })])).toBe(
      5 * 60 * 1000,
    );
    expect(tenantJoinRequestsPollIntervalMs([request({ status: "approved" })])).toBe(false);
    expect(tenantJoinRequestsPollIntervalMs([])).toBe(false);
  });

  it("normalizes tenant join request status without treating unknown values as final", () => {
    expect(tenantJoinRequestStatus(request({ status: "pending_approval" }))).toBe("pending");
    expect(tenantJoinRequestStatus(request({ status: "approved" }))).toBe("approved");
    expect(tenantJoinRequestStatus(request({ status: "rejected" }))).toBe("rejected");
    expect(tenantJoinRequestStatus(request({ status: "cancelled" }))).toBe("cancelled");
    expect(tenantJoinRequestStatus(request({ status: "server_new_value" }))).toBe("unknown");
  });

  it("does not notify for cold-start historical final requests", () => {
    const state = reconcileTenantJoinRequestReminders({
      initialized: false,
      previous: [],
      next: [request({ requestId: "r1", status: "approved" })],
    });

    expect(state.reminders).toEqual([]);
    expect(state.initialized).toBe(true);
  });

  it("notifies once when a pending request becomes approved", () => {
    const state = reconcileTenantJoinRequestReminders({
      initialized: true,
      previous: [request({ requestId: "r1", status: "pending", tenantName: "树软科技" })],
      next: [request({ requestId: "r1", status: "approved", tenantName: "树软科技" })],
    });

    expect(state.reminders).toEqual([
      expect.objectContaining({
        id: "tenant-join-request-r1",
        title: "企业申请已通过",
        body: "你已加入「树软科技」，可切换进入企业空间。",
        targetModule: "enterpriseSwitch",
        targetId: "tenant-1",
        icon: "enterprise",
      }),
    ]);

    const repeated = reconcileTenantJoinRequestReminders({
      initialized: true,
      previous: state.next,
      next: [request({ requestId: "r1", status: "approved", tenantName: "树软科技" })],
      notifiedIds: new Set(state.notifiedIds),
    });
    expect(repeated.reminders).toEqual([]);
  });

  it("builds rejected reminders with productized fallback reason", () => {
    expect(
      buildTenantJoinResultReminder(
        request({ requestId: "r2", status: "rejected", rejectReason: "当前人数已满" }),
      ),
    ).toMatchObject({
      title: "企业申请未通过",
      body: "当前人数已满",
      targetModule: "enterpriseSwitch",
      targetId: "tenant-1",
      severity: "warning",
    });

    expect(
      buildTenantJoinResultReminder(request({ requestId: "r3", status: "rejected" })),
    ).toMatchObject({
      body: "管理员未通过本次加入申请。",
    });
  });

  it("uses stable request ids and falls back to tenant ids", () => {
    expect(tenantJoinRequestReminderId(request({ requestId: "r1" }))).toBe(
      "tenant-join-request-r1",
    );
    expect(tenantJoinRequestReminderId(request({ requestId: undefined }))).toBe(
      "tenant-join-tenant-1",
    );
  });
});

function request(overrides: Partial<TenantJoinRequestDto> = {}): TenantJoinRequestDto {
  return {
    createdAt: "2026-06-04T10:00:00.000Z",
    requestId: "r1",
    status: "pending",
    tenantId: "tenant-1",
    tenantName: "测试企业",
    ...overrides,
  };
}
