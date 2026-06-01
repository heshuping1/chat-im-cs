import { describe, expect, it } from "vitest";
import type {
  ConversationListItem,
  FriendDto,
  GroupMemberDto,
  MessageItemDto,
  TenantMemberDto,
  UserProfileDto,
} from "../../src/renderer/data/api-client";
import { buildUserAvatarRegistry } from "../../src/renderer/messages/models/userAvatarRegistry";

describe("userAvatarRegistry", () => {
  it("prefers profile and friend avatars over conversation and message snapshots", () => {
    const conversation = {
      avatarUrl: "conversation.png",
      conversationId: "direct-1",
      conversationType: "direct",
      peerLppId: "lpp-1",
      peerUserId: "user-1",
      title: "Alice",
    } as ConversationListItem;
    const registry = buildUserAvatarRegistry({
      activeProfiles: [{ userId: "user-1", displayName: "Alice", avatarUrl: "profile.png" } as UserProfileDto],
      conversations: [conversation],
      friends: [{ friendUserId: "user-1", displayName: "Alice", avatarUrl: "friend.png" } as FriendDto],
    });

    expect(
      registry.resolveMessageSenderAvatar(
        {
          messageId: "m1",
          senderUserId: "user-1",
          senderAvatarUrl: "snapshot.png",
        } as MessageItemDto,
        conversation,
      ),
    ).toBe("profile.png");
  });

  it("uses group member avatar before the message sender snapshot", () => {
    const conversation = {
      conversationId: "group-1",
      conversationType: "group",
      title: "Group",
    } as ConversationListItem;
    const registry = buildUserAvatarRegistry({
      groupMembersByConversation: {
        "group-1": [
          { userId: "member-1", displayName: "Bob", avatarUrl: "member.png" } as GroupMemberDto,
        ],
      },
    });

    expect(
      registry.resolveMessageSenderAvatar(
        {
          messageId: "m1",
          senderUserId: "member-1",
          senderAvatarUrl: "snapshot.png",
        } as MessageItemDto,
        conversation,
      ),
    ).toBe("member.png");
  });

  it("uses tenant member avatars for non-friend senders and falls back to snapshots", () => {
    const registry = buildUserAvatarRegistry({
      tenantMembers: [
        { userId: "staff-1", displayName: "Staff", avatarUrl: "staff.png" } as TenantMemberDto,
      ],
    });

    expect(
      registry.resolveMessageSenderAvatar({
        messageId: "m1",
        senderUserId: "staff-1",
        senderAvatarUrl: "snapshot.png",
      } as MessageItemDto),
    ).toBe("staff.png");

    expect(
      registry.resolveMessageSenderAvatar({
        messageId: "m2",
        senderUserId: "unknown",
        senderAvatarUrl: "snapshot.png",
      } as MessageItemDto),
    ).toBe("snapshot.png");
  });
});
