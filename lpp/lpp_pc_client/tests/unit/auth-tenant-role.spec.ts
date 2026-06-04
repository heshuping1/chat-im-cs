import { describe, expect, it } from "vitest";
import {
  authTenantRoleLabel,
  reconcileAuthSessionTenantRole,
} from "../../src/renderer/data/auth/auth-tenant-role";
import type { AuthSession } from "../../src/renderer/data/auth/auth-session";

describe("auth tenant role model", () => {
  it("maps membership roles to account labels", () => {
    expect(authTenantRoleLabel(4)).toBe("所有者");
    expect(authTenantRoleLabel(3)).toBe("管理员");
    expect(authTenantRoleLabel(2)).toBe("客服");
    expect(authTenantRoleLabel(1)).toBe("技术支持");
    expect(authTenantRoleLabel(undefined)).toBe("成员");
  });

  it("reconciles a stale current tenant role from platform tenants", () => {
    const session: AuthSession = {
      apiBaseUrl: "https://chat.hearteasechat.com",
      displayName: "bigtree5",
      membershipRole: 0,
      platformToken: "platform-token",
      roleLabel: "成员",
      spaceType: 2,
      tenantId: "tenant-mouse",
      tenantToken: "tenant-token",
      tenants: [
        {
          membershipRole: 0,
          tenantCode: "mouse-corp",
          tenantId: "tenant-mouse",
          tenantName: "Mouse 测试企业",
        },
      ],
    };

    const reconciled = reconcileAuthSessionTenantRole(session, [
      {
        membershipRole: 2,
        tenantCode: "mouse-corp",
        tenantId: "tenant-mouse",
        tenantName: "Mouse 测试企业",
      },
    ]);

    expect(reconciled.membershipRole).toBe(2);
    expect(reconciled.roleLabel).toBe("客服");
    expect(reconciled.tenants?.[0]?.membershipRole).toBe(2);
  });
});
