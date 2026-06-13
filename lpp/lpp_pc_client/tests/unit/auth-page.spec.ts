import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("auth page contract", () => {
  const source = readFileSync(
    resolve(process.cwd(), "src/renderer/components/LoginPage.tsx"),
    "utf8",
  );
  const partsSource = readFileSync(
    resolve(process.cwd(), "src/renderer/components/auth/AuthPageParts.tsx"),
    "utf8",
  );
  const brandLogoSource = readFileSync(
    resolve(process.cwd(), "src/renderer/components/AppBrandLogo.tsx"),
    "utf8",
  );
  const modelSource = readFileSync(
    resolve(process.cwd(), "src/renderer/data/auth/auth-flow-model.ts"),
    "utf8",
  );
  const authSource = `${source}\n${partsSource}\n${modelSource}`;
  const css = readFileSync(
    resolve(process.cwd(), "src/renderer/styles/account/auth.css"),
    "utf8",
  );

  it("offers login and registration in one auth shell", () => {
    expect(
      existsSync(resolve(process.cwd(), "src/renderer/components/auth/AuthPageParts.tsx")),
    ).toBe(true);
    expect(source).toContain('from "./auth/AuthPageParts"');
    expect(authSource).toContain("auth-mode-switch");
    expect(authSource).toContain("auth.login");
    expect(authSource).toContain("auth.register");
    expect(authSource).toContain('onChange("register")');
    expect(source).toContain("platformRegister");
  });

  it("renders the high fidelity app icon through the shared brand component", () => {
    expect(source).toContain('from "./AppBrandLogo"');
    expect(source).toContain("<AppBrandLogo");
    expect(source).toContain("auth-brand-logo");
    expect(brandLogoSource).toContain("brand-logo-icon.png");
    expect(brandLogoSource).toContain("app-brand-logo-mark");
    expect(brandLogoSource).not.toContain("appIconSrc");
    expect(brandLogoSource).not.toContain("<path");
    expect(source).not.toContain("appIconSrc");
    expect(source).not.toContain("app-icon-startlink.png");
  });

  it("lets new users choose a polished personal avatar during registration", () => {
    expect(source).toContain("registerAvatarOptions");
    expect(source).toContain("selectedRegisterAvatarUrl");
    expect(source).toContain("avatarUrl: selectedRegisterAvatarUrl");
    expect(authSource).toContain("auth.avatar");
    expect(authSource).toContain("visibleAvatarOptions");
    expect(authSource).toContain("showAllAvatarOptions");
    expect(authSource).toContain("auth-avatar-option");
    expect(authSource).toContain("auth-avatar-toggle");
    expect(authSource).toContain("avatarUrl");
  });

  it("moves technical configuration behind advanced settings", () => {
    expect(authSource).toContain("<details");
    expect(authSource).toContain("auth.advancedSettings");
    expect(authSource).toContain("auth.serviceUrlAdvanced");
    expect(authSource).not.toContain("auth.tenantId");
    expect(authSource).not.toContain("onTenantIdChange");
    expect(source).not.toContain("tenantId={tenantId}");
    expect(source).not.toContain("VITE_TENANT_ID");
    expect(authSource).not.toContain("<span>{t(\"auth.serviceUrl\")}</span>");
  });

  it("does not expose a production login default account", () => {
    expect(authSource).not.toContain("lpp_gs9fn2c7");
    expect(authSource).toContain("auth.identifierPlaceholder");
    expect(partsSource).toContain('autoComplete="off"');
    expect(partsSource).toContain('autoComplete="new-password"');
  });

  it("uses a post-login space picker instead of forcing tenant id in the main form", () => {
    expect(source).toContain("pendingLogin");
    expect(authSource).toContain("auth.chooseSpaceTitle");
    expect(source).toContain("createAuthSpaceChoices");
    expect(source).toContain("handleSelectTenant");
  });

  it("supports optional invitation code for existing-login and new-registration join flows", () => {
    expect(authSource).toContain("auth.invitationOptional");
    expect(authSource).toContain("auth-invitation-field");
    expect(authSource).toContain("auth-invitation-preview-card");
    expect(authSource).toContain("将加入企业");
    expect(authSource).toContain("无法确认邀请码");
    expect(authSource).toContain("auth.invitationHelp");
    expect(authSource).not.toContain("<summary>{t(\"auth.hasInvitation\")}</summary>");
    expect(source).toContain("invitationCode");
    expect(source).toContain("invitationPreview");
    expect(source).toContain("createInvitationPreviewView");
    expect(source).toContain("createInvitationPreviewErrorView");
    expect(source).toContain("getPlatformInvitationPreview");
    expect(source).toContain("acceptPlatformInvitation");
    expect(source).toContain("auth.joinedEnteringWorkbench");
    expect(source).toContain("applySelectedTenantSession(baseUrl, login, tenant, null)");
    expect(source).not.toContain("inviteCode:");
    expect(source).not.toContain("invitationCode:");
  });

  it("keeps register contact selectable between email and multi-country mobile", () => {
    expect(source).toContain("registerContactType");
    expect(source).toContain("registerCountryDialCode");
    expect(source).toContain("registerPhoneCountryOptions");
    expect(authSource).toContain("auth-contact-mode");
    expect(authSource).toContain("auth.email");
    expect(authSource).toContain("auth.mobile");
    expect(authSource).toContain("auth.countryRegion");
    expect(authSource).toContain("auth.emailPlaceholder");
    expect(authSource).toContain("auth.mobilePlaceholder");
  });

  it("styles auth modes, space picker and advanced settings locally", () => {
    expect(css).toContain("overflow: auto");
    expect(css).toContain(".auth-mode-switch");
    expect(css).toContain(".auth-avatar-grid");
    expect(css).toContain("grid-template-columns: repeat(6, minmax(0, 1fr))");
    expect(css).toContain(".auth-avatar-option.selected");
    expect(css).toContain(".auth-avatar-toggle");
    expect(css).toContain(".auth-advanced");
    expect(css).toContain(".auth-invitation");
    expect(css).toContain(".auth-contact-mode");
    expect(css).toContain(".auth-phone-row");
    expect(css).toContain(".auth-space-list");
    expect(css).toContain(".auth-space-option");
  });
});
