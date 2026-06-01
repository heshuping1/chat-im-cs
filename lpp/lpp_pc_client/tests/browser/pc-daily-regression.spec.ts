import { expect, test, type Page, type TestInfo } from "@playwright/test";

const regressionEnabled = process.env.PC_REGRESSION_E2E === "true";

test.describe("PC daily full regression", () => {
  test.skip(!regressionEnabled, "Set PC_REGRESSION_E2E=true after account bootstrap.");

  test("logs in with reusable account and巡检s core modules", async ({ page }, testInfo) => {
    const issues = collectRuntimeIssues(page);
    await loginWithRegressionAccount(page);

    await expect(page.locator(".app-shell")).toBeVisible({ timeout: 30_000 });
    await expect(page.getByRole("button", { name: /消息/ })).toBeVisible();

    await visitSidebarModule(page, /消息/, "消息");
    await expect(page.getByLabel("消息会话列表")).toBeVisible({ timeout: 15_000 });
    await inspectFirstConversationIfAvailable(page);

    await visitSidebarModule(page, /在线客服/, "在线客服");
    await expect(page.getByText("在线客服").first()).toBeVisible({ timeout: 15_000 });

    await visitSidebarModule(page, /通讯录/, "通讯录");
    await expect(page.getByText(/通讯录|联系人|客户|好友/).first()).toBeVisible({ timeout: 15_000 });

    for (const module of [
      { name: /工作台/, label: "工作台" },
      { name: /工单中心/, label: "工单中心" },
      { name: /数据中心/, label: "数据中心" },
      { name: /知识库/, label: "知识库" },
      { name: /设置/, label: "设置" },
    ]) {
      await visitSidebarModule(page, module.name, module.label);
      await expect(page.locator(".app-shell")).toBeVisible();
    }

    await visitSidebarModule(page, /消息/, "消息");
    await page.reload();
    await expect(page.locator(".app-shell")).toBeVisible({ timeout: 30_000 });
    await expect(page.getByRole("button", { name: /消息/ })).toBeVisible();

    await testInfo.attach("runtime-issues", {
      body: issues.join("\n") || "无关键运行时异常",
      contentType: "text/plain",
    });
    expect(issues).toEqual([]);
  });
});

async function loginWithRegressionAccount(page: Page) {
  const apiBaseUrl = requiredEnv("PC_REGRESSION_API_BASE_URL");
  const email = requiredEnv("PC_REGRESSION_EMAIL");
  const password = requiredEnv("PC_REGRESSION_PASSWORD");
  const tenantId = process.env.PC_REGRESSION_TENANT_ID?.trim();

  await page.goto("/");
  await page.getByText("高级设置").click();
  await page.locator("label", { hasText: "服务地址" }).locator("input").fill(apiBaseUrl);
  await page
    .locator("label", { hasText: "LPP 号 / 邮箱 / 手机号" })
    .locator("input")
    .fill(email);
  await page.locator("label", { hasText: "密码" }).locator("input").fill(password);
  if (tenantId) {
    await page.locator("label", { hasText: "企业 tenantId，可选" }).locator("input").fill(tenantId);
  }
  await page.getByRole("button", { name: "登录" }).click();
}

async function visitSidebarModule(page: Page, name: RegExp, label: string) {
  const button = page.getByRole("button", { name }).first();
  await expect(button, `${label} 入口应可见`).toBeVisible({ timeout: 15_000 });
  await button.click();
  await expect(page.locator(".app-shell"), `${label} 切换后应用壳不应消失`).toBeVisible();
  await page.waitForLoadState("networkidle", { timeout: 3_000 }).catch(() => undefined);
}

async function inspectFirstConversationIfAvailable(page: Page) {
  const list = page.getByLabel("消息会话列表");
  const firstConversation = list.getByRole("button").first();
  if ((await firstConversation.count()) === 0 || !(await firstConversation.isVisible().catch(() => false))) {
    return;
  }
  await firstConversation.click();
  await expect(page.getByLabel("消息内容")).toBeVisible({ timeout: 10_000 });
}

function collectRuntimeIssues(page: Page) {
  const issues: string[] = [];
  page.on("pageerror", (error) => {
    issues.push(`pageerror: ${error.name}: ${error.message}`);
  });
  page.on("console", (message) => {
    if (message.type() !== "error") return;
    issues.push(`console.error: ${message.text()}`);
  });
  page.on("response", (response) => {
    const url = response.url();
    if (url.includes("/api/") && response.status() >= 500) {
      issues.push(`api ${response.status()}: ${url}`);
    }
  });
  return issues;
}

function requiredEnv(name: string) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing ${name}`);
  return value;
}
