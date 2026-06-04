import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  canCreateTenantInvitations,
  createTenantInvitationDefaults,
  invitationCopyTarget,
  invitationCreateButtonLabel,
  invitationRoleDescription,
  invitationRoleLabel,
  normalizeTenantInvitationRoleFields,
  normalizeTenantInvitationTargetRole,
  tenantInvitationRoleOptionsFor,
  tenantInvitationStatusLabel,
} from "../../src/renderer/spaces/models/tenantInvitationModel";

describe("tenant employee invitations", () => {
  const endpointsSource = readFileSync(
    resolve(process.cwd(), "src/renderer/data/api/endpoints.ts"),
    "utf8",
  );
  const profileClientSource = readFileSync(
    resolve(process.cwd(), "src/renderer/data/api/profile-client.ts"),
    "utf8",
  );
  const queryKeysSource = readFileSync(
    resolve(process.cwd(), "src/renderer/data/query-keys.ts"),
    "utf8",
  );
  const accountSpaceSource = readFileSync(
    resolve(process.cwd(), "src/renderer/components/AccountUtilityPages.tsx"),
    "utf8",
  );
  const tenantInvitationPanelSource = readFileSync(
    resolve(process.cwd(), "src/renderer/spaces/components/TenantInvitationPanel.tsx"),
    "utf8",
  );

  it("maps creator role to allowed invitation target roles without owner grants", () => {
    expect(canCreateTenantInvitations(2)).toBe(false);
    expect(canCreateTenantInvitations(3)).toBe(true);
    expect(canCreateTenantInvitations(4)).toBe(true);
    expect(canCreateTenantInvitations(5)).toBe(false);
    expect(tenantInvitationRoleOptionsFor(2).map((option) => option.role)).toEqual([]);
    expect(tenantInvitationRoleOptionsFor(3).map((option) => option.role)).toEqual([0, 1, 2]);
    expect(tenantInvitationRoleOptionsFor(4).map((option) => option.role)).toEqual([0, 1, 2, 3]);
    expect(tenantInvitationRoleOptionsFor(5).map((option) => option.role)).toEqual([]);
    expect(tenantInvitationRoleOptionsFor(4).map((option) => option.label)).not.toContain("所有者");
    expect(createTenantInvitationDefaults(3).targetMembershipRole).toBe(2);
    expect(createTenantInvitationDefaults(2).targetMembershipRole).toBe(0);
    expect(invitationRoleLabel(2)).toBe("客服");
    expect(invitationCreateButtonLabel(2)).toBe("创建客服邀请");
    expect(invitationRoleDescription(0)).toContain("接受后进入企业空间，但不会获得员工工作台权限");
  });

  it("adds tenant invitation endpoints and sends targetMembershipRole", () => {
    expect(endpointsSource).toContain('tenantInvitations: "/api/client/v1/tenant/invitations"');
    expect(endpointsSource).toContain('tenantInvitation: "/api/client/v1/tenant/invitations/{invitationId}"');
    expect(profileClientSource).toContain("createTenantInvitation");
    expect(profileClientSource).toContain("targetMembershipRole");
    expect(profileClientSource).toContain("getTenantInvitations");
    expect(profileClientSource).toContain("deleteTenantInvitation");
    expect(queryKeysSource).toContain("tenantInvitations");
  });

  it("normalizes returned invitation role aliases before rendering labels", () => {
    expect(normalizeTenantInvitationTargetRole({ targetRole: 2 })).toBe(2);
    expect(normalizeTenantInvitationTargetRole({ membershipRole: "2" })).toBe(2);
    expect(normalizeTenantInvitationTargetRole({ target_membership_role: "customer_service" })).toBe(2);
    expect(normalizeTenantInvitationRoleFields({ code: "ABC", targetRole: 2 })).toMatchObject({
      code: "ABC",
      targetMembershipRole: 2,
    });
  });

  it("maps invitation status without leaking raw backend numeric codes", () => {
    expect(tenantInvitationStatusLabel(1)).toBe("有效");
    expect(tenantInvitationStatusLabel(0)).toBe("已撤销");
    expect(tenantInvitationStatusLabel(3)).toBe("已用完");
    expect(tenantInvitationStatusLabel("active")).toBe("有效");
    expect(tenantInvitationStatusLabel("valid")).toBe("有效");
    expect(tenantInvitationStatusLabel("revoked")).toBe("已撤销");
    expect(tenantInvitationStatusLabel("expired")).toBe("已过期");
    expect(tenantInvitationStatusLabel("exhausted")).toBe("已用完");
    expect(tenantInvitationStatusLabel(99)).toBe("状态待同步");
  });

  it("labels returned codes as invitation codes unless the server returns a real URL", () => {
    expect(invitationCopyTarget({ code: "D0BFA03D38DC013C" })).toEqual({
      value: "D0BFA03D38DC013C",
      kind: "code",
      label: "邀请码",
      buttonLabel: "复制邀请码",
      copiedNotice: "邀请码已复制",
    });
    expect(invitationCopyTarget({ inviteUrl: "https://example.com/invite/D0BFA" })).toEqual({
      value: "https://example.com/invite/D0BFA",
      kind: "url",
      label: "邀请链接",
      buttonLabel: "复制链接",
      copiedNotice: "邀请链接已复制",
    });
    expect(invitationCopyTarget({})).toMatchObject({
      value: "",
      kind: "none",
      label: "邀请码",
    });
    expect(invitationCopyTarget({ invitationId: "11111111-1111-1111-1111-111111111111" })).toMatchObject({
      value: "",
      kind: "none",
      label: "邀请码",
    });
  });

  it("renders invitation management in enterprise space with refresh and revoke flow", () => {
    expect(accountSpaceSource).toContain("<TenantInvitationPanel isPersonalSpace={isPersonalSpace} />");
    expect(tenantInvitationPanelSource).toContain("邀请员工");
    expect(tenantInvitationPanelSource).toContain("入职角色");
    expect(tenantInvitationPanelSource).toContain("管理员将拥有成员和空间管理权限");
    expect(tenantInvitationPanelSource).toContain("tenantInvitations");
    expect(tenantInvitationPanelSource).toContain("tenant-invitation-code");
    expect(tenantInvitationPanelSource).toContain("邀请码：");
    expect(tenantInvitationPanelSource).toContain("复制邀请码");
    expect(tenantInvitationPanelSource).toContain("invalidateQueries({");
    expect(tenantInvitationPanelSource).toContain("queryKey: pcQueryKeys.tenantInvitations");
    expect(tenantInvitationPanelSource).toContain("confirm(\"撤销后，已复制的邀请码将无法继续使用。确认撤销？\")");
    expect(tenantInvitationPanelSource).not.toContain("创建所有者邀请");
    expect(tenantInvitationPanelSource).not.toContain("下载客户端");
    expect(tenantInvitationPanelSource).not.toContain("qrPayload");
  });
});
