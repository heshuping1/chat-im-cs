import { expect, test } from "@playwright/test";

test("renders the local login shell", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { name: "LPP PC 客服客户端" })).toBeVisible();
  await expect(page.getByText("服务地址")).toBeVisible();
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
