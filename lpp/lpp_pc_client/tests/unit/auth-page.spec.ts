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
  const authSource = `${source}\n${partsSource}`;
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
    expect(authSource).toContain("登录");
    expect(authSource).toContain("注册");
    expect(authSource).toContain('onChange("register")');
    expect(source).toContain("platformRegister");
  });

  it("lets new users choose a polished personal avatar during registration", () => {
    expect(source).toContain("registerAvatarOptions");
    expect(source).toContain("selectedRegisterAvatarUrl");
    expect(source).toContain("avatarUrl: selectedRegisterAvatarUrl");
    expect(authSource).toContain("选择头像");
    expect(authSource).toContain("visibleAvatarOptions");
    expect(authSource).toContain("showAllAvatarOptions");
    expect(authSource).toContain("auth-avatar-option");
    expect(authSource).toContain("auth-avatar-toggle");
    expect(authSource).toContain("avatarUrl");
  });

  it("moves technical configuration behind advanced settings", () => {
    expect(authSource).toContain("<details");
    expect(authSource).toContain("高级设置");
    expect(authSource).toContain("服务地址（高级）");
    expect(authSource).not.toContain("企业 tenantId，可选");
    expect(authSource).not.toContain("onTenantIdChange");
    expect(source).not.toContain("tenantId={tenantId}");
    expect(source).not.toContain("VITE_TENANT_ID");
    expect(authSource).not.toContain("<span>服务地址</span>");
  });

  it("does not expose a production login default account", () => {
    expect(authSource).not.toContain("lpp_gs9fn2c7");
    expect(authSource).toContain("请输入 LPP 号 / 邮箱 / 手机号");
  });

  it("uses a post-login space picker instead of forcing tenant id in the main form", () => {
    expect(source).toContain("pendingLogin");
    expect(authSource).toContain("选择进入空间");
    expect(source).toContain("createAuthSpaceChoices");
    expect(source).toContain("handleSelectTenant");
  });

  it("styles auth modes, space picker and advanced settings locally", () => {
    expect(css).toContain(".auth-mode-switch");
    expect(css).toContain(".auth-avatar-grid");
    expect(css).toContain("grid-template-columns: repeat(6, minmax(0, 1fr))");
    expect(css).toContain(".auth-avatar-option.selected");
    expect(css).toContain(".auth-avatar-toggle");
    expect(css).toContain(".auth-advanced");
    expect(css).toContain(".auth-space-list");
    expect(css).toContain(".auth-space-option");
  });
});
