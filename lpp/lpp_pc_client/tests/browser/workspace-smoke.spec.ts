import { expect, test } from "@playwright/test";

test("renders the local login shell", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { name: "lppchat" })).toBeVisible();
  await expect(page.locator(".auth-advanced summary")).toBeVisible();
  await expect(page.locator(".auth-advanced input").first()).toBeHidden();
  await expect(page.getByText("LPP 号 / 邮箱 / 手机号")).toBeVisible();
  await expect(page.getByText("密码")).toBeVisible();
});

test("IM unread UI uses model result after opening latest page", async ({ page }) => {
  const markReadRequests: number[] = [];
  await seedLoggedInImWorkspace(page, { markReadRequests });

  await page.goto("/");
  await page.getByRole("button", { name: "消息" }).click();

  await expect(page.getByRole("heading", { name: "Task 7 Direct" })).toBeVisible();
  await expect(page.getByText("latest incoming")).toBeVisible();
  await expect(page.getByText(/好友私聊.*暂无未读/)).toBeVisible();
  await expect
    .poll(() => markReadRequests)
    .toEqual([12]);
});

test("IM outgoing bubble does not regress from read to sent after refresh", async ({ page }) => {
  await seedLoggedInImWorkspace(page, {
    storedReadState: {
      "direct:task-7-chat": {
        conversationKey: "direct:task-7-chat",
        conversationId: "task-7-chat",
        conversationType: "direct",
        myReadSeq: 12,
        peerReadSeq: 12,
        lastMessageSeq: 12,
        updatedAt: 1,
      },
    },
  });

  await page.goto("/");
  await page.getByRole("button", { name: "消息" }).click();

  const outgoingMessage = page.locator("article", { hasText: "latest outgoing" });
  await expect(outgoingMessage).toBeVisible();
  await expect(outgoingMessage.locator("time")).toContainText("已读");
  await expect(outgoingMessage.locator("time")).not.toContainText("已发送");
});

test("settings left navigation does not jump between bottom sections", async ({ page }) => {
  await seedLoggedInImWorkspace(page);

  for (const height of [900, 768, 650]) {
    await page.setViewportSize({ width: 1440, height });
    await page.goto("/");
    await page.getByRole("button", { name: /^设置$/ }).click();
    await expect(page.getByRole("heading", { name: "设置中心" })).toBeVisible();

    const nav = page.locator(".settings-nav");
    const storageButton = page.getByRole("button", { name: /存储诊断/ });
    const helpButton = page.getByRole("button", { name: /关于/ });
    const navBox = await nav.boundingBox();
    const storageBox = await storageButton.boundingBox();
    const helpBox = await helpButton.boundingBox();

    expect(navBox?.y).toBeGreaterThanOrEqual(0);
    expect(storageBox?.height).toBe(54);
    expect(helpBox?.height).toBe(54);

    for (let index = 0; index < 10; index += 1) {
      await storageButton.click();
      await helpButton.click();
    }

    const nextNavBox = await nav.boundingBox();
    const nextStorageBox = await storageButton.boundingBox();
    const nextHelpBox = await helpButton.boundingBox();

    expect(nextNavBox?.y).toBe(navBox?.y);
    expect(nextStorageBox?.height).toBe(54);
    expect(nextHelpBox?.height).toBe(54);
  }
});

async function seedLoggedInImWorkspace(
  page: Parameters<typeof test>[0]["page"],
  options: {
    markReadRequests?: number[];
    storedReadState?: Record<string, unknown>;
  } = {},
) {
  const apiBaseUrl = "http://127.0.0.1:5173";
  const session = {
    apiBaseUrl,
    tenantToken: "test-token",
    tenantId: "test-tenant",
    tenantCode: "TEST",
    tenantName: "Task 7 Tenant",
    userId: "me-user",
    platformUserId: "me-platform",
    lppId: "me-lpp",
    displayName: "Me",
    roleLabel: "Tester",
  };
  const readStateKey = [
    "lpp.pc.im.readState",
    session.apiBaseUrl,
    session.tenantId,
    session.userId,
  ].join("|");

  await page.addInitScript(
    ({ readStateKey, session, storedReadState }) => {
      window.localStorage.setItem("lpp.pc.authSession", JSON.stringify(session));
      window.localStorage.setItem("site_line_current_site_id_v1", session.apiBaseUrl);
      window.localStorage.setItem(
        "site_line_cached_switchable_sites_v1",
        JSON.stringify([
          {
            id: session.apiBaseUrl,
            name: "当前登录线路",
            apiBaseUrl: session.apiBaseUrl,
          },
        ]),
      );
      window.localStorage.setItem(readStateKey, JSON.stringify(storedReadState ?? {}));
    },
    { readStateKey, session, storedReadState: options.storedReadState },
  );

  await page.route("**/api/client/v1/conversations?**", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        code: "OK",
        data: {
          items: [
            {
              conversationId: "task-7-chat",
              conversationType: "direct",
              title: "Task 7 Direct",
              unreadCount: 2,
              lastReadSeq: 10,
              lastMessageSeq: 12,
              lastMessage: {
                messageId: "m-12",
                messageType: "text",
                preview: "latest outgoing",
                sentAt: "2026-05-28T01:02:00.000Z",
                senderUserId: "me-user",
                senderDisplayName: "Me",
                direction: "outgoing",
              },
            },
          ],
        },
      }),
    });
  });

  await page.route("**/api/client/v1/profile/me", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        code: "OK",
        data: {
          userId: session.userId,
          loginName: "me@example.test",
          displayName: session.displayName,
          lppId: session.lppId,
          mobile: "13800000000",
          email: "me@example.test",
          signature: "PC regression user",
          createdAt: "2026-05-28T00:00:00.000Z",
        },
      }),
    });
  });

  await page.route("**/api/client/v1/direct-chats/task-7-chat/messages?**", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        code: "OK",
        data: [
          {
            messageId: "m-11",
            conversationId: "task-7-chat",
            conversationSeq: 11,
            senderUserId: "peer-user",
            senderDisplayName: "Peer",
            messageType: "text",
            body: { text: "latest incoming" },
            preview: "latest incoming",
            sentAt: "2026-05-28T01:01:00.000Z",
            status: "sent",
          },
          {
            messageId: "m-12",
            conversationId: "task-7-chat",
            conversationSeq: 12,
            senderUserId: "me-user",
            senderDisplayName: "Me",
            messageType: "text",
            body: { text: "latest outgoing" },
            preview: "latest outgoing",
            sentAt: "2026-05-28T01:02:00.000Z",
            status: "sent",
            direction: "outgoing",
          },
        ],
      }),
    });
  });

  await page.route("**/api/client/v1/direct-chats/task-7-chat/read", async (route) => {
    const body = route.request().postDataJSON() as { readSeq?: number } | undefined;
    options.markReadRequests?.push(Number(body?.readSeq ?? 0));
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        code: "OK",
        data: { readSeq: body?.readSeq ?? 0, unreadCount: 0 },
      }),
    });
  });

  await page.route("**/api/client/v1/customer-service/workbench/threads", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        code: "OK",
        data: {
          summary: { allCount: 0, queuedCount: 0, activeCount: 0, vipCount: 0 },
          queueItems: [],
          activeItems: [],
        },
      }),
    });
  });

  await page.route("**/ws/client/**", async (route) => {
    await route.fulfill({
      status: 404,
      contentType: "application/json",
      body: JSON.stringify({ code: "NOT_FOUND", data: null }),
    });
  });
}
