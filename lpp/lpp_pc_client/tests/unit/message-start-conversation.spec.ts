import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

import {
  deriveGroupCreateAccess,
  extractCreatedGroupConversationId,
  formatGroupCreateError,
  normalizeCreateGroupChatPayload,
} from "../../src/renderer/messages/models/groupCreateModel";

describe("group create contract model", () => {
  it("normalizes title and member ids before submit", () => {
    expect(
      normalizeCreateGroupChatPayload({
        title: "  项目联调群  ",
        memberUserIds: ["u1", "", "u2", "u1", "  ", "u3"],
      }),
    ).toEqual({
      title: "项目联调群",
      memberUserIds: ["u1", "u2", "u3"],
    });
  });

  it("keeps a short-term name alias but rejects empty title and fewer than 2 members", () => {
    expect(
      normalizeCreateGroupChatPayload({
        name: "  旧入口群名  ",
        memberUserIds: ["u1", "u2"],
      }),
    ).toEqual({
      title: "旧入口群名",
      memberUserIds: ["u1", "u2"],
    });

    expect(() =>
      normalizeCreateGroupChatPayload({ title: " ", memberUserIds: ["u1", "u2"] }),
    ).toThrow("群聊名称不能为空");
    expect(() =>
      normalizeCreateGroupChatPayload({ title: "项目群", memberUserIds: ["u1"] }),
    ).toThrow("至少选择 2 位成员");
  });

  it("extracts new conversation ids from common server response shapes", () => {
    expect(extractCreatedGroupConversationId({ groupId: "g1" })).toBe("g1");
    expect(extractCreatedGroupConversationId({ conversationId: "c1" })).toBe("c1");
    expect(extractCreatedGroupConversationId({ group_id: "g2" })).toBe("g2");
    expect(extractCreatedGroupConversationId({ group: { groupId: "g3" } })).toBe("g3");
    expect(extractCreatedGroupConversationId({ data: { group: { group_id: "g4" } } })).toBe(
      "g4",
    );
  });

  it("derives group creation access from session roles without blocking legacy sessions", () => {
    expect(
      deriveGroupCreateAccess({
        apiBaseUrl: "https://api.example",
        displayName: "客服",
        membershipRole: 2,
        roleLabel: "客服",
        tenantToken: "token",
      }),
    ).toMatchObject({
      canCreateGroup: false,
      reason: "当前角色暂无建群权限",
    });

    expect(
      deriveGroupCreateAccess({
        apiBaseUrl: "https://api.example",
        displayName: "管理员",
        membershipRole: 3,
        tenantToken: "token",
      }).canCreateGroup,
    ).toBe(true);
    expect(
      deriveGroupCreateAccess({
        apiBaseUrl: "https://api.example",
        displayName: "所有者",
        roleLabel: "所有者",
        tenantToken: "token",
      }).canCreateGroup,
    ).toBe(true);
    expect(
      deriveGroupCreateAccess({
        apiBaseUrl: "https://api.example",
        displayName: "个人空间",
        roleLabel: "个人空间",
        tenantToken: "token",
      }).canCreateGroup,
    ).toBe(true);
    expect(
      deriveGroupCreateAccess({
        apiBaseUrl: "https://api.example",
        displayName: "旧会话",
        tenantToken: "token",
      }).canCreateGroup,
    ).toBe(true);
  });

  it("maps the backend title validation message to Chinese copy", () => {
    expect(formatGroupCreateError(new Error("group title is required"))).toBe(
      "群聊名称不能为空",
    );
    expect(formatGroupCreateError(new Error("当前账号没有权限执行此操作"))).toBe(
      "当前账号没有权限执行此操作",
    );
  });
});

describe("message start UI closure", () => {
  const startDialogs = readFileSync(
    resolve(process.cwd(), "src/renderer/messages/components/MessageStartDialogs.tsx"),
    "utf8",
  );
  const conversationListPanel = readFileSync(
    resolve(
      process.cwd(),
      "src/renderer/messages/components/MessageConversationListPanel.tsx",
    ),
    "utf8",
  );

  it("exposes a disabled group action state instead of an unconditional group menu item", () => {
    expect(startDialogs).toContain("groupCreateAccess");
    expect(startDialogs).toContain("messages.start.noGroupPermission");
    expect(startDialogs).toContain("aria-disabled");
    expect(conversationListPanel).toContain("groupCreateAccess");
  });
});
