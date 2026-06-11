import type {
  ConversationListItem,
  FriendDto,
  TenantMemberDto,
} from "../../data/api/types";

export type ConversationListIdentityKind = "customer" | "internal" | "none";

export interface ConversationListIdentityView {
  identityText: "客户" | "内部" | "";
  kind: ConversationListIdentityKind;
  sourceText: string;
}

export function conversationListIdentityView({
  conversation,
  friends,
  isGroup,
  tenantMembers,
}: {
  conversation: ConversationListItem;
  friends: FriendDto[];
  isGroup: boolean;
  tenantMembers: TenantMemberDto[];
}): ConversationListIdentityView {
  if (isGroup) return emptyIdentityView();

  const friend = friends.find((item) => sameId(item.friendUserId, conversation.peerUserId));
  const customer = friend?.userType === 1 || conversation.peerUserType === 1;
  if (customer) {
    return {
      identityText: "客户",
      kind: "customer",
      sourceText: customerConversationSourceText(conversation),
    };
  }

  if (conversationPeerMatchesTenantMember(conversation, tenantMembers)) {
    return {
      identityText: "内部",
      kind: "internal",
      sourceText: "",
    };
  }

  return emptyIdentityView();
}

function emptyIdentityView(): ConversationListIdentityView {
  return { identityText: "", kind: "none", sourceText: "" };
}

function conversationPeerMatchesTenantMember(
  conversation: ConversationListItem,
  tenantMembers: TenantMemberDto[],
) {
  const record = conversation as unknown as Record<string, unknown>;
  const peerIds = [
    conversation.peerUserId,
    record.peerPlatformUserId,
    record.peer_platform_user_id,
    conversation.peerLppId,
    conversation.peerLppNo,
    conversation.peerLppNumber,
    conversation.peerUserNo,
  ]
    .map(normalizeIdentityValue)
    .filter(Boolean);
  if (peerIds.length === 0) return false;
  return tenantMembers.some((member) =>
    [
      member.userId,
      member.platformUserId,
      member.greenBubbleNo,
    ]
      .map(normalizeIdentityValue)
      .some((value) => value && peerIds.includes(value)),
  );
}

function customerConversationSourceText(conversation: ConversationListItem) {
  const source = readStringField(
    conversation as unknown as Record<string, unknown>,
    "sourceChannel",
    "source_channel",
    "entryChannel",
    "entry_channel",
    "channel",
    "source",
    "from",
    "platform",
    "provider",
  );
  if (!source) return "";
  const normalized = source.trim().toLowerCase().replace(/[^a-z0-9\u4e00-\u9fa5]+/g, "_");
  if (source.includes("网页") || source.includes("网站") || normalized.includes("web")) {
    return "@网页";
  }
  if (source.includes("抖音") || normalized.includes("douyin") || normalized.includes("tiktok")) {
    return "@抖音";
  }
  if (source.includes("微信") || normalized.includes("wechat") || normalized.includes("weixin")) {
    return "@微信";
  }
  if (
    source.includes("自有") ||
    normalized === "app" ||
    normalized.includes("own_app") ||
    normalized.includes("native") ||
    normalized.includes("mobile_app")
  ) {
    return "@自有App";
  }
  return source.length <= 12 ? `@${source}` : `@${source.slice(0, 12)}...`;
}

function readStringField(record: Record<string, unknown>, ...keys: string[]) {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) return value.trim();
    if (typeof value === "number" && Number.isFinite(value)) return String(value);
  }
  return "";
}

function sameId(left: unknown, right: unknown) {
  const normalizedLeft = normalizeIdentityValue(left);
  return Boolean(normalizedLeft && normalizedLeft === normalizeIdentityValue(right));
}

function normalizeIdentityValue(value: unknown) {
  if (value === undefined || value === null) return "";
  return String(value).trim().toLowerCase();
}
