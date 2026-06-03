import { describe, expect, it } from "vitest";

import {
  createAuthSpaceChoices,
  inferLoginType,
  mapAuthErrorMessage,
  selectAutoTenantId,
  validateRegisterForm,
} from "../../src/renderer/data/auth/auth-flow-model";
import { ApiError } from "../../src/renderer/data/api-client";

describe("auth flow model", () => {
  it("infers login identity type from common account identifiers", () => {
    expect(inferLoginType("lpp_gs9fn2c7")).toBe("lpp_id");
    expect(inferLoginType("pc@example.test")).toBe("email");
    expect(inferLoginType("+81 090-1234-5678")).toBe("mobile");
    expect(inferLoginType("mouse-corp")).toBe("auto");
  });

  it("auto-selects only safe single-space tenant paths", () => {
    expect(
      selectAutoTenantId({
        platformUserId: "p1",
        lppId: "lpp_1",
        displayName: "A",
        tenants: [{ tenantId: "tenant-1", tenantName: "A 企业" }],
      }),
    ).toBe("tenant-1");
    expect(
      selectAutoTenantId({
        platformUserId: "p1",
        lppId: "lpp_1",
        displayName: "A",
        tenants: [
          { tenantId: "tenant-1", tenantName: "A 企业" },
          { tenantId: "tenant-2", tenantName: "B 企业" },
        ],
      }),
    ).toBeNull();
    const selectAutoTenantIdWithLegacyPreferred = selectAutoTenantId as (
      login: Parameters<typeof selectAutoTenantId>[0],
      preferred?: string,
    ) => string | null;
    expect(
      selectAutoTenantIdWithLegacyPreferred(
        {
          platformUserId: "p1",
          lppId: "lpp_1",
          displayName: "A",
          tenants: [
            { tenantId: "tenant-1", tenantName: "A 企业" },
            { tenantId: "tenant-2", tenantName: "B 企业" },
          ],
        },
        "tenant-1",
      ),
    ).toBeNull();
  });

  it("builds tenant choices for a post-login space picker", () => {
    const choices = createAuthSpaceChoices({
      platformUserId: "p1",
      lppId: "lpp_1",
      displayName: "A",
      tenants: [
        { tenantId: "tenant-1", tenantCode: "ACME", tenantName: "Acme", membershipRole: 2 },
        { tenantId: "tenant-2", tenantName: "Beta", membershipRole: 3 },
      ],
    });

    expect(choices).toEqual([
      {
        id: "tenant-1",
        kind: "tenant",
        name: "Acme",
        code: "ACME",
        roleLabel: "客服",
      },
      {
        id: "tenant-2",
        kind: "tenant",
        name: "Beta",
        code: "tenant-2",
        roleLabel: "管理员",
      },
    ]);
  });

  it("validates minimal registration form fields", () => {
    expect(
      validateRegisterForm({
        displayName: "  ",
        contact: "pc@example.test",
        password: "Password-123",
        confirmPassword: "Password-123",
      }),
    ).toBe("请输入昵称");
    expect(
      validateRegisterForm({
        displayName: "新用户",
        contact: "not-a-contact",
        password: "Password-123",
        confirmPassword: "Password-123",
      }),
    ).toBe("请输入有效的邮箱或手机号");
    expect(
      validateRegisterForm({
        displayName: "新用户",
        contact: "pc@example.test",
        password: "short",
        confirmPassword: "short",
      }),
    ).toBe("密码至少需要 8 位");
    expect(
      validateRegisterForm({
        displayName: "新用户",
        contact: "pc@example.test",
        password: "Password-123",
        confirmPassword: "Password-456",
      }),
    ).toBe("两次输入的密码不一致");
    expect(
      validateRegisterForm({
        displayName: "新用户",
        contact: "pc@example.test",
        password: "Password-123",
        confirmPassword: "Password-123",
      }),
    ).toBeNull();
  });

  it("maps raw auth errors to product copy", () => {
    expect(mapAuthErrorMessage(new ApiError("email already registered", "AUTH_EMAIL_EXISTS"))).toBe(
      "该邮箱已注册，请直接登录",
    );
    expect(mapAuthErrorMessage(new ApiError("bad password", "AUTH_INVALID_CREDENTIALS"))).toBe(
      "账号或密码不正确",
    );
    expect(mapAuthErrorMessage(new ApiError("captcha required", "AUTH_CAPTCHA_REQUIRED"))).toBe(
      "需要完成安全验证",
    );
  });
});
