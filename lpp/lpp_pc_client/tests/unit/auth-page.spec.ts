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

  it("moves technical configuration behind advanced settings", () => {
    expect(authSource).toContain("<details");
    expect(authSource).toContain("高级设置");
    expect(authSource).toContain("企业 tenantId，可选");
    expect(authSource).not.toContain("<span>服务地址</span>");
  });

  it("uses a post-login space picker instead of forcing tenant id in the main form", () => {
    expect(source).toContain("pendingLogin");
    expect(authSource).toContain("选择进入空间");
    expect(source).toContain("createAuthSpaceChoices");
    expect(source).toContain("handleSelectTenant");
  });

  it("styles auth modes, space picker and advanced settings locally", () => {
    expect(css).toContain(".auth-mode-switch");
    expect(css).toContain(".auth-advanced");
    expect(css).toContain(".auth-space-list");
    expect(css).toContain(".auth-space-option");
  });
});
