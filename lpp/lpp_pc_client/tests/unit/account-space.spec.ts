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
  const spaceSwitchSource = readFileSync(
    resolve(process.cwd(), "src/renderer/spaces/hooks/useSpaceSwitchController.ts"),
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
    expect(spaceSwitchSource).toContain("spaceType: tenant.spaceContext?.spaceType ?? (space ? 2 : 1)");
    expect(accountSpaceSource).toContain("spaceType: 2");
    expect(spaceSwitchSource).toContain("const sessionRole = space ? space.membershipRole : undefined");
    expect(spaceSwitchSource).toContain("tenantRole: tenant.membershipRole");
    expect(spaceSwitchSource).toContain("membershipRole: sessionRole");
    expect(accountSpaceSource).toContain("membershipRole: joinedSpace?.membershipRole");
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
    expect(accountSpaceSource.indexOf("accountUtility.space.switchableSpaces")).toBeLessThan(
      accountSpaceSource.indexOf("accountUtility.space.previewAndJoin"),
    );
    expect(accountSpaceSource).not.toContain("enterprise-switch-grid");
    expect(productPagesCss).not.toContain(".enterprise-switch-grid");
  });

  it("renders searched enterprise states before allowing join actions", () => {
    expect(accountSpaceSource).toContain("joinApprovalMode");
    expect(accountSpaceSource).toContain("alreadyMember");
    expect(accountSpaceSource).toContain("accountUtility.space.manualApproval");
    expect(accountSpaceSource).toContain("accountUtility.space.autoApproval");
    expect(accountSpaceSource).toContain("accountUtility.space.joinEnterprise");
    expect(accountSpaceSource).toContain("accountUtility.space.enter");
    expect(accountSpaceSource).toContain("accountUtility.space.currentlyUsing");
    expect(accountSpaceSource).toContain("accountUtility.space.previewEmptyTitle");
    expect(accountSpaceSource).toContain("accountUtility.space.notFoundTitle");
    expect(accountSpaceSource).toContain("accountUtility.space.previewFailedWithError");
    expect(accountSpaceSource).toContain("accountUtility.space.joinPending");
    expect(accountSpaceSource).toContain("accountUtility.space.joinAlreadyPending");
    expect(accountSpaceSource).toContain("accountUtility.space.joinAlreadyPendingDetail");
    expect(accountSpaceSource).toContain("tenantJoinErrorNotice");
    expect(accountSpaceSource).not.toContain("accountUtility.space.joinFailedWithError");
    expect(productPagesCss).toContain(".utility-notice.warning");
    expect(productPagesCss).toContain(".utility-notice-copy");
  });

  it("polls pending tenant join requests every five minutes and explains the check cadence", () => {
    expect(accountSpaceSource).toContain("getMyTenantJoinRequests");
    expect(accountSpaceSource).toContain("tenantJoinRequestsPollIntervalMs");
    expect(accountSpaceSource).toContain("pcQueryKeys.tenantJoinRequests");
    expect(accountSpaceSource).toContain("accountUtility.space.pendingRequests");
    expect(accountSpaceSource).toContain("queryKey: pcQueryKeys.tenantJoinRequests");
    expect(accountSpaceSource).toContain("await joinRequestsQuery.refetch()");
  });

  it("does not present personal space placeholder tenant IDs as real space IDs", () => {
    expect(accountSpaceSource).toContain("const isPersonalSpace =");
    expect(accountSpaceSource).toContain("const tenantId = isPersonalSpace ? \"--\"");
    expect(accountSpaceSource).toContain("!isPersonalSpace && tenantInfoQuery.isLoading");
    expect(accountSpaceSource).toContain("!isPersonalSpace && tenantInfoQuery.error");
    expect(accountSpaceSource).toContain("copyable={!isPersonalSpace && tenantId !== \"--\"}");
    expect(spaceSwitchSource).toContain("tenantId: isPersonalSpace ? undefined : tenant.tenantId");
    expect(spaceSwitchSource).not.toContain(
      "(tenant.tenantId ? \"个人空间\" : authSession.tenantName)",
    );
  });

  it("keeps identity hints optional for legacy persisted sessions", () => {
    expect(authSessionSource).toContain("userType?: number");
    expect(authSessionSource).toContain("membershipRole?: number");
    expect(authSessionSource).toContain("spaceType?: number");
  });
});
