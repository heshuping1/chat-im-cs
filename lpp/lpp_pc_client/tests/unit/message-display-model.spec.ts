import { describe, expect, it } from "vitest";
import type { ConversationListItem, MessageItemDto } from "../../src/renderer/data/api-client";
import {
  buildContactCardProfilePopover,
  buildAvatarProfilePopover,
  eventMessageText,
  extractMessageText,
  isMineMessage,
  resolveSenderDisplayName,
} from "../../src/renderer/messages/models/messageDisplayModel";
import { normalizeContactCard } from "../../src/renderer/messages/models/contactCardModel";

describe("messageDisplayModel", () => {
  it("resolves mine messages by direction and sender identity", () => {
    const identity = { userId: "u1", platformUserId: "p1", lppId: "l1" };

    expect(isMineMessage({ messageId: "m1", direction: "out" } as MessageItemDto, identity)).toBe(true);
    expect(isMineMessage({ messageId: "m2", senderUserId: "u1" } as MessageItemDto, identity)).toBe(true);
    expect(isMineMessage({ messageId: "m3", senderUserId: "u2" } as MessageItemDto, identity)).toBe(false);
  });

  it("extracts direct and nested message text", () => {
    expect(extractMessageText({ messageId: "m1", body: { text: "hello" } } as MessageItemDto)).toBe("hello");
    expect(extractMessageText({
      messageId: "m2",
      body: { parts: [{ body: { content: "nested" } }] },
    } as MessageItemDto)).toBe("nested");
  });

  it("formats group member join event text", () => {
    const message = {
      messageId: "m1",
      messageType: "event",
      body: {
        type: "members_added",
        addedUsers: [{ displayName: "Alice" }, { displayName: "Bob" }],
      },
    } as MessageItemDto;

    expect(eventMessageText(message)).toBe("Alice, Bob加入了群聊");
  });

  it("resolves group sender display and avatar popover", () => {
    const conversation = {
      conversationId: "group-1",
      conversationType: "group",
      title: "Support",
    } as ConversationListItem;
    const members = new Map([
      ["u1", { userId: "u1", displayName: "Agent", avatarUrl: "agent.png", role: "admin" }],
    ]);
    const message = {
      messageId: "m1",
      senderUserId: "u1",
      senderDisplayName: "Fallback",
    } as MessageItemDto;

    expect(resolveSenderDisplayName(message, conversation, members)).toBe("Agent");
    expect(buildAvatarProfilePopover({
      conversation,
      groupMembers: members,
      message,
      mine: false,
      x: 10,
      y: 20,
    })).toMatchObject({
      title: "Agent",
      subtitle: "admin",
      avatarUrl: "agent.png",
    });
  });

  it("builds direct avatar profile from customer and friend profile fields", () => {
    const conversation = {
      conversationId: "direct-1",
      conversationType: "direct",
      title: "会话标题",
      peerDisplayName: "会话昵称",
      peerLppId: "peer-lpp",
      peerUserId: "internal-user-id",
    } as ConversationListItem;
    const message = {
      messageId: "m1",
      senderDisplayName: "消息昵称",
      senderLppId: "message-lpp",
      senderUserId: "message-user-id",
      senderPlatformUserId: "message-platform-id",
    } as MessageItemDto;

    const popover = buildAvatarProfilePopover({
      conversation,
      groupMembers: new Map(),
      message,
      mine: false,
      profile: {
        nickname: "资料昵称",
        lppNo: "profile-lpp",
        appDisplayName: "渠道应用 A",
        sourceChannel: "官网",
        tags: ["低优先"],
      },
      profileExtra: {
        friendUserId: "friend-1",
        displayName: "好友昵称",
        note: "重点跟进",
        tags: ["VIP", "跟进", "VIP"],
        source: "小程序",
      },
      x: 10,
      y: 20,
    });

    expect(popover.title).toBe("资料昵称");
    expect(popover.subtitle).toBe("好友");
    expect(popover.rows).toEqual([
      { label: "昵称", value: "资料昵称" },
      { label: "备注", value: "重点跟进" },
      { label: "星络号", value: "profile-lpp" },
      { label: "渠道应用", value: "渠道应用 A" },
      { label: "来源渠道", value: "小程序" },
    ]);
    expect(popover.tags).toEqual(["VIP", "跟进"]);
    expect(popover.rows.map((row) => row.label)).not.toEqual(
      expect.arrayContaining(["用户 ID", "平台 ID", "角色", "会话", "身份"]),
    );
    expect(popover.rows.map((row) => row.value)).not.toEqual(
      expect.arrayContaining(["internal-user-id", "message-user-id", "message-platform-id"]),
    );
  });

  it("keeps the current account avatar card free of internal ids", () => {
    const popover = buildAvatarProfilePopover({
      conversation: {
        conversationId: "direct-1",
        conversationType: "direct",
        title: "好友",
      } as ConversationListItem,
      groupMembers: new Map(),
      message: { messageId: "m1" } as MessageItemDto,
      mine: true,
      session: {
        apiBaseUrl: "http://localhost",
        tenantToken: "tenant",
        displayName: "当前账号",
        lppId: "me-lpp",
        userId: "me-internal-id",
      },
      x: 10,
      y: 20,
    });

    expect(popover.rows).toEqual([
      { label: "昵称", value: "当前账号" },
      { label: "星络号", value: "me-lpp" },
    ]);
    expect(popover.rows.map((row) => row.label)).not.toEqual(
      expect.arrayContaining(["用户 ID", "平台 ID", "角色", "会话", "身份"]),
    );
    expect(popover.rows.map((row) => row.value)).not.toContain("me-internal-id");
  });

  it("builds contact card popovers without account phone email or internal ids", () => {
    const popover = buildContactCardProfilePopover({
      profile: {
        displayName: "Alice",
        email: "alice@example.com",
        lppId: "lpp_123",
        mobile: "13800000000",
        platformUserId: "platform-1",
        userId: "profile-user-id",
      },
      value: {
        displayName: "Card Alice",
        email: "card@example.com",
        lppId: "card-lpp",
        mobile: "13900000000",
        platformUserId: "card-platform-id",
        userId: "card-user-id",
      },
      x: 10,
      y: 20,
    });

    expect(popover.title).toBe("Alice");
    expect(popover.subtitle).toBe("lpp_123");
    expect(popover.rows.map((row) => row.value)).toContain("lpp_123");
    expect(popover.rows.map((row) => row.label)).not.toEqual(
      expect.arrayContaining(["账号", "手机", "邮箱", "用户 ID", "平台 ID"]),
    );
    expect(popover.rows.map((row) => row.value)).not.toEqual(
      expect.arrayContaining([
        "13800000000",
        "13900000000",
        "alice@example.com",
        "card@example.com",
        "platform-1",
        "card-platform-id",
        "profile-user-id",
        "card-user-id",
      ]),
    );
  });

  it("does not use phone or email as the contact card preview fallback", () => {
    expect(normalizeContactCard({
      displayName: "Bob",
      email: "bob@example.com",
      mobile: "13800000001",
      userId: "u-bob",
    }).subtitle).toBe("个人名片");
    expect(normalizeContactCard({
      displayName: "Bob",
      lppId: "lpp_bob",
      mobile: "13800000001",
      userId: "u-bob",
    }).subtitle).toBe("lpp_bob");
  });
});
