import type {
  ConversationListItem,
  CustomerProfileCard,
  FriendDto,
  FriendProfileExtraDto,
  GroupMemberDto,
  MessageItemDto,
  TenantMemberDto,
  UserProfileDto,
} from "../../data/api-client";

type AvatarProfile =
  | CustomerProfileCard
  | FriendProfileExtraDto
  | UserProfileDto
  | null
  | undefined;

export type UserAvatarRegistry = ReturnType<typeof buildUserAvatarRegistry>;

export function buildUserAvatarRegistry({
  activeProfiles = [],
  conversations = [],
  friends = [],
  groupMembersByConversation = {},
  tenantMembers = [],
}: {
  activeProfiles?: AvatarProfile[];
  conversations?: ConversationListItem[];
  friends?: FriendDto[];
  groupMembersByConversation?: Record<string, GroupMemberDto[] | undefined>;
  tenantMembers?: TenantMemberDto[];
}) {
  const byIdentity = new Map<string, string>();
  const byConversationId = new Map<string, string>();

  const register = (identity: AvatarIdentity, avatarUrl?: string | null) => {
    const normalizedAvatar = normalizeAvatarUrl(avatarUrl);
    if (!normalizedAvatar) return;
    avatarIdentityKeys(identity).forEach((key) => {
      if (!byIdentity.has(key)) byIdentity.set(key, normalizedAvatar);
    });
  };

  activeProfiles.forEach((profile) => {
    if (!profile) return;
    register(profile, profile.avatarUrl);
  });

  friends.forEach((friend) => {
    register(
      {
        userId: friend.friendUserId,
        greenBubbleNo: friend.greenBubbleNo,
      },
      friend.avatarUrl,
    );
  });

  Object.values(groupMembersByConversation).forEach((members) => {
    members?.forEach((member) => register(member, member.avatarUrl));
  });

  tenantMembers.forEach((member) => register(member, member.avatarUrl));

  conversations.forEach((conversation) => {
    const avatarUrl = normalizeAvatarUrl(conversation.avatarUrl);
    if (!avatarUrl || conversation.conversationType === "group") return;
    register(
      {
        conversationId: conversation.conversationId,
        lppId: conversation.peerLppId,
        lppNo: conversation.peerLppNo,
        lppNumber: conversation.peerLppNumber,
        userId: conversation.peerUserId,
      },
      avatarUrl,
    );
    byConversationId.set(conversation.conversationId, avatarUrl);
  });

  const resolve = ({
    conversation,
    fallbackAvatarUrl,
    lppId,
    message,
    userId,
  }: {
    conversation?: ConversationListItem;
    fallbackAvatarUrl?: string | null;
    lppId?: string | null;
    message?: MessageItemDto;
    userId?: string | null;
  }) => {
    const directConversation =
      conversation && conversation.conversationType !== "group"
        ? conversation
        : undefined;
    const directMatch = firstAvatarForIdentity(byIdentity, {
      conversationId: directConversation?.conversationId,
      fromUserId: message?.fromUserId,
      lppId: lppId ?? message?.senderLppId ?? message?.lppId ?? directConversation?.peerLppId,
      lppNo: directConversation?.peerLppNo,
      lppNumber: directConversation?.peerLppNumber,
      platformUserId: message?.senderPlatformUserId ?? message?.platformUserId,
      senderId: message?.senderId,
      senderUserId: message?.senderUserId,
      userId: userId ?? directConversation?.peerUserId,
    });
    if (directMatch) return directMatch;
    if (directConversation?.conversationId) {
      const conversationAvatar = byConversationId.get(directConversation.conversationId);
      if (conversationAvatar) return conversationAvatar;
    }
    return (
      normalizeAvatarUrl(fallbackAvatarUrl) ??
      normalizeAvatarUrl(message?.senderAvatarUrl) ??
      normalizeAvatarUrl(message?.avatarUrl) ??
      null
    );
  };

  return {
    resolve,
    resolveConversationAvatar: (conversation: ConversationListItem) =>
      resolve({
        conversation,
        fallbackAvatarUrl: conversation.avatarUrl,
        lppId: conversation.peerLppId,
        userId: conversation.peerUserId,
      }),
    resolveMessageSenderAvatar: (
      message: MessageItemDto,
      conversation?: ConversationListItem,
    ) =>
      resolve({
        conversation,
        message,
      }),
  };
}

type AvatarIdentity = {
  conversationId?: string | null;
  customerLppId?: string | null;
  customerLppNo?: string | null;
  customerUserId?: string | null;
  fromUserId?: string | null;
  friendUserId?: string | null;
  greenBubbleId?: string | null;
  greenBubbleNo?: string | null;
  lppId?: string | null;
  lppNo?: string | null;
  lppNumber?: string | null;
  platformUserId?: string | null;
  senderId?: string | null;
  senderUserId?: string | null;
  userId?: string | null;
  userNo?: string | number | null;
};

function firstAvatarForIdentity(
  byIdentity: Map<string, string>,
  identity: AvatarIdentity,
) {
  for (const key of avatarIdentityKeys(identity)) {
    const avatarUrl = byIdentity.get(key);
    if (avatarUrl) return avatarUrl;
  }
  return null;
}

function avatarIdentityKeys(identity: AvatarIdentity) {
  return [
    identity.userId,
    identity.friendUserId,
    identity.customerUserId,
    identity.senderUserId,
    identity.senderId,
    identity.fromUserId,
    identity.platformUserId,
    identity.lppId,
    identity.lppNo,
    identity.lppNumber,
    identity.customerLppId,
    identity.customerLppNo,
    identity.greenBubbleId,
    identity.greenBubbleNo,
    identity.userNo,
    identity.conversationId,
  ]
    .map((value) => normalizeIdentityKey(value))
    .filter((value): value is string => Boolean(value));
}

function normalizeIdentityKey(value?: string | number | null) {
  const normalized = `${value ?? ""}`.trim().toLowerCase();
  return normalized || null;
}

function normalizeAvatarUrl(value?: string | null) {
  const normalized = `${value ?? ""}`.trim();
  return normalized || null;
}
