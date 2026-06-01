import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("account space session identity", () => {
  const accountSpaceSource = readFileSync(
    resolve(process.cwd(), "src/renderer/components/AccountUtilityPages.tsx"),
    "utf8",
  );
  const authSessionSource = readFileSync(
    resolve(process.cwd(), "src/renderer/data/auth/auth-session.ts"),
    "utf8",
  );
  const endpointsSource = readFileSync(
    resolve(process.cwd(), "src/renderer/data/api/endpoints.ts"),
    "utf8",
  );
  const profileClientSource = readFileSync(
    resolve(process.cwd(), "src/renderer/data/api/profile-client.ts"),
    "utf8",
  );
  const productPagesCss = readFileSync(
    resolve(process.cwd(), "src/renderer/styles/pages/product-pages.css"),
    "utf8",
  );

  it("persists identity hints when switching tenant or personal space", () => {
    expect(accountSpaceSource).toContain("userType: profile?.userType");
    expect(accountSpaceSource).toContain("spaceType: space ? 2 : 1");
    expect(accountSpaceSource).toContain("membershipRole: space ? space.membershipRole : undefined");
  });

  it("requires a tenant code preview before submitting an enterprise join request", () => {
    expect(endpointsSource).toContain("tenantByCode");
    expect(profileClientSource).toContain("previewTenantByCode");
    expect(accountSpaceSource).toContain("previewTenantByCode(code)");
    expect(accountSpaceSource).toContain("joinTenantByCode");
    expect(accountSpaceSource).toContain("tenantCode: tenant.tenantCode");
    expect(accountSpaceSource).toContain("joinMutation.mutate(tenant)");
    expect(accountSpaceSource).toContain("data-tenant-code={tenant.tenantCode}");
    expect(accountSpaceSource).not.toContain("searchTenants(keyword)");
    expect(accountSpaceSource).not.toContain("submitTenantJoinRequest");
  });

  it("keeps enterprise join under switchable spaces instead of a two-column panel", () => {
    expect(accountSpaceSource.indexOf("可切换空间")).toBeLessThan(
      accountSpaceSource.indexOf("企业码预览并加入"),
    );
    expect(accountSpaceSource).not.toContain("enterprise-switch-grid");
    expect(productPagesCss).not.toContain(".enterprise-switch-grid");
  });

  it("renders searched enterprise states before allowing join actions", () => {
    expect(accountSpaceSource).toContain("joinApprovalMode");
    expect(accountSpaceSource).toContain("alreadyMember");
    expect(accountSpaceSource).toContain("申请后需管理员审批");
    expect(accountSpaceSource).toContain("确认后可直接加入");
    expect(accountSpaceSource).toContain("加入企业");
    expect(accountSpaceSource).toContain("进入");
    expect(accountSpaceSource).toContain("当前使用中");
    expect(accountSpaceSource).toContain("先输入企业码预览企业");
    expect(accountSpaceSource).toContain("未找到该企业码");
    expect(accountSpaceSource).toContain("企业码预览失败");
  });

  it("keeps identity hints optional for legacy persisted sessions", () => {
    expect(authSessionSource).toContain("userType?: number");
    expect(authSessionSource).toContain("membershipRole?: number");
    expect(authSessionSource).toContain("spaceType?: number");
  });
});
