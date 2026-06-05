import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

import {
  canManageGroupMember,
  groupMemberDisplayName,
  groupManagementPermissions,
  groupMemberRoleRank,
  normalizeGroupRole,
  visibleGroupInfoTabs,
} from "../../src/renderer/messages/models/groupManagementModel";
import type { GroupMemberDto } from "../../src/renderer/data/api-client";

describe("message group management", () => {
  const conversationInfoPanel = readFileSync(
    resolve(process.cwd(), "src/renderer/messages/components/ConversationInfoPanel.tsx"),
    "utf8",
  );
  const contactsClient = readFileSync(
    resolve(process.cwd(), "src/renderer/data/api/contacts-client.ts"),
    "utf8",
  );
  const endpoints = readFileSync(
    resolve(process.cwd(), "src/renderer/data/api/endpoints.ts"),
    "utf8",
  );
  const groupHook = readFileSync(
    resolve(process.cwd(), "src/renderer/messages/hooks/useMessageGroupManagement.ts"),
    "utf8",
  );

  it("normalizes group roles and permissions", () => {
    expect(normalizeGroupRole("owner")).toBe("owner");
    expect(normalizeGroupRole("admin")).toBe("admin");
    expect(normalizeGroupRole("member")).toBe("member");
    expect(groupManagementPermissions("owner")).toMatchObject({
      canDisband: true,
      canTransferOwner: true,
      canManageMembers: true,
    });
    expect(groupManagementPermissions("admin")).toMatchObject({
      canDisband: false,
      canTransferOwner: false,
      canManageMembers: true,
    });
    expect(groupManagementPermissions("member")).toMatchObject({
      canManageMembers: false,
      canLeave: true,
    });
  });

  it("orders owner and admins ahead of ordinary members", () => {
    const members = [
      { userId: "m", displayName: "Member", role: "member" },
      { userId: "o", displayName: "Owner", role: "owner" },
      { userId: "a", displayName: "Admin", role: "admin" },
    ] as GroupMemberDto[];
    expect(members.sort((left, right) => groupMemberRoleRank(left) - groupMemberRoleRank(right)).map((m) => m.userId)).toEqual([
      "o",
      "a",
      "m",
    ]);
  });

  it("prefers group nickname for member display", () => {
    expect(groupMemberDisplayName({
      userId: "u1",
      displayName: "Account name",
      groupNickname: "Group nick",
    } as GroupMemberDto)).toBe("Group nick");
  });

  it("prevents admins from handling owners or other admins", () => {
    expect(canManageGroupMember({ actorRole: "admin", targetRole: "owner", action: "remove" })).toBe(false);
    expect(canManageGroupMember({ actorRole: "admin", targetRole: "admin", action: "remove" })).toBe(false);
    expect(canManageGroupMember({ actorRole: "admin", targetRole: "member", action: "mute" })).toBe(true);
    expect(canManageGroupMember({ actorRole: "owner", targetRole: "admin", action: "demote" })).toBe(true);
  });

  it("keeps group management visible only to owners and admins", () => {
    expect(visibleGroupInfoTabs({ role: "owner" })).toContain("management");
    expect(visibleGroupInfoTabs({ role: "admin" })).toContain("management");
    expect(visibleGroupInfoTabs({ role: "member" })).not.toContain("management");
    expect(visibleGroupInfoTabs({ role: "member", settings: { allowMemberViewMemberList: false } })).not.toContain(
      "members",
    );
  });

  it("renders first-class group info tabs and owner danger actions", () => {
    expect(conversationInfoPanel).toContain("visibleGroupInfoTabs");
    expect(conversationInfoPanel).toContain("actions.transfer");
    expect(conversationInfoPanel).toContain("actions.disbandGroup");
    expect(conversationInfoPanel).toContain("joinRequests");
    expect(conversationInfoPanel).toContain("actions.enableAllMute");
  });

  it("declares the client group management endpoints and methods", () => {
    [
      "groupDetail",
      "groupMemberRole",
      "groupMemberMute",
      "groupSettings",
      "groupAnnouncements",
      "groupJoinRequests",
      "groupFiles",
      "groupLeave",
      "groupPin",
      "groupMute",
    ].forEach((key) => expect(endpoints).toContain(key));
    [
      "getGroupDetail",
      "updateGroupDetail",
      "disbandGroup",
      "addGroupMembers",
      "removeGroupMember",
      "transferGroupOwner",
      "setGroupMemberRole",
      "setGroupMemberMute",
      "getGroupSettings",
      "updateGroupSettings",
      "getGroupAnnouncements",
      "getGroupJoinRequests",
      "getGroupFiles",
    ].forEach((method) => expect(contactsClient).toContain(method));
  });

  it("invalidates conversation and group management queries after mutations", () => {
    expect(groupHook).toContain('invalidateQueries({ queryKey: ["pc-im-conversations"] })');
    expect(groupHook).toContain('invalidateQueries({ queryKey: ["pc-group-members"] })');
    expect(groupHook).toContain('"pc-group-management"');
  });
});
