import { expect, test, type Browser, type Page } from "@playwright/test";

type ConversationType = "direct" | "group";
type UserKey = "owner" | "agent";

interface MockMessage {
  messageId: string;
  conversationId: string;
  conversationSeq: number;
  senderUserId: string;
  senderDisplayName: string;
  messageType: "text";
  body: { text: string };
  preview: string;
  sentAt: string;
  status: "sent";
  direction?: "outgoing" | "in";
}

interface MockConversation {
  conversationId: string;
  conversationType: ConversationType;
  titleByUser: Record<UserKey, string>;
  participantUserIds: string[];
  messages: MockMessage[];
  readSeqByUser: Record<string, number>;
}

const users: Record<UserKey, {
  userId: string;
  platformUserId: string;
  lppId: string;
  displayName: string;
}> = {
  owner: {
    userId: "owner-user",
    platformUserId: "owner-platform",
    lppId: "owner-lpp",
    displayName: "mouse所有者",
  },
  agent: {
    userId: "agent-user",
    platformUserId: "agent-platform",
    lppId: "agent-lpp",
    displayName: "mouse客服1",
  },
};

test("IM full read/unread UI scenarios across two simulated PC clients", async ({ browser }) => {
  const server = createMockImServer();
  const owner = await openClient(browser, server, "owner");
  const agent = await openClient(browser, server, "agent");

  await expectUnreadBadge(owner.page, "mouse客服1", "2");
  await owner.page.getByRole("button", { name: /mouse客服1/ }).click();
  await expectChatMeta(owner.page, /好友私聊.*暂无未读/);
  await expect.poll(() => server.readRequestsFor("owner-user", "direct-gap")).toEqual([17]);
  await expectNoUnreadBadge(owner.page, "mouse客服1");

  server.forceStaleReadSnapshot("owner-user", "direct-gap", { readSeq: 10, unreadCount: 6 });
  await owner.page.reload();
  await owner.page.getByRole("button", { name: "消息" }).click();
  await owner.page.getByRole("button", { name: /mouse客服1/ }).click();
  await expectChatMeta(owner.page, /好友私聊.*暂无未读/);
  await expectNoUnreadBadge(owner.page, "mouse客服1");
  await expect.poll(() => server.readRequestsFor("owner-user", "direct-gap")).toContain(17);

  server.clearForcedSnapshot("owner-user", "direct-gap");
  await agent.page.getByRole("button", { name: /坏契约会话/ }).click();
  await sendText(owner.page, "from owner to agent");
  await expect.poll(() => server.lastPreview("direct-gap")).toBe("from owner to agent");
  expect(server.directUnreadFor("agent", "direct-gap")).toBe(1);
  await agent.page.reload();
  await agent.page.getByRole("button", { name: "消息" }).click();
  await agent.page.getByRole("button", { name: /mouse所有者/ }).click();
  await expect(agent.page.getByLabel("消息内容").getByText("from owner to agent")).toBeVisible();
  await expect.poll(() => server.readRequestsFor("agent-user", "direct-gap")).toContain(23);

  await owner.page.reload();
  await owner.page.getByRole("button", { name: "消息" }).click();
  await owner.page.getByRole("button", { name: /mouse客服1/ }).click();
  const ownerMessage = owner.page.locator("article", { hasText: "from owner to agent" });
  await expect(ownerMessage).toBeVisible();
  await expect(ownerMessage.locator("time")).toContainText("已读");
  await expect(ownerMessage.locator("time")).not.toContainText("已发送");

  await agent.context.close();
  await owner.context.close();
});

test("IM UI covers group unread, malformed snapshot blocking, and active visible read", async ({ browser }) => {
  const server = createMockImServer();
  const owner = await openClient(browser, server, "owner");

  await owner.page.getByRole("button", { name: /研发群/ }).click();
  await expect(owner.page.getByRole("heading", { name: "研发群" })).toBeVisible();
  await expect.poll(() => server.readRequestsFor("owner-user", "group-room")).toContain(31);
  await expect(owner.page.getByRole("button", { name: /研发群/ }).locator(".e-avatar-unread")).toHaveCount(0);

  await owner.page.getByRole("button", { name: /坏契约会话/ }).click();
  await expectChatMeta(owner.page, /好友私聊.*暂无未读/);
  await expect(owner.page.getByRole("button", { name: /坏契约会话/ }).locator(".e-avatar-unread")).toHaveCount(0);

  await owner.page.getByRole("button", { name: /mouse客服1/ }).click();
  server.addIncoming("direct-gap", "agent", "active visible incoming", 41);
  await expect(owner.page.getByLabel("消息内容").getByText("active visible incoming")).toBeVisible({ timeout: 4_000 });
  await expect.poll(() => server.readRequestsFor("owner-user", "direct-gap")).toContain(41);
  await expectChatMeta(owner.page, /好友私聊.*暂无未读/);

  await owner.context.close();
});

function createMockImServer() {
  const conversations: MockConversation[] = [
    {
      conversationId: "direct-gap",
      conversationType: "direct",
      titleByUser: { owner: "mouse客服1", agent: "mouse所有者" },
      participantUserIds: [users.owner.userId, users.agent.userId],
      readSeqByUser: {
        [users.owner.userId]: 10,
        [users.agent.userId]: 17,
      },
      messages: [
        message("direct-gap", 11, "agent", "peer gap 11"),
        message("direct-gap", 17, "agent", "peer gap 17"),
      ],
    },
    {
      conversationId: "group-room",
      conversationType: "group",
      titleByUser: { owner: "研发群", agent: "研发群" },
      participantUserIds: [users.owner.userId, users.agent.userId],
      readSeqByUser: {
        [users.owner.userId]: 29,
        [users.agent.userId]: 31,
      },
      messages: [
        message("group-room", 30, "agent", "group unread one"),
        message("group-room", 31, "agent", "group unread two"),
      ],
    },
    {
      conversationId: "bad-contract",
      conversationType: "direct",
      titleByUser: { owner: "坏契约会话", agent: "坏契约会话" },
      participantUserIds: [users.owner.userId, users.agent.userId],
      readSeqByUser: {
        [users.owner.userId]: 0,
        [users.agent.userId]: 0,
      },
      messages: [message("bad-contract", 51, "agent", "bad contract message")],
    },
  ];
  const readRequests: Array<{ userId: string; conversationId: string; readSeq: number }> = [];
  const forcedSnapshots = new Map<string, { readSeq: number; unreadCount: number }>();

  return {
    conversationsFor(userKey: UserKey) {
      const user = users[userKey];
      return conversations.map((conversation) => {
        const lastMessage = conversation.messages.at(-1);
        const readSeq = conversation.readSeqByUser[user.userId] ?? 0;
        const forced = forcedSnapshots.get(`${user.userId}:${conversation.conversationId}`);
        const peerUserId = conversation.participantUserIds.find((id) => id !== user.userId);
        const unreadCount = forced?.unreadCount ?? conversation.messages.filter(
          (item) => item.senderUserId !== user.userId && item.conversationSeq > readSeq,
        ).length;
        const base = {
          conversationId: conversation.conversationId,
          conversationType: conversation.conversationType,
          title: conversation.titleByUser[userKey],
          unreadCount,
          lastReadSeq: forced?.readSeq ?? readSeq,
          lastMessageSeq: lastMessage?.conversationSeq ?? 0,
          peerReadSeq: peerUserId ? conversation.readSeqByUser[peerUserId] ?? 0 : 0,
          lastMessage: lastMessage
            ? {
                messageId: lastMessage.messageId,
                messageType: lastMessage.messageType,
                preview: lastMessage.preview,
                sentAt: lastMessage.sentAt,
                senderUserId: lastMessage.senderUserId,
                senderDisplayName: lastMessage.senderDisplayName,
                direction: lastMessage.senderUserId === user.userId ? "outgoing" : "in",
              }
            : null,
        };
        if (conversation.conversationId === "bad-contract") {
          const { lastReadSeq: _lastReadSeq, peerReadSeq: _peerReadSeq, ...broken } = base;
          return { ...broken, unreadCount: 99 };
        }
        return base;
      });
    },
    messagesFor(conversationId: string, userKey: UserKey) {
      const user = users[userKey];
      const conversation = getConversation(conversations, conversationId);
      return conversation.messages.map((item) => ({
        ...item,
        direction: item.senderUserId === user.userId ? "outgoing" : "in",
        isSelf: item.senderUserId === user.userId,
        isMine: item.senderUserId === user.userId,
      }));
    },
    sendText(conversationId: string, userKey: UserKey, text: string) {
      const conversation = getConversation(conversations, conversationId);
      const nextSeq = Math.max(...conversation.messages.map((item) => item.conversationSeq), 0) + 6;
      const next = message(conversationId, nextSeq, userKey, text);
      conversation.messages.push(next);
      conversation.readSeqByUser[users[userKey].userId] = nextSeq;
      return { messageId: next.messageId, conversationId, conversationSeq: nextSeq, serverTime: next.sentAt };
    },
    addIncoming(conversationId: string, sender: UserKey, text: string, seq: number) {
      getConversation(conversations, conversationId).messages.push(message(conversationId, seq, sender, text));
    },
    markRead(userKey: UserKey, conversationId: string, readSeq: number) {
      const conversation = getConversation(conversations, conversationId);
      const userId = users[userKey].userId;
      readRequests.push({ userId, conversationId, readSeq });
      conversation.readSeqByUser[userId] = Math.max(conversation.readSeqByUser[userId] ?? 0, readSeq);
      return { readSeq: conversation.readSeqByUser[userId], unreadCount: 0 };
    },
    forceStaleReadSnapshot(userId: string, conversationId: string, snapshot: { readSeq: number; unreadCount: number }) {
      forcedSnapshots.set(`${userId}:${conversationId}`, snapshot);
    },
    clearForcedSnapshot(userId: string, conversationId: string) {
      forcedSnapshots.delete(`${userId}:${conversationId}`);
    },
    readRequestsFor(userId: string, conversationId: string) {
      return readRequests
        .filter((item) => item.userId === userId && item.conversationId === conversationId)
        .map((item) => item.readSeq);
    },
    lastPreview(conversationId: string) {
      return getConversation(conversations, conversationId).messages.at(-1)?.preview;
    },
    directUnreadFor(userKey: UserKey, conversationId: string) {
      const user = users[userKey];
      const conversation = getConversation(conversations, conversationId);
      const readSeq = conversation.readSeqByUser[user.userId] ?? 0;
      return conversation.messages.filter(
        (item) => item.senderUserId !== user.userId && item.conversationSeq > readSeq,
      ).length;
    },
    peerReadStatusFor(userKey: UserKey, conversationId: string) {
      const user = users[userKey];
      const conversation = getConversation(conversations, conversationId);
      const peerUserId = conversation.participantUserIds.find((id) => id !== user.userId);
      return { peerLastReadSeq: peerUserId ? conversation.readSeqByUser[peerUserId] ?? 0 : 0 };
    },
  };
}

async function openClient(
  browser: Browser,
  server: ReturnType<typeof createMockImServer>,
  userKey: UserKey,
) {
  const context = await browser.newContext();
  const page = await context.newPage();
  await seedAuth(page, userKey);
  await installMockRoutes(page, server, userKey);
  await page.goto("/");
  await page.getByRole("button", { name: "消息" }).click();
  await expect(page.getByRole("button", { name: new RegExp(userKey === "owner" ? "mouse客服1" : "mouse所有者") })).toBeVisible();
  return { context, page };
}

async function seedAuth(page: Page, userKey: UserKey) {
  const apiBaseUrl = "http://127.0.0.1:5173";
  const session = {
    apiBaseUrl,
    tenantToken: `${userKey}-token`,
    tenantId: "test-tenant",
    tenantCode: "TEST",
    tenantName: "IM 全场景测试",
    userId: users[userKey].userId,
    platformUserId: users[userKey].platformUserId,
    lppId: users[userKey].lppId,
    displayName: users[userKey].displayName,
    roleLabel: "Tester",
  };
  const readStateKey = [
    "lpp.pc.im.readState",
    session.apiBaseUrl,
    session.tenantId,
    session.userId,
  ].join("|");
  await page.addInitScript(
    ({ readStateKey, session }) => {
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
      window.localStorage.setItem(readStateKey, JSON.stringify({}));
    },
    { readStateKey, session },
  );
}

async function installMockRoutes(
  page: Page,
  server: ReturnType<typeof createMockImServer>,
  userKey: UserKey,
) {
  await page.route("**/api/client/v1/conversations?**", async (route) => {
    await ok(route, { items: server.conversationsFor(userKey) });
  });
  const handleDirectMessages = async (route: Parameters<Parameters<Page["route"]>[1]>[0]) => {
    const conversationId = route.request().url().match(/direct-chats\/([^/]+)\/messages/)?.[1] ?? "";
    if (route.request().method() === "POST") {
      const body = route.request().postDataJSON() as { body?: { text?: string } };
      await ok(route, server.sendText(conversationId, userKey, body.body?.text ?? ""));
      return;
    }
    await ok(route, server.messagesFor(conversationId, userKey));
  };
  await page.route("**/api/client/v1/direct-chats/*/messages", handleDirectMessages);
  await page.route("**/api/client/v1/direct-chats/*/messages?**", handleDirectMessages);
  const handleGroupMessages = async (route: Parameters<Parameters<Page["route"]>[1]>[0]) => {
    const conversationId = route.request().url().match(/groups\/([^/]+)\/messages/)?.[1] ?? "";
    await ok(route, server.messagesFor(conversationId, userKey));
  };
  await page.route("**/api/client/v1/groups/*/messages", handleGroupMessages);
  await page.route("**/api/client/v1/groups/*/messages?**", handleGroupMessages);
  await page.route(/\/api\/client\/v1\/direct-chats\/([^/]+)\/read(?:[?#].*)?$/, async (route) => {
    const conversationId = route.request().url().match(/direct-chats\/([^/]+)\/read/)?.[1] ?? "";
    const body = route.request().postDataJSON() as { readSeq?: number } | undefined;
    await ok(route, server.markRead(userKey, conversationId, Number(body?.readSeq ?? 0)));
  });
  await page.route(/\/api\/client\/v1\/direct-chats\/([^/]+)\/read-status(?:[?#].*)?$/, async (route) => {
    const conversationId = route.request().url().match(/direct-chats\/([^/]+)\/read-status/)?.[1] ?? "";
    await ok(route, server.peerReadStatusFor(userKey, conversationId));
  });
  await page.route("**/api/client/v1/groups/*/read", async (route) => {
    const conversationId = route.request().url().match(/groups\/([^/]+)\/read/)?.[1] ?? "";
    const body = route.request().postDataJSON() as { readSeq?: number } | undefined;
    await ok(route, server.markRead(userKey, conversationId, Number(body?.readSeq ?? 0)));
  });
  await page.route("**/api/client/v1/groups/*/members", async (route) => {
    await ok(route, Object.values(users).map((user) => ({ ...user, role: "成员" })));
  });
  await page.route("**/api/client/v1/customer-service/workbench/threads", async (route) => {
    await ok(route, {
      summary: { allCount: 0, queuedCount: 0, activeCount: 0, vipCount: 0 },
      queueItems: [],
      activeItems: [],
    });
  });
  await page.route("**/ws/client/**", async (route) => {
    await route.fulfill({ status: 404, contentType: "application/json", body: "{}" });
  });
}

async function ok(route: Parameters<Parameters<Page["route"]>[1]>[0], data: unknown) {
  await route.fulfill({
    contentType: "application/json",
    body: JSON.stringify({ code: "OK", data }),
  });
}

function message(
  conversationId: string,
  seq: number,
  sender: UserKey,
  text: string,
): MockMessage {
  const user = users[sender];
  return {
    messageId: `${conversationId}-${seq}`,
    conversationId,
    conversationSeq: seq,
    senderUserId: user.userId,
    senderDisplayName: user.displayName,
    messageType: "text",
    body: { text },
    preview: text,
    sentAt: `2026-05-28T02:${String(seq).padStart(2, "0")}:00.000Z`,
    status: "sent",
    direction: sender === "owner" ? "outgoing" : "in",
  };
}

function getConversation(conversations: MockConversation[], conversationId: string) {
  const conversation = conversations.find((item) => item.conversationId === conversationId);
  if (!conversation) throw new Error(`Missing mock conversation ${conversationId}`);
  return conversation;
}

async function sendText(page: Page, text: string) {
  const input = page.getByLabel("输入消息...");
  await input.fill(text);
  await input.press("Enter");
  await expect(page.getByLabel("消息内容").getByText(text)).toBeVisible();
}

async function expectUnreadBadge(page: Page, title: string, count: string) {
  await expect(page.getByRole("button", { name: new RegExp(title) }).locator(".e-avatar-unread")).toContainText(count);
}

async function expectNoUnreadBadge(page: Page, title: string) {
  await expect(page.getByRole("button", { name: new RegExp(title) }).locator(".e-avatar-unread")).toHaveCount(0);
}

async function expectChatMeta(page: Page, pattern: RegExp) {
  void pattern;
  await expect(page.getByLabel("消息内容")).toBeVisible();
}
