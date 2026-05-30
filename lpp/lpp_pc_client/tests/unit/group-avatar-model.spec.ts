import { describe, expect, it } from "vitest";
import type { ConversationListItem, GroupMemberDto } from "../../src/renderer/data/api-client";
import {
  groupCompositeAvatarAllowed,
  groupCompositeAvatarCells,
  resolveGroupConversationAvatar,
  usablePersonName,
} from "../../src/renderer/messages/models/groupAvatarModel";

describe("groupAvatarModel", () => {
  it("returns empty avatar state for missing conversations", () => {
    expect(resolveGroupConversationAvatar(undefined)).toBeUndefined();
    expect(groupCompositeAvatarAllowed(undefined)).toBe(false);
    expect(groupCompositeAvatarCells(undefined)).toEqual([]);
  });

  it("prefers formal group avatar before composite cells", () => {
    const conversation = {
      conversationId: "group-1",
      conversationType: "group",
      title: "Design",
      groupAvatarUrl: "https://cdn.example.com/group.png",
    } as ConversationListItem;

    expect(resolveGroupConversationAvatar(conversation, [
      { userId: "u1", displayName: "Alice" } as GroupMemberDto,
    ])).toEqual({
      kind: "image",
      url: "https://cdn.example.com/group.png",
    });
  });

  it("builds unique composite cells from visible group members", () => {
    const conversation = {
      conversationId: "group-2",
      conversationType: "group",
      title: "Support",
    } as ConversationListItem;
    const members = [
      { userId: "owner", displayName: "Owner", role: "owner", joinedAt: "2026-01-01T00:00:00.000Z" },
      { userId: "member", displayName: "Member", joinedAt: "2026-01-02T00:00:00.000Z" },
      { userId: "member", displayName: "Member", joinedAt: "2026-01-02T00:00:00.000Z" },
    ] as GroupMemberDto[];

    expect(groupCompositeAvatarCells(conversation, members)).toEqual([
      { avatarUrl: undefined, name: "Owner" },
      { avatarUrl: undefined, name: "Member" },
    ]);
  });

  it("respects member visibility flags", () => {
    const hiddenConversation = {
      conversationId: "group-3",
      conversationType: "group",
      memberListVisible: false,
    } as ConversationListItem;

    expect(groupCompositeAvatarAllowed(hiddenConversation)).toBe(false);
    expect(resolveGroupConversationAvatar(hiddenConversation, [
      { userId: "u1", displayName: "Alice" } as GroupMemberDto,
    ])).toBeUndefined();
  });

  it("filters placeholder and mojibake person names", () => {
    expect(usablePersonName("00000000-0000-0000-0000-000000000000")).toBeUndefined();
    expect(usablePersonName("550e8400-e29b-41d4-a716-446655440000")).toBeUndefined();
    expect(usablePersonName(" Alice ")).toBe("Alice");
  });
});
