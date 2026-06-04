import { describe, expect, it } from "vitest";

import {
  createInvitationPreviewErrorView,
  createInvitationPreviewView,
  createAuthSpaceChoices,
  createRegisterContactPayload,
  inferLoginType,
  mapAuthErrorMessage,
  normalizeInvitationCode,
  registerPhoneCountryOptions,
  selectAutoTenantId,
  shouldContinueAfterInvitationPreviewError,
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
        contactType: "email",
        password: "Password-123",
        confirmPassword: "Password-123",
      }),
    ).toBe("请输入有效的邮箱地址");
    expect(
      validateRegisterForm({
        displayName: "新用户",
        contact: "abc123",
        contactType: "mobile",
        countryDialCode: "+81",
        password: "Password-123",
        confirmPassword: "Password-123",
      }),
    ).toBe("请输入有效的手机号");
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

  it("supports email and multi-country mobile registration contact payloads", () => {
    expect(registerPhoneCountryOptions.map((option) => option.dialCode)).toContain("+86");
    expect(registerPhoneCountryOptions.map((option) => option.dialCode)).toContain("+81");
    expect(registerPhoneCountryOptions.map((option) => option.dialCode)).toContain("+1");
    expect(
      createRegisterContactPayload("pc@example.test", { type: "email", countryDialCode: "+86" }),
    ).toEqual({ email: "pc@example.test", mobile: null });
    expect(
      createRegisterContactPayload("090-1234-5678", { type: "mobile", countryDialCode: "+81" }),
    ).toEqual({ email: null, mobile: "+819012345678" });
  });

  it("normalizes optional invitation code without treating it as tenant code", () => {
    expect(normalizeInvitationCode(" D0BFA03D38DC013C ")).toBe("D0BFA03D38DC013C");
    expect(normalizeInvitationCode("   ")).toBeNull();
  });

  it("builds an invitation preview view so users can confirm the invited enterprise", () => {
    expect(
      createInvitationPreviewView({
        tenantId: "tenant-1",
        tenantName: "Mouse 测试企业",
        tenantCode: "mouse-corp",
        logoUrl: "https://example.test/logo.png",
        tenantDescription: "用于测试各角色场景的企业",
        alreadyMember: false,
        identityMatched: true,
        expiresAt: "2026-06-11T00:00:00.000Z",
      }),
    ).toEqual({
      kind: "ready",
      alreadyMember: false,
      badges: ["定向匹配", "有效至 2026-06-11"],
      codeText: "mouse-corp",
      description: "用于测试各角色场景的企业",
      identityMatched: true,
      logoUrl: "https://example.test/logo.png",
      name: "Mouse 测试企业",
      title: "将加入企业",
    });
  });

  it("builds an invitation preview error view without hiding the confirmation problem", () => {
    expect(
      createInvitationPreviewErrorView(new ApiError("invitation is invalid or expired", "INVITATION_INVALID")),
    ).toEqual({
      kind: "error",
      message: "邀请码无效，请确认后重试",
      title: "无法确认邀请码",
    });
  });

  it("treats invitation preview errors as non-blocking before tokenized accept", () => {
    expect(
      shouldContinueAfterInvitationPreviewError(new ApiError("invalid", "INVITATION_INVALID")),
    ).toBe(true);
    expect(shouldContinueAfterInvitationPreviewError(new Error("network down"))).toBe(true);
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
    expect(mapAuthErrorMessage(new ApiError("invalid invitation", "INVITATION_INVALID"))).toBe(
      "邀请码无效，请确认后重试",
    );
    expect(mapAuthErrorMessage(new ApiError("expired invitation", "INVITATION_EXPIRED"))).toBe(
      "邀请码已过期，请联系邀请人重新生成",
    );
    expect(mapAuthErrorMessage(new ApiError("target mismatch", "INVITATION_TARGET_MISMATCH"))).toBe(
      "该邀请码仅限指定账号使用",
    );
  });
});
